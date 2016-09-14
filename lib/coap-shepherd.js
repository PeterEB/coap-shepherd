'use strict';

var Q = require('q'),
    fs = require('fs'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Readable = require('stream').Readable,
    network = require('network'),
    proving = require('proving'),
    _ = require('busyman'),
    coap = require('coap'),
    debug = require('debug')('coap-shepherd'),
    logReq = require('debug')('coap-shepherd:request');

var CoapNode = require('./components/coap-node'),
    Coapdb = require('./components/coapdb'),
    cutils = require('./components/cutils'),
    config = require('./config'),
    init = require('./init');

var reqTimeout = config.reqTimeout || 60,
    hbTimeout = config.hbTimeout || 40;

/**** Code Enumerations ****/
var RSP = { ok: '2.00', created: '2.01', deleted: '2.02', changed: '2.04', content: '2.05', badreq: '4.00',
            unauth: '4.01', forbid: '4.03', notfound: '4.04', notallowed: '4.05', timeout: '4.08',  dberror: '5.00' };

function CoapShepherd() {
    EventEmitter.call(this);

    this.clientIdCount = 1;

    this._net = {
        intf: '',
        ip: config.ip || '',
        port: config.port || 5683,
        mac: '',
        routerIp: ''
    };

    this._registry = {};
    this._server = null;

    this._enabled = false;
    this._joinable = 'off';
    this._hbChecker = null;
    this._permitJoinTime = 0; 
    this._permitJoinTimer = null;

    this._dbPath = config.defaultDbPath;

    try {
        fs.statSync(config.defaultDbFolder);
    } catch (e) {
        fs.mkdirSync(config.defaultDbFolder);
    }

    this._coapdb = new Coapdb(this._dbPath);

    coap.updateTiming({
        maxLatency: (reqTimeout - 47) / 2
    });
}

util.inherits(CoapShepherd, EventEmitter);

var coapShepherd = new CoapShepherd();

CoapShepherd.prototype.start = function (callback) {
    var deferred = Q.defer(),
        shepherd = this;

    if (!this._enabled) {
        init.setupShepherd(shepherd).then(function () {
            hbCheck(shepherd, true);
            shepherd.emit('ready');
            deferred.resolve();
        }).fail(function (err) {
            shepherd._server = null;
            shepherd._enabled = false;
            deferred.reject(err);
        }).done();
    } else {
        deferred.resolve();
    }

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.stop = function (callback) {
    var deferred = Q.defer(),
        shepherd = this;

    if (!shepherd._enabled) {
        deferred.resolve();
    } else {
        if (!shepherd._server) {
            deferred.reject(new Error('server does not exist.'));
        } else {
            shepherd._server.close(function () {
                shepherd._server = null;
                shepherd._enabled = false;
                hbCheck(shepherd, false);
                deferred.resolve();
            });
        }
    }

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.reset = function (callback) {
    var shepherd = this,
        deferred = Q.defer();

    this.stop().then(function () {
        return shepherd.start();
    }).done(function () {
        deferred.resolve();
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.find = function (clientName) {
    proving.string(clientName, 'clientName should be a string.');

    return this._registry[clientName];
};

CoapShepherd.prototype.findByMacAddr = function (macAddr) {
    proving.string(macAddr, 'macAddr should be a string.');

    return _.filter(this._registry, function (cnode) {
        return cnode.mac === macAddr;
    });
};

CoapShepherd.prototype._findByClientId = function (id) {
    proving.stringOrNumber(id, 'id should be a string or a number.');

    return _.find(this._registry, function (cnode) {
        return cnode.clientId == id;
    });
};

CoapShepherd.prototype._findByLocationPath = function (path) {
    proving.string(path, 'path should be a string.');

    return _.find(this._registry, function (cnode) {
        return cnode.locationPath === path;
     });
};

CoapShepherd.prototype.permitJoin = function (time) {
    if (!_.isUndefined(time))
        proving.number(time, 'time should be a number if given.');

    var shepherd = this;

    time = time || 0;
    this._permitJoinTime = Math.floor(time);

    clearTimeout(this._permitJoinTimer);
    this.emit('permitJoining', this._permitJoinTime);
    this._joinable = 'on';    

    this._permitJoinTimer = setInterval(function () {
        shepherd._permitJoinTime -= 1;

        if (shepherd._permitJoinTime === 0) {
            shepherd._joinable = 'off';
            clearInterval(shepherd._permitJoinTimer);
            shepherd._permitJoinTimer = null;
        }

        shepherd.emit('permitJoining', shepherd._permitJoinTime);
    }, 1000);
};

CoapShepherd.prototype.list = function () {
    var devList = [];

    _.forEach(this._registry, function (dev, clientName) {
        delete dev.so;
        devList.push(dev.dump());
    });

    return devList;
};

CoapShepherd.prototype.request = function (reqObj, callback) {
    proving.object(reqObj, 'reqObj should be an object.');

    var deferred = Q.defer();

    if (!reqObj.hostname || !reqObj.port || !reqObj.method) {
        deferred.reject(new Error('bad reqObj.'));
        return deferred.promise.nodeify(callback);
    }

    if (!this._enabled) {
        deferred.reject(new Error('server does not enabled.'));
    } else {
        if (_.isObject(reqObj.payload) && !_.isEmpty(reqObj.payload)) {
            reqObj.payload = JSON.stringify(reqObj.payload); 
        } else if (!_.isNil(reqObj.payload)) {
            reqObj.payload = reqObj.payload.toString();
        } else {
            reqObj.payload = null;
        }

        coapRequest(reqObj).done(function (rsp) {
            deferred.resolve(rsp); 
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.announce = function (msg, callback) {
    proving.string(msg, 'msg should be an string.');

    var deferred = Q.defer(),
        shepherd = this,
        announceAllClient = [],
        count = this._registry.lenght,
        reqObj = {
            hostname: null,
            port: null,
            pathname: '/announce',
            method: 'POST',
            payload: msg
        };

    function reqWithoutRsp(reqObj) {
        var agent = new coap.Agent({ type: config.connectionType }),
            req = agent.request(reqObj);

        req.end(reqObj.payload);
        agent.abort(req);
        count -= 1;

        if (count === 0)
            deferred.resolve(msg);
    } 

    _.forEach(this._registry, function (cnode, clientName) {
        reqObj.hostname = cnode.ip;
        reqObj.port = cnode.port;

        process.nextTick(function () {
            reqWithoutRsp(reqObj);
        });
    });

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.remove = function (clientName, callback) {  
    var deferred = Q.defer(),
        shepherd = this,
        cnode = this.find(clientName);

    if (cnode) {
        cnode._setStatus('offline');
        cnode.lifeCheck(false);
        cnode.dbRemove().done(function () {
            cnode._registered = false;
            cnode.so = null;
            cnode._cancelAllObservers();
            shepherd._registry[cnode.clientName] = null;
            delete shepherd._registry[cnode.clientName];
            shepherd.clientIdCount -= 1;

            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });
    } else {
        deferred.resolve();
    }

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype._newClientId = function (id) {
    if (!_.isUndefined(id))  
        proving.number(id, 'id should be a number.');

    var clientId = id || this.clientIdCount;

    if (this._findByClientId(clientId)) {
        this.clientIdCount += 1;
        return this._newClientId();
    } else {
        this.clientIdCount += 1;
        return clientId;
    }
};

/*********************************************************
 * Private function                                      *
 *********************************************************/
function coapRequest(reqObj) {
    var deferred = Q.defer(),
        agent = new coap.Agent({ type: config.connectionType }),
        req = agent.request(reqObj);

    if (!_.isNil(reqObj.observe) && reqObj.observe === false) 
        req.setOption('Observe', 1);

    req.on('response', function (rsp) {
        debug('RSP <-- %s, token: %s, status: %s', reqObj.method, req._packet ? req._packet.token.toString('hex') : undefined, rsp.code);

        if (!_.isEmpty(rsp.payload) && rsp.headers['Content-Format'] === 'application/json') {
            rsp.payload = JSON.parse(rsp.payload);
            rsp.payload = cutils.decodeJsonObj(reqObj.pathname, rsp.payload);
        } else if (!_.isEmpty(rsp.payload)) {
            rsp.payload = rsp.payload.toString();

            if (!_.isNaN(Number(rsp.payload)))
                rsp.payload = Number(rsp.payload);
        }

        deferred.resolve(rsp);
    });

    req.on('error', function(err) {
        if (err.retransmitTimeout) {
            deferred.resolve({ code: RSP.timeout });
        } else {
            deferred.reject(err);
        }        
    });

    req.end(reqObj.payload);
    debug('REQ --> %s, token: %s', reqObj.method, req._packet ? req._packet.token.toString('hex') : undefined);

    return deferred.promise;
}

function hbCheck (shepherd, enabled) {
    clearInterval(shepherd._hbChecker);
    shepherd._hbChecker = null;

    if (enabled) {
        shepherd._hbChecker = setInterval(function () {
            _.forEach(shepherd._registry, function (cn) {
                var now = cutils.getTime();

                if (cn.status === 'online' && ((now - cn._heartbeat) > hbTimeout)) {
                    cn._setStatus('offline');

                    cn.pingReq().done(function (rspObj) {
                        if (rspObj.status === RSP.content) {
                            cn._heartbeat = now;
                        } else if (cn.status !== 'online') {
                            cn._cancelAllObservers();
                        }
                    }, function (err) {
                        cn._cancelAllObservers();
                        shepherd.emit('error', err);
                    });
                }
            });
        }, hbTimeout * 1000);
    }
}

module.exports = coapShepherd;

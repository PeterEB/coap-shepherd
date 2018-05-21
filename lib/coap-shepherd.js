'use strict';

var Q = require('q'),
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Readable = require('stream').Readable,
    network = require('network');

var proving = require('proving'),
    _ = require('busyman'),
    coap = require('coap'),
    debug = require('debug')('coap-shepherd'),
    logReq = require('debug')('coap-shepherd:request');

var CoapNode = require('./components/coap-node'),
    Coapdb = require('./components/coapdb'),
    cutils = require('./components/cutils'),
    CNST = require('./components/constants'),
    config = require('./config'),
    init = require('./init');

var reqTimeout = config.reqTimeout || 60,
    hbTimeout = config.hbTimeout || 60;

/**** Code Enumerations ****/
var RSP = CNST.RSP;

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
    this._joinable = false;
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

    this._acceptDevIncoming = function (devInfo, callback) {   // Override at will.
        setImmediate(function () {
            var accepted = true;
            callback(null, accepted);
        });
    };
}

util.inherits(CoapShepherd, EventEmitter);

var coapShepherd = new CoapShepherd();

CoapShepherd.prototype.start = function (callback) {
    var deferred = Q.defer(),
        shepherd = this;

    if (!this._enabled) {
        init.setupShepherd(shepherd).then(function () {
            hbCheck(shepherd, true);
            shepherd._fire('ready');
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
                coap.globalAgent._doClose();    // [FIXIT]
                hbCheck(shepherd, false);
                deferred.resolve();
            });
        }
    }

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.reset = function (mode, callback) {
    var shepherd = this,
        deferred = Q.defer();

    if (_.isFunction(mode)) {
        callback = mode;
        mode = false;
    }

    mode = !!mode;

    if (mode === true) {
        if (shepherd._coapdb) {
            shepherd._coapdb.db.remove({}, { multi: true }, function (err, num) {
                shepherd._coapdb.db.loadDatabase(function (err) {
                    if (!err)
                        debug('Database cleared.');
                    else
                        debug(err);
                });
            });
        } else {
            shepherd._coapdb = new Coapdb(shepherd._dbPath);
        }
    }

    this.stop().then(function () {
        return shepherd.start();
    }).done(deferred.resolve, deferred.reject);

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

    if (!this._enabled) {
        this._permitJoinTime = 0;
        return false;
    }

    time = time || 0;

    if (!time) {
        this._joinable = false;
        this._permitJoinTime = 0;
        this._fire('permitJoining', this._permitJoinTime);

        if (this._permitJoinTimer) {
            clearInterval(this._permitJoinTimer);
            this._permitJoinTimer = null;
        }

        return true;
    }

    if (this._joinable && this._permitJoinTimer && this._permitJoinTimer._idleTimeout !== -1) {
        clearInterval(this._permitJoinTimer);
        this._permitJoinTimer = null;
    }

    this._joinable = true;
    this._permitJoinTime = Math.floor(time);
    this._fire('permitJoining', shepherd._permitJoinTime);

    this._permitJoinTimer = setInterval(function () {
        shepherd._permitJoinTime -= 1;

        if (shepherd._permitJoinTime === 0) {
            shepherd._joinable = false;
            clearInterval(shepherd._permitJoinTimer);
            shepherd._permitJoinTimer = null;
        }

        shepherd._fire('permitJoining', shepherd._permitJoinTime);
    }, 1000);

    return true;
};

CoapShepherd.prototype.list = function () {
    var devList = [];

    _.forEach(this._registry, function (dev, clientName) {
        var rec = dev._dumpSummary();
        rec.status = dev.status;
        devList.push(rec);
    });

    return devList;
};

CoapShepherd.prototype.request = function (reqObj, callback) {
    proving.object(reqObj, 'reqObj should be an object.');

    var deferred = Q.defer(),
        socket;
        
    if (!reqObj.hostname || !reqObj.port || !reqObj.method) {
        deferred.reject(new Error('bad reqObj.'));
        return deferred.promise.nodeify(callback);
    }

    if (!this._enabled) {
        deferred.reject(new Error('server does not enabled.'));
    } else {
        if (!_.isNil(reqObj.payload))
            reqObj.payload = reqObj.payload;
        else 
            reqObj.payload = null;

        coapRequest(reqObj, coap.globalAgent).done(deferred.resolve, deferred.reject);
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
        var req = coap.globalAgent.request(reqObj);

        req.end(reqObj.payload);
        coap.globalAgent.abort(req);
        count -= 1;

        if (count === 0)
            deferred.resolve(msg);
    } 

    _.forEach(this._registry, function (cnode, clientName) {
        reqObj.hostname = cnode.ip;
        reqObj.port = cnode.port;

        setImmediate(function () {
            reqWithoutRsp(reqObj);
        });
    });

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.remove = function (clientName, callback) {  
    var deferred = Q.defer(),
        shepherd = this,
        cnode = this.find(clientName),
        mac;

    if (cnode) {
        mac = cnode.mac;
        cnode._setStatus('offline');
        cnode.lifeCheck(false);
        cnode.dbRemove().done(function () {
            cnode._registered = false;
            cnode.so = null;
            cnode._cancelAllObservers();
            shepherd._registry[cnode.clientName] = null;
            delete shepherd._registry[cnode.clientName];
            shepherd.clientIdCount -= 1;
            shepherd._fire('ind', {
                type: 'devLeaving', 
                cnode: clientName,
                data: mac
            });

            deferred.resolve(clientName);
        }, function (err) {
            deferred.reject(err);
        });
    } else {
        deferred.resolve();
    }

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.acceptDevIncoming = function (predicate) {
    proving.fn(predicate, 'predicate must be a function');

    this._acceptDevIncoming = predicate;
    return true;
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

CoapShepherd.prototype._fire = function (msg, data) {
    var shepherd = this;

    setImmediate(function () {
        shepherd.emit(msg, data);
    });
};

/*********************************************************
 * Private function                                      *
 *********************************************************/
function coapRequest(reqObj) {
    var deferred = Q.defer(),
        req = coap.request(reqObj);

    if (!_.isNil(reqObj.observe) && reqObj.observe === false)
        req.setOption('Observe', 1);

    req.on('response', function (rsp) {
        debug('RSP <-- %s, token: %s, status: %s', reqObj.method, req._packet ? req._packet.token.toString('hex') : undefined, rsp.code);

        if (!_.isEmpty(rsp.payload) && rsp.headers['Content-Format'] === 'application/json') {
            rsp.payload = cutils.decodeJson(reqObj.pathname, rsp.payload);
        } else if (!_.isEmpty(rsp.payload) && rsp.headers['Content-Format'] === 'application/tlv') {
            rsp.payload = cutils.decodeTlv(reqObj.pathname, rsp.payload);
        } else if (!_.isEmpty(rsp.payload) && rsp.headers['Content-Format'] === 'application/link-format') {
            rsp.payload = cutils.decodeLinkFormat(rsp.payload.toString());
        } else if (!_.isEmpty(rsp.payload)) {
            rsp.payload = cutils.checkRescType(reqObj.pathname, rsp.payload.toString());
        }
        
        deferred.resolve(rsp);
    });

    req.on('error', function(err) {
        if (err.retransmitTimeout) 
            deferred.resolve({ code: RSP.timeout });
        else 
            deferred.reject(err);
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
                
                if (cn.status === 'online' && cn.heartbeatEnabled && ((now - cn._heartbeat) > hbTimeout)) {
                    cn._setStatus('offline');

                    cn.pingReq().done(function (rspObj) {
                        if (rspObj.status === RSP.content) {
                            cn._heartbeat = now;
                        } else if (cn.status !== 'online') {
                            cn._cancelAllObservers();
                        }
                    }, function (err) {
                        cn._cancelAllObservers();
                        shepherd._fire('error', err);
                    });
                }
            });
        }, hbTimeout * 1000);
    }
}

module.exports = coapShepherd;

'use strict';

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Readable = require('stream').Readable,
    _ = require('lodash'),
    Q = require('q'),
    network = require('network'),
    coap = require('coap');

var CoapNode = require('./coapnode.js'),
    cutils = require('./utils/cutils.js'),
    config = require('../config.js'),
    coapdb = require('./coapdb.js');

var reqTimeout = config.reqTimeout || 60,
    hbTimeout = config.hbTimeout || 40;

/**** Code Enumerations ****/
var RSP = { ok: '2.00', created: '2.01', deleted: '2.02', changed: '2.04', content: '2.05', badreq: '4.00',
            unauth: '4.01', forbid: '4.03', notfound: '4.04', notallowed: '4.05', timeout: '4.08',  dberror: '5.00' };

function CoapShepherd() {
    EventEmitter.call(this);

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
    this._shepherdTest = false;
    this._joinable = 'off';

    this.locationPathCount = 1;

    this._hbChecker = null;
    this._permitJoinTimer = null;
}

util.inherits(CoapShepherd, EventEmitter);

var coapShepherd = new CoapShepherd();

CoapShepherd.prototype.start = function (callback) {
    var deferred = Q.defer(),
        shepherd = this;

    if (!this._enabled) {
        _coapServerStart(shepherd).then(function (server) {
            shepherd._enabled = true;
            shepherd._server = server;
            if (!shepherd._shepherdTest) {
                return _testShepherd(shepherd).then(function (shepherd) {
                    return _loadNodesFromDb(shepherd);
                });
            }
        }).then(function () {
            _hbCheck(shepherd, true);
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
                _hbCheck(shepherd, false);
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
    return this._registry[clientName];
};

CoapShepherd.prototype._findByLocationPath = function (path) {
    return _.find(this._registry, { locationPath: path });
};

CoapShepherd.prototype._findByMac = function (mac) {
    return _.find(this._registry, { mac: mac });
};

CoapShepherd.prototype.updateNetInfo = function (callback) {
    var shepherd = this,
        deferred = Q.defer();

    network.get_active_interface(function(err, obj) {
        if (err) {
            deferred.reject(err);
        } else {
            shepherd._net.intf = obj.name;
            shepherd._net.ip = obj.ip_address;
            shepherd._net.mac = obj.mac_address;
            shepherd._net.routerIp = obj.gateway_ip;
            deferred.resolve(_.cloneDeep(shepherd._net));
        }
    });

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.permitJoin = function (time) {
    if (!_.isNumber(time)) { throw new Error('time must be a number'); }
    var shepherd = this;

    clearTimeout(this._permitJoinTimer);
    this._joinable = 'on';
    this._permitJoinTimer = setTimeout(function () {
        shepherd._joinable = 'off';
    }, time * 1000);
};

CoapShepherd.prototype.devList = function () {
    var devList = {};

    _.forEach(this._registry, function (dev, clientName) {
        devList[clientName] = dev.dump();
    });

    return devList;
};

CoapShepherd.prototype.observeList = function () {
    var observeList = {};

    _.forEach(this._registry, function (dev, clientName) {
        observeList[clientName] = [];

        _.forEach(dev._streamObservers, function (observeStream, path) {
            if (path !== '/heartbeat')
                observeList[clientName].push(path);
        });
    });

    return observeList;
};


CoapShepherd.prototype.request = function (reqObj, callback) {
    if (!_.isPlainObject(reqObj)) throw new Error('reqObj should be an object.');
    var deferred = Q.defer();

    if (!reqObj.hostname || !reqObj.port || !reqObj.method) {
        deferred.reject(new Error('bad reqObj.'));
        return deferred.promise.nodeify(callback);
    }

    if (!this._enabled) {
        deferred.reject(new Error('server does not enabled.'));
    } else {
        if (_.isObject(reqObj.payload) && !_.isEmpty(reqObj.payload)) {
            reqObj.options = { 'Content-Format': 'application/json' };
            reqObj.payload = JSON.stringify(reqObj.payload); 
        } else if (!_.isNil(reqObj.payload)) {
            reqObj.payload = reqObj.payload.toString();
        } else {
            reqObj.payload = null;
        }

        _coapRequest(reqObj).done(function (rsp) {
            deferred.resolve(rsp); 
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.announce = function (msg, callback) {
    var deferred = Q.defer(),
        shepherd = this,
        announceAllClient = [],
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
    } 

    _.forEach(this._registry, function (cnode, clientName) {
        reqObj.hostname = cnode.ip;
        reqObj.port = cnode.port;
        reqWithoutRsp(reqObj);
    });

    deferred.resolve();

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.remove = function (clientName, callback) {  
    var deferred = Q.defer(),
        shepherd = this,
        cnode = this._registry[clientName];

    if (cnode) {
        cnode._setStatus('offline');
        cnode.disableLifeChecker();
        cnode.dbRemove().done(function () {
            cnode._registered = false;
            cnode.so = null;
            cnode._cancelAllObservers();
            shepherd._registry[cnode.clientName] = null;
            delete shepherd._registry[cnode.clientName];
// [FIXME] you should decrease the count?
            shepherd.locationPathCount -= 1;

            if (shepherd._shepherdTest)
                shepherd.emit('ind', { type: 'deregistered', data: clientName });

            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });
    } else {
        deferred.resolve();
    }

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype._newLocationPath = function () {
    var locationPath = '/rd/' + this.locationPathCount.toString();

    if (this._findByLocationPath(locationPath)) {
        this.locationPathCount += 1;
        return this._newLocationPath();
    } else {
        this.locationPathCount += 1;
        return locationPath;
    }
};

/*********************************************************
 * coap module function
 *********************************************************/
function _coapServerStart(shepherd, callback) {
    var deferred = Q.defer(),
        server;

    server = coap.createServer({
        type: config.connectionType
    });

    server.on('request', function (req, rsp) {
        if (!_.isEmpty(req.payload) && req.payload.length !== 0 && req.headers && req.headers['Content-Format'] === 'application/json') {
            req.payload = JSON.parse(req.payload);
        } else if (!_.isEmpty(req.payload) && req.payload.length !== 0) {
            req.payload = req.payload.toString();
            
            if (!_.isNaN(Number(req.payload)))
                req.payload = Number(req.payload);
        }

        _clientReqHandler(shepherd, req, rsp);
    });

    server.listen(shepherd._net.port, function (err) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(server);
    });

    return deferred.promise.nodeify(callback);
}

function _coapRequest(reqObj) {
    var deferred = Q.defer(),
        agent = new coap.Agent({ type: config.connectionType }),
        req = agent.request(reqObj),
        reqChecker;

    if (!_.isNil(reqObj.observe) && reqObj.observe === false) 
        req.setOption('Observe', 1);

    req.on('response', function (rsp) {
        clearTimeout(reqChecker);
        if (!_.isNil(rsp.payload) && rsp.headers && rsp.headers['Content-Format'] === 'application/json') {
            rsp.payload = JSON.parse(rsp.payload);
            rsp.payload = cutils.decodeJsonObj(reqObj.pathname, rsp.payload);
        } else if (!_.isNil(rsp.payload)) {
            rsp.payload = rsp.payload.toString();

            if (!_.isNaN(Number(rsp.payload)))
                rsp.payload = Number(rsp.payload);
        }

        deferred.resolve(rsp);
    });

    req.on('error', function (err) {
        deferred.reject(err);
    });

    reqChecker = setTimeout(function () {
        var rsp = { code: RSP.timeout, payload: null };
        agent.abort(req);
        deferred.resolve(rsp);
    }, reqTimeout * 1000);
    
    req.end(reqObj.payload);
    return deferred.promise;
}

/*********************************************************
 * Handler function
 *********************************************************/
function _clientReqHandler(shepherd, req, rsp) {
    var optType = _clientReqParser(req),
        reqHdlr;

    switch (optType) {
        case 'register':
            reqHdlr = _clientRegisterHandler;
            break;
        case 'update':
            reqHdlr = _clientUpdateHandler;
            break;
        case 'deregister':
            reqHdlr = _clientDeregisterHandler;
            break;
        case 'lookup':
            reqHdlr = _clientLookupHandler;
            break;
        case 'empty':
            rsp.reset();
            break;
        default:
            break;
    }

    if (reqHdlr)
        process.nextTick(function () {
            reqHdlr(shepherd, req, rsp).done();
        });
}

function _clientRegisterHandler (shepherd, req, rsp) {
    var deferred = Q.defer(),
        devAttr = _buildDevAttr(req),
        cnode = shepherd.find(devAttr.clientName);

    if (!devAttr.clientName || !devAttr.objList) {
        rsp.code = RSP.badreq;
        rsp.end('');
        return deferred.promise;
    }
    
    if (shepherd._joinable === 'off') {
        rsp.code = RSP.notallowed;
        rsp.end('');
        return deferred.promise;
    }
    
    if (!cnode) {
        cnode = new CoapNode(shepherd, devAttr);
        shepherd._registry[devAttr.clientName] = cnode;
        cnode._heartbeat = cutils.getTime();
        cnode.enableLifeChecker();

        if (shepherd._shepherdTest) {
            cnode._readAllResource().then(function (rspObj) {
                return cnode.dbSave();
            }).then(function () {
                return cnode.observe('/heartbeat');
            }).then(function () {
                cnode._setStatus('online');
                cnode._registered = true;
                rsp.code = RSP.created;
                rsp.setOption('Location-Path', cnode.locationPath);
                rsp.end('');
                shepherd.emit('ind', { type: 'registered', data: cnode });  
            }).fail(function (err) {
                rsp.code = RSP.dberror;
                rsp.end('');
                shepherd.emit('error', err);
            }).done(function () {
                deferred.resolve();
            });
        } else {
            cnode._setStatus('online');
            cnode._registered = true;
            rsp.code = RSP.created;
            rsp.setOption('Location-Path', cnode.locationPath);
            rsp.end('');
            deferred.resolve();
        }
    } else {
// [HACK]
        cnode._updateAttrs(devAttr).then(function (diff) {
            cnode._heartbeat = cutils.getTime();
            cnode.enableLifeChecker();
            return cnode._readAllResource();
        }).then(function (rspObj) {
            return cnode.dbSave();
        }).then(function () {
            if (!cnode._streamObservers['/heartbeat']) {
                return cnode.observe('/heartbeat');
            } else {
                return cnode.cancelObserve('/heartbeat').then(function () {
                    return cnode.observe('/heartbeat');
                });
            }   
        }).then(function () {
            cnode._setStatus('online');
            rsp.code = RSP.changed;
            rsp.setOption('Location-Path', cnode.locationPath);
            rsp.end('');
            shepherd.emit('ind', { type: 'registered', data: cnode });
        }).fail(function (err) {
            rsp.code = RSP.dberror;
            rsp.end('');
            shepherd.emit('error', err);
        }).done(function () {
            deferred.resolve();
        });
    }

    return deferred.promise;
}

function _clientUpdateHandler (shepherd, req, rsp) {
    var deferred = Q.defer(),
        devAttr = _buildDevAttr(req),
        locationPath = cutils.urlParser(req.url).pathname,
        cnode = shepherd._findByLocationPath(locationPath),
        diff,
        msg = {};

    if (cnode) {
        cnode._updateAttrs(devAttr).then(function (diffAttrs) {
            diff = diffAttrs;
            cnode._setStatus('online');
            cnode._heartbeat = cutils.getTime();
            cnode.enableLifeChecker();
            if (diff.objList) {
                return cnode._readAllResource().then(function (rspObj) {
                    return cnode.dbSave();
                });
            }
        }).then(function () {
            msg.device = cnode.clientName;
            
            if (_.isEmpty(diff)) {
                rsp.code = RSP.ok;
            } else {
                rsp.code = RSP.changed;
                _.forEach(diff, function (val, key) {
                    msg[key] = val;
                });
            }

            rsp.end('');

            if (shepherd._shepherdTest) 
                shepherd.emit('ind', { type: 'update', data: msg });
        }, function (err) {
            rsp.code = RSP.dberror;
            rsp.end('');
            shepherd.emit('error', err);
        }).done(function () {
            deferred.resolve();
        });
    } else {
        rsp.code = RSP.notfound;
        rsp.end('');
        deferred.resolve();
    }

    return deferred.promise;
}

function _clientDeregisterHandler (shepherd, req, rsp) {
    var deferred = Q.defer(),
        locationPath = cutils.urlParser(req.url).pathname,
        cnode = shepherd._findByLocationPath(locationPath),
        clientName = cnode.clientName;

    if (cnode) {
        shepherd.remove(clientName).then(function () {
            rsp.code = RSP.deleted;
            rsp.end('');
        }, function (err) {
            rsp.code = RSP.dberror;
            rsp.end('');
        }).done(function () {
            deferred.resolve();
        });
    } else {
        rsp.code = RSP.notfound;
        rsp.end('');
        deferred.resolve();
    }

    return deferred.promise;
}

function _clientLookupHandler (shepherd, req, rsp) {
    var deferred = Q.defer(),
        lookupType = cutils.pathSlashParser(req.url)[1],
        clientName = cutils.getDevAttr(req).clientName,
        cnode = shepherd.find(clientName);
// [TODO] check pathname & lookupType
    if (cnode) {
        rsp.code = RSP.content;
        rsp.end('<coap://' + cnode.ip + ':' + cnode.port + '>;ep=' + cnode.clientName);
        shepherd.emit('ind', { type: 'lookup' , data: clientName });
        deferred.resolve();
    } else {
        rsp.code = RSP.notfound;
        rsp.end('');
        deferred.resolve();
    }

    return deferred.promise;

}
/*********************************************************
 * Private function
 *********************************************************/
function _loadNodesFromDb (shepherd, callback) {
    var deferred = Q.defer(),
        loadAllNodes = [];

    coapdb.exportClientNames().then(function (cNames) {
        _.forEach(cNames, function (cName) {
            var reNode,
                loadNode;

            loadNode = coapdb.findByClientName(cName).then(function (ndata) {
                reNode = new CoapNode(shepherd, ndata);
                shepherd._registry[cName] = reNode;
                _.assign(reNode.so, ndata.so);
                reNode._registered = true;
            });

            loadAllNodes.push(loadNode);
        });

        return Q.all(loadAllNodes);
    }).done(function () {
        deferred.resolve(shepherd);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
}

function _testShepherd (shepherd) {
    var deferred = Q.defer(),
        testReqOdj = {},
        testNode;

    function testClientListener(port) {
        var deferred = Q.defer(),
            server;

        server = coap.createServer({
            type: config.connectionType
        });

        server.on('request', function (req, rsp) {
            rsp.code = RSP.ok;
            rsp.end('_test');
        });

        server.listen(port, function (err) {
            if (err)
                deferred.reject(err);
            else
                deferred.resolve(server);
        });

        return deferred.promise;
    }
    shepherd._joinable = 'on';
// client register
    testReqOdj.hostname = shepherd._net.ip;
    testReqOdj.port = shepherd._net.port;
    testReqOdj.pathname = '/rd';
    testReqOdj.query = 'ep=shepherdTest';
    testReqOdj.payload = '</1/0>';
    testReqOdj.method = 'POST';

    shepherd.request(testReqOdj).then(function (rsp) {
        if (rsp.code === RSP.created) {
            testReqOdj.pathname = rsp.headers['Location-Path'];
            testReqOdj.query = null;
            testReqOdj.payload = null;
            return testClientListener(rsp.outSocket.port);
        } else {
            deferred.reject(new Error('register test error'));
        }
    }).then(function () {
        testNode = shepherd.find('shepherdTest');
// server read
        return testNode.read('/');
    }).then(function (rspObj) {
        if (rspObj.status === RSP.ok && rspObj.data === '_test') {
// client deregister
            testReqOdj.method = 'DELETE'; 
            return shepherd.request(testReqOdj);
        } else {
            deferred.reject(new Error('read test error'));
        }
    }).then(function (rsp) {
        if (rsp.code === RSP.deleted && !shepherd.find('shepherdTest')) {
            deferred.resolve(shepherd);
        } else {
            deferred.reject(new Error('deregister test error'));
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done(function () {
        testReqOdj = null;
        testNode = null;
        shepherd._shepherdTest = true;
        shepherd._joinable = 'off';
    });

    return deferred.promise;
 }

function _hbCheck (shepherd, enabled) {
    clearInterval(shepherd._hbChecker);
    shepherd._hbChecker = null;

    if (enabled) {
        shepherd._hbChecker = setInterval(function () {
            _.forEach(shepherd._registry, function (cn) {
                var now = cutils.getTime();

                if (cn.status === 'online' && ((now - cn._heartbeat) > hbTimeout)) {
                    cn._setStatus('offline');

                    cn.ping().done(function (rspObj) {
                        if (rspObj.status === RSP.content) {
                            cn._heartbeat = now;
                        } else if (cn.status === 'offline') {
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
// [TODO] check ip? mac?
function _clientReqIpChk(cn, req) {
    if (req.rsinfo.address !== cn.ip)
        return false;
    else 
        return true;
}

function _clientReqParser (req) {
    var optType,
        lookupType;

    if (req.code === '0.00' && req._packet.confirmable && req.payload.length === 0)
        return 'empty';

    switch (req.method) {
        case 'POST':
            optType = 'register';
            break;
        case 'PUT':
            optType = 'update';
            break;
        case 'DELETE':
            optType = 'deregister';
            break;
        case 'GET':
            optType = 'lookup';
            break;
        default:
            break;
    }

    return optType;
}

function _buildDevAttr(req) {
    var devAttr = {},  
        query = req.url.split('?')[1] || '',
        queryParams = query.split('&');

    _.forEach(queryParams, function (queryParam, idx) {
        queryParams[idx] = queryParam.split('=');
    });

    _.forEach(queryParams, function(queryParam) {     // 'ep=clientName&lt=86400&lwm2m=1.0.0'
        if(queryParam[0] === 'ep') {
            devAttr.clientName = queryParam[1];
        } else if (queryParam[0] === 'lt') {
            devAttr.lifetime = parseInt(queryParam[1]);
        } else if (queryParam[0] === 'lwm2m') {
            devAttr.version = queryParam[1];
        } else if (queryParam[0] === 'mac') {
            devAttr.mac = queryParam[1];
        }
    });

    devAttr.ip = req.rsinfo.address;
    devAttr.port = req.rsinfo.port;

    if (req.payload.length !== 0) {
        devAttr.objList = cutils.getObjListOfSo(req.payload);
    }

    return devAttr;         // { clientName: 'clientName', lifetime: 86400, version: '1.0.0', objList: { "1": [] }}
}

module.exports = coapShepherd;

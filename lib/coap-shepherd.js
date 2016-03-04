'use strict';

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Readable = require('stream').Readable,
    _ = require('lodash'),
    Q = require('q'),
    coap = require('coap');

var CoapNode = require('./coapnode.js'),
    cutils = require('./utils/cutils.js'),
    config = require('./config/config.js'),
    coapdb = require('./coapdb.js');

var reqTimeout = config.reqTimeout || 10,
    hbTimeout = config.hbTimeout || 30,
    hbChkTime = config.hbChkTime || 40;

function CoapShepherd() {
    EventEmitter.call(this);

    this._registry = {};
    this._enabled = false;
    this._clientIdCount = 1;
    this._shepherdTest = false;
    this.server = null;
    this._hbChecker = null;
}

util.inherits(CoapShepherd, EventEmitter);

var coapShepherd = new CoapShepherd();

CoapShepherd.prototype.start = function (callback) {
    var deferred = Q.defer(),
        shepherd = this;

    _coapServerStart(shepherd).then(function (server) {
        shepherd.server = server;
        shepherd._enabled = true;
        console.log('>> coap-shepherd testing');
        return _testShepherd(shepherd);
    }).then(function (shepherd) {
        return _loadNodesFromDb(shepherd);
    }).then(function (shepherd) {
        _hbCheck(shepherd, true);
        shepherd.emit('ready');
        console.log('>> coap-shepherd server start!');
        deferred.resolve();
    }).fail(function (err) {
        shepherd.server = null;
        shepherd._enabled = false;
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.stop = function (callback) {
    var deferred = Q.defer(),
        shepherd = this;

    if (!shepherd._enabled) {
        deferred.resolve();
    } else {
        if (!shepherd.server) {
            deferred.reject(new Error('server does not exist.'));
        } else {
            shepherd.server.close(function () {
                shepherd._enabled = false;
                shepherd.server = null;
                _hbCheck(shepherd, false);
// [TODO] handle cnode
                console.log('coap-shepherd server stop!');
                deferred.resolve();
            });
        }
    }

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.find = function (clientName) {
    return this._registry[clientName];
};

CoapShepherd.prototype._findByClientId = function (id) {
    return _.find(this._registry, { clientId: id });
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
        }

        _coapRequest(reqObj).done(function (rsp) {
// [TODO] if code = '4.08' then ping client?
            deferred.resolve(rsp);
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.announce = function (msg, callback) {
    var shepherd = this,
        deferred = Q.defer(),
        announceAllClient = [],
        reqObj = {
            hostname: null,
            port: null,
            pathname: '/announce',
            method: 'POST',
            payload: msg
        };

    _.forEach(this._registry, function (cnode, clientName) {
        reqObj.hostname = cnode.ip;
        reqObj.port = cnode.port;

        announceAllClient.push(shepherd.request(reqObj));
    });

    Q.all(announceAllClient).then(function () {
        deferred.resolve();
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.deregisterNode = function (clientName, callback) {
    var deferred = Q.defer(),
        cnode = this._registry[clientName];

    if (cnode) {
        cnode._registered = false;
        cnode.status = 'offline';
        cnode.dbRemove();
        cnode.so = null;
        cnode._cancelAllObservers();
        cnode.disableLifeChecker();
        this._registry[cnode.clientName] = null;
        delete this._registry[cnode.clientName];
        this.emit('ind', { type: 'deregistered' });
        deferred.resolve({ status: '2.02' });
    } else {
        deferred.resolve({ status: '4.04' });
    }

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype._newClientId = function () {
    var clientId = this._clientIdCount.toString();

    if (this._findByClientId(clientId)) {
        this._clientIdCount += 1;
        return this._newClientId();
    } else {
        this._clientIdCount += 1;
        return clientId;
    }
};

/*********************************************************
 * Request to Remote  APIs
 *********************************************************/
 CoapShepherd.prototype.readReq = function (clientName, reqObj, callback) {

 };

 CoapShepherd.prototype.writeReq = function (clientName, reqObj, callback) {

 };

 CoapShepherd.prototype.executeReq = function (clientName, reqObj, callback) {

 };

 CoapShepherd.prototype.dicoverReq = function (clientName, reqObj, callback) {

 };

 CoapShepherd.prototype.writeAttrReq = function (clientName, reqObj, callback) {

 };

 CoapShepherd.prototype.observeReq = function (clientName, reqObj, callback) {

 };

/*********************************************************
 * coap module function
 *********************************************************/
function _coapServerStart(shepherd, callback) {
    var deferred = Q.defer(),
        server;

    server = coap.createServer({
        type: config.serverProtocol,
        proxy: true
    });

    server.on('request', function (req, rsp) {
        if (req.payload && req.headers && req.headers['Content-Format'] === 'application/json') {
            req.payload = JSON.parse(req.payload);
        } else if (req.payload) {
            req.payload = req.payload.toString();
            
            if (!_.isNaN(Number(req.payload)))
                req.payload = Number(req.payload);
        }

        _clientReqHandler(shepherd, req, rsp);
    });

    server.listen(config.port, function (err) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(server);
    });

    return deferred.promise.nodeify(callback);
}

function _coapRequest(reqObj) {
    var deferred = Q.defer(),
        agent = new coap.Agent({ type: config.serverProtocol }),
        req = agent.request(reqObj),
        reqChecker;

    if (!_.isNil(reqObj.observe) && reqObj.observe === false) 
        req.setOption('Observe', 1);

    req.on('response', function (rsp) {
        clearTimeout(reqChecker);
        if (!_.isNil(rsp.payload) && rsp.headers && rsp.headers['Content-Format'] === 'application/json') 
            rsp.payload = JSON.parse(rsp.payload);
        else if (!_.isNil(rsp.payload)) {
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
        var rsp = { code: '4.08' };
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
            reqHdlr(shepherd, req, rsp);
        });
}

function _clientRegisterHandler (shepherd, req, rsp) {
    var devAttr = cutils.buildDevAttr(req),
        cnode = shepherd.find(devAttr.clientName);
// [TODO] devAttr check
    if (!cnode) {
        cnode = new CoapNode(shepherd, devAttr);
        shepherd._registry[devAttr.clientName] = cnode;
        cnode.status = 'online';
        cnode._heartbeat = cutils.getTime();
        cnode._registered = true;
        cnode.enableLifeChecker();

        rsp.code = '2.01';
        rsp.setOption('Location-Path', 'rd/' + cnode.clientId);
        rsp.end('');

        if (shepherd._shepherdTest) {
            cnode._readAllResource().then(function () {
                return cnode.dbSave();
            }).done(function () {
                cnode.observe('/heartbeat');
                shepherd.emit('ind', { type: 'registered', data: cnode });
            }, function (err) {
            // [TODO]
            });
        }
    } else {
        cnode._updateAttrs(devAttr).then(function (diff) {
            cnode.port = devAttr.port;
            cnode.status = 'online';
            cnode._heartbeat = cutils.getTime();
            cnode.enableLifeChecker();
            rsp.code = '2.04';
            rsp.setOption('Location-Path', 'rd/' + cnode.clientId);
            rsp.end('');
            return cnode._readAllResource();
        }).then(function () {
            return cnode.dbSave();
        }).done(function () {
            if (!cnode._streamObservers['/heartbeat']) {
                cnode.observe('/heartbeat');
            } else {
                cnode.cancelObserve('/heartbeat').done(function () {
                    cnode.observe('/heartbeat');
                });
            }

            shepherd.emit('ind', { type: 'registered', data: cnode });
        }, function (err) {
            // [TODO]
        });
    }
}

function _clientUpdateHandler (shepherd, req, rsp) {
    var devAttr = cutils.buildDevAttr(req),
        clientId = cutils.uriParser(req.url)[1],
        cnode = shepherd._findByClientId(clientId),
        diff;
// [TODO] devAttr check
    if (cnode) {
        cnode._updateAttrs(devAttr).then(function (diffAttrs) {
            diff = diffAttrs;
            cnode.status = 'online';
            cnode._heartbeat = cutils.getTime();
            cnode.enableLifeChecker();
            if (!cnode._streamObservers['/heartbeat']) {
                cnode.observe('/heartbeat');
            } else {
                cnode.cancelObserve('/heartbeat').done(function () {
                    cnode.observe('/heartbeat');
                });
            }

            if (_.isEmpty(diff))
                rsp.code = '2.00';
            else 
                rsp.code = '2.04';

            rsp.end('');

            if (shepherd._shepherdTest) 
                shepherd.emit('ind', { type: 'update', data: diff });

            if (diff.objList) {
                return cnode._readAllResource().then(function () {
                    return cnode.dbSave();
                });
            }
        }).done();
    } else {
        rsp.code = '4.04';
        rsp.end(new Error("Device not found."));
    }
}

function _clientDeregisterHandler (shepherd, req, rsp) {
    var clientId = cutils.uriParser(req.url)[1],
        cnode = shepherd._findByClientId(clientId);
    
    if (cnode) {
        cnode._registered = false;
        cnode.status = 'offline';
        cnode.dbRemove();
        cnode.so = null;
        cnode._cancelAllObservers();
        cnode.disableLifeChecker();
        shepherd._registry[cnode.clientName] = null;
        delete shepherd._registry[cnode.clientName];
// you should decrease the count
        shepherd._clientIdCount -= 1;

        rsp.code = '2.02';
        rsp.end('');

        if (shepherd._shepherdTest)
            shepherd.emit('ind', { type: 'deregistered' });

    } else {
        rsp.code = '4.04';
        rsp.end(new Error("Device not found."));
    }
}

function _clientLookupHandler (shepherd, req, rsp) {
    var lookupType = cutils.uriParser(req.url)[1],
        clientName = cutils.getDevAttr(req).clientName,
        cnode = shepherd.find(clientName);
// [TODO] check pathname & lookupType
    if (cnode) {
        rsp.code = '2.05';
        rsp.end('<coap://' + cnode.ip + ':' + cnode.port + '>;ep=' + cnode.clientName);
        shepherd.emit('ind', { type: 'lookup' });
    } else {
        rsp.code = '4.04';
        rsp.end(new Error("Device not found."));
    }

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
                shepherd._registry[cNames] = reNode;
                _.assign(reNode.so, ndata.so);
                reNode.status = 'offline';
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
            type: 'udp4',
            proxy: true
        });

        server.on('request', function (req, rsp) {
            rsp.code = '2.05';
            rsp.end('test');
        });

        server.listen(port, function (err) {
            if (err)
                deferred.reject(err);
            else
                deferred.resolve(server);
        });

        return deferred.promise;
    }
// client register
    testReqOdj.hostname = config.ip;
    testReqOdj.port = config.port;
    testReqOdj.pathname = '/rd';
    testReqOdj.query = 'ep=shepherdTest';
    testReqOdj.payload = '</1/0>';
    testReqOdj.method = 'POST';

    shepherd.request(testReqOdj).then(function (rsp) {
        if (rsp.code === '2.01') {
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
    }).then(function (msg) {
        if (msg.status === '2.05' && msg.data === 'test') {
// client deregister
            testReqOdj.method = 'DELETE'; 
            return shepherd.request(testReqOdj);
        } else {
            deferred.reject(new Error('read test error'));
        }
    }).then(function (rsp) {
        if (rsp.code === '2.02' && !shepherd.find('shepherdTest')) {
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
                    cn.ping().done(function (msg) {
                        if (msg.status === '2.05') {
                            cn._heartbeat = now;
                        } else {
                            if (cn._streamObservers['/heartbeat']) {
                                cn._streamObservers['/heartbeat'].close();
                                cn._streamObservers['/heartbeat'] = null;
                            }
                            cn.status = 'offline';
                            shepherd.emit('ind', { type: 'offline', data: cn.clientName });
                        }
                    }, function (err) {
                        if (cn._streamObservers['/heartbeat']) {
                            cn._streamObservers['/heartbeat'].close();
                            cn._streamObservers['/heartbeat'] = null;
                        }
                        cn.status = 'offline';
                        shepherd.emit('ind', { type: 'offline', data: cn.clientName });
                    });
                }
            });
        }, hbChkTime * 1000);
    }
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

module.exports = coapShepherd;

'use strict';

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Readable = require('stream').Readable,
    _ = require('lodash'),
    Q = require('q'),
    coap = require('coap');

var CoapNode = require('./coapnode.js'),
    cutils = require('./utils/cutils.js'),
    config = require('./config/config.js').server,
    coapdb = require('./coapdb.js');

function CoapShepherd() {
    this._registry = {};
    this._enabled = false;
    this._clientIdCount = 1;
    this._shepherdTest = false;
    this.server = null;
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
    }).then(function () {
        return _loadNodesFromDb(shepherd);
    }).done(function () {
        shepherd.emit('ready');
        console.log('>> coap-shepherd server start!');
        deferred.resolve();
    }, function (err) {
        shepherd.server = null;
        shepherd._enabled = false;
        deferred.reject(err);
    });

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
    var deferred = Q.defer();

    if (!reqObj.hostname || !reqObj.port || !reqObj.method) {
        deferred.reject(new Error('Bad reqObj.'));
        return deferred.promise.nodeify(callback);
    }

    if (!this._enabled) {
        deferred.reject(new Error('server does not enabled.'));
    } else {
        _coapRequest(reqObj).done(function (rsp) {
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

    _.forEach(this._registry, function (node, clientName) {
        reqObj.hostname = node.ip;
        reqObj.port = node.port;

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
        node = this._registry[clientName];

    node._registered = false;
    node.status = 'offline';
    node.dbRemove();
    node.so = null;
    node._cancelAll();
    node.disableLifeChecker();
    this._registry[node.clientName] = null;
    delete this._registry[node.clientName];

    this.emit('ind', { type: 'deregistered' });

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
        type: 'udp4',
        proxy: true
    });

    server.on('request', function (req, rsp) {
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
        agent = new coap.Agent({ type: 'udp4' }),
        req = agent.request(reqObj),
        reqChecker;

    req.on('response', function (rsp) {
        clearTimeout(reqChecker);
        if (rsp.headers && rsp.headers['Content-Format'] === 'application/json')
            rsp.payload = JSON.parse(rsp.payload);
        else
            rsp.payload = rsp.payload.toString();

        deferred.resolve(rsp);
    });

    req.on('error', function (err) {
        deferred.reject(err);
    });

    reqChecker = setTimeout(function () {
        var rsp = { code: '4.08' };
        // why req.sender.reset()? where is req.sender? why not req.reset()?-
        req.sender.reset();

        deferred.resolve(rsp);
    }, 30000);

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
        case 'notify':
            reqHdlr = _clientNotifyHandler;
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
        node = shepherd.find(devAttr.clientName);

    if (!node) {
        node = new CoapNode(shepherd, devAttr);
        shepherd._registry[devAttr.clientName] = node;
        node.status = 'online';
        node._registered = true;
        node.enableLifeChecker();

        rsp.code = '2.01';
        rsp.setOption('Location-Path', 'rd/' + node.clientId);
        rsp.end('');

        if (shepherd._shepherdTest) {
            node._readAllResource().then(function () {
                return node.dbSave();
            }).done(function () {
                shepherd.emit('ind', { type: 'registered', data: node });
            }, function (err) {
            // [TODO]
            });
        }
    } else {
        node._updateAttrs(devAttr).then(function (diff) {
            node.port = devAttr.port;
            node.status = 'online';
            node.enableLifeChecker();
            rsp.code = '2.01';  // 2.01 (Created) is not suitable for an existed node-
            rsp.setOption('Location-Path', 'rd/' + node.clientId);
            rsp.end('');
            return node._readAllResource();
        }).then(function () {
            return node.dbSave();
        }).done(function () {
            shepherd.emit('ind', { type: 'registered', data: node });
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

    if (cnode) {
        cnode._updateAttrs(devAttr).then(function (diffAttrs) {
            diff = diffAttrs;
            cnode.status = 'online';
            cnode.enableLifeChecker();

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

// TODO Notify Interface
function _clientNotifyHandler (shepherd, req, rsp) {
    var clientId = cutils.uriParser(req.url)[1],
        cnode = shepherd._findByClientId(clientId);
    
    if (cnode) {
        rsp.code = '2.04';
        rsp.end('');
        shepherd.emit('ind', { type: 'notify', data: req.payload });
    } else {
        rsp.code = '4.04';
        rsp.end(new Error("Not found device."));
    }
}

function _clientLookupHandler (shepherd, req, rsp) {
    var lookupType = cutils.uriParser(req.url)[1],
        clientName = cutils.getDevAttr(req).clientName,
        node = shepherd.find(clientName);

    if (node) {
        rsp.code = '2.05';
        rsp.end('<coap://' + node.ip + ':' + node.port + '>;ep=' + node.clientName);
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
                reNode.enableLifeChecker();
            });

            loadAllNodes.push(loadNode);
        });

        return Q.all(loadAllNodes);
    }).done(function () {
        deferred.resolve();
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
}

function _testShepherd (shepherd) {
    var deferred = Q.defer(),
        testReqOdj = {},
        serverPort = 5683,
        testNode;

    function testListener(port) {
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

    testReqOdj.hostname = '127.0.0.1';
    testReqOdj.port = serverPort;
    testReqOdj.pathname = '/rd';
    testReqOdj.query = 'ep=shepherdTest&lt=20000&lwm2m=1.0';
    testReqOdj.payload = '</1/0>';
    testReqOdj.method = 'POST';

    shepherd.request(testReqOdj).then(function (rsp) {  //register
        if (rsp.code === '2.01') {
            testReqOdj.pathname = rsp.headers['Location-Path'];
            testReqOdj.query = null;
            testReqOdj.payload = null;
            return testListener(rsp.outSocket.port);
        } else {
            deferred.reject(new Error('register test error'));
        }
    }).then(function () {
        testNode = shepherd.find('shepherdTest');
        return testNode.read('/');   
    }).then(function (msg) {
        if (msg.status === '2.05' && msg.data === 'test') {
            testReqOdj.method = 'DELETE'; 
            return shepherd.request(testReqOdj);        //deregister
        } else {
            deferred.reject(new Error('read test error'));
        }
    }).then(function (rsp) {
        if (rsp.code === '2.02' && !shepherd.find('shepherdTest')) {
            deferred.resolve();
        } else {
            deferred.reject(new Error('deregister test error'));
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done(function () {
        shepherd._shepherdTest = true;
    });

    return deferred.promise;
 }

function _clientReqParser (req) {
    var optType,
        lookupType;

    if (req.code === '0.00' && req._packet.confirmable && req.payload.length === 0)
        return 'empty';

    switch (req.method) {
        case 'POST':
            optType = (req.headers.Observe === 0) ? 'notify' : 'register' ;
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

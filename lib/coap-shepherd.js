'use strict';

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Readable = require('stream').Readable,
    _ = require('lodash'),
    Q = require('q'),
    coap = require('coap');

var CoapNode = require('./coapNode.js'),
    cutils = require('./utils/cutils.js'),
    config = require('./config/config.js').server;

function CoapShepherd() {
    this._registry = {};
    this._enabled = false;
    this._clientIdCount = 0;
    this.server = null;
}

util.inherits(CoapShepherd, EventEmitter);
// move the singleton to here-
var coapShepherd = new CoapShepherd();

CoapShepherd.prototype.start = function (callback) {
    var deferred = Q.defer(),
        shepherd = this;

    _coapServerStart(shepherd).then(function (server) {
        shepherd.server = server;
        shepherd._enabled = true;
        console.log('>> coap-shepherd testing');
        return _testShepherd(shepherd);
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

// why _findByClientId() is aynchronous?
CoapShepherd.prototype._findByClientId = function (id, callback) {
    var deferred = Q.defer(),
        node = _.find(this._registry, { clientId: id });

    // use _.find(), don't use _.forEach()
    // _.forEach() will iterate whole array, but _.find() will break immediately once he find the match

    // _.forEach(this._registry, function (dev) {
    //     if (dev.clientId === clientId) {
    //         node = dev;
    //     }
    // });

    if (node)
        deferred.resolve(node);
    else
        deferred.reject(new Error("Not found device."));

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.request = function (reqObj, callback) {
    var deferred = Q.defer();

    if (!this._enabled) {
        deferred.reject(new Error('server does not enabled.'));
    } else {
        _coapRequest(reqObj).done(function (res) {
            deferred.resolve(res);
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};
//TODO
CoapShepherd.prototype.announce = function (msg, callback) {
    var shepherd = this,
        deferred = Q.defer(),
        announceAllClient = [],
        reqObj = {
            hostname: null,
            port: null,
            method: 'POST'
        };

    _.forEach(this._registry, function (node, clientName) {
        reqObj.hostname = node.ip;
        reqObj.port = node.port;

        announceAllClient.push(shepherd.require(reqObj));
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
    node._so = null;
    node._cancelAll();
    node.disableLifeChecker();
    this._registry[node.clientName] = null;
    delete this._registry[node.clientName];

    this.emit('ind', { type: 'deregistered' });

    return deferred.promise.nodeify(callback);
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

// var coapShepherd = new CoapShepherd();-

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

    // server.on('request', _clientReqHandler(shepherd));
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
        // rs = new Readable(),
        reqChecker;

    req.on('response', function (res) {
        clearTimeout(reqChecker);
        if (res.headers && res.headers['Content-Format'] === 'application/json')
            res.payload = JSON.parse(res.payload);
        else
            res.payload = res.payload.toString();

        deferred.resolve(res);
    });

    req.on('error', function (err) {
        deferred.reject(err);
    });

    reqChecker = setTimeout(function () {
        // why req.sender.reset()? where is req.sender? why not req.reset()?-
        req.sender.reset();
        // I dont think reject an error for timeout is a good idea-
        // It would be good to let res.code = '4.08' (Timeout) for your users to get the status code -
        deferred.reject(new Error('No reply in 30s'));
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
            // _clientRegisterHandler(shepherd, req, res);
            break;
        case 'updata':
            reqHdlr = _clientRegisterHandler;
            // _clientUpdateHandler(shepherd, req, res);
            break;
        case 'deregister':
            reqHdlr = _clientRegisterHandler;
            // _clientDeregisterHandler(shepherd, req, res);
            break;
        case 'notify':
            reqHdlr = _clientRegisterHandler;
            // _clientNotifyHandler(shepherd, req, res);
            break;
        case 'lookup':
            reqHdlr = _clientRegisterHandler;
            // _clientLookupHandler(shepherd, req, res);
            break;
        case 'empty':
            res.reset();
            break;
        default:
            break;
    }

    if (reqHdlr)
        process.nextTick(function () {
            reqHdlr(shepherd, req, res);
        });
}

function _clientRegisterHandler (shepherd, req, res) {
    var devAttr = cutils.buildDevAttr(req),
        node = shepherd.find(devAttr.clientName);

    if (!node) {
        node = new CoapNode(shepherd, devAttr);
        shepherd._registry[devAttr.clientName] = node;
        shepherd._clientIdCount += 1;
        node.status = 'online';
        node._registered = true;
        node.enableLifeChecker();

        res.code = '2.01';
        res.setOption('Location-Path', 'rd/' + node.clientId);
        res.end('');
            
        node._readAllResource().done(function () {
            shepherd.emit('ind', { type: 'registered', data: node });
        }, function (err) {
            // [TODO]
        });
    } else {
        node._updateAttrs(devAttr).then(function (diff) {
            node.enableLifeChecker();
            res.code = '2.01';  // 2.01 (Created) is not suitable for an existed node-
            res.setOption('Location-Path', 'rd/' + node.clientId);
            res.end('');
            return node._readAllResource();
        }).done(function () {
            shepherd.emit('ind', { type: 'registered', data: node });
        }, function (err) {
            // [TODO]
        });
    }

}

function _clientUpdateHandler (shepherd, req, res) {
    var devAttr = cutils.buildDevAttr(req),
        clientId = cutils.uriParser(req.url)[1],
        node,   // node = shepherd._findByClientId(clientId), if _findByClientId() is synchronous
        diff;

    shepherd._findByClientId(clientId).then(function (dev) {
        node = dev;
        return node._updateAttrs(devAttr);
    }).then(function (diffAttrs) {
        diff = diffAttrs;
        node.enableLifeChecker();

        res.code = '2.04';
        res.end('');
        shepherd.emit('ind', { type: 'update', data: diff });

        // if diff has no 'objList', you dont have to _readAllResource() again
        return node._readAllResource();
    }).then(function () {
        // shepherd.emit('ind', { type: 'update', data: diff });
    }).fail(function (err) {
        res.code = '4.04';
        res.end(new Error("Device not found."));
    }).done();
}

function _clientDeregisterHandler (shepherd, req, res) {
    var clientId = cutils.uriParser(req.url)[1];
    
    shepherd._findByClientId(clientId).then(function (node) {
        node._registered = false;
        node.status = 'offline';
        node._so = null;
        node._cancelAllObservers();
        node.disableLifeChecker();
        shepherd._registry[node.clientName] = null;
        delete shepherd._registry[node.clientName];
        // you should decrease the count
        shepherd._clientIdCount -= 1;

        res.code = '2.02';
        res.end('');
        shepherd.emit('ind', { type: 'deregistered' });
    }, function (err) {
        res.code = '4.04';
        res.end(new Error("Device not found."));
    });
}

// TODO Notify Interface
function _clientNotifyHandler (shepherd, req, res) {
    var clientId = cutils.uriParser(req.url)[1];
    
    shepherd._findByClientId(clientId).then(function (node) {
        res.code = '2.04';
        res.end('');
        shepherd.emit('ind', { type: 'notify', data: req.payload });
    }, function (err) {
        res.code = '4.04';
        res.end(new Error("Not found device."));
    });
}

function _clientLookupHandler (shepherd, req, res) {
    var uri = cutils.uriParser(req.url),
        lookupType = uri[1],
        clientName = cutils.buildDevAttr(req).clientName,
        node = shepherd.find(clientName);

    if (node) {
        res.code = '2.05';
        res.end('<coap://' + node.ip + ':' + node.port + '>;ep=' + node.clientName);
        shepherd.emit('ind', { type: 'lookup' });
    } else {
        res.code = '4.04';
        res.end(new Error("Device not found."));
    }

}
/*********************************************************
 * Private function
 *********************************************************/
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

        server.on('request', function (req, res) {
            res.code = '2.05';
            res.end('test');
        });

        server.listen(port, function (err) {
            if (err)
                deferred.reject(err);
            else
                deferred.resolve(server);
        });

        return deferred.promise;
    }
//register
    testReqOdj.hostname = '127.0.0.1';
    testReqOdj.port = serverPort;
    testReqOdj.pathname = '/rd';
    testReqOdj.query = 'ep=shepherdTest&lt=20000&lwm2m=1.0';
    testReqOdj.payload = '</1/0>';
    testReqOdj.method = 'POST';

    shepherd.request(testReqOdj).then(function (res) {
        if (res.code === '2.01') {
//update
            testReqOdj.pathname = res.headers['Location-Path'];
            testReqOdj.query = 'lt=10000';
            testReqOdj.payload = null;
            testReqOdj.method = 'PUT';
            return testListener(res.outSocket.port);
        } else {
            deferred.reject(new Error('register test error'));
        }
    }).then(function () {
        return shepherd.request(testReqOdj);
    }).then(function (res) {
        if (res.code === '2.04') {
//read
            testNode = shepherd.find('shepherdTest');
            return testNode.read('/');
        } else {
            deferred.reject(new Error('update test error'));
        }
    }).then(function (msg) {
        if (msg.status === '2.05' && msg.data === 'test') {
//deregister
            testReqOdj.method = 'DELETE'; 
            return shepherd.request(testReqOdj);
        } else {
            deferred.reject(new Error('read test error'));
        }
    }).then(function (res) {
        if (res.code === '2.02' && !shepherd.find('shepherdTest')) {
            deferred.resolve();
        } else {
            deferred.reject(new Error('deregister test error'));
        }
    }).fail(function (err) {
        deferred.reject(err);
    });

    return deferred.promise;
 }

function _clientReqParser (req) {
    var optType;

    if (req.code === '0.00' && req._packet.confirmable && req.payload.length === 0)
        return 'empty';

    switch (req.method) {
        case 'POST':
            optType = req.headers.Observe ? 'register' : 'notify';
            break;
        case 'PUT':
            optType = 'updata';
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

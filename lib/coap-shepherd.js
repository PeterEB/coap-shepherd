'use strict'

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

    this._clientIdCount = 1;

    this.server = null;

}

util.inherits(CoapShepherd, EventEmitter);

CoapShepherd.prototype.start = function (callback) {
    var deferred = Q.defer(),
        shepherd = this;

    _coapServerStart(shepherd).then(function (server) {
        shepherd.server = server;
    }).done(function () {
        shepherd._enabled = true; 
        shepherd.emit('ready');
        console.log('coap-shepherd server start!');
        deferred.resolve();
    }, function (err) {
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

CoapShepherd.prototype.find = function (clientName, callback) {
    var deferred = Q.defer(),
        node = this._registry[clientName];

    if (node) {
        deferred.resolve(node);
    } else {
        deferred.reject(new Error("Not found device."));
    }

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype._findById = function (clientId, callback) {
    var deferred = Q.defer(),
        node;

    _.forEach(this._registry, function (dev) {
        if (dev.clientId === clientId) {
            node = dev;
        }
    });

    if (node) {
        deferred.resolve(node);
    } else {
        deferred.reject(new Error("Not found device."));
    }

    return deferred.promise.nodeify(callback);
};
//TODO
CoapShepherd.prototype.announce = function (msg, callback) {
    var deferred = Q.defer();



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

CoapShepherd.prototype.deregisterNode = function (clientName, callback) {
    var deferred = Q.defer(),
        node = this._registry[clientName];

    node._registered = false;
    node.status = 'offline';
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

var coapShepherd = new CoapShepherd();

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

    server.on('request', _clientReqHandler(shepherd));

    server.listen(config.port, function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(server);
        }
    });

    return deferred.promise.nodeify(callback);
}

function _coapRequest(reqObj, callback) {
    var deferred = Q.defer(),
        agent = new coap.Agent({type: 'udp4'}),
        req = agent.request(reqObj),
        rs = new Readable();

    req.on('response', function(res) {
        deferred.resolve(res);
    });

    req.on('error', function(err) {
        deferred.reject(err);
    });

    if (reqObj.payload) {
        rs.push(reqObj.payload);
        rs.push(null);
        rs.pipe(req);
    } else {
        req.end();
    }

    return deferred.promise.nodeify(callback);
}

/*********************************************************
 * Handler function
 *********************************************************/
function _clientReqHandler (shepherd) {
    return function (req, res) {
        var optType = _clientReqParser(req);

        switch (optType) {
            case 'register':
                _clientRegisterHandler(shepherd, req, res);
                break;
            case 'updata':
                _clientUpdateHandler(shepherd, req, res);
                break;
            case 'deregister':
                _clientDeregisterHandler(shepherd, req, res);
                break;
            case 'empty':
                res.reset();
                break;
            default:
                break;
        }
    };
}

function _clientRegisterHandler (shepherd, req, res) {
    var devAttr = cutils.getDevAttr(req),
        node = shepherd._registry[devAttr.clientName];

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

        shepherd.emit('ind', { type: 'registered', data: node });
    } else {
        req.isFromRegister = true;
        _clientUpdateHandler(shepherd, req, res);
    }

}

function _clientUpdateHandler (shepherd, req, res) {
    var devAttr = cutils.getDevAttr(req),
        clientId,
        node;

    if (req.isFromRegister === true) {
        node = shepherd._registry[devAttr.clientName];
        node._updateAttrs(devAttr).then(function (diff) {
            node.enableLifeChecker();

            res.code = '2.01';
            res.setOption('Location-Path', 'rd/' + node.clientId);
            res.end('');
            shepherd.emit('ind', { type: 'registered', data: node });
        });
        
    } else {
        clientId = cutils.uriParser(req.url)[1];
        shepherd._findById(clientId).then(function (dev) {
            node = dev;
            return node._updateAttrs(devAttr);  
        }).then(function (diff) {
            node.enableLifeChecker();
            res.code = '2.04';
            res.end('');
            shepherd.emit('ind', { type: 'update', data: diff });
        }).fail(function (err) {
            res.code = '4.04';
            res.end(new Error("Not found device."));
        });
    }

}

function _clientDeregisterHandler (shepherd, req, res) {
    var clientId = cutils.uriParser(req.url)[1];
    
    shepherd._findById(clientId).then(function (node) {
        node._registered = false;
        node.status = 'offline';
        node._cancelAll();
        node.disableLifeChecker();
        shepherd._registry[node.clientName] = null;
        delete shepherd._registry[node.clientName];

        res.code = '2.02';
        res.end('');
        shepherd.emit('ind', { type: 'deregistered' });
    }, function (err) {
        res.code = '4.04';
        res.end(new Error("Not found device."));
    });

}
//TODO
function _clientNotifyHandler (shepherd, req, res) {
    var clientId = cutils.uriParser(req.url)[1];
    
    shepherd._findById(clientId).then(function (node) {

        res.code = '2.04';
        res.end('');
        shepherd.emit('ind', { type: 'Notify' });
    }, function (err) {
        res.code = '4.04';
        res.end(new Error("Not found device."));
    });

}

/*********************************************************
 * Private function
 *********************************************************/
function _clientReqParser (req) {
    var optType;

    if (req.code === '0.00' && req._packet.confirmable && req.payload.length === 0) {
        optType = 'empty';
    } else {
        switch (req.method) {
            case 'POST':
                optType = 'register';
                break;
            case 'PUT':
                optType = 'updata';
                break;
            case 'DELETE':
                optType = 'deregister';
                break;
            default:
                break;  
        }
    }
    return optType;
}

module.exports = coapShepherd;

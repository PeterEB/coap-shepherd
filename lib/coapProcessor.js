'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Readable = require('stream').Readable,
    Q = require('q'),
    coap = require('coap');

function CoapP () {}

util.inherits(CoapP, EventEmitter);

CoapP.prototype.start = function (config, callback) {
    var deferred = Q.defer(),
        server;

    server = coap.createServer({
        type: 'udp4',
        proxy: true
    });

    this.server = server;

    server.on('request', reqHandler(config));

    server.listen(config.port, function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(server);
        }
    });

    return deferred.promise.nodeify(callback);
};

CoapP.prototype.stop = function (callback) {
    var deferred = Q.defer();

    if (this.server) {
        this.server.close(function () {
            deferred.resolve();
        });
    } else {
        deferred.reject(new Error('server does not exist.'));
    }

    return deferred.promise.nodeify(callback);
};

CoapP.prototype.request = function (request, callback) {
    var deferred = Q.defer(),
        agent = new coap.Agent({type: 'udp4'}),
        req = agent.request(request),
        sr = new Readable();

    req.on('response', function(res) {
        deferred.resolve(res);
    });

    req.on('error', function(err) {
        deferred.reject(err);
    });

    if (request.payload) {
        sr.push(request.payload);
        sr.push(null);
        sr.pipe(req);
    } else {
        req.end();
    }

    return deferred.promise.nodeify(callback);
};

var coapP = new CoapP();

/*********************************************************
 * Handler function
 *********************************************************/
function reqHandler (config) {
    return function(req, res) {
        var optType = reqParser(req, config),
            data = {
                req: req,
                res: res
            };

        switch (optType) {
            case 'register':
                data.type = 'register';
                coapP.emit('ind', data);
                break;
            case 'updata':
                data.type = 'updata';
                coapP.emit('ind', data);
                break;
            case 'unregister':
                data.type = 'unregister';
                coapP.emit('ind', data);
                break;
            case 'empty':
                res.reset();
                break;
            default:
                break;
        }
        
    };
}

/*********************************************************
 * Private function
 *********************************************************/
function reqParser (req, config) {
    var optType;

    if (req.code === '0.00' && req._packet.confirmable && req.payload.length === 0) {
        optType = 'empty';
    } else if (config.device === 'server') {
        switch (req.method) {
            case 'POST':
                optType = 'register';
                break;
            case 'PUT':
                optType = 'updata';
                break;
            case 'DELETE':
                optType = 'unregister';
                break;
            default:
                break;  
        }
    } else if (config.device === 'client') {
        switch (req.method) {
            case 'GET':
                optType = 'read';
                break;
            case 'POST':
                optType = 'execute';
                break;
            case 'PUT':
                optType = 'write';
                break;
            case 'DELETE':
                optType = 'delete';
                break;
            default:
                break;  
        }
    }

    return optType;
}

module.exports = coapP;

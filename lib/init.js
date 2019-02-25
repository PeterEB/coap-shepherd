'use strict';

var Q = require('q'),
    _ = require('busyman'),
    coap = require('coap'),
    network = require('network'),
    debug = require('debug')('coap-shepherd:init');

var reqHandler = require('./components/reqHandler'),
    CoapNode = require('./components/coap-node'),
    cutils = require('./components/cutils'),
    CNST = require('./components/constants');

/**** Code Enumerations ****/
var RSP = CNST.RSP;

var init = {};

init.setupShepherd = function (shepherd, callback) {
    var deferred = Q.defer(),
        self = this;

    debug('coap-shepherd booting...');

    coap.registerFormat('application/tlv', 11542);      // Leshan TLV binary Content-Formats
    coap.registerFormat('application/json', 11543);     // Leshan JSON Numeric Content-Formats

    coap.updateTiming({                  
        ackTimeout:0.25,
        ackRandomFactor: 1.0,
        maxRetransmit: 3,
        maxLatency: 2,
    });
                
    this._coapServerStart(shepherd).then(function (server) {
        debug('Create a coap server for shepherd.');
        shepherd._enabled = true;
        shepherd._server = server;
        return self._testRequestServer(shepherd);
    }).then(function () {
        debug('Coap server testing done.');
        return self._loadNodesFromDb(shepherd);
    }).then(function () {
        debug('Loading cnodes from database done.');
        return self._updateNetInfo(shepherd);
    }).then(function () {
        debug('coap-shepherd is up and ready.');
        deferred.resolve();
    }).fail(function (err) {
        debug(err);
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

/*********************************************************
 * Private function                                      *
 *********************************************************/
init._coapServerStart = function (shepherd, callback) {
    var deferred = Q.defer(),
        server = coap.createServer({
            type: shepherd._config.connectionType
        });

    server.on('request', function (req, rsp) {
        if (!_.isEmpty(req.payload)) 
            req.payload = req.payload.toString();

        reqHandler(shepherd, req, rsp);
    });

    server.listen(shepherd._net.port, function (err) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(server);
    });

    if (shepherd._config.connectionType === 'udp6') {
        coap.globalAgentIPv6 = new coap.Agent({
            type: shepherd._config.connectionType,
            socket: server._sock
        });

        shepherd._agent = coap.globalAgentIPv6;
    } else {
        coap.globalAgent = new coap.Agent({
            type: shepherd._config.connectionType,
            socket: server._sock
        });
        
        shepherd._agent = coap.globalAgent;
    }
    
    
    return deferred.promise.nodeify(callback);
};

init._testRequestServer = function (shepherd) {
    var deferred = Q.defer(),
        reqOdj = {
            hostname: shepherd._net.ip,
            port: shepherd._net.port,
            pathname: '/test',
            method: 'GET'
        };

    debug('Coap server testing start.');
    shepherd.request(reqOdj).then(function (rsp) {
        debug('Coap server testing request done.');
        if (rsp.code === RSP.content && rsp.payload === '_test') { 
            reqOdj = null;
            deferred.resolve();
        } else {
            deferred.reject(new Error('shepherd client test error'));
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

init._loadNodesFromDb = function (shepherd, callback) {
    var deferred = Q.defer(),
        loadAllNodes = [];

    shepherd._coapdb.exportClientNames().then(function (cNames) {
        _.forEach(cNames, function (cName) {
            var reNode,
                loadNode;

            loadNode = shepherd._coapdb.findByClientName(cName).then(function (ndata) {
                reNode = new CoapNode(shepherd, ndata);
                shepherd._registry[cName] = reNode;
                assignSo(reNode.so, ndata.so);
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
};

init._updateNetInfo = function (shepherd, callback) {
    var deferred = Q.defer();

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

/*********************************************************
 * Private function                                      *
 *********************************************************/
function assignSo(so, soData) {
    _.forEach(soData, function (obj, oid) {
        _.forEach(obj, function (iObj, iid) {
            so.init(oid, iid, iObj);
        });
    });
}

 module.exports = init;

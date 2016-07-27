'use strict';

var Q = require('q'),
    _ = require('busyman'),
    coap = require('coap');

var reqHandler = require('./components/reqHandler'),
    CoapNode = require('./components/coap-node'),
    config = require('./config');

/**** Code Enumerations ****/
var RSP = { ok: '2.00', created: '2.01', deleted: '2.02', changed: '2.04', content: '2.05', badreq: '4.00',
            unauth: '4.01', forbid: '4.03', notfound: '4.04', notallowed: '4.05', timeout: '4.08',  dberror: '5.00' };

var init = {};

init.setupShepherd = function (shepherd, callback) {
    var deferred = Q.defer(),
        self = this;

    this._coapServerStart(shepherd).then(function (server) {
        shepherd._enabled = true;
        shepherd._server = server;
        return self._testRequestServer(shepherd);
    }).then(function () {
        return self._loadNodesFromDb(shepherd);
    }).then(function () {
        return shepherd.updateNetInfo();
    }).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

/*********************************************************
 * Private function                                      *
 *********************************************************/
init._testRequestServer = function (shepherd) {
    var deferred = Q.defer(),
        testReqOdj = {};

    function testClientListener(port) {
        var deferred = Q.defer(),
            server;

        server = coap.createServer({
            type: config.connectionType
        });

        server.on('request', function (req, rsp) {
            rsp.code = RSP.content;
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

    testReqOdj.hostname = shepherd._net.ip;
    testReqOdj.port = shepherd._net.port;
    testReqOdj.pathname = '/rd-lookup/ep';
    testReqOdj.query = 'ep=shepherdTest';
    testReqOdj.method = 'GET';

    shepherd.request(testReqOdj).then(function (rsp) {
        if (rsp.code === RSP.notfound) {
            testReqOdj.port = rsp.outSocket.port;
            testReqOdj.query = null;
            testReqOdj.payload = null;
            return testClientListener(rsp.outSocket.port);
        } else {
            deferred.reject(new Error('shepherd server test error'));
        }
    }).then(function () {
        return shepherd.request(testReqOdj);
    }).then(function (rsp) {
        if (rsp.code === RSP.content && rsp.payload === '_test') { 
            testReqOdj = null;
            deferred.resolve();
        } else {
            deferred.reject(new Error('shepherd client test error'));
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

init._coapServerStart = function (shepherd, callback) {
    var deferred = Q.defer(),
        server;

    server = coap.createServer({
        type: config.connectionType
    });

    server.on('request', function (req, rsp) {
        if (!_.isEmpty(req.payload) && req.headers['Content-Format'] === 'application/json') {
            req.payload = JSON.parse(req.payload);
        } else if (!_.isEmpty(req.payload)) {
            req.payload = req.payload.toString();
            
            if (!_.isNaN(Number(req.payload)))
                req.payload = Number(req.payload);
        }

        reqHandler(shepherd, req, rsp);
    });

    server.listen(shepherd._net.port, function (err) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(server);
    });

    return deferred.promise.nodeify(callback);
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

'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

var coapP = require('./coapProcessor.js'),
    cutils = require('./utils/cutils.js');

function InfoReporting () {}

util.inherits(InfoReporting, EventEmitter);

InfoReporting.prototype.observe = function (ip, port, path, callback) {
    var deferred = Q.defer(),
        request = {};

    request.hostname = ip;
    request.port = 5683;
    request.pathname = path;
    request.method = 'GET';
    request.observe = true;
    request.proxyUri = 'coap://' + ip + ':' + port;

    coapP.request(request).then(function (res) {
        if (res.code === '2.05') {
            deferred.resolve(res);
        } else if (res.code === '4.04') {
            deferred.reject(new Error(path + ' not found.'));
        } else {
            deferred.reject(new Error('ClientError ' + res.code));
        }
    }, function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

var infoReporting = new InfoReporting();

module.exports = infoReporting;

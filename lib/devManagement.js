'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

var coapP = require('./coapProcessor.js'),
    devRegistry = require('./devRegistry.js'),
    cutils = require('./utils/cutils.js');

function DevManagement () {}

util.inherits(DevManagement, EventEmitter);

DevManagement.prototype.read = function (ip, port, path, callback) {
	var deferred = Q.defer(),
        request = {};

	request.hostname = ip;
	request.port = 5683;
	request.pathname = path;
	request.method = 'GET';
    request.proxyUri = 'coap://' + ip + ':' + port;

    coapP.request(request).then(function (res) {
        if (res.code === '2.05') {
            deferred.resolve(res);
        } else if (res.code === '4.04') {
            deferred.reject(new Error(path + ' not found.'));
        } else {
            deferred.reject(new Error('client error ' + res.code));
        }
    }, function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

DevManagement.prototype.write = function (ip, port, path, value, callback) {
	var deferred = Q.defer(),
        request = {};

	request.hostname = ip;
	request.port = 5683;
	request.pathname = path;
	request.method = 'PUT';
	request.payload = value;
    request.proxyUri = 'coap://' + ip + ':' + port;

    coapP.request(request).then(function (res) {
        if (res.code === '2.04') {
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

DevManagement.prototype.execute = function (ip, port, path, callback) {
    var deferred = Q.defer(),
    request = {};

    request.hostname = ip;
    request.port = 5683;
    request.pathname = path;
    request.method = 'POST';
    request.proxyUri = 'coap://' + ip + ':' + port;

    coapP.request(request).then(function (res) {
        if (res.code === '2.04') {
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

DevManagement.prototype.dicover = function (ip, port, path, callback) {
    var deferred = Q.defer(),
        request = {};

    request.hostname = ip;
    request.port = 5683;
    request.pathname = path;
    request.method = 'GET';
    request.proxyUri = 'coap://' + ip + ':' + port;
    request.options = {
        'Accept': 'application/link-format'
    };

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

DevManagement.prototype.writeAttr = function (ip, port, path, attr, callback) {
    var deferred = Q.defer(),
        request = {};

    request.hostname = ip;
    request.port = 5683;
    request.pathname = path;
    request.method = 'PUT';
    request.proxyUri = 'coap://' + ip + ':' + port;

    coapP.request(request).then(function (res) {
        if (res.code === '2.04') {
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

var devManagement = new DevManagement();

module.exports = devManagement;


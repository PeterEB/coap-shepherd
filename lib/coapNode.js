'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

var devManagement = require('./devManagement.js'),
    infoReporting = require('./infoReporting'),
    cutils = require('./utils/cutils.js');

function CoapNode (id, deviceInfo) {

	this.id = id;

	this.clientName = deviceInfo.clientName;
	this.lifeTime = deviceInfo.lifeTime || 86400;
	this.lwm2m = deviceInfo.lwm2m || 'unknown';

	this.ip = deviceInfo.ip || 'unknown';
    this.port = deviceInfo.port || 'unknown';

    this.startTime = Math.round(new Date().getTime()/1000);
    this.status = 'online';

	this.objList = deviceInfo.objList;
    this.so = null;

    this.observeList = {};
}

CoapNode.prototype.read = function (path, callback) {
    var self = this,
        deferred = Q.defer(),
        soPath;

    if (!_.isString(path))
        throw new Error('path should be a string.');

    soPath = cutils.getSoUri(path);

    devManagement.read(this.ip, this.port, soPath).then(function (res) {
        console.log('read value from device ' + self.clientName + ' ' + soPath + ': ' + res.payload.toString());
        deferred.resolve(res.payload.toString());
    }, function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.write = function (path, value, callback) {
    var self = this,
        deferred = Q.defer(),
        pathParams,
        soPath;

    if (!_.isString(path))
        throw new Error('path should be a string.');

    pathParams = cutils.uriParser(path);
    if (!pathParams[1] || !pathParams[2])
        throw new Error('path should contain Object ID, Object Instance ID and Resource ID.');

    if (!_.isString(value)) {
        value = value.toString();
    }

    soPath = cutils.getSoUri(path);

    devManagement.write(this.ip, this.port, soPath, value).then(function (res) {
        console.log('write value ' + value + ' on device ' + self.clientName + ' ' + soPath);
        deferred.resolve();
    }, function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.execute = function (path, callback) {
    var self = this,
        deferred = Q.defer(),
        pathParams,
        soPath;

    if (!_.isString(path))
        throw new Error('path should be a string.');

    pathParams = cutils.uriParser(path);
    if (!pathParams[1] || !pathParams[2])
        throw new Error('path should contain Object ID, Object Instance ID and Resource ID.');

    soPath = cutils.getSoUri(path);

    devManagement.execute(this.ip, this.port, soPath).then(function (res) {
        console.log('execute device ' + self.clientName + ' ' + soPath + ': ' + res.payload.toString());
        deferred.resolve(res.payload.toString());
    }, function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.dicover = function (path, callback) {
    var self = this,
        deferred = Q.defer(),
        soPath;

    if (!_.isString(path))
        throw new Error('path should be a string.');

    soPath = cutils.getSoUri(path);

    devManagement.dicover(this.ip, this.port, soPath).then(function (res) {
        console.log('dicover device ' + self.clientName + ' ' + soPath + ': ' + res.payload.toString());
        deferred.resolve(res.payload.toString());
    }, function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.writeAttr = function (path, attr, callback) {
    var self = this,
        deferred = Q.defer(),
        soPath;

    if (!_.isString(path))
        throw new Error('path should be a string.');

    soPath = cutils.getSoUri(path);

    devManagement.writeAttr(this.ip, this.port, attr, soPath).then(function (res) {
        console.log('write Attributes on device ' + self.clientName + ' ' + soPath);
        deferred.resolve();
    }, function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

//Unnecessary
CoapNode.prototype.create = function (path, callback) {
    var self = this,
        deferred = Q.defer(),
        soPath;

    if (!_.isString(path))
        throw new Error('path should be a string.');

    soPath = cutils.getSoUri(path);

    return deferred.promise.nodeify(callback);
};

//Unnecessary
CoapNode.prototype.delete = function (path, callback) {
    var self = this,
        deferred = Q.defer(),
        soPath;

    if (!_.isString(path))
        throw new Error('path should be a string.');

    soPath = cutils.getSoUri(path);

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.observe = function (path, callback) {
    var self = this,
        deferred = Q.defer(),
        pathParams,
        soPath;

    if (!_.isString(path))
        throw new Error('path should be a string.');

    pathParams = cutils.uriParser(path);
    if (!pathParams[1] || !pathParams[2])
        throw new Error('path should contain Object ID, Object Instance ID and Resource ID.');

    soPath = cutils.getSoUri(path);

    if (this.observeList[soPath]) {
        this.cancel(soPath);
    }

    infoReporting.observe(this.ip, this.port, soPath).then(function (observeReadStream) {
        console.log('observe ' + soPath + ' on device ' + self.clientName);
        self.observeList[soPath] = observeReadStream;
        observeReadStream.on('data', notifyHandler(soPath));
        observeReadStream.on('finish', function () { self.cancel(soPath); });
        deferred.resolve();
    }, function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.cancel = function (path, callback) {
    var deferred = Q.defer(),
        soPath;

    if (!_.isString(path))
        throw new Error('path should be a string.');

    soPath = cutils.getSoUri(path);

    if (this.observeList[soPath]) {
        this.observeList[soPath].close();
        delete this.observeList[soPath];
        console.log('cancel observe ' + soPath + ' on device ' + this.clientName);
        deferred.resolve();
    } else {
        deferred.reject(new Error('device ' + this.clientName + ' not observe ' + soPath));
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.cancelAll = function (callback) {
    var self = this,
        deferred = Q.defer();

    _.forEach(this.observeList, function (observeReadStream, soPath) {
        observeReadStream.close();
        delete self.observeList[soPath];
    });

    console.log('cancel all observe on device ' + this.clientName);

    deferred.resolve();

    return deferred.promise.nodeify(callback);
};
/*********************************************************
 * Handler function
 *********************************************************/
function notifyHandler (soPath) {
    return function (value) {
        console.log(value.toString());
    };
}

module.exports = CoapNode;

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

    this._so = {};
    this._observeList = {};
}

CoapNode.prototype.read = function (path, callback) {
    var self = this,
        deferred = Q.defer(),
        soPath;

    if (!_.isString(path))
        throw new Error('path should be a string.');

    soPath = cutils.getSoUri(path);

    devManagement.read(this.ip, this.port, soPath.value).then(function (res) {
        deferred.resolve({type: 'read', device: self.clientName, path: soPath.key, status: res.code, data: res.payload.toString()});
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

    devManagement.write(this.ip, this.port, soPath.value, value).then(function (res) {
        deferred.resolve({type: 'write', device: self.clientName, path: soPath.key, status: res.code, data: value});
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

    devManagement.execute(this.ip, this.port, soPath.value).then(function (res) {
        deferred.resolve({type: 'execute', device: self.clientName, path: soPath.key, status: res.code, data: res.payload.toString()});
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

    devManagement.dicover(this.ip, this.port, soPath.value).then(function (res) {
        deferred.resolve({type: 'dicover', device: self.clientName, path: soPath.key, status: res.code, data: res.payload.toString()});
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

    if (!_.isObject(attr))
        throw new Error('attr should be a object.');

    soPath = cutils.getSoUri(path);

    devManagement.writeAttr(this.ip, this.port, soPath.value, attr).then(function (res) {
        deferred.resolve({type: 'writeAttr', device: self.clientName, path: soPath.key, status: res.code});
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

    if (this._observeList[soPath.key]) {
        this.cancel(soPath.key);
    }

    infoReporting.observe(this.ip, this.port, soPath.value).then(function (observeReadStream) {
        self._observeList[soPath.key] = observeReadStream;
        observeReadStream.on('data', notifyHandler(soPath.key, self.clientName));
        observeReadStream.on('finish', function () { self.cancel(soPath.key); });
        deferred.resolve({type: 'observe', device: self.clientName, path: soPath.key, status: observeReadStream.code});
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

    if (this._observeList[soPath.key]) {
        this._observeList[soPath.key].close();
        delete this._observeList[soPath.key];
        deferred.resolve({type: 'cancel', device: this.clientName, path: soPath.key});
    } else {
        deferred.reject(new Error('device ' + this.clientName + ' not observe ' + soPath.key));
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.cancelAll = function (callback) {
    var self = this,
        deferred = Q.defer();

    _.forEach(this._observeList, function (observeReadStream, path) {
        observeReadStream.close();
        delete self._observeList[path];
    });

    deferred.resolve({device: this.clientName});

    return deferred.promise.nodeify(callback);
};
/*********************************************************
 * Handler function
 *********************************************************/
function notifyHandler (path, device) {
    return function (value) {
        var soParams = cutils.uriParser(path);

        console.log({type: 'notify', device: device, path: path, data: value.toString()});
    };
}

module.exports = CoapNode;

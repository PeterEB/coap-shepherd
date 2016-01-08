'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

function DevRegistry () {

    this.registry = {};

    this.idCount = 1;

}

util.inherits(DevRegistry, EventEmitter);

DevRegistry.prototype.register = function (deviceInfo, callback) {
    var deferred = Q.defer(),
        self = this,
        id = this.idCount;

    this.getByName(deviceInfo.name).then(function (result) {

        self.unregister(result.id).then(function () {
            self.registry[id] = deviceInfo;
            self.registry[id].id = id;
            self.idCount += 1;
            deferred.resolve(self.registry[id]);
        }, function (err) {
            deferred.reject(err);
        }).done();

    }, function (err) {

        self.registry[id] = deviceInfo;
        self.registry[id].id = id;
        self.idCount += 1;
        deferred.resolve(self.registry[id]);

    }).done();

    return deferred.promise.nodeify(callback);
};

DevRegistry.prototype.update = function (id, deviceInfo, callback) {
    var deferred = Q.defer(),
        device = this.registry[id];

    if (device) {
        device.ip = deviceInfo.ip;
        device.port = deviceInfo.port;
        device.startTime = deviceInfo.startTime;
        device.status = deviceInfo.status;
        device.lifeTime = deviceInfo.lifeTime || device.lifeTime;
        device.sms = deviceInfo.sms || device.sms;
        device.objList = deviceInfo.objList || device.objList;
        deferred.resolve(device);
    } else {
        deferred.reject(new Error("Can't find device."));
    }

    return deferred.promise.nodeify(callback);
};

DevRegistry.prototype.unregister = function (id, callback) {
    var deferred = Q.defer(),
        device = this.registry[id];

    if (device) {
        delete this.registry[id];
        deferred.resolve(device);
    } else {
        deferred.reject(new Error("Can't find device."));
    }

    return deferred.promise.nodeify(callback);
};

DevRegistry.prototype.getByName = function (name, callback) {
    var deferred = Q.defer(),
        device;

    _.forEach(this.registry, function (deviceData) {
        if (deviceData.name === name) {
            device = deviceData;
        }
    });

    if (device) {
        deferred.resolve(device);
    } else {
        deferred.reject(new Error("Can't find device."));
    }

    return deferred.promise.nodeify(callback);
};

DevRegistry.prototype.startLifeTimeCheck = function () {
    this._lifeTimer = setTimeout(checkLifeTime, 1000);
};

DevRegistry.prototype.stopLifeTimeCheck = function () {
    clearTimeout(this._lifeTimer);
};

var devRegistry = new DevRegistry();

/*********************************************************
 * Private function
 *********************************************************/
function checkLifeTime() {
    var now;

    _.forEach(devRegistry.registry, function (device) {
        now = Math.round(new Date().getTime()/1000);
        if( device.status === 'online' && now - device.startTime > device.lifeTime ) {
            device.status = 'offline';
            devRegistry.emit('msg', {type: 'lifeTimeOut', data: device});
        }
    });

    devRegistry._lifeTimer = setTimeout(checkLifeTime, 1000);
}

module.exports = devRegistry;

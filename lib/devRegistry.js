'use strict'

var Q = require('q'),
    _ = require('lodash');

function DevRegistry () {

    this.registry = {};

    this.idCount = 1;

}

DevRegistry.prototype.register = function (device, callback) {
    var deferred = Q.defer(),
        self = this,
        id = this.idCount;

    this.getByName(device.name).then(function (result) {

        self.unreister(result.id).then(function () {
            self.registry[id] = device;
            self.registry[id].id = id;
            self.idCount += 1;
            deferred.resolve(id);
        }, function (err) {
            deferred.reject(err);
        });

    }, function (err) {

        self.registry[id] = device;
        self.registry[id].id = id;
        self.idCount += 1;
        deferred.resolve(id);

    }).done();

    return deferred.promise.nodeify(callback);
};

DevRegistry.prototype.updata = function (id, device, callback) {
    var deferred = Q.defer();

    

    return deferred.promise.nodeify(callback);
};

DevRegistry.prototype.unreister = function (id, callback) {
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

var devRegistry = new DevRegistry();

module.exports = devRegistry;

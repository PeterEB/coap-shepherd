'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

var CoapNode = require('./coapNode.js');

function DevRegistry () {

    this.registry = {};

    this.idCount = 1;

}

util.inherits(DevRegistry, EventEmitter);

DevRegistry.prototype.getByName = function (name, callback) {
    var deferred = Q.defer(),
        node;

    _.forEach(this.registry, function (deviceData) {
        if (deviceData.clientName === name) {
            node = deviceData;
        }
    });

    if (node) {
        deferred.resolve(node);
    } else {
        deferred.reject(new Error("Can't find device."));
    }

    return deferred.promise.nodeify(callback);
};

/*********************************************************
 *         function
 *********************************************************/
DevRegistry.prototype.register = function (deviceInfo, callback) {
    var deferred = Q.defer(),
        self = this,
        id = this.idCount,
        node;

    this.getByName(deviceInfo.clientName).then(function (result) {

        self.unregister(result.id).then(function () {
            node = new CoapNode(id, deviceInfo);

            self.registry[id] = node;
            self.idCount += 1;

            self.emit('ind', {type: 'registered', data: node});
            deferred.resolve(self.registry[id]);
        }, function (err) {
            deferred.reject(err);
        }).done();

    }, function (err) {
        node = new CoapNode(id, deviceInfo);

        self.registry[id] = node;
        self.idCount += 1;

        self.emit('ind', {type: 'registered', data: node});
        deferred.resolve(self.registry[id]);
    }).done();

    return deferred.promise.nodeify(callback);
};

DevRegistry.prototype.update = function (id, deviceInfo, callback) {
    var deferred = Q.defer(),
        node = this.registry[id];

    if (node) {
        node.ip = deviceInfo.ip;
        node.port = deviceInfo.port;
        node.lifeTime = deviceInfo.lifeTime || node.lifeTime;
        node.objList = deviceInfo.objList || node.objList;
        node.startTime = Math.round(new Date().getTime()/1000);
        node.status = 'online';

        this.emit('ind', {type: 'updated', data: node});
        deferred.resolve(node);
    } else {
        deferred.reject(new Error("Can't find device."));
    }

    return deferred.promise.nodeify(callback);
};

DevRegistry.prototype.unregister = function (id, callback) {
    var deferred = Q.defer(),
        self = this,
        node = this.registry[id];

    if (node) {
        node.cancelAll().then(function () {
            delete self.registry[id];
            self.emit('ind', {type: 'unregistered', data: node.clientName});
            deferred.resolve(node.clientName); 
        }, function (err) {
            deferred.reject(err);
        }).done();
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

    _.forEach(devRegistry.registry, function (node) {
        now = Math.round(new Date().getTime()/1000);
        if( node.status === 'online' && now - node.startTime > node.lifeTime ) {
            node.status = 'offline';
            devRegistry.emit('ind', {type: 'lifeTimeOut', data: node});
        }
    });

    devRegistry._lifeTimer = setTimeout(checkLifeTime, 1000);
}

module.exports = devRegistry;

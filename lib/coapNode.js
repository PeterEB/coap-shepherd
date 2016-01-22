'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

var cutils = require('./utils/cutils.js');

function CoapNode (shepherd, devAttr) {

    this.clientId = shepherd._clientIdCount;

    this.clientName = devAttr.clientName;
    this.lifeTime = devAttr.lifeTime || 86400;
    this.lwm2m = devAttr.version || 'unknown';

    this.ip = devAttr.ip || 'unknown';
    this.port = devAttr.port || 'unknown';

    this.startTime = Math.round(new Date().getTime()/1000);
    this.status = 'offline';

    this.objList = devAttr.objList;

    this._registered = false;
    this._so = {};
    this._observeList = {};
}

CoapNode.prototype.read = function (path, callback) {
    var deferred = Q.defer();



    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.write = function (path, value, callback) {
    var deferred = Q.defer();



    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.execute = function (path, callback) {
    var deferred = Q.defer();



    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.dicover = function (path, callback) {
    var deferred = Q.defer();



    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.writeAttr = function (path, attr, callback) {
    var deferred = Q.defer();



    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.observe = function (path, callback) {
    var deferred = Q.defer();



    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._cancelAll = function (path, callback) {
    var deferred = Q.defer();



    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.updateAttrs = function (attrs, callback) {
    var deferred = Q.defer();



    return deferred.promise.nodeify(callback);
};

module.exports = CoapNode;

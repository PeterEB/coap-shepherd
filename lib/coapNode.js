'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

var cutils = require('./utils/cutils.js');

function CoapNode (shepherd, devAttr) {

    this.shepherd = shepherd;

    this.clientId = shepherd._clientIdCount.toString();

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

    this.lifeChecker = null;
}

CoapNode.prototype.enableLifeChecker = function () {
    var self = this;

    if (this.lifeChecker)
        clearTimeout(this.lifeChecker);

    this.lifeChecker = setTimeout(function () {
        self.shepherd.deregisterNode(self.clientName);
    }, this.lifetime * 1000);

    return this;
};

CoapNode.prototype.disableLifeChecker = function () {
    if (this.lifeChecker) {
        clearTimeout(this.lifeChecker);
        this.lifeChecker = null;
    }

    return this;
};

CoapNode.prototype.read = function (path, callback) {
    var deferred = Q.defer(),
        reqObj = {};

    if (!_.isString(path))
        throw new TypeError('path should be a string.');

    reqObj.hostname = this.ip;
    reqObj.port = this.port;
    reqObj.pathname = path;
    reqObj.method = 'GET';

    this.shepherd.request(reqObj).then(function (res) {
        if (res.code === '2.05') {
            deferred.resolve({status: res.code, data: res.payload.toString()});
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

CoapNode.prototype.write = function (path, value, callback) {
    var deferred = Q.defer(),
        pathParams,
        reqObj = {};

    if (!_.isString(path))
        throw new TypeError('path should be a string.');

    pathParams = cutils.uriParser(path);
    if (!pathParams[1] || !pathParams[2])
        throw new Error('path should contain Object ID, Object Instance ID and Resource ID.');

    if (!_.isString(value)) {
        value = value.toString();
    }

    reqObj.hostname = this.ip;
    reqObj.port = this.port;
    reqObj.pathname = path;
    reqObj.method = 'PUT';
    reqObj.payload = value;

    this.shepherd.request(reqObj).then(function (res) {
        if (res.code === '2.04') {
            deferred.resolve({status: res.code, data: value});
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

CoapNode.prototype.execute = function (path, callback) {
    var deferred = Q.defer(),
        pathParams,
        reqObj = {};

    if (!_.isString(path))
        throw new TypeError('path should be a string.');

    pathParams = cutils.uriParser(path);
    if (!pathParams[1] || !pathParams[2])
        throw new Error('path should contain Object ID, Object Instance ID and Resource ID.');

    reqObj.hostname = this.ip;
    reqObj.port = this.port;
    reqObj.pathname = path;
    reqObj.method = 'POST';

    this.shepherd.request(reqObj).then(function (res) {
        if (res.code === '2.04') {
            deferred.resolve({status: res.code, data: res.payload.toString()});
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

CoapNode.prototype.dicover = function (path, callback) {
    var deferred = Q.defer(),
        reqObj = {};

    if (!_.isString(path))
        throw new TypeError('path should be a string.');

    reqObj.hostname = this.ip;
    reqObj.port = this.port;
    reqObj.pathname = path;
    reqObj.method = 'GET';
    reqObj.options = {
        'Accept': 'application/link-format'
    };

    this.shepherd.request(reqObj).then(function (res) {
        if (res.code === '2.05') {
            deferred.resolve({status: res.code, data: res.payload.toString()});
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

CoapNode.prototype.writeAttr = function (path, attr, callback) {
    var deferred = Q.defer(),
        reqObj = {};

    if (!_.isString(path))
        throw new TypeError('path should be a string.');

    if (!_.isObject(attr))
        throw new TypeError('attr should be a object.');

    reqObj.hostname = this.ip;
    reqObj.port = this.port;
    reqObj.pathname = path;
    reqObj.method = 'PUT';
    reqObj.query = getAttrQuery(attr);

    this.shepherd.request(reqObj).then(function (res) {
        if (res.code === '2.04') {
            deferred.resolve({status: res.code});
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

CoapNode.prototype.observe = function (path, callback) {
    var deferred = Q.defer(),
        pathParams,
        reqObj = {};

    if (!_.isString(path))
        throw new TypeError('path should be a string.');

    pathParams = cutils.uriParser(path);
    if (!pathParams[1] || !pathParams[2])
        throw new Error('path should contain Object ID, Object Instance ID and Resource ID.');

    reqObj.hostname = this.ip;
    reqObj.port = this.port;
    reqObj.pathname = path;
    reqObj.method = 'GET';
    reqObj.observe = true;

    this.shepherd.request(reqObj).then(function (observeStream) {
        if (observeStream.code === '2.05') {
            deferred.resolve(observeStream);
        } else if (observeStream.code === '4.04') {
            deferred.reject(new Error('Not found ' + path));
        } else {
            deferred.reject(new Error('ClientError ' + observeStream.code));
        }
    }, function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._cancelAll = function (path, callback) {
    var self = this,
        deferred = Q.defer();

    _.forEach(this._observeList, function (observeStream, path) {
        observeStream.close();
        delete self._observeList[path];
    });

    deferred.resolve({data: this.clientName});

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.updateAttrs = function (attrs, callback) {
    var deferred = Q.defer(),
        node = this,
        diff = {};

    _.forEach(attrs, function (value, key) {
        if (node[key] !== value) {
            diff[key] = value;
        }
    });

    if (_.isEmpty(diff)) {
        deferred.resolve(diff);
    } else {
        _.forEach(diff, function (value, key) {
            node[key] = value;
        });

        deferred.resolve(diff);
    }

    return deferred.promise.nodeify(callback);
};

/*********************************************************
 * Private function
 *********************************************************/
function getAttrQuery(attr) {
    var query = '';

    _.forEach(attr, function (value, key) {
        if(key === 'pmin') {
            query += 'pmin=' + value + '&';

        } else if (key === 'pmax') {
            query += 'pmax=' + value + '&';

        } else if (key === 'gt') {
            query += 'gt=' + value + '&';

        } else if (key === 'lt') {
            query += 'lt=' + value + '&';
            
        } else if (key === 'cancel' && value === true) {
            query += 'cancel&';
        }
    });
    return query;
}

module.exports = CoapNode;

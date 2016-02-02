'use strict';

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

var cutils = require('./utils/cutils.js'),
    SmartObject = require('./smartObject.js');

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
    this._so = new SmartObject();
    this._observeList = {};

    this.lifeChecker = null;
}

CoapNode.prototype.enableLifeChecker = function () {
    var self = this;

    if (this.lifeChecker)
        clearTimeout(this.lifeChecker);

    this.lifeChecker = setTimeout(function () {
        self.shepherd.deregisterNode(self.clientName);
    }, this.lifeTime * 1000);

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
        reqObj = {},
        chkErr = null;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj.hostname = this.ip;
        reqObj.port = this.port;
        reqObj.pathname = cutils.getSoValPath(path);
        reqObj.method = 'GET';

        this.shepherd.request(reqObj).then(function (res) {
            if (res.code === '2.05') {
                deferred.resolve({status: res.code, data: res.payload});
            } else if (res.code === '4.04') {
                deferred.resolve({status: res.code, data: path + ' not found.'});
            } else {
                deferred.resolve({status: res.code});
            }
        }, function (err) {
            deferred.reject(err);
        }).done(); 
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.write = function (path, value, callback) {
    var deferred = Q.defer(),
        reqObj = {},
        chkErr = null;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');
    else if (!cutils.uriParser(path)[1] || !cutils.uriParser(path)[2])
        chkErr = new Error('path should contain Object ID, Object Instance ID and Resource ID.');
    
    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        if (!_.isString(value)) {
            value = value.toString();
        }

        reqObj.hostname = this.ip;
        reqObj.port = this.port;
        reqObj.pathname = cutils.getSoValPath(path);
        reqObj.method = 'PUT';
        reqObj.payload = value;

        this.shepherd.request(reqObj).then(function (res) {
            if (res.code === '2.04') {
                deferred.resolve({status: res.code, data: value});
            } else if (res.code === '4.04') {
                deferred.resolve({status: res.code, data: path + ' not found.'});
            } else {
                deferred.resolve({status: res.code});
            }
        }, function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.execute = function (path, callback) {
    var deferred = Q.defer(),
        reqObj = {},
        chkErr = null;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');
    else if (!cutils.uriParser(path)[1] || !cutils.uriParser(path)[2])
        chkErr = new Error('path should contain Object ID, Object Instance ID and Resource ID.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj.hostname = this.ip;
        reqObj.port = this.port;
        reqObj.pathname = cutils.getSoValPath(path);
        reqObj.method = 'POST';

        this.shepherd.request(reqObj).then(function (res) {
            if (res.code === '2.04') {
                deferred.resolve({status: res.code, data: res.payload});
            } else if (res.code === '4.04') {
                deferred.resolve({status: res.code, data: path + ' not found.'});
            } else {
                deferred.resolve({status: res.code});
            }
        }, function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.discover = function (path, callback) {
    var deferred = Q.defer(),
        reqObj = {},
        chkErr = null;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');
    
    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj.hostname = this.ip;
        reqObj.port = this.port;
        reqObj.pathname = cutils.getSoValPath(path);
        reqObj.method = 'GET';
        reqObj.options = {
            'Accept': 'application/link-format'
        };

        this.shepherd.request(reqObj).then(function (res) {
            if (res.code === '2.05') {
                deferred.resolve({status: res.code, data: res.payload});
            } else if (res.code === '4.04') {
                deferred.resolve({status: res.code, data: path + ' not found.'});
            } else {
                deferred.resolve({status: res.code});
            }
        }, function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.writeAttr = function (path, attrs, callback) {
    var deferred = Q.defer(),
        reqObj = {},
        chkErr = null;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');
    else if (!_.isObject(attrs))
        chkErr = new TypeError('attr should be a object.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj.hostname = this.ip;
        reqObj.port = this.port;
        reqObj.pathname = cutils.getSoValPath(path);
        reqObj.method = 'PUT';
        reqObj.query = getAttrQuery(attrs);

        this.shepherd.request(reqObj).then(function (res) {
            if (res.code === '2.04') {
                deferred.resolve({status: res.code});
            } else if (res.code === '4.04') {
                deferred.resolve({status: res.code, data: path + ' not found.'});
            } else {
                deferred.resolve({status: res.code});
            }
        }, function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.observe = function (path, callback) {
    var deferred = Q.defer(),
        reqObj = {},
        chkErr = null,
        node = this;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');
    else if (!cutils.uriParser(path)[1] || !cutils.uriParser(path)[2])
        chkErr = new Error('path should contain Object ID, Object Instance ID and Resource ID.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj.hostname = this.ip;
        reqObj.port = this.port;
        reqObj.pathname = cutils.getSoValPath(path);
        reqObj.method = 'GET';
        reqObj.observe = true;

        this.shepherd.request(reqObj).then(function (observeStream) {
            if (observeStream.code === '2.05') {
                node._observeList[reqObj.pathname] = observeStream;
                observeStream.on('data', notifyHandler(node.shepherd, reqObj.pathname, node.clientName));
                observeStream.on('finish', function () { node.cancel(reqObj.pathname); });
                deferred.resolve({status: observeStream.code});
            } else if (observeStream.code === '4.04') {
                deferred.resolve({status: observeStream.code, data: path + ' not found.'});
            } else {
                deferred.resolve({status: observeStream.code});
            }
        }, function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._cancelAll = function () {
    var self = this;

    _.forEach(this._observeList, function (observeStream, path) {
        observeStream.close();
        delete self._observeList[path];
    });
};

CoapNode.prototype._readAllResource = function (callback) {
    var deferred = Q.defer(),
        readAllResourcePromises = [],
        node = this,
        oids = [];

    _.forEach(this.objList, function (iids, oid) {
        readAllResourcePromises.push(node.read(oid));
        oids.push(oid);
    });

    Q.all(readAllResourcePromises).then(function (msgs) {
        var isAnyFail = false;

        _.forEach(msgs, function (msg, idx) {
            if (msg.status === '2.05') 
                node._so.addIObjects(oids[idx], msg.data);
            else 
                isAnyFail = true;
        });
        
         if (isAnyFail)
            deferred.resolve(node._so);   //TODO
        else
            deferred.resolve(node._so);
    });

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._updateAttrs = function (attrs, callback) {
    var deferred = Q.defer(),
        node = this,
        diff = {};

    _.forEach(attrs, function (value, key) {
        if (node[key] !== value && key !== 'port') {
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
 * Handler function
 *********************************************************/
function notifyHandler (shepherd, path, device) {
    return function (value) {
        shepherd.emit('ind', { type: 'notify', device: device, path: path, data: value.toString()});
    };
}

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

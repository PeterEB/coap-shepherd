'use strict';

var util = require('util'),
//    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

var cutils = require('./utils/cutils.js'),
    SmartObject = require('./smartobject.js'),
    coapdb = require('./coapdb.js');

function CoapNode (shepherd, devAttrs) {

    if (!_.isPlainObject(devAttrs))
        throw new Error('devAttrs should be an object');

    this.shepherd = shepherd;

    // do you really need clientId? since there is a 'clientName'
    this.clientName = devAttrs.clientName;
    this.clientId = devAttrs.clientId || shepherd._newClientId();

    this.lifetime = devAttrs.lifetime || 86400;
    this.version = devAttrs.version || 'unknown';

    this.ip = devAttrs.ip || 'unknown';
    this.port = devAttrs.port || 'unknown';

    //this.joinTime = Math.round(new Date().getTime()/1000);

    this.status = 'offline';

    this.objList = devAttrs.objList;
    this.so = new SmartObject();

    this._registered = false;
    this._streamObservers = {};

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
    if (this.lifeChecker)
        clearTimeout(this.lifeChecker);

    this.lifeChecker = null;
    return this;
};

CoapNode.prototype._reqObj = function (method, pathname) {
    return {
        hostname: this.ip,
        port: this.port,
        pathname: pathname,
        method: method
    };
};

CoapNode.prototype.read = function (path, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr = null,
        reqObj,
        msg;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        // use shorthand this._reqObj() to create the request object
        reqObj = this._reqObj('GET', cutils.getSoValPath(path));
        this.shepherd.request(reqObj).then(function (rsp) {
            msg = { status: rsp.code };

            if (rsp.code === '2.05') {  // only 2.05 is with data
                msg.data = rsp.payload;
                return self._updateSo(path, rsp.payload);
            }
            return 'notUpdate';
        }).done(function () {
            deferred.resolve(msg);
        }, function (err) {
            deferred.reject(err);
        }); 
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.write = function (path, value, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr = null,
        reqObj,
        msg;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');
    else if (!cutils.uriParser(path)[1] || !cutils.uriParser(path)[2])
        chkErr = new Error('path should contain Object ID, Object Instance ID and Resource ID.');
    
    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        // you always turn something to string, no need to check. string.toString() is also a string
        // But, are you sure using .toString() is correct? what if the value is an object?
        // if (!_.isString(value))
        // value = value.toString();
        reqObj = this._reqObj('PUT', cutils.getSoValPath(path));
        reqObj.payload = value.toString();

        this.shepherd.request(reqObj).done(function (rsp) {
            msg = { status: rsp.code };

            if (rsp.code === '2.04') {  // consider only 2.04 with the written value
                msg.data = value;       // user should get the value of what he wrote, not value.toString()
                return self._updateSo(path, rsp.payload);
            }
            return 'notUpdate';
        }).done(function () {
            deferred.resolve(msg);
        }, function (err) {
            deferred.reject(err);
        }); 
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.execute = function (path, callback) {
    var deferred = Q.defer(),
        chkErr = null,
        reqObj;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');
    else if (!cutils.uriParser(path)[1] || !cutils.uriParser(path)[2])
        chkErr = new Error('path should contain Object ID, Object Instance ID and Resource ID.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('POST', cutils.getSoValPath(path));
        this.shepherd.request(reqObj).done(function (rsp) {
            var msg = { status: rsp.code };
            if (rsp.code === '2.04')    // only 2.04 is with data
                msg.data = rsp.payload;

            deferred.resolve(msg);
        }, function (err) {
            deferred.reject(err);
        });
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.discover = function (path, callback) {
    var deferred = Q.defer(),
        chkErr = null,
        reqObj;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');
    
    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('GET', cutils.getSoValPath(path));
        reqObj.options = { Accept: 'application/link-format' };

        this.shepherd.request(reqObj).then(function (rsp) {
            var msg = { status: rsp.code };
            if (rsp.code === '2.05')    // only 2.05 is with data
                msg.data = cutils.getAttrsAndResrcList(rsp.payload);

            deferred.resolve(msg);
        }, function (err) {
            deferred.reject(err);
        }).done();
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.writeAttr = function (path, attrs, callback) {
    var deferred = Q.defer(),
        chkErr = null,
        reqObj;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');
    else if (!_.isObject(attrs))
        chkErr = new TypeError('attr should be a object.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('PUT', cutils.getSoValPath(path));
        reqObj.query = getAttrQuery(attrs);

        this.shepherd.request(reqObj).done(function (rsp) {
            deferred.resolve({ status: rsp.code });
        }, function (err) {
            deferred.reject(err);
        });
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.observe = function (path, callback) {
    var deferred = Q.defer(),
        cnode = this,
        chkErr = null,
        reqObj;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');
    else if (!cutils.uriParser(path)[1] || !cutils.uriParser(path)[2])
        chkErr = new Error('path should contain Object ID, Object Instance ID and Resource ID.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('GET', cutils.getSoValPath(path));
        reqObj.observe = true;

        this.shepherd.request(reqObj).done(function (observeStream) {
            var msg = { status: observeStream.code },
                type = (observeStream.headers && observeStream.headers['Content-Format'] === 'application/json') ? 'json' : 'text';

            if (observeStream.code === '2.05') {
                cnode._streamObservers[reqObj.pathname] = observeStream;
                observeStream.on('data', function (value) {
                    notifyHandler(cnode, reqObj, value, type);
                });
                observeStream.on('finish', function () {
                    cnode.cancel(reqObj.pathname);
                });
            }

            deferred.resolve(msg);
        }, function (err) {
            deferred.reject(err);
        });
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.dump = function () {
    var self = this,
        excludedKeys = [ 'shepherd', 'status', '_registered', '_streamObservers', 'lifeChecker'],
        dumped = {};

    _.forOwn(this, function (n , key) {
        if (!_.isFunction(n) && !_.includes(excludedKeys, key)) {
            if (key ==='so')
                dumped[key] = self.so.dump();
            else if (_.isObject(n))
                dumped[key] = _.cloneDeep(n);
            else
                dumped[key] = n;
        }
    });

    return dumped;
};

CoapNode.prototype._cancelAllObservers = function () {
    var _streamObservers = this._streamObservers;

    _.forEach(_streamObservers, function (observeStream, path) {
        observeStream.close();
        _streamObservers[path] = null;
        delete _streamObservers[path];
    });
};

CoapNode.prototype._readAllResource = function (callback) {
    var deferred = Q.defer(),
        readAllResourcePromises = [],
        cnode = this,
        oids = [],
        reqObj;

    _.forEach(this.objList, function (iids, oid) {
        reqObj = cnode._reqObj('GET', cutils.getSoValPath(oid));
        readAllResourcePromises.push(cnode.shepherd.request(reqObj));
        oids.push(oid);
    });

    Q.all(readAllResourcePromises).then(function (rsps) {
        var isAnyFail = false;

        _.forEach(rsps, function (rsp, idx) {
            if (rsp.code === '2.05') 
                cnode.so.addIObjects(oids[idx], rsp.payload);
            else 
                isAnyFail = true;
        });
        
        if (isAnyFail)
            deferred.reject(cnode.so);   // TODO
        else
            deferred.resolve(cnode.so);
    });

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._updateAttrs = function (attrs, callback) {
    var deferred = Q.defer(),
        cnode = this,
        diff = {};

    if (!_.isPlainObject(attrs)) {
        deferred.reject(new TypeError('attrs to update should be an object.'));
        return deferred.promise.nodeify(callback);
    }

    _.forEach(attrs, function (value, key) {
        if (!_.isEqual(cnode[key], value) && key !== 'port') {
            diff[key] = value;
        }
    });
    
    if (_.isEmpty(diff)) {
        deferred.resolve(diff);
    } else {
        coapdb.modify(this.clientName, '/', diff).done(function () {
            _.forEach(diff, function (val, key) {
                cnode[key] = val;
            });
            deferred.resolve(diff);
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._updateObjectInstance = function (oid, iid, data, callback) {
    var deferred = Q.defer(),
        iObj,
        diff,
        path,
        dotPath;
    
    path = cutils.createPath('/', 'so', oid, iid);
    dotPath = cutils.createPath('.', 'so', oid, iid);

    iObj = _.get(this, dotPath);

    try {
        diff = cutils.objectInstanceDiff(iObj, data);
    } catch (e) {
        deferred.reject(e);
        return deferred.promise.nodeify(callback);
    }

    if (!_.isEmpty(diff)) {
        coapdb.modify(this.clientName, dotPath, diff).done(function (diffObj) {
            _.merge(iObj, diff);
            deferred.resolve(diff);
        }, function (err) {
            deferred.reject(err);
        });
    } else {
        deferred.resolve(diff);
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._updateResource  = function (oid, iid, rid, data, callback) {
    var deferred = Q.defer(),
        self = this,
        resource,
        diff,
        path,
        dotPath;

    path = cutils.createPath('/', 'so', oid, iid, rid);
    dotPath = cutils.createPath('.', 'so', oid, iid, rid);

    function rejectTheResult (err) {
        deferred.reject(err);
    }

    resource = _.get(this, dotPath);

    try {
        diff = cutils.resourceDiff(resource, data);
    } catch (e) {
        deferred.reject(e);
        return deferred.promise.nodeify(callback);
    }

    if (_.isNull(diff)) {
        deferred.resolve(resource);
    } else if (typeof target !== typeof diff) {
        coapdb.replace(this.clientName, dotPath, diff).done(function (diffObj) {
            _.set(self, dotPath, diff);
            deferred.resolve(diff);
        }, rejectTheResult);
    } else if (_.isPlainObject(diff)) {
        coapdb.modify(this.clientName, dotPath, diff).done(function (diffObj) {
            _.merge(resource, diff);
            deferred.resolve(diff);
        }, rejectTheResult);
    } else {
        coapdb.modify(this.clientName, dotPath, diff).done(function (diffObj) {
            _.set(self, dotPath, diff);
            deferred.resolve(diff);
        }, rejectTheResult);
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._updateSo = function (path, data, callback) {
    var deferred = Q.defer(),
        self = this,
        dateType = cutils.pathDateType(path),
        dateObj = cutils.getSoKeyObj(path),
        iObjsUpdater = [],
        iidArray = [];

    switch (dateType) {
        case 'object': 
            _.forEach(data, function (iObj, iid) {
                iObjsUpdater.push(self._updateObjectInstance(dateObj.oid, iid, iObj));
                iidArray.push(iid);
            });

            Q.all(iObjsUpdater).done(function (diffArray) {
                deferred.resolve();
            }, function (err) {
                deferred.reject(err);
            });

            break;
        case 'instance': 
            this._updateObjectInstance(dateObj.oid, dateObj.iid, data).done(function (diff) {
                deferred.resolve();
            }, function (err) {
                deferred.reject(err);
            });
            break;
        case 'resource': 
            this._updateResource(dateObj.oid, dateObj.iid, dateObj.rid, data).done(function (diff) {
                deferred.resolve();
            }, function (err) {
                deferred.reject(err);
            });
            break;
        default:
            deferred.resolve();
            break;
    }

    return deferred.promise.nodeify(callback);
};

/*********************************************************
 * CoapNode Database Access Methods
 *********************************************************/
 CoapNode.prototype.dbRead = function (callback) {
    var deferred = Q.defer();

    coapdb.findByClientName(this.clientName).done(function (ndata) {
        if (!ndata)
            deferred.reject(new Error('mqtt-node data not found'));
        else
            deferred.resolve(ndata);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.dbSave = function (callback) {
    var self = this,
        deferred = Q.defer();

    coapdb.findByClientNameWith_id(this.clientName).then(function (ndata) {
        if (!ndata) {
            return coapdb.insert(self.dump());
        } else {
            return self.dbRemove().then(function () {
                var nodeData = _.assign(self.dump(), { _id: ndata._id });
                return coapdb.insert(nodeData);
            });
        }
    }).done(function (savedNdata) {
        deferred.resolve(savedNdata);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.dbRemove = function (callback) {
    return  coapdb.removeByClientName(this.clientName, callback);
};

/*********************************************************
 * Handler function
 *********************************************************/
function notifyHandler (cnode, reqObj, value, type) {
    var shepherd = cnode.shepherd,
        data;

    switch (type) {
        case 'text':
            data = value.toString();
            break;
        case 'json':
            data = JSON.parse(value);
            break;
        default:
            data = value.toString();
            break;
    }

    if (shepherd) {
        cnode._updateSo(reqObj.pathname, value).done();

        shepherd.emit('ind', {
            type: 'notify',
            device: cnode.clientName,
            path: reqObj.pathname,
            data: data
        });
    }
}

/*********************************************************
 * Private function
 *********************************************************/
function getAttrQuery(attr) {
    var qstrs = [ 'pmin', 'pmax', 'gt', 'lt' ],
        query = '';

    _.forEach(attr, function (value, key) {
        if (_.includes(qstrs, key))
            query = query + key + '=' + value + '&';
        else if (key === 'cancel' && value === true)
            query += 'cancel&';
    });

    return query.slice(0, query.length - 1);    // take off the last '&'
}

module.exports = CoapNode;

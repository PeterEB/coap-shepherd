'use strict';

var util = require('util'),
//    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

var cutils = require('./utils/cutils.js'),
    SmartObject = require('./smartobject.js'),
    coapdb = require('./coapdb.js');

function CoapNode (shepherd, devAttr) {

    this.shepherd = shepherd;

    // do you really need clientId? since there is a 'clientName'
    this.clientName = devAttr.clientName;
    this.clientId = devAttr.clientId || shepherd._newClientId();

    this.lifeTime = devAttr.lifeTime || 86400;
    this.version = devAttr.version || 'unknown';

    this.ip = devAttr.ip || 'unknown';
    this.port = devAttr.port || 'unknown';

    //this.joinTime = Math.round(new Date().getTime()/1000);

    this.status = 'offline';

    this.objList = devAttr.objList;
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
    }, this.lifeTime * 1000);

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
        chkErr = null,
        reqObj;

    if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');
    else if (!this._registered)
        chkErr = new Error('this node was deregistered.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        // use shorthand this._reqObj() to create the request object
        reqObj = this._reqObj('GET', cutils.getSoValPath(path));
        this.shepherd.request(reqObj).done(function (rsp) {
            var msg = { status: rsp.code };
            if (rsp.code === '2.05')    // only 2.05 is with data
                msg.data = rsp.payload;

            deferred.resolve(msg);
        }, function (err) {
            deferred.reject(err);
        }); 
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.write = function (path, value, callback) {
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
        // you always turn something to string, no need to check. string.toString() is also a string
        // But, are you sure using .toString() is correct? what if the value is an object?
        // if (!_.isString(value))
        // value = value.toString();
        reqObj = this._reqObj('PUT', cutils.getSoValPath(path));
        reqObj.payload = value.toString();

        this.shepherd.request(reqObj).done(function (rsp) {
            var msg = { status: rsp.code };
            if (rsp.code === '2.04')    // consider only 2.04 with the written value
                msg.data = value;       // user should get the value of what he wrote, not value.toString()

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
                msg.data = rsp.payload;

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
            var msg = { status: observeStream.code };

            if (observeStream.code === '2.05') {
                cnode._streamObservers[reqObj.pathname] = observeStream;
                observeStream.on('data', function (value) {
                    notifyHandler(cnode, reqObj, value);
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
        oids = [];

    _.forEach(this.objList, function (iids, oid) {
        readAllResourcePromises.push(cnode.read(oid));
        oids.push(oid);
    });

    Q.all(readAllResourcePromises).then(function (msgs) {
        var isAnyFail = false;

        _.forEach(msgs, function (msg, idx) {
            if (msg.status === '2.05') 
                cnode.so.addIObjects(oids[idx], msg.data);
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
        node = this,
        diff = {};

    _.forEach(attrs, function (value, key) {
        if (!_.isEqual(node[key], value) && key !== 'port') {
            diff[key] = value;
        }
    });

    deferred.resolve(diff);
    return deferred.promise.nodeify(callback);
};
// TODO
CoapNode.prototype._updateDb = function (path, data, callback) {
    var deferred = Q.defer(),
        dateType = cutils.pathDateType(path),
        dateObj = cutils.getSoKeyObj;

    switch (dateType) {
        case 'object': 

            break;
        case 'instance': 

            break;
        case 'resource': 

            break;
        default:
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
function notifyHandler (cnode, reqObj, value) {
    var shepherd = cnode.shepherd;

    if (shepherd) {
        shepherd.emit('ind', {
            type: 'notify',
            device: cnode.clientName,
            path: reqObj.pathname,
            data: value.toString()
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

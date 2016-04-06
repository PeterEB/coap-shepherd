'use strict';

var util = require('util'),
    Q = require('q'),
    _ = require('lodash');

var cutils = require('./utils/cutils.js'),
    SmartObject = require('./smartobject.js'),
    coapdb = require('./coapdb.js');

/**** Code Enumerations ****/
var RSP = { ok: '2.00', created: '2.01', deleted: '2.02', changed: '2.04', content: '2.05', badreq: '4.00',
            unauth: '4.01', forbid: '4.03', notfound: '4.04', notallowed: '4.05', timeout: '4.08', dberror: '5.00' };

var clientDefaultPort = '5685';

function CoapNode (shepherd, devAttrs) {
    if (!_.isPlainObject(devAttrs)) throw new Error('devAttrs should be an object.');

    this.shepherd = shepherd;

// [TODO] clientName locationPath check
    this.clientName = devAttrs.clientName;
    this.locationPath = devAttrs.locationPath || shepherd._newLocationPath();

    this.lifetime = devAttrs.lifetime || 86400;
    this.version = devAttrs.version || 'unknown';

    this.ip = devAttrs.ip || 'unknown';
    this.port = devAttrs.port || clientDefaultPort;
    this._defaultPort = clientDefaultPort;

    this.status = 'offline';

    this.objList = devAttrs.objList;
    this.so = new SmartObject();

    this._registered = false;
    this._streamObservers = {};

    this._lifeChecker = null;
    this._heartbeat = null;
}

CoapNode.prototype.enableLifeChecker = function () {
    var self = this;

    if (this._lifeChecker)
        clearTimeout(this._lifeChecker);

    this._lifeChecker = setTimeout(function () {
        self.shepherd.removeNode(self.clientName);
    }, this.lifetime * 1000);

    return this;
};

CoapNode.prototype.disableLifeChecker = function () {
    if (this._lifeChecker)
        clearTimeout(this._lifeChecker);

    this._lifeChecker = null;
    return this;
};

CoapNode.prototype._reqObj = function (method, pathname) {
    if (!_.isString(method) || !_.isString(pathname)) throw new TypeError('method and pathname should be a string.');

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
        chkErr = this._reqCheck('read', path),
        reqObj,
        msg;

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('GET', cutils.getSoValPath(path));
        this.shepherd.request(reqObj).then(function (rsp) {
            msg = { status: rsp.code };
            isRspTimeout(rsp, self);
            if (rsp.code === RSP.content) {  // only 2.05 is with data
                msg.data = cutils.decodeJsonObj(path, rsp.payload);
                return self._updateSo(path, cutils.decodeJsonObj(path, rsp.payload));
            }
            msg.data = rsp.payload;
            return 'notUpdate';
        }).done(function (diff) {
            deferred.resolve(msg);
        }, function (err) {
            deferred.reject(err);
        }); 
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.discover = function (path, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr = this._reqCheck('discover', path),
        reqObj;
    
    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('GET', cutils.getSoValPath(path));
        reqObj.options = { Accept: 'application/link-format' };

        this.shepherd.request(reqObj).done(function (rsp) {
            var msg = { status: rsp.code };
            
            isRspTimeout(rsp, self);
            if (rsp.code === RSP.content) {   // only 2.05 is with data
                msg.data = cutils.getAttrsAndRsc(rsp.payload);
            }
            
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
        chkErr,
        reqObj,
        msg;

    if (_.isFunction(value)) {
        callback = value;
        value = null;
    }

    chkErr = this._reqCheck('write', path, value);

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('PUT', cutils.getSoValPath(path));
        reqObj.payload = cutils.encodeJsonObj(path, value);

        this.shepherd.request(reqObj).then(function (rsp) {
            msg = { status: rsp.code };
            isRspTimeout(rsp, self);
            if (rsp.code === RSP.changed) {  // consider only 2.04 with the written value
                return self._updateSo(path, value);
            }
            return 'notUpdate';
        }).done(function (diff) {
            deferred.resolve(msg);
        }, function (err) {
            deferred.reject(err);
        }); 
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.writeAttr = function (path, attrs, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr,
        reqObj;

    if (_.isFunction(attrs)) {
        callback = attrs;
        attrs = null;
    }

    chkErr = this._reqCheck('writeAttr', path, attrs);

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('PUT', cutils.getSoValPath(path));
        reqObj.query = getAttrQuery(attrs);

        this.shepherd.request(reqObj).done(function (rsp) {
            isRspTimeout(rsp, self);
            deferred.resolve({ status: rsp.code });
        }, function (err) {
            deferred.reject(err);
        });
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.execute = function (path, argus, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr,
        reqObj,
        argusInPlain = null;

    if (_.isFunction(argus)) {
        callback = argus;
        argus = [];
    }

    chkErr = this._reqCheck('execute', path, argus);

    if (!_.isEmpty(argus))
        argusInPlain = getPlainTextArgus(argus);    // argus to plain text format

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('POST', cutils.getSoValPath(path));
        reqObj.payload = argusInPlain;
        this.shepherd.request(reqObj).done(function (rsp) {
            isRspTimeout(rsp, self);
            deferred.resolve({ status: rsp.code });
        }, function (err) {
            deferred.reject(err);
        });
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.observe = function (path, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr = this._reqCheck('observe', path),
        reqObj;

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('GET', cutils.getSoValPath(path));
        reqObj.observe = true;

        if (path === '/heartbeat')
            reqObj.port = this._defaultPort;

        this.shepherd.request(reqObj).done(function (observeStream) {
            var msg = { status: observeStream.code },
                type = (observeStream.headers && observeStream.headers['Content-Format'] === 'application/json') ? 'json' : 'text';

            isRspTimeout(observeStream, self);
            msg.data = observeStream.payload;
            
            if (observeStream.code === RSP.content) {
                self._streamObservers[reqObj.pathname] = observeStream;

                observeStream.on('data', function (value) {
                    observeStream.removeAllListeners('data');
                    observeStream.on('data', function (value) {
                        notifyHandler(self, reqObj, value, type);
                    });
                });
            }
            deferred.resolve(msg);
        }, function (err) {
            deferred.reject(err);
        });
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.cancelObserve = function (path, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr = this._reqCheck('cancelObserve', path),
        reqObj;

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('GET', cutils.getSoValPath(path));
        reqObj.observe = false;

        if (path === '/heartbeat')
            reqObj.port = this._defaultPort;

        this.shepherd.request(reqObj).done(function (rsp) {
            isRspTimeout(rsp, self);
            if (rsp.code === RSP.content) {
                self._setStatus('online');
                self._streamObservers[reqObj.pathname].close();
                self._streamObservers[reqObj.pathname] = null;
                delete self._streamObservers[reqObj.pathname];
            }

            deferred.resolve({ status: rsp.code });
        }, function (err) {
            deferred.reject(err);
        });
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.ping = function (callback) {
    var deferred = Q.defer(),
        self = this,
        reqObj,
        txTime = new Date().getTime();

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('POST', '/ping');

        this.shepherd.request(reqObj).done(function (rsp) {
            var msg = { status: rsp.code };

            isRspTimeout(rsp, self, true);
            if (rsp.code === RSP.content) {
                msg.data = new Date().getTime() - txTime + 'ms';
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
        excludedKeys = [ 'shepherd', 'locationPath', '_defaultPort', 'status', 
                         '_registered', '_streamObservers', '_lifeChecker', '_heartbeat'],
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
        self = this,
        oids = [],
        reqObj;

    _.forEach(this.objList, function (iids, oid) {
        reqObj = self._reqObj('GET', cutils.getSoValPath(oid));
        reqObj.port = self._defaultPort;
        readAllResourcePromises.push(self.shepherd.request(reqObj));
        oids.push(oid);
    });

    Q.all(readAllResourcePromises).then(function (rsps) {
        var isAnyFail = false,
            msg = {};

        _.forEach(rsps, function (rsp, idx) {
            if (rsp.code === RSP.content) {
                self.so.addIObjects(oids[idx], cutils.decodeJsonObj(oids[idx], rsp.payload));
            } else {
                msg.status = msg.status || rsp.code;
                msg.data = msg.data || '/' + oids[idx];
                isAnyFail = true;
            }
        });
        
        if (isAnyFail) {
            deferred.reject(new Error('object requests fail.'));
        } else {
            msg.status = RSP.content;
            msg.data = self.so;
            deferred.resolve(msg);
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._setStatus = function (status) {
    if (status !== 'online' && status !== 'offline') throw new TypeError('bad status.');
    var shepherd = this.shepherd;

    if (this.status !== status) {
        this.status = status;

        if (shepherd._shepherdTest)
            shepherd.emit('ind', { type: status, msg: this.clientName });
    }
};

CoapNode.prototype._updateAttrs = function (attrs, callback) {
    var deferred = Q.defer(),
        self = this,
        diff = {};

    if (!_.isPlainObject(attrs)) {
        deferred.reject(new TypeError('attrs to update should be an object.'));
        return deferred.promise.nodeify(callback);
    }

    _.forEach(attrs, function (value, key) {
        if (!_.isEqual(self[key], value)) {
            diff[key] = value;
        }
    });
    
    if (_.isEmpty(diff)) {
        deferred.resolve(diff);
    } else {
        coapdb.modify(this.clientName, '/', diff).done(function () {
            _.forEach(diff, function (val, key) {
                self[key] = val;
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
        soData = {},
        iObj,
        diff,
        path,
        dotPath;

    path = cutils.createPath('/', 'so', oid, iid);
    dotPath = cutils.createPath('.', 'so', oid, iid);

    iObj = _.get(this, dotPath);

    _.forEach(data, function (val, rid) {
        soData[cutils.ridKey(oid, rid)] = val;
    });
    
    try {
        diff = cutils.objectInstanceDiff(iObj, soData);
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

CoapNode.prototype._updateResource = function (oid, iid, rid, data, callback) {
    var deferred = Q.defer(),
        self = this,
        resource,
        diff,
        path,
        dotPath;

    path = cutils.createPath('/', 'so', oid, iid, rid);
    dotPath = cutils.createPath('.', 'so', oid, iid, rid);

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
        }, deferred.reject);
    } else if (_.isPlainObject(diff)) {
        coapdb.modify(this.clientName, dotPath, diff).done(function (diffObj) {
            _.merge(resource, diff);
            deferred.resolve(diff);
        }, deferred.reject);
    } else {
        coapdb.modify(this.clientName, dotPath, diff).done(function (diffObj) {
            _.set(self, dotPath, diff);
            deferred.resolve(diff);
        }, deferred.reject);
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._reqCheck = function (type, path, data) {
    var chkErr = null,
        allowedAttrs = [ 'pmin', 'pmax', 'gt', 'lt', 'stp', 'step' ];

    if (!this._registered)
        chkErr = new Error(this.clientName + ' was deregistered.');
    else if (this.status === 'offline')
        chkErr = new Error(this.clientName + ' is offline.');

    switch (type) {
        case 'read':
            if (!_.isString(path))
                chkErr = chkErr || new TypeError('path should be a string.');
            break;

        case 'write':
            if (!_.isString(path))
                chkErr = chkErr || new TypeError('path should be a string.');
            else if (!cutils.pathSlashParser(path)[1])
                chkErr = chkErr || new Error('path should contain Object ID.');
            else if (_.isFunction(data) || _.isNil(data))
                chkErr = chkErr || new Error('value is undefined.');
            break;

        case 'execute':
            if (!_.isString(path))
                chkErr = chkErr || new TypeError('path should be a string.');
            else if (!cutils.pathSlashParser(path)[1] || !cutils.pathSlashParser(path)[2])
                chkErr = chkErr || new Error('path should contain Object ID, Object Instance ID and Resource ID.');
            else if (!_.isArray(data) && !_.isNil(data))
                chkErr = chkErr || new TypeError('argus should be a array.');
            break;

        case 'discover':
            if (!_.isString(path))
                chkErr = chkErr || new TypeError('path should be a string.');
            break;

        case 'writeAttr':
            if (!_.isString(path))
                chkErr = chkErr || new TypeError('path should be a string.');
            else if (!_.isPlainObject(data))
                chkErr = chkErr || new TypeError('attr should be a object.');

            _.forEach(data, function (val, key) {
                if (!_.includes(allowedAttrs, key))
                    chkErr = chkErr || new TypeError(key + ' is not allowed.');
            });
            break;

        case 'observe':         // [TODO] observe object/inst
            if (!_.isString(path))
                chkErr = chkErr || new TypeError('path should be a string.');
            else if ((!cutils.pathSlashParser(path)[1] || !cutils.pathSlashParser(path)[2]) && cutils.pathSlashParser(path)[0] !== 'heartbeat' )
                chkErr = chkErr || new Error('path should contain Object ID, Object Instance ID and Resource ID.');  
            else if (this._streamObservers[cutils.getSoValPath(path)])
                chkErr = chkErr || new Error(path + 'has been observed.');
            break;

        case 'cancelObserve':   // [TODO] observe object/inst
            if (!_.isString(path))
                chkErr = chkErr || new TypeError('path should be a string.');
            else if ((!cutils.pathSlashParser(path)[1] || !cutils.pathSlashParser(path)[2]) && cutils.pathSlashParser(path)[0] !== 'heartbeat' )
                chkErr = chkErr || new Error('path should contain Object ID, Object Instance ID and Resource ID.');  
            else if (!this._streamObservers[cutils.getSoValPath(path)])
                chkErr = chkErr || new Error(path + ' has not yet been observed.');
            break;

        default:
            chkErr = chkErr || new Error('unknown method.');
    }

    return chkErr;
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
                deferred.resolve(diffArray);
            }, function (err) {
                deferred.reject(err);
            });

            break;
        case 'instance': 
            this._updateObjectInstance(dateObj.oid, dateObj.iid, data).done(function (diff) {
                deferred.resolve(diff);
            }, function (err) {
                deferred.reject(err);
            });
            break;
        case 'resource': 
            this._updateResource(dateObj.oid, dateObj.iid, dateObj.rid, data).done(function (diff) {
                deferred.resolve(diff);
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
            deferred.reject(new Error('coap node data not found'));
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
            if (!_.isNaN(Number(data)))
                data = Number(data);

            break;
        case 'json':
            data = JSON.parse(value);
            break;
        default:
            data = value.toString();
            break;
    }

    if (shepherd._enabled && cutils.pathSlashParser(reqObj.pathname)[0] === 'heartbeat') {
        cnode._setStatus('online');
        cnode._heartbeat = data;
    } else if (shepherd._enabled) {
        cnode._setStatus('online');
        cnode._updateSo(reqObj.pathname, data).done(function () {
            shepherd.emit('ind', {
                type: 'notify',
                msg: {
                    device: cnode.clientName,
                    path: reqObj.pathname,
                    data: data
                }
            });
        }, function (err) {
            shepherd.emit('error', err);
        });
    }
}

/*********************************************************
 * Private function
 *********************************************************/
function getAttrQuery(attr) {
    var query = '';

    _.forEach(attr, function (value, key) {
        if (key === 'step')
            query = query + 'stp=' + value + '&'; 
        else 
            query = query + key + '=' + value + '&';
    });

    return query.slice(0, query.length - 1);    // take off the last '&'
}

function getPlainTextArgus(argus) {
    var plainTextArgus = '';

    _.forEach(argus, function (argu) {
        if (_.isString(argu))
            plainTextArgus += "'" + argu + "'" + ','; 
        else if (_.isNumber(argu))
            plainTextArgus += argu + ','; 
    });

    return plainTextArgus.slice(0, plainTextArgus.length - 1);      // take off the last ','
}

function isRspTimeout (rsp, cn, ping) {
    if (rsp.code === '4.08' && cn.shepherd._shepherdTest)
        if (ping !== true) {
            process.nextTick(function () {
                cn.ping().done();
            });
        } else {
            cn._setStatus('offline');
        }
    else if (cn.shepherd._shepherdTest)
        cn._setStatus('online');
}

module.exports = CoapNode;

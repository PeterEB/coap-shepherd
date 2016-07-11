'use strict';

var util = require('util'),
    Q = require('q'),
    _ = require('busyman'),
    Smartobject = require('smartobject');

var cutils = require('./utils/cutils.js'),
    coapdb = require('./coapdb.js');

/**** Code Enumerations ****/
var RSP = { ok: '2.00', created: '2.01', deleted: '2.02', changed: '2.04', content: '2.05', badreq: '4.00',
            unauth: '4.01', forbid: '4.03', notfound: '4.04', notallowed: '4.05', timeout: '4.08', dberror: '5.00' };

function CoapNode (shepherd, devAttrs) {
    if (!_.isPlainObject(devAttrs)) throw new Error('devAttrs should be an object.');

    this.shepherd = shepherd;

// [TODO] clientName locationPath check
    this.clientName = devAttrs.clientName;
    this.clientId =  shepherd._newClientId(devAttrs.clientId);
    this.locationPath = '/rd/' + this.clientId.toString();

    this.lifetime = devAttrs.lifetime || 86400;
    this.version = devAttrs.version || 'unknown';

    this.ip = devAttrs.ip || 'unknown';
    this.mac = devAttrs.mac || 'unknown';
    this.port = devAttrs.port || 'unknown';

    this.status = 'offline';
    this.joinTime = devAttrs.joinTime || Date.now();
    this.objList = devAttrs.objList;
    this.so = new Smartobject();

    this._registered = false;
    this._streamObservers = {};

    this._lifeChecker = null;
    this._heartbeat = null;
}

CoapNode.prototype.lifeCheck = function (enable) {
    var self = this;

    if (enable === true) {
        if (this._lifeChecker)
            clearTimeout(this._lifeChecker);

        this._lifeChecker = setTimeout(function () {
            self.shepherd.remove(self.clientName);
        }, this.lifetime * 1000);
    } else {
       if (this._lifeChecker)
            clearTimeout(this._lifeChecker);

        this._lifeChecker = null;
    }

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

CoapNode.prototype.read = 
CoapNode.prototype.readReq = function (path, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr = this._reqCheck('read', path),
        reqObj,
        rspObj;

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('GET', cutils.getSoValPath(path));
        this.shepherd.request(reqObj).then(function (rsp) {
            rspObj = { status: rsp.code };

            isRspTimeout(rsp, self);
            if (rsp.code === RSP.content) {  // only 2.05 is with data
                rspObj.data = rsp.payload;
                return self._updateSo(path, rspObj.data);
            } else if (rsp.code === RSP.notallowed) {
                rspObj.data = rsp.payload;
            }

            return 'notUpdate';
        }).done(function (diff) {
            deferred.resolve(rspObj);
        }, function (err) {
            deferred.reject(err);
        }); 
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.discover = 
CoapNode.prototype.discoverReq = function (path, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr = this._reqCheck('discover', path),
        reqObj,
        rspObj;
    
    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('GET', cutils.getSoValPath(path));
        reqObj.options = { Accept: 'application/link-format' };

        this.shepherd.request(reqObj).done(function (rsp) {
            rspObj = { status: rsp.code };
            
            isRspTimeout(rsp, self);
            if (rsp.code === RSP.content) {   // only 2.05 is with data
                rspObj.data = cutils.getAttrsAndRsc(rsp.payload);
            }
            
            deferred.resolve(rspObj);
        }, function (err) {
            deferred.reject(err);
        });
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.write =
CoapNode.prototype.writeReq = function (path, value, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr,
        reqObj,
        rspObj;

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
            rspObj = { status: rsp.code };

            isRspTimeout(rsp, self);
            if (rsp.code === RSP.changed) {  // consider only 2.04 with the written value
                return self._updateSo(path, value);
            }
            return 'notUpdate';
        }).done(function (diff) {
            deferred.resolve(rspObj);
        }, function (err) {
            deferred.reject(err);
        }); 
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.writeAttrs =
CoapNode.prototype.writeAttrsReq = function (path, attrs, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr,
        reqObj;

    if (_.isFunction(attrs)) {
        callback = attrs;
        attrs = null;
    }

    chkErr = this._reqCheck('writeAttrs', path, attrs);

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

CoapNode.prototype.execute = 
CoapNode.prototype.executeReq = function (path, argus, callback) {
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

CoapNode.prototype.observe = 
CoapNode.prototype.observeReq = function (path, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr = this._reqCheck('observe', path),
        reqObj,
        rspObj,
        type;

    if (chkErr && path !== '/heartbeat') {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('GET', cutils.getSoValPath(path));
        reqObj.observe = true;

        this.shepherd.request(reqObj).done(function (observeStream) {
            rspObj = { status: observeStream.code };
            isRspTimeout(observeStream, self);
            
            if (observeStream.code === RSP.content) {
                type = (observeStream.headers && observeStream.headers['Content-Format'] === 'application/json') ? 'json' : 'text';
                rspObj.data = observeStream.payload;
                self._streamObservers[cutils.getSoKeyPath(reqObj.pathname)] = observeStream;

                observeStream.on('data', function (value) {
                    observeStream.removeAllListeners('data');
                    observeStream.on('data', function (value) {
                        notifyHandler(self, path, value, type);
                    });
                });
            }
            deferred.resolve(rspObj);
        }, function (err) {
            deferred.reject(err);
        });
    }
    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.cancelObserve = 
CoapNode.prototype.cancelObserveReq = function (path, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr = this._reqCheck('cancelObserve', path),
        reqObj;

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('GET', cutils.getSoValPath(path));
        reqObj.observe = false;

        this.shepherd.request(reqObj).done(function (rsp) {
            isRspTimeout(rsp, self);
            if (rsp.code === RSP.content) {
                self._setStatus('online');
                self._streamObservers[cutils.getSoKeyPath(reqObj.pathname)].close();
                self._streamObservers[cutils.getSoKeyPath(reqObj.pathname)] = null;
                delete self._streamObservers[cutils.getSoKeyPath(reqObj.pathname)];
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

    reqObj = this._reqObj('POST', '/ping');

    if (!this._registered) {
        deferred.reject(new Error(this.clientName + ' was deregistered.'));
    } else {
        this.shepherd.request(reqObj).done(function (rsp) {
            var rspObj = { status: rsp.code };

            isRspTimeout(rsp, self);
            if (rsp.code === RSP.content) {
                rspObj.data = new Date().getTime() - txTime;
            }

            deferred.resolve(rspObj);
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype.dump = function () {
    var self = this,
        excludedKeys = [ 'shepherd', 'locationPath', 'status', 
                         '_registered', '_streamObservers', '_lifeChecker', '_heartbeat'],
        dumped = {};

    _.forOwn(this, function (n , key) {
        if (!_.isFunction(n) && !_.includes(excludedKeys, key)) {
            if (key ==='so')
                dumped[key] = self.so.dumpSync();
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
        readAllResourcePromises.push(self.shepherd.request(reqObj));
        oids.push(oid);
    });

    Q.all(readAllResourcePromises).then(function (rsps) {
        var isAnyFail = false,
            rspObj = {};

        _.forEach(rsps, function (rsp, idx) {
            var obj = rsp.payload,
                oid = oids[idx];

            if (rsp.code === RSP.content) {
                self.so.create(oid);
                _.forEach(obj, function (iObj, iid) {
                    _.forEach(iObj, function (val, rid) {
                        var rsc = {};
                        rsc[rid] = val;

                        self.so.addResource(oid, iid, rsc);
                    });
                });
            } else {
                rspObj.status = rspObj.status || rsp.code;
                rspObj.data = rspObj.data || '/' + oids[idx];
                isAnyFail = true;
            }
        });
        
        if (isAnyFail) {
            deferred.reject(new Error('object requests fail.'));
        } else {
            rspObj.status = RSP.content;
            rspObj.data = self.so;
            deferred.resolve(rspObj);
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
            shepherd.emit('ind', { type: status, data: this.clientName });
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

        case 'writeAttrs':
            if (!_.isString(path))
                chkErr = chkErr || new TypeError('path should be a string.');
            else if (!_.isPlainObject(data))
                chkErr = chkErr || new TypeError('attr should be a object.');

            _.forEach(data, function (val, key) {
                if (!_.includes(allowedAttrs, key))
                    chkErr = chkErr || new TypeError(key + ' is not allowed.');
            });
            break;

        case 'observe':  
            if (!_.isString(path))
                chkErr = chkErr || new TypeError('path should be a string.'); 
            break;

        case 'cancelObserve':  
            if (!_.isString(path))
                chkErr = chkErr || new TypeError('path should be a string.');
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
function notifyHandler (cnode, path, value, type) {
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
            data = cutils.decodeJsonObj(path, data);
            break;
        default:
            data = value.toString();
            break;
    }
    
    if (shepherd._enabled && cutils.pathSlashParser(path)[0] === 'heartbeat') {
        cnode._setStatus('online');
        cnode._heartbeat = cutils.getTime();
    } else if (shepherd._enabled) {
        cnode._setStatus('online');
        cnode._updateSo(path, data).done(function () {
            shepherd.emit('ind', {
                type: 'notify',
                data: {
                    device: cnode.clientName,
                    path: path,
                    value: data
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

function isRspTimeout(rsp, cn) {
    if (rsp.code !== '4.08' && cn.shepherd._shepherdTest) {
        cn._setStatus('online');
    }
}

module.exports = CoapNode;

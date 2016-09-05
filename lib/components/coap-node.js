'use strict';

var Q = require('q'),
    _ = require('busyman'),
    SmartObject = require('smartobject');

var cutils = require('./cutils.js');

/**** Code Enumerations ****/
var RSP = { ok: '2.00', created: '2.01', deleted: '2.02', changed: '2.04', content: '2.05', badreq: '4.00',
            unauth: '4.01', forbid: '4.03', notfound: '4.04', notallowed: '4.05', timeout: '4.08', dberror: '5.00' };

function CoapNode (shepherd, devAttrs) {
    if (!_.isPlainObject(devAttrs)) 
        throw new Error('devAttrs should be an object.');

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
    this.so = new SmartObject();

    this._registered = false;
    this._streamObservers = {};

    this._lifeChecker = null;
    this._sleepChecker = null;
    this._heartbeat = null;
}

CoapNode.prototype.lifeCheck = function (enable) {
    if (!_.isBoolean(enable)) 
        throw new TypeError('enable should be a boolean.');

    var self = this;

    if (this._lifeChecker)
            clearTimeout(this._lifeChecker);

    if (enable) {
        this._lifeChecker = setTimeout(function () {
            self.shepherd.remove(self.clientName);
        }, (this.lifetime * 1000) + 500);
    } else {
        this._lifeChecker = null;
    }

    return this;
};

CoapNode.prototype.sleepCheck = function (enable, duration) {
    if (!_.isBoolean(enable)) 
        throw new TypeError('enable should be a boolean.');
    else if (!_.isNumber(duration) && !_.isUndefined(duration))
        throw new TypeError('duration should be a number.');

    var self = this;

    if (this._sleepChecker)
        clearTimeout(this._sleepChecker);

    if (enable) {
        if (duration) {
            this._sleepChecker = setTimeout(function () {
                self._setStatus('offline');
            }, (duration * 1000) + 500);
        }
    } else {
        this._sleepChecker = null;
    }

    return this;
};

CoapNode.prototype._reqObj = function (method, pathname) {
    if (!_.isString(method) || !_.isString(pathname)) 
        throw new TypeError('method and pathname should be a string.');

    return {
        hostname: this.ip,
        port: this.port,
        pathname: pathname,
        method: method
    };
};

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
                return self._updateSoAndDb(path, rspObj.data);
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
        
        if (_.isPlainObject(value)) {
            reqObj.options = { 'Content-Format': 'application/json' };
        } else {
            reqObj.options = { 'Content-Format': 'text/plain' };
        }

        this.shepherd.request(reqObj).then(function (rsp) {
            rspObj = { status: rsp.code };

            isRspTimeout(rsp, self);
            if (rsp.code === RSP.changed) {  // consider only 2.04 with the written value
                return self._updateSoAndDb(path, value);
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

CoapNode.prototype.pingReq = function (callback) {
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
        excludedKeys = [ 'shepherd', 'locationPath', 'status', '_registered', '_streamObservers', 
                         '_lifeChecker', '_sleepChecker', '_heartbeat' ],
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
                _.forEach(obj, function (iObj, iid) {
                    var rsc = {};

                    _.forEach(iObj, function (val, rid) {
                        rsc[rid] = val;
                    });
                    
                    self.so.init(oid, iid, rsc);
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
    if (status !== 'online' && status !== 'offline' && status !== 'sleep') 
        throw new TypeError('bad status.');

    var shepherd = this.shepherd;

    if (this.status !== status) {
        this.status = status;
        shepherd.emit('ind', { 
            type: 'devStatus', 
            cnode: this,
            data: status 
        });
    }
};

CoapNode.prototype._reqCheck = function (type, path, data) {
    var chkErr = null,
        allowedAttrs = [ 'pmin', 'pmax', 'gt', 'lt', 'stp', 'step' ],
        pathItems;

    if (!this._registered)
        chkErr = new Error(this.clientName + ' was deregistered.');
    else if (this.status === 'offline')
        chkErr = new Error(this.clientName + ' is offline.');
    else if (this.status === 'sleep')
        chkErr = new Error(this.clientName + ' is sleeping.');
    else if (!_.isString(path))
        chkErr = new TypeError('path should be a string.');

    if (chkErr)
        return chkErr;

    switch (type) {
        case 'read':
            break;

        case 'write': 
            pathItems = cutils.pathSlashParser(path);

            if (!pathItems[1])
                chkErr = new Error('path should contain Object ID and Object Instance ID.');
            else if (pathItems.length === 2 && !_.isObject(data)) 
                chkErr = new Error('value should be an object.');
            else if (_.isFunction(data) || _.isNil(data))
                chkErr = new Error('value is undefined.');
            break;

        case 'execute':
            pathItems = cutils.pathSlashParser(path);

            if (!pathItems[1] || !pathItems[2])
                chkErr = new Error('path should contain Object ID, Object Instance ID and Resource ID.');
            else if (!_.isArray(data) && !_.isNil(data))
                chkErr = new TypeError('argus should be an array.');
            break;

        case 'discover':
            break;

        case 'writeAttrs':
            if (!_.isPlainObject(data))
                chkErr = new TypeError('attr should be a object.');

            _.forEach(data, function (val, key) {
                if (!_.includes(allowedAttrs, key))
                    chkErr = chkErr || new TypeError(key + ' is not allowed.');
            });
            break;

        case 'observe':  
            break;

        case 'cancelObserve':  
            break;

        default:
            chkErr = new Error('unknown method.');
    }

    return chkErr;
};

/*********************************************************
 * CoapNode Database Access Methods
 *********************************************************/
 CoapNode.prototype.dbRead = function (callback) {
    var deferred = Q.defer();

    this.shepherd._coapdb.findByClientName(this.clientName).done(function (ndata) {
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

    this.shepherd._coapdb.findByClientNameWithId(this.clientName).then(function (ndata) {
        if (!ndata) {
            return self.shepherd._coapdb.insert(self.dump());
        } else {
            return self.dbRemove().then(function () {
                var nodeData = _.assign(self.dump(), { _id: ndata._id });
                return self.shepherd._coapdb.insert(nodeData);
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
    return  this.shepherd._coapdb.removeByClientName(this.clientName, callback);
};

CoapNode.prototype._updateSoAndDb = function (path, data, callback) {
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

CoapNode.prototype._updateObjectInstance = function (oid, iid, data, callback) {
    var deferred = Q.defer(),
        soData = {},
        iObj,
        diff,
        dotPath,
        chkErr = null;

    if (!_.isObject(data))
        chkErr = new TypeError('data should be an object');

    try {
        iObj = this.so.findObjectInstance(oid, iid);
        dotPath = cutils.createPath('.', 'so', oid, iid);

        _.forEach(data, function (val, rid) {
            soData[cutils.ridKey(oid, rid)] = val;
        });
    
        diff = cutils.objectInstanceDiff(iObj, soData);
    } catch (e) {
        chkErr = e;
    }

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        if (!_.isEmpty(diff)) {
            this.shepherd._coapdb.modify(this.clientName, dotPath, diff).done(function (diffObj) {
                _.merge(iObj, diff);
                deferred.resolve(diff);
            }, function (err) {
                deferred.reject(err);
            });
        } else {
            deferred.resolve(diff);
        }
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._updateResource = function (oid, iid, rid, data, callback) {
    var deferred = Q.defer(),
        self = this,
        resource,
        diff,
        dotPath,
        chkErr = null;

    try {
        resource = this.so.get(oid, iid, rid);
        dotPath = cutils.createPath('.', 'so', oid, iid, rid);
        diff = cutils.resourceDiff(resource, data);
    } catch (e) {
        chkErr = e;
    }

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        if (_.isNull(diff)) {
            deferred.resolve(resource);
        } else if (typeof target !== typeof diff) {
            this.shepherd._coapdb.replace(this.clientName, dotPath, diff).done(function (diffObj) {
                self.so.set(oid, iid, rid, diff);
                deferred.resolve(diff);
            }, deferred.reject);
        } else if (_.isPlainObject(diff)) {
            this.shepherd._coapdb.modify(this.clientName, dotPath, diff).done(function (diffObj) {
                _.merge(resource, diff);
                deferred.resolve(diff);
            }, deferred.reject);
        } else {
            this.shepherd._coapdb.modify(this.clientName, dotPath, diff).done(function (diffObj) {
                self.so.set(oid, iid, rid, diff);
                deferred.resolve(diff);
            }, deferred.reject);
        }
    }

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._updateAttrs = function (attrs, callback) {
    var deferred = Q.defer(),
        self = this,
        diff = {},
        chkErr = null;

    if (!_.isPlainObject(attrs)) 
        chkErr = new TypeError('attrs to update should be an object.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        _.forEach(attrs, function (value, key) {
            if (!_.isEqual(self[key], value)) {
                diff[key] = value;
            }
        });
        
        if (_.isEmpty(diff)) {
            deferred.resolve(diff);
        } else {
            this.shepherd._coapdb.modify(this.clientName, '/', diff).done(function () {
                _.forEach(diff, function (val, key) {
                    self[key] = val;
                });
                deferred.resolve(diff);
            }, function (err) {
                deferred.reject(err);
            });
        }
    }

    return deferred.promise.nodeify(callback);
};

/*********************************************************
 * Notify handler function                               *
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
        cnode._updateSoAndDb(path, data).done(function () {
            shepherd.emit('ind', {
                type: 'devNotify',
                cnode: cnode,
                data: {
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
 * Private function                                      *
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
    if (rsp.code !== '4.08') {
        cn._setStatus('online');
    }
}

module.exports = CoapNode;

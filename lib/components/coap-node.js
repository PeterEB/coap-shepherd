'use strict';

var Q = require('q'),
    _ = require('busyman'),
    proving = require('proving'),
    SmartObject = require('smartobject');

var cutils = require('./cutils.js'),
    CNST = require('./constants');

/**** Code Enumerations ****/
var RSP = CNST.RSP;

function CoapNode (shepherd, devAttrs) {
    proving.object(devAttrs, 'devAttrs should be an object.');
    
    this.shepherd = shepherd;
// [TODO] clientName locationPath check
    this.clientName = devAttrs.clientName;
    this.clientId =  shepherd._newClientId(devAttrs.clientId);
    this.locationPath = '/rd/' + this.clientId.toString();
    this.version = devAttrs.version || '1.0.0';
    this.lifetime = devAttrs.lifetime || 86400;

    this.ip = devAttrs.ip || 'unknown';
    this.mac = devAttrs.mac || 'unknown';
    this.port = devAttrs.port || 'unknown';

    this.status = 'offline';
    this.joinTime = devAttrs.joinTime || Date.now();
    this.objList = devAttrs.objList;
    this.so = new SmartObject();
    this.observedList = [];
    this.dataFormat = [];

    if (devAttrs.ct == '11543')
        this.dataFormat.push('application/json');

    this._registered = false;
    this._streamObservers = {};
    this._lifeChecker = null;
    this._sleepChecker = null;

    this.heartbeatEnabled = devAttrs.heartbeatEnabled ? true : false;
    this._heartbeat = null;
}

CoapNode.prototype.lifeCheck = function (enable) {
    proving.boolean(enable, 'enable should be a boolean.');

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
    proving.boolean(enable, 'enable should be a boolean.');
    if (!_.isUndefined(duration))
        proving.number(duration, 'duration should be a number.');

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

/*********************************************************
 * Request function                                      *
 *********************************************************/
CoapNode.prototype.readReq = function (path, callback) {
    var deferred = Q.defer(),
        self = this,
        chkErr = this._reqCheck('read', path),
        reqObj,
        rspObj;

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('GET', cutils.getNumPath(path));
        if (this.dataFormat.includes('application/json'))
            reqObj.options = { Accept: 'application/json' };
        else
            reqObj.options = { Accept: 'application/tlv' };     // Default format is tlv

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
        reqObj = this._reqObj('GET', cutils.getNumPath(path));
        reqObj.options = { Accept: 'application/link-format' };

        this.shepherd.request(reqObj).done(function (rsp) {
            rspObj = { status: rsp.code };
            
            isRspTimeout(rsp, self);
            if (rsp.code === RSP.content) {   // only 2.05 is with data
                rspObj.data = rsp.payload;
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
        chkErr = this._reqCheck('write', path, value),
        reqObj,
        rspObj;

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('PUT', cutils.getNumPath(path));
        if (this.dataFormat.includes('application/json')) {
            reqObj.payload = cutils.encodeJson(path, value);
            reqObj.options = { 'Content-Format': 'application/json' };
        } else {
            reqObj.payload = cutils.encodeTlv(path, value);
            reqObj.options = { 'Content-Format': 'application/tlv' };     // Default format is tlv
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
        chkErr = this._reqCheck('writeAttrs', path, attrs),
        reqObj;

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        reqObj = this._reqObj('PUT', cutils.getNumPath(path));
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
        reqObj = this._reqObj('POST', cutils.getNumPath(path));
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
        reqObj = this._reqObj('GET', cutils.getNumPath(path));
        reqObj.observe = true;
        if (this.dataFormat.includes('application/json'))
            reqObj.options = { Accept: 'application/json' };
        else
            reqObj.options = { Accept: 'application/tlv' };     // Default format is tlv

        this.shepherd.request(reqObj).done(function (observeStream) {
            rspObj = { status: observeStream.code };
            isRspTimeout(observeStream, self);

            if (observeStream.code === RSP.content) {
                type = observeStream.headers['Content-Format'];
                rspObj.data = observeStream.payload;
                
                if (path !== '/heartbeat')
                    self.observedList.push(cutils.getKeyPath(reqObj.pathname));

                self._streamObservers[cutils.getKeyPath(reqObj.pathname)] = observeStream;

                observeStream.once('data', function (value) {
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
        reqObj = this._reqObj('GET', cutils.getNumPath(path));
        reqObj.observe = false;

        this.shepherd.request(reqObj).done(function (rsp) {
            isRspTimeout(rsp, self);

            if (rsp.code === RSP.content) 
                self._cancelObserver(cutils.getKeyPath(reqObj.pathname));

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
    var dumped = this._dumpSummary();
    dumped['so'] = this.so.dumpSync();
    return dumped;
};

CoapNode.prototype._dumpSummary = function () {
    var self = this,
        dumped = {},
        includedKeys = [ 'clientName', 'clientId', 'lifetime', 'version', 'ip', 'mac', 'port', 'objList', 'observedList', 'heartbeatEnabled' ];

    _.forEach(includedKeys, function (key) {
        dumped[key] = _.cloneDeep(self[key]);
    });

    return dumped;
};

/*********************************************************
 * Protected function                                    *
 *********************************************************/
CoapNode.prototype._setStatus = function (status) {
    if (status !== 'online' && status !== 'offline' && status !== 'sleep') 
        throw new TypeError('bad status.');

    var self = this,
        shepherd = this.shepherd;

    if (this.status !== status) {
        this.status = status;

        setImmediate(function () {
            shepherd.emit('ind', { 
                type: 'devStatus', 
                cnode: self,
                data: status 
            });
        });
    }
};

CoapNode.prototype._reqObj = function (method, pathname) {
    proving.string(method, 'method should be a string.');
    proving.string(pathname, 'pathname should be a string.');

    return {
        hostname: this.ip,
        port: this.port,
        pathname: pathname,
        method: method
    };
};

CoapNode.prototype._reqCheck = function (type, path, data) {
    var chkErr = null,
        allowedAttrs = [ 'pmin', 'pmax', 'gt', 'lt', 'stp', 'step' ],
        pathItems;

    proving.string(path, 'path should be a string.');

    switch (type) {
        case 'read':
            break;

        case 'write': 
            pathItems = cutils.getPathArray(path);

            if (!pathItems[1])
                throw Error('path should contain Object ID and Object Instance ID.');
            else if (pathItems.length === 2 && !_.isObject(data)) 
                throw TypeError('value should be an object.');
            else if (_.isFunction(data) || _.isNil(data))
                throw TypeError('value is undefined.');
            break;

        case 'execute':
            pathItems = cutils.getPathArray(path);

            if (!pathItems[1] || !pathItems[2])
                throw Error('path should contain Object ID, Object Instance ID and Resource ID.');
            else if (!_.isArray(data) && !_.isNil(data))
                chkErr = new TypeError('argus should be an array.');
            break;

        case 'discover':
            break;

        case 'writeAttrs':
            proving.object(data, 'data should be an object.');
            
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

    if (!this._registered)
        chkErr = chkErr || new Error(this.clientName + ' was deregistered.');
    else if (this.status === 'offline')
        chkErr = chkErr || new Error(this.clientName + ' is offline.');
    else if (this.status === 'sleep')
        chkErr = chkErr || new Error(this.clientName + ' is sleeping.');

    return chkErr;
};

CoapNode.prototype._readAllResource = function (callback) {
    var deferred = Q.defer(),
        self = this,
        oids = [],
        reqObj,
        readAllResourcePromises = []; 

    _.forEach(this.objList, function (iids, oid) {
        reqObj = self._reqObj('GET', cutils.getNumPath(oid));

        // [TODO]
        reqObj.options = { Accept: 'application/tlv' };
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

CoapNode.prototype._reinitiateObserve = function (callback) {
    var deferred = Q.defer(),
        self = this,
        paths = [],
        reinitiateObservePromises = [];

    if (_.isEmpty(this.observedList)) {
        deferred.resolve();
        return deferred.promise.nodeify(callback);
    }

    _.forEach(this.observedList, function (path) {
        paths.push(path);
        reinitiateObservePromises.push(self.observeReq(path));
    });

    Q.all(reinitiateObservePromises).then(function (rsps) {
        _.forEach(rsps, function (rsp, idx) {
            if (rsp.code !== RSP.content) 
                _.remove(self.observedList, paths[idx]);
        });

        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

CoapNode.prototype._cancelObserver = function (path) {
    var streamObservers = this._streamObservers;

    streamObservers[path].close();
    streamObservers[path] = null;
    delete streamObservers[path];

    if (path !== '/heartbeat')
        _.remove(this.observedList, path);
};

CoapNode.prototype._cancelAllObservers = function () {
    var self = this;

    _.forEach(this._streamObservers, function (observeStream, path) {
        self._cancelObserver(path);
    });
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
        dataType = cutils.getPathDateType(path),
        dataObj = cutils.getPathIdKey(path),
        iObjsUpdater = [],
        iidArray = [];
        
    if (!_.isNil(data)) {
        switch (dataType) {
            case 'object': 
                _.forEach(data, function (iObj, iid) {
                    iObjsUpdater.push(self._updateObjectInstance(dataObj.oid, iid, iObj));
                    iidArray.push(iid);
                });

                Q.all(iObjsUpdater).done(function (diffArray) {
                    deferred.resolve(diffArray);
                }, function (err) {
                    deferred.reject(err);
                });

                break;
            case 'instance': 
                this._updateObjectInstance(dataObj.oid, dataObj.iid, data).done(function (diff) {
                    deferred.resolve(diff);
                }, function (err) {
                    deferred.reject(err);
                });
                break;
            case 'resource': 
                this._updateResource(dataObj.oid, dataObj.iid, dataObj.rid, data).done(function (diff) {
                    deferred.resolve(diff);
                }, function (err) {
                    deferred.reject(err);
                });
                break;
            default:
                deferred.resolve();
                break;
        }
    } else {
        deferred.resolve();
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
            if (!_.isEqual(self[key], value) && key !== 'hb' && key !== 'ct') {
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
        case 'application/json':
            data = cutils.decodeJson(path, value);
            break;
        case 'application/tlv':
            data = cutils.decodeTlv(path, value);
            break;
        default:
            data = cutils.checkRescType(path, value.toString());
            break;
    }

    if (shepherd._enabled && cutils.getPathArray(path)[0] === 'heartbeat') {
        cnode._setStatus('online');
        cnode._heartbeat = cutils.getTime();
    } else if (shepherd._enabled) {
        cnode._setStatus('online');
        cnode._updateSoAndDb(path, data).done(function () {
            setImmediate(function () {
                shepherd.emit('ind', {
                    type: 'devNotify',
                    cnode: cnode,
                    data: {
                        path: cutils.getKeyPath(path),
                        value: data
                    }
                });
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
    } else if (cn.status !== 'sleep')
        cn._setStatus('offline');
}

module.exports = CoapNode;

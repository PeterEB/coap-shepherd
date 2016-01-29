'use strict';

var _ = require('lodash');

var cutils = require('./utils/cutils.js');

function SmartObject() {}

SmartObject.prototype.addObjects = function (sObjs) {
    var self = this;

    _.forEach(sObjs, function (iObj, oid) {
        var oidKey =  cutils.oidKey(oid);

        self[oidKey] = self[oidKey] || {};
        self.addIObjects(oid, iObj);
    });

    return this;
};

SmartObject.prototype.addIObjects = function (oid, iObjs) {
    var self = this,
        oidKey =  cutils.oidKey(oid);

    this[oidKey] = this[oidKey] || {};

    _.forEach(iObjs, function (rObjs, iid) {
        self.addResources(oid, iid, rObjs);
    });

    return this;
};

SmartObject.prototype.addResources = function (oid, iid, rObjs) {
    var self = this,
        oidKey = cutils.oidKey(oid),
        iobj;

    iid = iid || 0;

    this[oidKey] = this[oidKey] || {};
    iobj = this[oidKey][iid] = this[oidKey][iid] || {};

    _.forEach(rObjs, function (rval, rkey) {
        var ridKey;

        if (!_.isNumber(rkey) && !_.isString(rkey))
            throw new TypeError('rid should be a number or a string');

        ridKey = cutils.ridKey(oid, rkey);
        iobj[ridKey] = rval;
    });
    
    return this;
};

module.exports = SmartObject;

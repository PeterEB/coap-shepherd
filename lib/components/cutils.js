'use strict';

var _ = require('busyman'),
    proving = require('proving'),
    lwm2mId = require('lwm2m-id');

var cutils = {};

cutils.getTime = function () {
    return Math.round(new Date().getTime()/1000);
};

/*********************************************************
 * lwm2m-id utils                                        *
 *********************************************************/
cutils.chkPathSlash = function (path) {
    if (path.charAt(0) === '/') {
        return path;
    } else {
        return '/' + path;
    }
};

cutils.oidKey = function (oid) {
    var oidItem = lwm2mId.getOid(oid);
    return oidItem ? oidItem.key : oid;
};

cutils.oidNumber = function (oid) {
    var oidItem = lwm2mId.getOid(oid);

    oidItem = oidItem ? oidItem.value : parseInt(oid);   

    if (_.isNaN(oidItem))
        oidItem = oid;

    return oidItem;
};

cutils.ridKey = function (oid, rid) {
    var ridItem = lwm2mId.getRid(oid, rid);

    if (_.isUndefined(rid))
        rid = oid;

    return ridItem ? ridItem.key : rid;
};

cutils.ridNumber = function (oid, rid) {
    var ridItem = lwm2mId.getRid(oid, rid);

    if (_.isUndefined(rid))
        rid = oid;

    ridItem = ridItem ? ridItem.value : parseInt(rid);   

    if (_.isNaN(ridItem))
        ridItem = rid;

    return ridItem;
};

/*********************************************************
 * req utils                                            *
 *********************************************************/
cutils.getObjListOfSo = function (objList) {
    var objListOfSo = {},
        arrayOfObjList = objList.split(',');        // ['</0>', '</1/2>', '</1/3>', '</2/0>']

    _.forEach(arrayOfObjList, function (obj, idx) {                
        obj = obj.slice(1, -1).split('/');

        if (obj[0] === '')
            obj = obj.slice(1);

        if (obj[0] && !_.has(objListOfSo, obj[0]))
            objListOfSo[obj[0]] = [];

        if (obj[1])
            objListOfSo[obj[0]].push(obj[1]);
    });

    return objListOfSo;     // { '0':[] '1': ['2', '3'], '2':['0'] }
};

cutils.getAttrsAndRsc = function (objList) {    // '</1/2>;pmin=10;pmax=60,</1/2/1>,</1/2/2>'
    var self = this,
        attrsAndRsc = {},
        allowedAttrs = [ 'pmin', 'pmax', 'gt', 'lt', 'stp' ],
        arrayOfObjList = objList.split(','),
        attrs = arrayOfObjList[0].split(';').slice(1),
        rid;    

    arrayOfObjList = arrayOfObjList.slice(1); 

    if (!_.isEmpty(attrs)) {
        attrsAndRsc.attrs = {};
        _.forEach(attrs, function (val) {
            var attr = val.split('=');

            if (_.includes(allowedAttrs, attr[0]))
                attrsAndRsc.attrs[attr[0]] = Number(attr[1]);
        });
    }

    if (!_.isEmpty(arrayOfObjList)) {
        attrsAndRsc.resrcList = {};
        _.forEach(arrayOfObjList, function (obj, idx) {     
            arrayOfObjList[idx] = obj.slice(1, -1).split('/');  

            if (arrayOfObjList[idx][0] === '')
                arrayOfObjList[idx] = arrayOfObjList[idx].slice(1); // [1, 2, 1]

            if (arrayOfObjList[idx][1] && !_.has(attrsAndRsc.resrcList, arrayOfObjList[idx][1]))
                attrsAndRsc.resrcList[arrayOfObjList[idx][1]] = [];

            if (arrayOfObjList[idx][2]) {
                rid = self.ridKey(arrayOfObjList[idx][0], arrayOfObjList[idx][2]);
                attrsAndRsc.resrcList[arrayOfObjList[idx][1]].push(rid);
            }
        });
    }

    return attrsAndRsc;     // { attrs: { pmin: 10, pmax: 60 }, resrcList: { '2': ['1', '2'] } }
};

/*********************************************************
 * path utils                                            *
 *********************************************************/
cutils.urlParser = function (url) {
    var urlObj = {
        pathname: url.split('?')[0],
        query: url.split('?')[1]
    };

    return urlObj;
};

cutils.pathSlashParser = function (url) {
    var path = this.urlParser(url).pathname,
        pathArray = path.split('/');       // '/x/y/z'

    if (pathArray[0] === '') 
        pathArray = pathArray.slice(1);

    if (pathArray[pathArray.length-1] === '')           
        pathArray = pathArray.slice(0, pathArray.length-1);

    return pathArray;  // ['x', 'y', 'z']
};

cutils.getSoKeyObj = function (url) {
    var pathArray = this.pathSlashParser(url),       // '/1/2/3'
        pathObj = {},
        oid,
        rid;

    if (pathArray[0]) {    //oid
        oid = this.oidKey(pathArray[0]);
        pathObj.oid = oid;

        if (pathArray[1]) {    //iid
            pathObj.iid = pathArray[1]; 

            if (pathArray[2]) {    //rid
                rid = this.ridKey(oid, pathArray[2]);
                pathObj.rid = rid;
            }
        }
    }

    return pathObj;     // {oid:'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod'}
};

cutils.getSoKeyPath = function (url) {
    var pathArray = this.pathSlashParser(url),       // '/1/2/3'
        soPath = '',
        oid,
        rid;

    if (pathArray[0]) {    //oid
        oid = this.oidKey(pathArray[0]);
        soPath += '/' + oid;

        if (pathArray[1]) {    //iid
            soPath += '/' + pathArray[1]; 

            if (pathArray[2]) {    //rid
                rid = this.ridKey(oid, pathArray[2]);
                soPath +=  '/' + rid;
            } 
        }
    }

    return soPath;      // '/lwm2mServer/2/defaultMaxPeriod'
};

cutils.getSoValPath = function (url) {
    var pathArray = this.pathSlashParser(url),       // '/1/2/3'
        soPath = '',
        oid,
        rid;

    if (pathArray[0]) {    //oid
        oid = this.oidNumber(pathArray[0]);
        soPath += '/' + oid;

        if (pathArray[1]) {    //iid
            soPath += '/' + pathArray[1]; 

            if (pathArray[2]) {    //rid
                rid = this.ridNumber(oid, pathArray[2]);
                soPath +=  '/' + rid;
            } 
        }
    }

    return soPath;      // '/1/2/3'
};

cutils.pathDateType = function (path) {
    var pathArray = this.pathSlashParser(path),
        dateType = [ 'so', 'object', 'instance', 'resource' ][pathArray.length];
    return dateType;
};

/*********************************************************
 * JSON utils                                            *
 *********************************************************/
cutils.encodeJsonObj = function (basePath, value) {
    var self = this,
        objInJson = { 
            bn: this.chkPathSlash(basePath), 
            'e': [] 
        },
        pathType = this.pathDateType(basePath),
        pathArray = this.pathSlashParser(basePath),
        oid = pathArray[0];

    if (pathType === 'object') {
        if (!_.isPlainObject(value)) throw new TypeError('value should be a object.');
        _.forEach(value, function (iObj, iid) {
            _.forEach(iObj, function (resrc, rid) {
                if (_.isPlainObject(resrc)) {
                    _.forEach(resrc, function (r, riid) {
                        var data = self.encodeJsonValue(iid + '/' + self.ridNumber(oid, rid) + '/' + riid, r);
                        objInJson.e.push(data);
                    });
                } else {
                    var data = self.encodeJsonValue(iid + '/' + self.ridNumber(oid, rid), resrc);
                    objInJson.e.push(data);
                }
            });
        });
    } else if (pathType === 'instance') {
        if (!_.isPlainObject(value)) throw new TypeError('value should be a object.');
        _.forEach(value, function (resrc, rid) {
            if (_.isPlainObject(resrc)) {
                _.forEach(resrc, function (r, riid) {
                    var data = self.encodeJsonValue(self.ridNumber(oid, rid) + '/' + riid, r);
                    objInJson.e.push(data);
                });
            } else {
                var data = self.encodeJsonValue(self.ridNumber(oid, rid), resrc);
                objInJson.e.push(data);
            }
        });
    } else if (pathType === 'resource') {
         if (_.isPlainObject(value)) {
            _.forEach(value, function (r, riid) {
                var data = self.encodeJsonValue(riid, r);
                objInJson.e.push(data);
            });
        } else {
            if (value instanceof Date) value = Number(value);
            var data = self.encodeJsonValue('', value);
            objInJson.e.push(data);
        }
    }

    return objInJson;
};

cutils.encodeJsonValue = function (basePath, value) {
    var val = {};

    if (_.isNil(value)) {
        value = basePath;
        basePath = undefined;
    } else {
        val.n = basePath.toString();
    }

    if (_.isNumber(value)) {
        val.v = Number(value);
    } else if (_.isString(value)) {
        val.sv = String(value);
    } else if (value instanceof Date) {
        val.v = Number(value);       
    } else if (_.isBoolean(value)) {
        val.bv = Boolean(value);
    } else if (_.isPlainObject(value)) {
        val.ov = value;     // [TODO] objlnk
    }

    return val;
};

cutils.decodeJsonObj = function (basePath, value) {
    var self = this,
        data = {},
        pathType = this.pathDateType(basePath),
        oid = this.getSoKeyObj(basePath).oid,
        rid;

    if (value.e) {
        switch (pathType) {
            case 'object':         // obj
                _.forEach(value.e, function (resrc) {
                    var path = resrc.n.split('/'),          // [iid, rid[, riid]]
                        val;

                    if (!_.isUndefined(resrc.v)) {
                        val = resrc.v;
                    } else if (!_.isUndefined(resrc.sv)) {
                        val = resrc.sv;
                    } else if (!_.isUndefined(resrc.bv)) {
                        val = resrc.bv;
                    } else if (!_.isUndefined(resrc.ov)) {
                        val = resrc.ov;     // [TODO] objlnk
                    }

                    if (path[0] === '')
                        path = path.slice(1);

                    if (path[path.length - 1] === '')
                        path = path.slice(0, path.length - 1);

                    if (path[0] && !_.has(data, path[0]))
                        data[path[0]] = {};

                    rid = self.ridKey(oid, path[1]);

                    if (rid && !_.has(data, [path[0], rid])) {
                        if (path[2]) {
                            data[path[0]][rid] = {};
                            data[path[0]][rid][path[2]] = val;
                        } else {
                            data[path[0]][rid] = val;
                        }
                    }
                });
                break;
            case 'instance':         // inst
                _.forEach(value.e, function (resrc) {
                    var path = resrc.n.split('/'),          // [rid[, riid]]
                        val;

                    if (!_.isUndefined(resrc.v)) {
                        val = resrc.v;
                    } else if (!_.isUndefined(resrc.sv)) {
                        val = resrc.sv;
                    } else if (!_.isUndefined(resrc.bv)) {
                        val = resrc.bv;
                    } else if (!_.isUndefined(resrc.ov)) {
                        val = resrc.ov;     // [TODO] objlnk
                    }

                    if (path[0] === '')
                        path = path.slice(1);

                    if (path[path.length - 1] === '')
                        path = path.slice(0, path.length - 1);

                    rid = self.ridKey(oid, path[0]);

                    if (rid && !_.has(data, rid)) {
                        if (path[1]) {
                            data[rid] = {};
                            data[rid][path[1]] = val;
                        } else {
                            data[rid] = val;
                        }
                    }
                });
                break;
            case 'resource':         // resrc
                _.forEach(value.e, function (resrc) {
                    var path = resrc.n,          // [[riid]]
                        val;

                    if (!_.isUndefined(resrc.v)) {
                        val = resrc.v;
                    } else if (!_.isUndefined(resrc.sv)) {
                        val = resrc.sv;
                    } else if (!_.isUndefined(resrc.bv)) {
                        val = resrc.bv;
                    } else if (!_.isUndefined(resrc.ov)) {
                        val = resrc.ov;     // [TODO] objlnk
                    }

                    if (path === '') {
                        data = val;
                        return ;
                    } else if (path && !_.has(data, path)) {
                        data[path] = val;
                    }
                });
                break;
        default:
            break;
        }
    } else if (!_.isPlainObject(value) && pathType !== 'resource') {
        if (!_.isPlainObject(value)) throw new TypeError('value should be a object.');
    } else if (!_.isPlainObject(value) && pathType === 'resource') {
        data = value;
    } else {    // value is object and but not LWM2M format
        data = value;
    }
    
    return data;
};

/*********************************************************
 * Diff utils                                            *
 *********************************************************/
cutils.dotPath = function (path) {
    path = path.replace(/\//g, '.');            // '/1/2/3'

    if (path[0] === '.')                       
        path = path.slice(1);

    if (path[path.length-1] === '.')           
        path = path.slice(0, path.length-1);

    return path;    // 1.2.3
};

cutils.createPath = function () {
    var connector = arguments[0],
        path = '';

    proving.string(connector, 'arguments[0] should be a string.');

    _.forEach(arguments, function (arg, i) {
        if (i > 0) path = path + arg + connector;
    });

    if (path[path.length-1] === connector)           
        path = path.slice(0, path.length-1);

    return path;
};

cutils.buildPathValuePairs = function (rootPath, obj) {
    var result = {};

    rootPath = cutils.dotPath(rootPath);

    if (_.isObject(obj)) {
        if (rootPath !== '' && rootPath !== '.' && rootPath !== '/' && !_.isUndefined(rootPath))
            rootPath = rootPath + '.';

        _.forEach(obj, function (n, key) {
            // Tricky: objList is an array, don't buid its full path, or updating new list will fail
            if (_.isObject(n) && key !== 'objList')
                _.assign(result, cutils.buildPathValuePairs(rootPath + key, n));
            else
                result[rootPath + key] = n;
        });
    } else {
        result[rootPath] = obj;
    }

    return result;
};

cutils.invalidPathOfTarget = function (target, objToUpdate) {
    var invalidPath = [];

    _.forEach(objToUpdate, function (n, p) {
        if (!_.has(target, p)) {
            invalidPath.push(p);
        }
    });

    return invalidPath;
};

cutils.objectInstanceDiff = function (oldInst, newInst) {
    var badPath = cutils.invalidPathOfTarget(oldInst, newInst);

    if (badPath.length !== 0)
        throw new Error('No such property ' + badPath[0] + ' in targeting object instance.');
    else
        return cutils.objectDiff(oldInst, newInst);
};

cutils.resourceDiff = function (oldVal, newVal) {
    var badPath;

    if (typeof oldVal !== typeof newVal) {
        return newVal;
    } else if (_.isPlainObject(oldVal)) {
        // object diff
        badPath = cutils.invalidPathOfTarget(oldVal, newVal);
        if (badPath.length !== 0)
            throw new Error('No such property ' + badPath[0] + ' in targeting object.');
        else
            return cutils.objectDiff(oldVal, newVal);
    } else if (oldVal !== newVal) {
        return newVal;
    } else {
        return null;
    }
};

cutils.objectDiff = function (oldObj, newObj) {
    var pvp = cutils.buildPathValuePairs('/', newObj),
        diff = {};

    _.forEach(pvp, function (val, path) {
        if (!_.has(oldObj, path) || _.get(oldObj, path) !== val)
            _.set(diff, path, val);
    });

    return diff;
};

module.exports = cutils;

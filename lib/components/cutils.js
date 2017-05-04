'use strict';

var _ = require('busyman'),
    proving = require('proving'),
    lwm2mId = require('lwm2m-id'),
    lwm2mCodec = require('lwm2m-codec');

var cutils = {};

cutils.getTime = function () {
    return Math.round(new Date().getTime()/1000);
};

/*********************************************************
 * lwm2m-id utils                                        *
 *********************************************************/
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
        arrayOfObjList = objList.split(','),        // ['</0>;ct=11543;hb', '</1/2>', '</1/3>', '</2/0>']
        opts = {};

    _.forEach(arrayOfObjList, function (obj, idx) {
        if (obj.startsWith('</>')) {
            obj = obj.split(';').slice(1);

            _.forEach(obj, function (attr, idx) {
                obj[idx] = obj[idx].split('=');

                if(obj[idx][0] === 'ct') {
                    if (!opts.ct)
                        opts.ct = [];
                    opts.ct.push(obj[idx][1]);
                } else if (obj[idx][0] === 'hb') {
                    opts.hb = true;
                } else {
                    opts[obj[idx][0]] = obj[idx][1];
                }
            });
        } else {
            obj = obj.slice(1, -1).split('/');

            if (obj[0] === '')
                obj = obj.slice(1);

            if (obj[0] && !_.has(objListOfSo, obj[0]))
                objListOfSo[obj[0]] = [];

            if (obj[1])
                objListOfSo[obj[0]].push(obj[1]);
        }
    });
    
    return { opts: opts, list: objListOfSo };     // { '0':[] '1': ['2', '3'], '2':['0'] }
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

cutils.getPathArray = function (url) {
    var path = this.urlParser(url).pathname,
        pathArray = path.split('/');       // '/x/y/z'

    if (pathArray[0] === '') 
        pathArray = pathArray.slice(1);

    if (pathArray[pathArray.length-1] === '')           
        pathArray = pathArray.slice(0, pathArray.length-1);

    return pathArray;  // ['x', 'y', 'z']
};

cutils.getPathIdKey = function (url) {
    var pathArray = this.getPathArray(url),       // '/1/2/3'
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

cutils.getKeyPath = function (url) {
    var pathArray = this.getPathArray(url),       // '/1/2/3'
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

cutils.getNumPath = function (url) {
    var pathArray = this.getPathArray(url),       // '/lwm2mServer/2/defaultMaxPeriod'
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

cutils.getPathDateType = function (path) {
    var pathArray = this.getPathArray(path),
        dataType = [ 'so', 'object', 'instance', 'resource' ][pathArray.length];
    return dataType;
};

cutils.checkRescType = function (path, value) {
    var pathArray = this.getPathArray(path),
        oid,
        rid,
        dataDef,
        dataType,
        data;

    if (pathArray.length < 3 || _.isObject(value))
        return value;

    oid = cutils.oidKey(pathArray[0]);
    rid = cutils.ridKey(pathArray[0], pathArray[2]);
    dataDef = lwm2mId.getRdef(oid, rid);

    if (dataDef)
        dataType = dataDef.type;
    
    switch (dataType) {
        case 'string':
            data = value;
            break;
        case 'integer':
        case 'float':
            data = Number(value);
            break;
        case 'boolean':
            if (value === '0') {
                data = false;
            } else {
                data = true;
            }
            break;
        case 'time':
            data = value;
            break;
        default:
            if (Number(value))
                data = Number(value);
            else 
                data = value;
            break;
    }

    return data;
};

/*********************************************************
 * Link utils                                            *
 *********************************************************/
cutils.decodeLinkFormat = function (value) {
    return lwm2mCodec.decode('link', value);
};
/*********************************************************
 * TLV utils                                             *
 *********************************************************/
cutils.encodeTlv = function (basePath, value) {
    return lwm2mCodec.encode('tlv', basePath, value);
};

cutils.decodeTlv = function (basePath, value) {
    return lwm2mCodec.decode('tlv', basePath, value);
};

/*********************************************************
 * JSON utils                                            *
 *********************************************************/
cutils.encodeJson = function (basePath, value) {
    return lwm2mCodec.encode('json', basePath, value);
};

cutils.decodeJson = function (basePath, value) {
    return lwm2mCodec.decode('json', basePath, value);
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

cutils.invalidPathOfTarget = function (target, objToUpdata) {
    var invalidPath = [];

    _.forEach(objToUpdata, function (n, p) {
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

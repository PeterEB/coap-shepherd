'use strict';

var urlParser = require('url').parse,
    _ = require('lodash'),
    Enum = require('enum'),
    lwm2mId = require('lwm2m-id');

var RESCODE = new Enum({
    'OK': '2.00',
    'Created': '2.01',
    'Deleted': '2.02',
    'Changed': '2.04',
    'Content': '2.05',
    'BadRequest': '4.00',
    'Unauthorized': '4.01',
    'NotFound': '4.04',
    'MethodNotAllowed': '4.05',
    'Timeout': '4.08',
    'Conflict': '4.09',
    'InternalServerError': '5.00'
});

var cutils = {};

cutils.getResCode = function (code) {
    if (!_.isString(code) && !_.isNumber(code))
        throw new TypeError('code should be a type of string or number.');

    return RESCODE.get(code);
};

cutils.rspCodeKey = function (code) {
    var codeKey = cutils.getResCode(code);
    return codeKey ? codeKey.key : undefined;
};

cutils.rspCodeNum = function (code) {
    var codeNum = cutils.getResCode(code);
    return codeNum ? codeNum.value : undefined;
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

cutils.buildDevAttr = function (req) {
    var devAttr = {};

    _.forEach(_queryParser(req.url), function(queryParam) {     // 'ep=clientName&lt=86400&lwm2m=1.0'
        if(queryParam[0] === 'ep') {
            devAttr.clientName = queryParam[1];
        } else if (queryParam[0] === 'lt') {
            devAttr.lifeTime = parseInt(queryParam[1]);
        } else if (queryParam[0] === 'lwm2m') {
            devAttr.version = queryParam[1];
        }
    });

    devAttr.ip = req.rsinfo.address;
    devAttr.port = req.rsinfo.port;

    if (req.payload.toString() !== '') {
        devAttr.objList = this.getObjListOfSo(req.payload.toString());
    }

    return devAttr;
};

cutils.getObjListOfSo = function (objList) {
    var objListOfSo = {},
        arrayOfObjList = objList.split(',');        // '</1/2>,</1/3>,</2/0>'

    _.forEach(arrayOfObjList, function (obj, idx) {                
        arrayOfObjList[idx] = obj.slice(1, -1).split('/');

        if (arrayOfObjList[idx][0] === '')
            arrayOfObjList[idx] = arrayOfObjList[idx].slice(1);

        if (arrayOfObjList[idx][0] && !_.has(objListOfSo, arrayOfObjList[idx][0]))
            objListOfSo[arrayOfObjList[idx][0]] = [];

        if (arrayOfObjList[idx][1])
            objListOfSo[arrayOfObjList[idx][0]].push(arrayOfObjList[idx][1]);
    });

    return objListOfSo;     // {'1': ['2', '3'], '2':['0']}
};

cutils.getAttrsAndResrcList = function (objList) {    // '</1/2>;pmin=10;pmax=60,</1/2/1>,</1/2/2>'
    var objListOfSo = {},
        arrayOfObjList = objList.split(','),
        attrs = arrayOfObjList[0].split(';').slice(1);    
    arrayOfObjList = arrayOfObjList.slice(1); 

    if (!_.isEmpty(attrs)) {
        objListOfSo.attrs = {};
        _.forEach(attrs, function (val) {
            var attr = val.split('=');
            objListOfSo.attrs[attr[0]] = attr[1];
        });
    }

    if (!_.isEmpty(arrayOfObjList)) {
        objListOfSo.resrcList = {};
        _.forEach(arrayOfObjList, function (obj, idx) {     
            arrayOfObjList[idx] = obj.slice(1, -1).split('/');  

            if (arrayOfObjList[idx][0] === '')
                arrayOfObjList[idx] = arrayOfObjList[idx].slice(1); // [1, 2, 1]

            if (arrayOfObjList[idx][1] && !_.has(objListOfSo.resrcList, arrayOfObjList[idx][1]))
                objListOfSo.resrcList[arrayOfObjList[idx][1]] = [];

            if (arrayOfObjList[idx][2])
                objListOfSo.resrcList[arrayOfObjList[idx][1]].push(arrayOfObjList[idx][2]);
        });
    }

    return objListOfSo;     // { attrs: { pmin: 10, pmax: 60 }, resrcList: { '2': ['1', '2'] } }
};

cutils.uriParser = function (url) {
    var pathname = urlParser(url).pathname,
        pathnameParams = pathname.split('/');       // '/x/y/z'

    if (pathnameParams[0] === '') 
        pathnameParams = pathnameParams.slice(1);

    if (pathnameParams[pathnameParams.length-1] === '')           
        pathnameParams = pathnameParams.slice(0, pathnameParams.length-1);

    return pathnameParams;  // ['x', 'y', 'z']
};

cutils.getSoKeyObj = function (url) {
    var pathnameParams,       // '/1/2/3'
        pathObj = {},
        oid,
        rid;

    if (url) {
        pathnameParams = this.uriParser(url);
        if (pathnameParams[0]) {    //oid
            oid = this.oidKey(pathnameParams[0]);
            pathObj.oid = oid;

            if (pathnameParams[1]) {    //iid
                pathObj.iid = + pathnameParams[1]; 

                if (pathnameParams[2]) {    //rid
                    rid = this.ridKey(oid, pathnameParams[2]);
                    pathObj.rid = rid;
                } 
            }
        }
    }

    return pathObj;     // {oid:'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod'}
};

cutils.getSoValPath = function (url) {
    var pathnameParams = this.uriParser(url),       // '/1/2/3'
        soPath = '',
        oid,
        rid;

    if (pathnameParams[0]) {    //oid
        oid = this.oidNumber(pathnameParams[0]);
        soPath += '/' + oid;

        if (pathnameParams[1]) {    //iid
            soPath += '/' + pathnameParams[1]; 

            if (pathnameParams[2]) {    //rid
                rid = this.ridNumber(oid, pathnameParams[2]);
                soPath +=  '/' + rid;
            } 
        }
    }

    return soPath;      // '/1/2/3'
};

cutils.pathDateType = function (path) {
    var pathnameParams = this.uriParser(path),
        dateType;

    if (pathnameParams.length === 1) {
        dateType = 'object';
    } else if (pathnameParams.length === 2) {
        dateType = 'instance';
    } else if (pathnameParams.length === 3) {
        dateType = 'resource';
    }

    return dateType;
};

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
    _.forEach(arguments, function (arg, i) {
        if (i === 0) return;
        path = path + arg + connector;
    });

    return path.slice(0, path.length - 1);
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
/*********************************************************
 * Private function
 *********************************************************/
function _queryParser (url) {
    var query = urlParser(url).query,
        queryParams = query.split('&');

    _.forEach(queryParams, function (queryParam, idx) {
        queryParams[idx] = queryParam.split('=');
    });

    return queryParams;
}

module.exports = cutils;

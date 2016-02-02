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

cutils.getDevAttr = function (req) {
    var devAttr = {};

    _.forEach(_queryParser(req.url), function(queryParam) {
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
        arrayOfObjList = objList.split(',');

    _.forEach(arrayOfObjList, function (obj, idx) {
        arrayOfObjList[idx] = obj.slice(1, -1).split('/');

        if (arrayOfObjList[idx][0] === '')
            arrayOfObjList[idx] = arrayOfObjList[idx].slice(1);

        if (arrayOfObjList[idx][0] && !_.has(objListOfSo, arrayOfObjList[idx][0]))
            objListOfSo[arrayOfObjList[idx][0]] = [];

        if (arrayOfObjList[idx][1])
            objListOfSo[arrayOfObjList[idx][0]].push(arrayOfObjList[idx][1]);
    });

    return objListOfSo;
};

cutils.uriParser = function (url) {
    var pathname = urlParser(url).pathname,
        pathnameParams = pathname.split('/');

    if(pathnameParams[0] === '') 
        pathnameParams = pathnameParams.slice(1);

    return pathnameParams;
};

cutils.getSoPathKeyObj = function (url) {
    var pathnameParams = this.uriParser(url),
        pathObj = {},
        oid,
        rid;

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

    return pathObj;
};

cutils.getSoValPath = function (url) {
    var pathnameParams = this.uriParser(url),
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

    return soPath;
};

cutils.dotPath = function (path) {
    path = path.replace(/\//g, '.');          

    if (path[0] === '.')                       
        path = path.slice(1);

    if (path[path.length-1] === '.')           
        path = path.slice(0, path.length-1);

    return path;
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

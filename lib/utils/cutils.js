'use strict'

var urlParser = require('url').parse,
    _ = require('lodash'),
    Enum = require('enum'),
    lwm2mId = require('lwm2m-id');

var cutils = {};

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
        devAttr.objList = req.payload.toString();
    }

    return devAttr;
};

cutils.uriParser = function (url) {
    var pathname = urlParser(url).pathname,
        pathnameParams = pathname.split('/');

    if(pathnameParams[0] === '') {
        pathnameParams = pathnameParams.slice(1);
    }

    return pathnameParams;
};

cutils.getSoUri = function (url) {
    var pathname = urlParser(url).pathname,
        pathnameParams = pathname.split('/'),
        soUri = {
            key: '',
            value: ''
        },
        oid,
        rid;

    if(pathnameParams[0] === '') {
        pathnameParams = pathnameParams.slice(1);
    }

    if (pathnameParams[0]) {    //oid
        oid = lwm2mId.getOid(pathnameParams[0]);
        if (oid)
            pathnameParams[0] = oid;

        soUri.key += '/' + pathnameParams[0].key;
        soUri.value += '/' + pathnameParams[0].value;

        if (pathnameParams[1]) {    //iid
            soUri.key += '/' + pathnameParams[1]; 
            soUri.value += '/' + pathnameParams[1]; 

            if (pathnameParams[2]) {    //rid
                rid = lwm2mId.getRid(pathnameParams[0].key, pathnameParams[2]);
                if (rid)
                    pathnameParams[2] = rid;

                soUri.key +=  '/' + pathnameParams[2].key;
                soUri.value +=  '/' + pathnameParams[2].value;
            } 
        }
    }

    return soUri;
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
};

module.exports = cutils;

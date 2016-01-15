'use strict'

var urlParser = require('url').parse,
	_ = require('lodash'),
    lwm2mId = require('lwm2m-id');

var cutils = {};

cutils.uriParser = function (url) {
	var pathname = urlParser(url).pathname,
		pathnameParams = pathname.split('/');

	if(pathnameParams[0] === '') {
        pathnameParams = pathnameParams.slice(1);
    }

	return pathnameParams;
};

//TODO lwm2m-id
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

cutils.queryParser = function (url) {
	var query = urlParser(url).query,
		queryParams = query.split('&');

	_.forEach(queryParams, function (queryParam, idx) {
		queryParams[idx] = queryParam.split('=');
	});

	return queryParams;
};

cutils.getDeviceInfo = function (req) {
	var deviceInfo = {};

	_.forEach(this.queryParser(req.url), function(queryParam) {
        if(queryParam[0] === 'ep') {
            deviceInfo.clientName = queryParam[1];
        } else if (queryParam[0] === 'lt') {
            deviceInfo.lifeTime = parseInt(queryParam[1]);
        } else if (queryParam[0] === 'lwm2m') {
            deviceInfo.lwm2m = queryParam[1];
        }
    });

    deviceInfo.ip = req.rsinfo.address;
	deviceInfo.port = req.rsinfo.port;

    if (req.payload.toString() !== '') {
        deviceInfo.objList = req.payload.toString();
    }

    return deviceInfo;
};

module.exports = cutils;

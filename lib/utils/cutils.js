'use strict'

var urlParser = require('url').parse,
	_ = require('lodash');

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
        soUri = '/';

    if(pathnameParams[0] === '') {
        pathnameParams = pathnameParams.slice(1);
    }

    if (pathnameParams[0]) {    //oid
        soUri += pathnameParams[0];   
        if (pathnameParams[1]) {    //iid
            soUri += '/' + pathnameParams[1]; 
            if (pathnameParams[2]) {    //rid
                soUri +=  '/' + pathnameParams[2];
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

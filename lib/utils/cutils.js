'use strict'

var urlParser = require('url').parse,
	_ = require('lodash');

var cutils = {};

cutils.uriParser = function (url) {
	var pathname = urlParser(url).pathname,
		pathnameParams = pathname.split('/');

	return pathnameParams;
};

cutils.queryParser = function (url) {
	var query = urlParser(url).query,
		queryParams = query.split('&');

	_.forEach(queryParams, function (queryParam, idx) {
		queryParams[idx] = queryParam.split('=');
	});

	return queryParams;
};

module.exports = cutils;

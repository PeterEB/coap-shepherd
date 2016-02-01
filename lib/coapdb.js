'use strict';

var Datastore = require('nedb'),
    Q = require('q'),
    _ = require('lodash'),
    cutils = require('./utils/cutils'),
    config = require('./config/config.js').server,
    db = new Datastore({ filename: (config.dbPath || ('./database/coap.db')), autoload: true });

function Coapdb () {}

Coapdb.prototype.insert = function (doc, callback) {
    var deferred = Q.defer();

    db.insert(doc, function (err, newDoc) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(newDoc);
    });

    return deferred.promise.nodeify(callback);
};

var coapdb = new Coapdb();

module.exports = coapdb;

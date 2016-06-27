'use strict';

var Datastore = require('nedb'),
    Q = require('q'),
    _ = require('busyman'),
    cutils = require('./utils/cutils'),
    config = require('../config.js'),
    db = new Datastore({ filename: (config.dbPath || ( __dirname + '/database/coap.db')), autoload: true });

db.ensureIndex({ fieldName: 'clientName', unique: true }, function (err) {});

var coapdb = new Coapdb();

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

Coapdb.prototype.exportClientNames = function (callback) {
    var deferred = Q.defer();

    db.find({}, { clientName: 1, _id: 0 }, function (err, nodes) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(_.map(nodes, function (cNameInfo) {
                return cNameInfo.clientName;
            }));
        }
    });

    return deferred.promise.nodeify(callback);
};

Coapdb.prototype.findByClientName = function (cName, callback) {
    var deferred = Q.defer();

    db.findOne({ clientName: cName }, { _id: 0 }, function (err, doc) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(doc);
    });

    return deferred.promise.nodeify(callback);
};

Coapdb.prototype.findByClientNameWith_id = function (cName, callback) {
    var deferred = Q.defer();

    db.findOne({ clientName: cName }, function (err, doc) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(doc);
    });

    return deferred.promise.nodeify(callback);
};

Coapdb.prototype.removeByClientName = function (cName, callback) {
    var deferred = Q.defer();

    db.remove({ clientName: cName }, { multi: true }, function (err, numRemoved) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(numRemoved);
    });

    return deferred.promise.nodeify(callback);
};

Coapdb.prototype.replace = function (cName, path, value, callback) {
    var deferred = Q.defer(),
        objToReplace = {};

    if (path === 'clientName' || path === 'locationPath') {
        deferred.reject(new Error('clientName and locationPath cannot be replaced.'));
    } else {
        path = cutils.dotPath(path);
        objToReplace[path] = value;

        this.findByClientName(cName).then(function (doc) {
            if (!doc) {
                deferred.reject(new Error('No such object ' + cName + ' for property replacing.' ));
            } else if (!_.has(doc, path)) {
                deferred.reject(new Error('No such property ' + path + ' to replace.'));
            } else {
                db.update({ clientName: cName }, { $set: objToReplace }, {}, function (err, numRemoved) {
                    if (err)
                        deferred.reject(err);
                    else
                        deferred.resolve(numRemoved);
                });
            }
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }
    return deferred.promise.nodeify(callback);
};

Coapdb.prototype.modify = function (cName, path, obj, callback) {
    var self = this,
        deferred = Q.defer(),
        pLength = path.length + 1,
        diffObj = {},
        invalidPath,
        objToUpdate = cutils.buildPathValuePairs(path, obj);

    if (path === 'clientName' || _.has(obj, 'clientName')) {
        if (obj.clientName !== cName) {
            deferred.reject(new Error('clientName cannot be modified.'));
            return deferred.promise.nodeify(callback);
        }
    }

    this.findByClientName(cName).then(function (doc) {
        if (!doc) {
            deferred.reject(new Error('No such object ' + cName + ' for property modifying.'));
        } else {
            //check if target path exists
            invalidPath = cutils.invalidPathOfTarget(doc, objToUpdate);
            if (invalidPath.length !== 0) {
                deferred.reject(new Error('No such property ' + invalidPath[0] + ' to modify.'));
            } else {
                db.update({ clientName: cName }, { $set: objToUpdate }, { multi : true }, function (err, numReplaced) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        self.findByClientName(cName).done(function (newDoc) {
                            _.forEach(objToUpdate, function (val, checkPath) {
                                var subPath = checkPath.substr(pLength),
                                    newVal = _.get(newDoc, checkPath),
                                    oldVal = _.get(doc, checkPath);

                                subPath = (subPath === '') ? checkPath : subPath;
                                if ( newVal !== oldVal)
                                    _.set(diffObj, subPath, newVal);
                            });

                            deferred.resolve(diffObj);
                        }, function (err) {
                            deferred.reject(err);
                        });
                    }
                });
            }
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

module.exports = coapdb;

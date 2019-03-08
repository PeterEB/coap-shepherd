'use strict';

var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    proving = require('proving'),
    Q = require('q'),
    _ = require('busyman'),
    Datastore = require('nedb'),
    StorageInterface = require('./storage-interface');

function NedbStorage(dbPath) {
    proving.string(dbPath, 'dbPath should be a string.');

    var fullPath, dir;

    if (dbPath) {
        fullPath = path.resolve(dbPath);
        dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    }
    else {
        fullPath = null; // implies inMemoryOnly
    }

    this._db = this._createDatabase(fullPath);
}

util.inherits(NedbStorage, StorageInterface);

NedbStorage.prototype.save = function (cnode) {
    _provingCnode(cnode);

    var deferred = Q.defer();

    this._db.update({ clientName: cnode.clientName }, cnode.dump(), { upsert: true }, function (err, count, upserted) {
        if (err)
            deferred.reject(err);
        else {
            if (upserted) delete upserted._id;
            deferred.resolve(upserted);
        }
    });

    return deferred.promise;
};

NedbStorage.prototype.load = function (cnode) {
    _provingCnode(cnode);

    var deferred = Q.defer();

    this._db.findOne({ clientName: cnode.clientName }, { _id: 0 }, function (err, doc) {
        if (err) return deferred.reject(err);
        if (!doc) return deferred.reject(new Error('coap node data not found'));
        cnode._assignAttrs(doc);
        deferred.resolve(doc);
    });

    return deferred.promise;
};

NedbStorage.prototype.loadAll = function () {
    var deferred = Q.defer();

    this._db.find({}, { _id: 0 }, function (err, docs) {
        if (err) return deferred.reject(err);
        deferred.resolve(docs);
    });

    return deferred.promise;
};

NedbStorage.prototype.remove = function (cnode) {
    _provingCnode(cnode);

    var deferred = Q.defer();

    this._db.remove({ clientName: cnode.clientName }, { multi: true }, function (err, numRemoved) {
        if (err) return deferred.reject(err);
        deferred.resolve(numRemoved > 0);
    });

    return deferred.promise;
};

NedbStorage.prototype.updateAttrs = function (cnode, diff) {
    _provingCnode(cnode);
    if (diff !== null && !_.isPlainObject(diff)) throw new TypeError('diff should be an object if not null.');

    var deferred = Q.defer();

    if (diff === null || Object.keys(diff).length === 0)
        deferred.resolve(null);
    else
        if (diff.clientName)
            deferred.reject(new Error('clientName can not be modified.'));
        else
            this._db.update({ clientName: cnode.clientName }, { $set: diff }, {
                returnUpdatedDocs: true,
                multi: false
            }, function (err, count, doc) {
                if (err) return deferred.reject(err);
                deferred.resolve(diff);
            });

    return deferred.promise;
};

NedbStorage.prototype.patchSo = function (cnode, diff) {
    _provingCnode(cnode);
    if (diff !== null && !_.isPlainObject(diff)) throw new TypeError('diff should be an object if not null.');

    var deferred = Q.defer();

    if (diff === null || Object.keys(diff).length === 0)
        deferred.resolve(null);
    else
        this._db.update({ clientName: cnode.clientName }, { $set: _flatten(diff, 'so') }, {
            returnUpdatedDocs: true,
            multi: false
        }, function (err, count, doc) {
            if (err) return deferred.reject(err);
            deferred.resolve(diff);
        });

    return deferred.promise;
};

NedbStorage.prototype.reset = function () {
    var deferred = Q.defer();

    this._db.remove({}, { multi: true }, function (err, numRemoved) {
        if (err) return deferred.reject(err);
        this._db.loadDatabase(function (err) {
            if (err) return deferred.reject(err);
            deferred.resolve(numRemoved);
        });
    }.bind(this));

    return deferred.promise;
};

NedbStorage.prototype._createDatabase = function (fullPath) {
    var store = new Datastore({
        filename: fullPath,
        autoload: true
    });
    store.ensureIndex({
        fieldName: 'clientName',
        unique: true
    }, function (err) {
        if (err) throw err;
    });
    return store;
};

function _flatten (diff, path) {
    var result = {}, prefix = path ? (path + '.') : '', subObj;
    Object.keys(diff).forEach(function (key) {
        if (!_.isPlainObject(diff[key]))
            result[prefix + key] = diff[key];
        else {
            subObj = _flatten(diff[key], prefix + key);
            Object.keys(subObj).forEach(function (subKey) {
                result[subKey] = subObj[subKey];
            });
        }
    });
    return result;
}

function _provingCnode (cnode) {
    proving.object(cnode, 'cnode should be a CoapNode instance.');
    proving.string(cnode.clientName, 'cnode should be a CoapNode instance.');
    proving.fn(cnode.dump, 'cnode should be a CoapNode instance.');
}

module.exports = NedbStorage;

'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q');

var coapP = require('./coapProcessor.js'),
    devRegistry = require('./devRegistry.js'),
    registration = require('./registration.js'),
    config = require('./config/config.js').server;

function CoapShepherd() {}

util.inherits(CoapShepherd, EventEmitter);

CoapShepherd.prototype.start = function (callback) {
    var deferred = Q.defer();

    coapP.start(config).then(function (server) {
        console.log('coap-shepherd server start!');
        devRegistry.startLifeTimeCheck();
        this.emit('ready');
        deferred.resolve(server);
    }, function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.stop = function (callback) {
    var deferred = Q.defer();

    coapP.stop().then(function () {
        console.log('coap-shepherd server stop!');
        devRegistry.stopLifeTimeCheck();
        deferred.resolve();
    }, function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.find = function (name, callback) {
    var deferred = Q.defer();

    devRegistry.getByName(name).then(function (node) {
        deferred.resolve(node);
    }, function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

CoapShepherd.prototype.info = function (callback) {
    var deferred = Q.defer();
    
    if (config) {
        deferred.resolve(config);
    } else {
        deferred.reject(new Error('not found config'));
    }
    
    return deferred.promise.nodeify(callback);
};

var coapShepherd = new CoapShepherd();

/*********************************************************
 * Event Listener
 *********************************************************/
devRegistry.on('ind', indHandler);
devRegistry.on('error', errHandler);

/*********************************************************
 * Handler function
 *********************************************************/
function indHandler(data) {
    switch (data.type) {
        case 'lifeTimeOut':
            console.log('device ' + data.data.clientName + ' lifeTimeOut');
            coapShepherd.emit('ind', data);
            break;
        case 'registered':
            console.log('device ' + data.data.clientName + ' registered');
            coapShepherd.emit('ind', data);
            break;
        case 'updated':
            console.log('device ' + data.data.clientName + ' updated');
            coapShepherd.emit('ind', data);
            break;
        case 'unregistered':
            console.log('device ' + data.data + ' unregistered');
            coapShepherd.emit('ind', data);
            break;
    }
}

function errHandler(data) {
    console.log(data.data);
    switch (data.type) {
        case 'lifeTimeOut':
            coapShepherd.emit('error', data.data);
            break;
        case 'registered':
            coapShepherd.emit('error', data.data);
            break;
        case 'updated':
            coapShepherd.emit('error', data.data);
            break;
        case 'unregistered':
            coapShepherd.emit('error', data.data);
            break;
    }
}


module.exports = coapShepherd;

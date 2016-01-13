'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

var coapP = require('./coapProcessor.js'),
    devRegistry = require('./devRegistry.js'),
    cutils = require('./utils/cutils.js');

function Registration () {}

util.inherits(Registration, EventEmitter);

Registration.prototype.register = function (callback) {

};

Registration.prototype.updata = function (callback) {
    
};

Registration.prototype.unregister = function (callback) {
    
};

var registration = new Registration();

/*********************************************************
 * Event Listener
 *********************************************************/
coapP.on('ind', coapPHandler);
registration.on('register', registerHandler);
registration.on('updata', updateHandler);
registration.on('unregister', unregisterHandler);

/*********************************************************
 * Handler function
 *********************************************************/
function coapPHandler (data) {
    switch (data.type) {
        case 'register':
            registration.emit('register', data);
            break;
        case 'updata':
            registration.emit('updata', data);
            break;
        case 'unregister':
            registration.emit('unregister', data);
            break;
    }
}

function registerHandler (data) {
    var deviceInfo = cutils.getDeviceInfo(data.req);

    devRegistry.register(deviceInfo).then(function (device) {
        data.res.code = '2.01';
        data.res.setOption('Location-Path', 'rd/' + device.id);
        data.res.end('');
    }, function (err) {
        data.res.code = '4.04';
        data.res.end(err);
    }).done();
}

function updateHandler (data) {
    var deviceInfo = cutils.getDeviceInfo(data.req),
        id = cutils.uriParser(data.req.url)[1];

    devRegistry.update(id, deviceInfo).then(function (device) {
        data.res.code = '2.04';
        data.res.end('');
    }, function (err) {
        data.res.code = '4.04';
        data.res.end(err);
    }).done();
}

function unregisterHandler (data) {
    var id = cutils.uriParser(data.req.url)[1];

    devRegistry.unregister(id).then(function (device) {
        data.res.code = '2.02';
        data.res.end('');
    }, function (err) {
        data.res.code = '4.04';
        data.res.end(err);
    }).done();

}

module.exports = registration;

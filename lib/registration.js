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
    var deviceInfo = {};

    _.forEach(cutils.queryParser(data.req.url), function(queryParam) {
        if(queryParam[0] === 'ep') {
            deviceInfo.name = queryParam[1];
        } else if (queryParam[0] === 'lt') {
            deviceInfo.lifeTime = parseInt(queryParam[1]);
        } else if (queryParam[0] === 'lwm2m') {
            deviceInfo.lwm2m = queryParam[1];
        } else if (queryParam[0] === 'sms') {
            deviceInfo.sms = queryParam[1];
        }
    });

    deviceInfo.ip = data.req.rsinfo.address;
    deviceInfo.port = data.req.rsinfo.port;

    if (!deviceInfo.lifeTime) {
        deviceInfo.lifeTime = 86400;
    }

    deviceInfo.startTime = Math.round(new Date().getTime()/1000);
    deviceInfo.status = 'online';
    deviceInfo.objList = data.req.payload.toString();

    devRegistry.register(deviceInfo).then(function (device) {
        registration.emit('msg', {type: 'registered', data: device});
        data.res.code = '2.01';
        data.res.setOption('Location-Path', 'rd/' + device.id);
        data.res.end('');
    }, function (err) {
        registration.emit('error', {type: 'registered', data: err});
        data.res.code = '4.04';
        data.res.end(err);
    }).done();
}

function updateHandler (data) {
    var deviceInfo = {},
        id = cutils.uriParser(data.req.url)[2];

    _.forEach(cutils.queryParser(data.req.url), function(queryParam) {
        if (queryParam[0] === 'lt') {
            deviceInfo.lifeTime = parseInt(queryParam[1]);
        } else if (queryParam[0] === 'sms') {
            deviceInfo.sms = queryParam[1];
        }
    });

    deviceInfo.ip = data.req.rsinfo.address;
    deviceInfo.port = data.req.rsinfo.port;
    deviceInfo.startTime = Math.round(new Date().getTime()/1000);
    deviceInfo.status = 'online';

    if (data.req.payload.toString() !== '') {
        deviceInfo.objList = data.req.payload.toString();
    }

    devRegistry.update(id, deviceInfo).then(function (device) {
        registration.emit('msg', {type: 'updated', data: device});
        data.res.code = '2.04';
        data.res.end('');
    }, function (err) {
        registration.emit('error', {type: 'updated', data: err});
        data.res.code = '4.04';
        data.res.end(err);
    }).done();
}

function unregisterHandler (data) {
    var id = cutils.uriParser(data.req.url)[2];

    devRegistry.unregister(id).then(function (device) {
        registration.emit('msg', {type: 'unregistered', data: device});
        data.res.code = '2.02';
        data.res.end('');
    }, function (err) {
        registration.emit('error', {type: 'unregistered', data: err});
        data.res.code = '4.04';
        data.res.end(err);
    }).done();

}

module.exports = registration;

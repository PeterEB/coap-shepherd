'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash'),
    coapP = require('./coapProcessor.js'),
    devRegistry = require('./devRegistry.js'),
    cutils = require('./cutils.js');

function Registration () {}

util.inherits(Registration, EventEmitter);

Registration.prototype.reister = function (req, res) {

};

Registration.prototype.updata = function (req, res) {
    
};

Registration.prototype.unreister = function (req, res) {
    
};

var registration = new Registration();
/*************************************************************************************************/
/*** Event Listener                                                                            ***/
/*************************************************************************************************/
coapP.on('ind', coapPHandler);

registration.on('reister', reisterHandler);
registration.on('updata', updataHandler);
registration.on('unreister', unreisterHandler);
/*********************************************************
 * Handler function
 *********************************************************/
function coapPHandler (data) {
    switch (data.type) {
        case 'reister':
            registration.emit('reister', data);
            break;
        case 'updata':
            registration.emit('updata', data);
            break;
        case 'unreister':
            registration.emit('unreister', data);
            break;
    }
}

function reisterHandler (data) {
    var device = {};

    _.forEach(cutils.queryParser(data.req.url), function(queryParam) {
        if(queryParam[0] === 'ep') {
            device.name = queryParam[1];
        } else if (queryParam[0] === 'lt') {
            device.lifetime = parseInt(queryParam[1]);
        }
    });

    device.ip = data.req.rsinfo.address;
    device.port = data.req.rsinfo.port;
    device.startTime = Math.round(new Date().getTime()/1000);
    device.status = 'online';
    device.objList = data.req.payload.toString();

    devRegistry.register(device).then(function (id) {
        console.log(id);
        console.log(devRegistry.registry);
    });
}

function updataHandler (data) {
    
}

function unreisterHandler (data) {
    
}

module.exports = registration;

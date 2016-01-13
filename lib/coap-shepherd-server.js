'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter;

var coapP = require('./coapProcessor.js'),
    devRegistry = require('./devRegistry.js'),
    registration = require('./registration.js'),
    config = require('./config/config.js').server;

function CoapShepherd() {}

util.inherits(CoapShepherd, EventEmitter);

CoapShepherd.prototype.start = function (callback) {
    coapP.start(config).then(function (server) {
        console.log('coap-shepherd server start!');

        devRegistry.startLifeTimeCheck();
    }, function (err) {
        console.log(err);
    }).done();
};

CoapShepherd.prototype.stop = function (callback) {
    coapP.stop().then(function () {
        console.log('coap-shepherd server stop!');

        devRegistry.stopLifeTimeCheck();
    }, function (err) {
        console.log(err);
    }).done();
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
            coapShepherd.emit('error', data);
            break;
        case 'registered':
            coapShepherd.emit('error', data);
            break;
        case 'updated':
            coapShepherd.emit('error', data);
            break;
        case 'unregistered':
            coapShepherd.emit('error', data);
            break;
    }
}


module.exports = coapShepherd;

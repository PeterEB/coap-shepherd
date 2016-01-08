'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter;

var coapP = require('./coapProcessor.js'),
    registration = require('./registration.js'),
    devRegistry = require('./devRegistry.js'),
    devManagement = require('./devManagement.js'),
    infoReporting = require('./infoReporting'),
    config = require('./config/config.js').server;

function CoapShepherd() {}

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

CoapShepherd.prototype.read = function (callback) {
    devManagement.read();
};

CoapShepherd.prototype.write = function (callback) {
    devManagement.write();
};

var coapShepherd = new CoapShepherd();

/*********************************************************
 * Event Listener
 *********************************************************/
devRegistry.on('msg', msgHandler);
devRegistry.on('error', errHandler);
registration.on('msg', msgHandler);
registration.on('error', errHandler);

/*********************************************************
 * Handler function
 *********************************************************/
function msgHandler(data) {
    switch (data.type) {
        case 'lifeTimeOut':
            console.log('device ' + data.data.name + ' lifeTimeOut');
            break;
        case 'registered':
            console.log('device ' + data.data.name + ' registered');
            break;
        case 'updated':
            console.log('device ' + data.data.name + ' updated');
            break;
        case 'unregistered':
            console.log('device ' + data.data.name + ' unregistered');
            break;
    }
}

function errHandler(data) {
    console.log(data.data);
    switch (data.type) {
        case 'lifeTimeOut':
            break;
        case 'registered':
            break;
        case 'updated':
            break;
        case 'unregistered':
            break;
    }
}


module.exports = coapShepherd;

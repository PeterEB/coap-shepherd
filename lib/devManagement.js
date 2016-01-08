'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

var coapP = require('./coapProcessor.js'),
    devRegistry = require('./devRegistry.js'),
    cutils = require('./utils/cutils.js');

function DevManagement () {}

util.inherits(DevManagement, EventEmitter);

DevManagement.prototype.read = function (callback) {
    
};

DevManagement.prototype.write = function (callback) {
    
};

var devManagement = new DevManagement();

module.exports = devManagement;


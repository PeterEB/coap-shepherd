'use strict'

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    _ = require('lodash');

var coapP = require('./coapProcessor.js'),
    devRegistry = require('./devRegistry.js'),
    cutils = require('./utils/cutils.js');

function InfoReporting () {}

util.inherits(InfoReporting, EventEmitter);

var infoReporting = new InfoReporting();

module.exports = infoReporting;

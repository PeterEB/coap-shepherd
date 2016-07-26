var should = require('should'),
    _ = require('busyman'),
    CoapNode = require('../lib/components/coap-node'),
    shepherd = require('../lib/coap-shepherd');

describe('Constructor Check', function () {
    it('CoapShepherd', function () {
        should(shepherd.clientIdCount).be.eql(1);
        should(shepherd._registry).be.eql({});
        should(shepherd._enabled).be.false();
        should(shepherd._shepherdTest).be.false();
        should(shepherd._server).be.null();
        should(shepherd._hbChecker).be.null();
    });
});

describe('Function Check', function () {
    it('start', function () {
        shepherd.start().then(function () {
            if (shepherd._registry === {} && shepherd._enabled === true && shepherd._shepherdTest === true )
                done();
        });
    });

    it('stop', function () {
        shepherd.stop().then(function () {
            if (shepherd._enabled === false && shepherd._shepherdTest === true && shepherd._server === null)
                done();
        });
    });
});

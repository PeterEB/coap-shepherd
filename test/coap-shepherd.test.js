var should = require('should'),
    _ = require('busyman'),
    CoapNode = require('../lib/components/coap-node'),
    shepherd = require('../lib/coap-shepherd');

describe('coap-shepherd - Constructor Check', function () {
    it('coapShepherd', function () {
        should(shepherd.clientIdCount).be.eql(1);
        should(shepherd._registry).be.eql({});
        should(shepherd._enabled).be.false();
        should(shepherd._server).be.null();
        should(shepherd._hbChecker).be.null();
    });
});

describe('coap-shepherd - Functional Check', function () {
    it('#.start()', function () {
        shepherd.start().then(function () {
            if (shepherd._registry === {} && shepherd._enabled === true)
                done();
        });
    });

    it('#.stop()', function () {
        shepherd.stop().then(function () {
            if (shepherd._enabled === false && shepherd._server === null)
                done();
        });
    });
});

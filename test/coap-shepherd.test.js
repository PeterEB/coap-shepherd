var _ = require('busyman'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect;

chai.use(sinonChai);

var CoapNode = require('../lib/components/coap-node'),
    shepherd = require('../lib/coap-shepherd');

describe('coap-shepherd', function () {
    describe('Constructor Check', function () {
        it('coapShepherd', function () {
            expect(shepherd.clientIdCount).to.be.eql(1);
            expect(shepherd._registry).to.be.eql({});
            expect(shepherd._enabled).to.be.false;
            expect(shepherd._server).to.be.eql(null);
            expect(shepherd._hbChecker).to.be.eql(null);
        });
    });

    describe('Functional Check', function () {
        it('#.start()', function (done) {
            shepherd.start().then(function () {
                if (_.isEqual(shepherd._registry, {}) && shepherd._enabled === true)
                    done();
            });
        });

        it('#.stop()', function (done) {
            shepherd.stop().then(function () {
                if (shepherd._enabled === false && shepherd._server === null)
                    done();
            });
        });
    });
});

function emitServerRawMessage(shepherd, req) {
    var server = shepherd._server;

    server.emit('request', req, rsp);
}
var fs = require('fs'),
    path = require('path'),
    _ = require('busyman'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect;

chai.use(sinonChai);

var CoapNode = require('../lib/components/coap-node'),
    shepherd = require('../lib/coap-shepherd');

try {
    fs.unlinkSync(path.resolve('./lib/database/coap.db'));
} catch (e) {
    console.log(e);
}

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
    describe('Signature Check', function () {
        describe('#.find()', function () {
            it('should throw TypeError if clientName is not a string', function () {
                expect(function () { return shepherd.find(); }).to.throw(TypeError);
                expect(function () { return shepherd.find(undefined); }).to.throw(TypeError);
                expect(function () { return shepherd.find(null); }).to.throw(TypeError);
                expect(function () { return shepherd.find(NaN); }).to.throw(TypeError);
                expect(function () { return shepherd.find(10); }).to.throw(TypeError);
                expect(function () { return shepherd.find([]); }).to.throw(TypeError);
                expect(function () { return shepherd.find({}); }).to.throw(TypeError);
                expect(function () { return shepherd.find(true); }).to.throw(TypeError);
                expect(function () { return shepherd.find(new Date()); }).to.throw(TypeError);
                expect(function () { return shepherd.find(function () {}); }).to.throw(TypeError);

                expect(function () { return shepherd.find('xx'); }).not.to.throw(TypeError);
            });
        });

        describe('#.findByMacAddr()', function () {
            it('should throw TypeError if macAddr is not a string', function () {
                expect(function () { return shepherd.findByMacAddr(); }).to.throw(TypeError);
                expect(function () { return shepherd.findByMacAddr(undefined); }).to.throw(TypeError);
                expect(function () { return shepherd.findByMacAddr(null); }).to.throw(TypeError);
                expect(function () { return shepherd.findByMacAddr(NaN); }).to.throw(TypeError);
                expect(function () { return shepherd.findByMacAddr(10); }).to.throw(TypeError);
                expect(function () { return shepherd.findByMacAddr([]); }).to.throw(TypeError);
                expect(function () { return shepherd.findByMacAddr({}); }).to.throw(TypeError);
                expect(function () { return shepherd.findByMacAddr(true); }).to.throw(TypeError);
                expect(function () { return shepherd.findByMacAddr(new Date()); }).to.throw(TypeError);
                expect(function () { return shepherd.findByMacAddr(function () {}); }).to.throw(TypeError);

                expect(function () { return shepherd.findByMacAddr('xx'); }).not.to.throw(TypeError);
            });
        });

        describe('#._findByClientId()', function () {
            it('should throw TypeError if clientId is not a string or a number', function () {
                expect(function () { return shepherd._findByClientId(); }).to.throw(TypeError);
                expect(function () { return shepherd._findByClientId(undefined); }).to.throw(TypeError);
                expect(function () { return shepherd._findByClientId(null); }).to.throw(TypeError);
                expect(function () { return shepherd._findByClientId(NaN); }).to.throw(TypeError);
                expect(function () { return shepherd._findByClientId([]); }).to.throw(TypeError);
                expect(function () { return shepherd._findByClientId({}); }).to.throw(TypeError);
                expect(function () { return shepherd._findByClientId(true); }).to.throw(TypeError);
                expect(function () { return shepherd._findByClientId(new Date()); }).to.throw(TypeError);
                expect(function () { return shepherd._findByClientId(function () {}); }).to.throw(TypeError);

                expect(function () { return shepherd._findByClientId(10); }).not.to.throw(TypeError);
                expect(function () { return shepherd._findByClientId('xx'); }).not.to.throw(TypeError);
            });
        });

        describe('#._findByLocationPath()', function () {
            it('should throw TypeError if clientId is not a string', function () {
                expect(function () { return shepherd._findByLocationPath(); }).to.throw(TypeError);
                expect(function () { return shepherd._findByLocationPath(undefined); }).to.throw(TypeError);
                expect(function () { return shepherd._findByLocationPath(null); }).to.throw(TypeError);
                expect(function () { return shepherd._findByLocationPath(NaN); }).to.throw(TypeError);
                expect(function () { return shepherd._findByLocationPath(10); }).to.throw(TypeError);
                expect(function () { return shepherd._findByLocationPath([]); }).to.throw(TypeError);
                expect(function () { return shepherd._findByLocationPath({}); }).to.throw(TypeError);
                expect(function () { return shepherd._findByLocationPath(true); }).to.throw(TypeError);
                expect(function () { return shepherd._findByLocationPath(new Date()); }).to.throw(TypeError);
                expect(function () { return shepherd._findByLocationPath(function () {}); }).to.throw(TypeError);

                expect(function () { return shepherd._findByLocationPath('xx'); }).not.to.throw(TypeError);
            });
        });

        describe('#.permitJoin()', function () {
            it('should throw TypeError if time is not a number', function () {
                expect(function () { return shepherd.permitJoin(); }).to.throw(TypeError);
                expect(function () { return shepherd.permitJoin(undefined); }).to.throw(TypeError);
                expect(function () { return shepherd.permitJoin(null); }).to.throw(TypeError);
                expect(function () { return shepherd.permitJoin(NaN); }).to.throw(TypeError);
                expect(function () { return shepherd.permitJoin('xx'); }).to.throw(TypeError);
                expect(function () { return shepherd.permitJoin([]); }).to.throw(TypeError);
                expect(function () { return shepherd.permitJoin({}); }).to.throw(TypeError);
                expect(function () { return shepherd.permitJoin(true); }).to.throw(TypeError);
                expect(function () { return shepherd.permitJoin(new Date()); }).to.throw(TypeError);
                expect(function () { return shepherd.permitJoin(function () {}); }).to.throw(TypeError);

                expect(function () { return shepherd.permitJoin(10); }).not.to.throw(TypeError);
            });
        });

        describe('#.request()', function () {
            it('should throw TypeError if reqObj is not an object', function () {
                expect(function () { return shepherd.request(); }).to.throw(TypeError);
                expect(function () { return shepherd.request(undefined); }).to.throw(TypeError);
                expect(function () { return shepherd.request(null); }).to.throw(TypeError);
                expect(function () { return shepherd.request(NaN); }).to.throw(TypeError);
                expect(function () { return shepherd.request(10); }).to.throw(TypeError);
                expect(function () { return shepherd.request('xx'); }).to.throw(TypeError);
                expect(function () { return shepherd.request([]); }).to.throw(TypeError);
                expect(function () { return shepherd.request(true); }).to.throw(TypeError);
                expect(function () { return shepherd.request(new Date()); }).to.throw(TypeError);
                expect(function () { return shepherd.request(function () {}); }).to.throw(TypeError);

                expect(function () { return shepherd.request({}); }).not.to.throw(TypeError);
            });
        });

        describe('#.announce()', function () {
            it('should throw TypeError if msg is not a string', function () {
                expect(function () { return shepherd.announce(); }).to.throw(TypeError);
                expect(function () { return shepherd.announce(undefined); }).to.throw(TypeError);
                expect(function () { return shepherd.announce(null); }).to.throw(TypeError);
                expect(function () { return shepherd.announce(NaN); }).to.throw(TypeError);
                expect(function () { return shepherd.announce(10); }).to.throw(TypeError);
                expect(function () { return shepherd.announce({}); }).to.throw(TypeError);
                expect(function () { return shepherd.announce([]); }).to.throw(TypeError);
                expect(function () { return shepherd.announce(true); }).to.throw(TypeError);
                expect(function () { return shepherd.announce(new Date()); }).to.throw(TypeError);
                expect(function () { return shepherd.announce(function () {}); }).to.throw(TypeError);

                expect(function () { return shepherd.announce('xx'); }).not.to.throw(TypeError);
            });
        });

        describe('#.remove()', function () {
            it('should throw TypeError if clientName is not a string', function () {
                expect(function () { return shepherd.remove(); }).to.throw(TypeError);
                expect(function () { return shepherd.remove(undefined); }).to.throw(TypeError);
                expect(function () { return shepherd.remove(null); }).to.throw(TypeError);
                expect(function () { return shepherd.remove(NaN); }).to.throw(TypeError);
                expect(function () { return shepherd.remove(10); }).to.throw(TypeError);
                expect(function () { return shepherd.remove({}); }).to.throw(TypeError);
                expect(function () { return shepherd.remove([]); }).to.throw(TypeError);
                expect(function () { return shepherd.remove(true); }).to.throw(TypeError);
                expect(function () { return shepherd.remove(new Date()); }).to.throw(TypeError);
                expect(function () { return shepherd.remove(function () {}); }).to.throw(TypeError);

                expect(function () { return shepherd.remove('xx'); }).not.to.throw(TypeError);
            });
        });

        describe('#._newClientId()', function () {
            it('should throw TypeError if id is not a number', function () {
                expect(function () { return shepherd._newClientId(); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId(undefined); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId(null); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId(NaN); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId('xx'); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId({}); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId([]); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId(true); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId(new Date()); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId(function () {}); }).to.throw(TypeError);

                expect(function () { return shepherd._newClientId(10); }).not.to.throw(TypeError);
            });
        });
    });

    describe('Functional Check', function () {
        this.timeout(5000);

        describe('#.start()', function () {
            it('should start shepherd', function (done) {
                shepherd.start().then(function () {
                    if (_.isEqual(shepherd._registry, {}) && shepherd._enabled === true)
                        done();
                }).fail(function (err) {
                    console.log(err);
                });
            });
        });

        describe('#.stop()', function () {
            it('should stop shepherd', function (done) {
                shepherd.stop().then(function () {
                    if (shepherd._enabled === false && shepherd._server === null)
                        done();
                }).fail(function (err) {
                    console.log(err);
                });
            });
        });

        describe('#.reset()', function () {
            it('should reset shepherd', function (done) {
                shepherd.reset().then(function () {
                    if (shepherd._enabled === true)
                        done();
                }).fail(function (err) {
                    console.log(err);
                });
            });
        });

        describe('#.permitJoin()', function () {
            it('should open permitJoin', function () {
                shepherd.permitJoin(180);
                expect(shepherd._joinable).to.be.eql('on');
            });
        });

        describe('#register new cnode', function () {

        });

        describe('#update cnode', function () {

        });

        describe('#deregister cnode', function () {

        });

        describe('#.find()', function () {

        });

        describe('#.findByMacAddr()', function () {

        });

        describe('#._findByClientId()', function () {

        });

        describe('#._findByLocationPath()', function () {

        });

        describe('#.list()', function () {

        });

        describe('#.request()', function () {

        });

        describe('#.announce()', function () {

        });

        describe('#.remove()', function () {

        });
    });
});

function emitServerRawMessage(shepherd, req) {
    var server = shepherd._server;

    server.emit('request', req, rsp);
}
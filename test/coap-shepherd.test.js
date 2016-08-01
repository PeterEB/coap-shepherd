var fs = require('fs'),
    path = require('path'),
    Q = require('q'),
    _ = require('busyman'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect,
    coap = require('coap');

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
                expect(function () { return shepherd._newClientId(NaN); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId('xx'); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId({}); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId([]); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId(true); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId(new Date()); }).to.throw(TypeError);
                expect(function () { return shepherd._newClientId(function () {}); }).to.throw(TypeError);

                expect(function () { return shepherd._newClientId(); }).not.to.throw(TypeError);
                expect(function () { return shepherd._newClientId(undefined); }).not.to.throw(TypeError);
                expect(function () { return shepherd._newClientId(null); }).not.to.throw(TypeError);
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
            before(function () {
                shepherd.clientIdCount = 1;
            });

            it('should register new cnode', function (done) {
                var _readAllResourceStub = sinon.stub(CoapNode.prototype, '_readAllResource', function (path, callback) {
                        return Q.resolve({
                            status: '2.05',
                            data: { x: {'0': { 'x0': 10, 'x1': 20 }, '1':{ 'x0': 11, 'x1': 21 }},
                                    y: {'0': { 'y0': 20, 'y1': 40 }, '1':{ 'y0': 22, 'y1': 44 }}}
                        });
                    }),
                    observeReqStub = sinon.stub(CoapNode.prototype, 'observeReq', function (callback) {
                        return Q.resolve({
                            status: '2.05',
                            data: 'hb'
                        });
                    }),
                    rsp = {},
                    cnode,
                    regCallback = function (msg) {
                        if (msg.type === 'registered') {
                            cnode = msg.data;
                            _readAllResourceStub.restore();
                            observeReqStub.restore();
                            expect(rsp.setOption).to.have.been.calledWith('Location-Path', cnode.locationPath);
                            expect(rsp.end).to.have.been.calledWith('');
                            if (shepherd.find('cnode01') === cnode) {
                                shepherd.removeListener('ind', regCallback);
                                done();
                            }
                        }
                    };

                rsp.setOption = sinon.spy();
                rsp.end = sinon.spy();

                shepherd.on('ind', regCallback);

                emitClintReqMessage(shepherd, {
                    code: '0.01',
                    method: 'POST',
                    url: '/rd?ep=cnode01&lt=86400&lwm2m=1.0.0&mac=AA:AA:AA',
                    rsinfo: {
                        address: '127.0.0.1',
                        port: '5686'
                    },
                    payload: '</x/0>,</x/1>,</y/0>,</y/1>',
                    headers: {}
                }, rsp);
            });

            it('should register 2nd new cnode', function (done) {
                var _readAllResourceStub = sinon.stub(CoapNode.prototype, '_readAllResource', function (path, callback) {
                        return Q.resolve({
                            status: '2.05',
                            data: { a: {'0': { 'a0': 10, 'a1': 20 }, '1':{ 'a0': 11, 'a1': 21 }},
                                    b: {'0': { 'b0': 20, 'b1': 40 }, '1':{ 'b0': 22, 'b1': 44 }}}
                        });
                    }),
                    observeReqStub = sinon.stub(CoapNode.prototype, 'observeReq', function (callback) {
                        return Q.resolve({
                            status: '2.05',
                            data: 'hb'
                        });
                    }),
                    rsp = {},
                    cnode,
                    regCallback = function (msg) {
                        if (msg.type === 'registered') {
                            cnode = msg.data;
                            _readAllResourceStub.restore();
                            observeReqStub.restore();
                            expect(rsp.setOption).to.have.been.calledWith('Location-Path', cnode.locationPath);
                            expect(rsp.end).to.have.been.calledWith('');
                            if (shepherd.find('cnode02') === cnode) {
                                shepherd.removeListener('ind', regCallback);
                                done();
                            }
                        }
                    };

                rsp.setOption = sinon.spy();
                rsp.end = sinon.spy();

                shepherd.on('ind', regCallback);

                emitClintReqMessage(shepherd, {
                    code: '0.01',
                    method: 'POST',
                    url: '/rd?ep=cnode02&lt=86400&lwm2m=1.0.0&mac=BB:BB:BB',
                    rsinfo: {
                        address: '127.0.0.1',
                        port: '5687'
                    },
                    payload: '</a/0>,</a/1>,</b/0>,</b/1>',
                    headers: {}
                }, rsp);
            });
        });

        describe('#update cnode', function () {
            it('should update cnode lifetime', function (done) {
                var rsp = {},
                    cnode,
                    upCallback = function (msg) {
                        if (msg.type === 'update') {
                            diff = msg.data;
                            expect(rsp.end).to.have.been.calledWith('');
                            if (diff.lifetime == 87654) {
                                shepherd.removeListener('ind', upCallback);
                                done();
                            }
                        }
                    };

                rsp.end = sinon.spy();

                shepherd.on('ind', upCallback);

                emitClintReqMessage(shepherd, {
                    code: '0.02',
                    method: 'PUT',
                    url: '/rd/1?lt=87654',
                    rsinfo: {
                        address: '127.0.0.1',
                        port: '5688'
                    },
                    payload: '',
                    headers: {}
                }, rsp);
            });
        });

        describe('#deregister cnode', function () {
            it('should deregister 2nd cnode ', function (done) {
                var rsp = {},
                    cnode,
                    deCallback = function (msg) {
                        if (msg.type === 'deregistered') {
                            clientName = msg.data;
                            expect(rsp.end).to.have.been.calledWith('');
                            if (clientName === 'cnode02' && !shepherd.find('cnode02')) {
                                shepherd.removeListener('ind', deCallback);
                                done();
                            }
                        }
                    };

                rsp.end = sinon.spy();

                shepherd.on('ind', deCallback);

                emitClintReqMessage(shepherd, {
                    code: '0.03',
                    method: 'DELETE',
                    url: '/rd/2',
                    rsinfo: {
                        address: '127.0.0.1',
                        port: '5687'
                    },
                    payload: '',
                    headers: {}
                }, rsp);
            });
        });

        describe('#.find()', function () {
            it('should find cnode01 by clientName and return cnode01', function () {
                var cnode01 = shepherd.find('cnode01');
                expect(cnode01.clientName).to.be.eql('cnode01');
            });

            it('should not find cnode02 and return undefined', function () {
                var cnode02 = shepherd.find('cnode02');
                expect(cnode02).to.be.eql(undefined);
            });
        });

        describe('#.findByMacAddr()', function () {
            it('should find cnode01 by MacAddr and return cnode01', function () {
                var cnode01 = shepherd.findByMacAddr('AA:AA:AA')[0];
                expect(cnode01.clientName).to.be.eql('cnode01');
            });

            it('should not find cnode02 and return undefined', function () {
                var cnode02 = shepherd.findByMacAddr('BB:BB:BB');
                expect(cnode02).to.be.eql([]);
            });
        });

        describe('#._findByClientId()', function () {
            it('should find cnode01 by ClientId and return cnode01', function () {
                var cnode01 = shepherd._findByClientId(1);
                expect(cnode01.clientName).to.be.eql('cnode01');
            });

            it('should not find cnode02 and return undefined', function () {
                var cnode02 = shepherd._findByClientId(2);
                expect(cnode02).to.be.eql(undefined);
            });
        });

        describe('#._findByLocationPath()', function () {
            it('should find cnode01 by LocationPath and return cnode01', function () {
                var cnode01 = shepherd._findByLocationPath('/rd/1');
                expect(cnode01.clientName).to.be.eql('cnode01');
            });

            it('should not find cnode02 and return undefined', function () {
                var cnode02 = shepherd._findByLocationPath('/rd/2');
                expect(cnode02).to.be.eql(undefined);
            });
        });

        describe('#.list()', function () {
            it('should return devices list', function () {
                var list = shepherd.list();
                expect(list[0].clientName).to.be.eql('cnode01');
                expect(list[0].mac).to.be.eql('AA:AA:AA');
            });
        });

        describe('#.request()', function () {
            it('should announce a message', function () {
                var server = coap.createServer();

                server.on('request', function (req, rsp) {
                    if (req.payload.method === 'PUT') 
                        done();
                });

                server.listen('5690');
                shepherd.request({
                    hostname: '127.0.0.1',
                    port: '5690',
                    method: 'PUT'
                });
            });
        });

        describe('#.announce()', function (done) {
            it('should announce a message', function () {
                var server = coap.createServer();

                server.on('request', function (req, rsp) {
                    if (req.payload.toString() === 'Hum') 
                        done();
                });

                server.listen('5688');
                shepherd.announce('Hum');
            });
        });

        describe('#.remove()', function () {
            it('should remove cnode01', function () {
                shepherd.remove('cnode01', function () {
                    expect(shepherd.find('shepherd')).to.be.eql(undefined);
                });
            });
        });
    });
});

function emitClintReqMessage(shepherd, req, rsp) {
    shepherd._server.emit('request', req, rsp);
}

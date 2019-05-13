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
    StorageInterface = require('../lib/components/storage-interface'),
    NedbStorage = require('../lib/components/nedb-storage'),
    CoapShepherd = require('../lib/coap-shepherd'),
    init = require('../lib/init'),
    fixture = require('./fixture'),
    _verifySignatureSync = fixture._verifySignatureSync,
    _verifySignatureAsync = fixture._verifySignatureAsync,
    _fireSetTimeoutCallbackEarlier = fixture._fireSetTimeoutCallbackEarlier;

var interface6 = {
        ip_address: '::1',
        gateway_ip: '::c0a8:0101',
        mac_address: '00:00:00:00:00:00'
    },
    interface4 = {
        ip_address: '127.0.0.1',
        gateway_ip: '192.168.1.1',
        mac_address: '00:00:00:00:00:00'
    };

describe('coap-shepherd', function () {
    var shepherd;

    before(function (done) {
        fs.unlink(path.resolve('./lib/database/coap.db'), function (err) {
            expect(err).to.equal(null);
            done();
        });

        shepherd = new CoapShepherd();
    });

    describe('Constructor Check', function () {
        it('coapShepherd', function () {
            expect(shepherd.clientIdCount).to.be.eql(1);
            expect(shepherd._registry).to.be.eql({});
            expect(shepherd._enabled).to.be.false;
            expect(shepherd._server).to.be.eql(null);
            expect(shepherd._hbChecker).to.be.eql(null);
            expect(shepherd._storage).to.be.instanceOf(NedbStorage);
        });
    });

    describe('Signature Check', function () {
        describe('#.constructor()', function () {
            it('should throw TypeError if config is given but not an object', function () {
                _verifySignatureSync(function (arg) { return new CoapShepherd(arg); }, ['undefined', 'object']);
            });

            it('should throw TypeError if config.storage is given but not an instance of StorageInterface', function () {
                _verifySignatureSync(function (arg) {
                    var options = { storage: arg };
                    return new CoapShepherd(options);
                }, ['undefined', 'null', new StorageInterface()]);
            });
        });

        describe('#.find()', function () {
            it('should throw TypeError if clientName is not a string', function () {
                _verifySignatureSync(function (arg) { shepherd.find(arg); }, ['string']);
            });
        });

        describe('#.findByMacAddr()', function () {
            it('should throw TypeError if macAddr is not a string', function () {
                _verifySignatureSync(function (arg) { shepherd.findByMacAddr(arg); }, ['string']);
            });
        });

        describe('#._findByClientId()', function () {
            it('should throw TypeError if clientId is not a string or a number', function () {
                _verifySignatureSync(function (arg) { shepherd._findByClientId(arg); }, ['string', 'number']);
            });
        });

        describe('#._findByLocationPath()', function () {
            it('should throw TypeError if clientId is not a string', function () {
                _verifySignatureSync(function (arg) { shepherd._findByLocationPath(arg); }, ['string']);
            });
        });

        describe('#.permitJoin()', function () {
            it('should throw TypeError if time is not a number', function () {
                _verifySignatureSync(function (arg) { shepherd.permitJoin(arg); }, ['undefined', 'number']);
            });
        });

        describe('#.alwaysPermitJoin()', function () {
            it('should throw TypeError if permit is not a boolean', function () {
                _verifySignatureSync(function (arg) { shepherd.alwaysPermitJoin(arg); }, ['boolean']);
            });
        });

        describe('#.request()', function () {
            it('should throw TypeError if reqObj is not an object', function () {
                _verifySignatureSync(function (arg) { shepherd.request(arg); }, ['object']);
            });
        });

        describe('#.announce()', function () {
            it('should throw TypeError if msg is not a string', function () {
                _verifySignatureSync(function (arg) { shepherd.announce(arg); }, ['string']);
            });
        });

        describe('#.remove()', function () {
            it('should throw TypeError if clientName is not a string', function () {
                _verifySignatureSync(function (arg) { shepherd.remove(arg); }, ['string']);
            });
        });

        describe('#.acceptDevIncoming()', function () {
            it('should throw TypeError if predicate is not a function', function () {
                var savedPredicate = shepherd._acceptDevIncoming;
                _verifySignatureSync(function (arg) { shepherd.acceptDevIncoming(arg); }, ['function']);
                shepherd._acceptDevIncoming = savedPredicate;
            });
        });

        describe('#._newClientId()', function () {
            it('should throw TypeError if id is not a number', function () {
                _verifySignatureSync(function (arg) { shepherd._newClientId(arg); }, ['undefined', 'number']);
            });
        });
    });

    describe('Functional Check', function () {
        var _updateNetInfoStub, testDbPath = __dirname + '/../lib/database/test.db';

        before(function () {
            _updateNetInfoStub = sinon.stub(init, '_updateNetInfo', function (shepherd, callback) {
                var deferred = Q.defer();

                setTimeout(function () {
                    var intf = (shepherd._config.connectionType === 'udp6') ? interface6 : interface4;
                    shepherd._net.intf = intf.name;
                    shepherd._net.ip = intf.ip_address;
                    shepherd._net.mac = intf.mac_address;
                    shepherd._net.routerIp = intf.gateway_ip;
                    deferred.resolve(_.cloneDeep(shepherd._net));
                }, 10);

                return deferred.promise.nodeify(callback);
            });

        });

        after(function (done) {
            _updateNetInfoStub.restore();
            fs.unlink(testDbPath, function (err) {
                expect(err).to.equal(null);
                done();
            });
        });

        describe('#.constructor()', function () {
            it('should create an instance when passing no arguments', function () {
                var created = new CoapShepherd();
                expect(created).to.be.not.null;
                expect(created).to.be.instanceOf(CoapShepherd);
                expect(created._storage).to.be.instanceOf(NedbStorage);
                expect(created._config).to.be.an('object');
                expect(created._config.connectionType).to.be.eql('udp4');
                expect(created._config.ip).to.be.eql('127.0.0.1');
                expect(created._config.port).to.be.eql(5683);
                expect(created._config.reqTimeout).to.be.eql(60);
                expect(created._config.hbTimeout).to.be.eql(60);
                expect(created._config.defaultDbPath).to.be.a('string');
                expect(created._config.defaultDbPath.split('/').pop()).to.be.eql('coap.db');
            });

            it('should create an instance when passing config argument', function () {
                var myStorage = new StorageInterface();
                myStorage._myFlag = 'customized';
                var created = new CoapShepherd({
                    connectionType: 'udp6',
                    ip: '::2',
                    port: 1234,
                    hbTimeout: 45,
                    storage: myStorage,
                    defaultDbPath: testDbPath
                });
                expect(created).to.be.not.null;
                expect(created).to.be.instanceOf(CoapShepherd);
                expect(created._storage).to.equal(myStorage);
                expect(created._storage._myFlag).to.equal('customized');
                expect(created._config).to.be.an('object');
                expect(created._config.connectionType).to.be.eql('udp6');
                expect(created._config.ip).to.be.eql('::2');
                expect(created._config.port).to.be.eql(1234);
                expect(created._config.reqTimeout).to.be.eql(60);
                expect(created._config.hbTimeout).to.be.eql(45);
                expect(created._config.defaultDbPath).to.be.eql(testDbPath);
            });
        });

        describe('#.start()', function () {
            before(function () {
                return Q.all([1, 2, 3]
                    .map(function (index) { return new CoapNode(shepherd, { clientName: 'myCoapNode' + index }); })
                    .map(function (cnode) { return shepherd._storage.save(cnode); })
                );
            });

            it('should start shepherd', function () {
                return shepherd.start().then(function () {
                    expect(Object.keys(shepherd._registry)).to.have.lengthOf(3);
                    expect(shepherd._registry).to.have.property('myCoapNode1');
                    expect(shepherd._registry['myCoapNode1']).to.be.instanceOf(CoapNode);
                    expect(shepherd._registry['myCoapNode1'].clientName).to.equal('myCoapNode1');
                    expect(shepherd._registry).to.have.property('myCoapNode2');
                    expect(shepherd._registry['myCoapNode2']).to.be.instanceOf(CoapNode);
                    expect(shepherd._registry['myCoapNode2'].clientName).to.equal('myCoapNode2');
                    expect(shepherd._registry).to.have.property('myCoapNode3');
                    expect(shepherd._registry['myCoapNode3']).to.be.instanceOf(CoapNode);
                    expect(shepherd._registry['myCoapNode3'].clientName).to.equal('myCoapNode3');
                    expect(shepherd._enabled).to.equal(true);
                });
            });

            after(function () {
                shepherd._registry = {};
                return shepherd._storage.reset();
            });
        });

        describe('#.permitJoin()', function () {
            it('should open permitJoin when time > 0', function () {
                shepherd.permitJoin(180);
                expect(shepherd._joinable).to.be.eql(true);
            });

            it('should close permitJoin when time == 0', function () {
                shepherd.permitJoin(0);
                expect(shepherd._joinable).to.be.eql(false);
            });

            it('should open permitJoin when time > 0 after alwaysPermitJoin(false)', function () {
                shepherd.alwaysPermitJoin(false);
                shepherd.permitJoin(180);
                expect(shepherd._joinable).to.be.eql(true);
            });

            it('should close permitJoin when time == 0 after alwaysPermitJoin(true)', function () {
                shepherd.alwaysPermitJoin(true);
                shepherd.permitJoin(0);
                expect(shepherd._joinable).to.be.eql(false);
            });
        });

        describe('#.alwaysPermitJoin()', function () {
            it('should open permitJoin when permit is true', function () {
                var result = shepherd.alwaysPermitJoin(true);
                expect(result).to.be.eql(true);
                expect(shepherd._joinable).to.be.eql(true);
            });

            it('should close permitJoin when permit is false', function () {
                shepherd.alwaysPermitJoin(false);
                expect(shepherd._joinable).to.be.eql(false);
            });

            it('should clear _permitJoinTimer when permit is true', function () {
                shepherd.permitJoin(180);
                var result = shepherd.alwaysPermitJoin(true);
                expect(result).to.be.eql(true);
                expect(shepherd._joinable).to.be.eql(true);
                expect(shepherd._permitJoinTimer).to.be.eql(null);
            });

            it('should clear _permitJoinTimer when permit is false', function () {
                shepherd.permitJoin(180);
                var result = shepherd.alwaysPermitJoin(false);
                expect(result).to.be.eql(true);
                expect(shepherd._joinable).to.be.eql(false);
                expect(shepherd._permitJoinTimer).to.be.eql(null);
            });

            it('should not open permitJoin when server is not enabled', function () {
                shepherd._joinable = false;
                shepherd._enabled = false;
                var result = shepherd.alwaysPermitJoin(true);
                expect(result).to.be.eql(false);
                expect(shepherd._joinable).to.be.eql(false);
            });

            after(function () {
                shepherd._enabled = true;
                shepherd.alwaysPermitJoin(true);
            });
        });

        describe('#register new cnode', function () {
            before(function () {
                shepherd.clientIdCount = 1;
            });

            it('should not crash if "ep" not passed in', function () {
                var rsp = {},
                    req = {
                        code: '0.01',
                        method: 'POST',
                        url: '/rd?lt=86400&lwm2m=1.0.0&mac=AA:AA:AA',
                        rsinfo: {
                            address: '127.0.0.1',
                            port: '5686'
                        },
                        payload: '</x/0>,</x/1>,</y/0>,</y/1>',
                        headers: {}
                    },
                    oldSetImmediate = global.setImmediate,
                    reqHandler;
                rsp.setOption = sinon.spy();
                rsp.end = sinon.spy();
                global.setImmediate = sinon.spy();
                emitClintReqMessage(shepherd, req, rsp);
                expect(global.setImmediate).to.have.been.called;
                reqHandler = global.setImmediate.args[0][0];
                global.setImmediate = oldSetImmediate;

                expect(reqHandler).not.to.throw();

                expect(rsp.setOption).not.to.have.been.called;
                expect(rsp.end).to.have.been.calledWith('');
                expect(rsp.code).to.eql('4.00');
                expect(shepherd.find('')).to.be.falsy;
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
                        if (msg.type === 'devIncoming') {
                            cnode = msg.cnode;
                            _readAllResourceStub.restore();
                            observeReqStub.restore();
                            expect(rsp.setOption).to.have.been.calledWith('Location-Path', [new Buffer('rd'),new Buffer(cnode.clientId.toString())]);
                            expect(rsp.end).to.have.been.calledWith('');
                            if (shepherd.find('cnode01') === cnode) {
                                shepherd.removeListener('ind', regCallback);
                                done();
                            }
                        }
                    };

                rsp.setOption = sinon.spy();
                rsp.end = sinon.spy();
                _fireSetTimeoutCallbackEarlier(2);

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
                        if (msg.type === 'devIncoming') {
                            cnode = msg.cnode;
                            expect(rsp.setOption).to.have.been.calledWith('Location-Path', [new Buffer('rd'),new Buffer(cnode.clientId.toString())]);
                            expect(rsp.end).to.have.been.calledWith('');
                            if (shepherd.find('cnode02') === cnode) {
                                _readAllResourceStub.restore();
                                observeReqStub.restore();
                                shepherd.removeListener('ind', regCallback);
                                done();
                            }
                        }
                    };

                rsp.setOption = sinon.spy();
                rsp.end = sinon.spy();
                _fireSetTimeoutCallbackEarlier(2);

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

        describe('#config.clientNameParser', function () {
            before(function () {
                shepherd._config.clientNameParser = function (clientName) {
                    return clientName.split(':')[1];
                }
            });

            after(function (done) {
                shepherd._config.clientNameParser = function (clientName) {
                    return clientName;
                };
                shepherd.remove('cnode0X', done);
            });

            it('should keep the last part of clientName', function (done) {
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
                        if (msg.type === 'devIncoming') {
                            _readAllResourceStub.restore();
                            observeReqStub.restore();
                            shepherd.removeListener('ind', regCallback);
                            cnode = msg.cnode;
                            expect(cnode.clientName).to.eql('cnode0X');
                            expect(rsp.setOption).to.have.been.calledWith('Location-Path', [new Buffer('rd'),new Buffer(cnode.clientId.toString())]);
                            expect(rsp.end).to.have.been.calledWith('');
                            expect(shepherd.find('cnode0X')).to.be.truthy;
                            done();
                        }
                    };

                rsp.setOption = sinon.spy();
                rsp.end = sinon.spy();
                _fireSetTimeoutCallbackEarlier(2);

                shepherd.on('ind', regCallback);

                emitClintReqMessage(shepherd, {
                    code: '0.01',
                    method: 'POST',
                    url: '/rd?ep=urn:cnode0X&lt=86400&lwm2m=1.0.0&mac=FF:FF:FF',
                    rsinfo: {
                        address: '127.0.0.1',
                        port: '5687'
                    },
                    payload: '</a/0>,</a/1>,</b/0>,</b/1>',
                    headers: {}
                }, rsp);
            });
        });

        describe('#config.alwaysFireDevIncoming', function () {
            before(function () {
                shepherd._config.alwaysFireDevIncoming = true;
            });

            after(function () {
                shepherd._config.alwaysFireDevIncoming = false;
            });

            it('should fire devIncoming', function (done) {
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
                        _readAllResourceStub.restore();
                        observeReqStub.restore();
                        shepherd.removeListener('ind', regCallback);
                        expect(msg.type).to.eql('devIncoming');
                        cnode = msg.cnode;
                        expect(rsp.setOption).to.have.been.calledWith('Location-Path', [new Buffer('rd'),new Buffer(cnode.clientId.toString())]);
                        expect(rsp.end).to.have.been.calledWith('');
                        expect(shepherd.find('cnode02')).to.eql(cnode);
                        done();
                    };
                expect(shepherd.find('cnode02')).to.be.truthy;
                rsp.setOption = sinon.spy();
                rsp.end = sinon.spy();
                _fireSetTimeoutCallbackEarlier(2);

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
                        if (msg.type === 'devUpdate') {
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
                    method: 'POST',
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

        describe('#config.autoReadResources', function () {
            var shepherd;

            before(function (done) {
                shepherd = new CoapShepherd({port: 5684, defaultDbPath: testDbPath, autoReadResources: false});
                shepherd.start().then(function () {
                    shepherd.alwaysPermitJoin(true);
                    done();
                });
            });

            it('should not call cnode._readAllResource when autoReadResources is false for register', function (done) {
                var _readAllResourceStub = sinon.stub(CoapNode.prototype, '_readAllResource', function (path, callback) {
                        return null;
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
                        if (msg.type === 'devIncoming') {
                            cnode = msg.cnode;
                            expect(rsp.setOption).to.have.been.calledWith('Location-Path', [new Buffer('rd'),new Buffer(cnode.clientId.toString())]);
                            expect(rsp.end).to.have.been.calledWith('');
                            expect(_readAllResourceStub).to.have.not.been.called;
                            if (shepherd.find('cnode02') === cnode) {
                                _readAllResourceStub.restore();
                                observeReqStub.restore();
                                shepherd.removeListener('ind', regCallback);
                                done();
                            }
                        }
                    };

                rsp.setOption = sinon.spy();
                rsp.end = sinon.spy();
                _fireSetTimeoutCallbackEarlier(2);

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

            it('should not call cnode._readAllResource when autoReadResources is false for update', function (done) {
                var _readAllResourceStub = sinon.stub(CoapNode.prototype, '_readAllResource', function (path, callback) {
                        return null;
                    }),
                    _updateAttrsStub = sinon.stub(CoapNode.prototype, '_updateAttrs', function () {
                        return Q.fcall(function () {
                            return { lifetime: 87654, objList: {} };
                        });
                    }),
                    rsp = {},
                    cnode,
                    upCallback = function (msg) {
                        if (msg.type === 'devUpdate') {
                            diff = msg.data;
                            expect(rsp.end).to.have.been.calledWith('');
                            expect(_readAllResourceStub).to.have.not.been.called;
                            if (diff.lifetime == 87654) {
                                _readAllResourceStub.restore();
                                _updateAttrsStub.restore();
                                shepherd.removeListener('ind', upCallback);
                                done();
                            }
                        }
                    };

                rsp.end = sinon.spy();

                shepherd.on('ind', upCallback);

                emitClintReqMessage(shepherd, {
                    code: '0.02',
                    method: 'POST',
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
                        if (msg.type === 'devLeaving') {
                            clientName = msg.cnode;
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

        describe('#checkOut cnode', function () {
            it('should check out and cnode status changed to sleep', function (done) {
                var rsp = {},
                    cnode,
                    outCallback = function (msg) {
                        if (msg.type === 'devStatus' || msg.data === 'sleep') {
                            clientName = msg.cnode.clientName;
                            expect(rsp.end).to.have.been.calledWith('');
                            if (clientName === 'cnode01') {
                                expect(shepherd.find('cnode01').status).to.be.eql('sleep');
                                shepherd.removeListener('ind', outCallback);
                                done();
                            }
                        }
                    };

                rsp.end = sinon.spy();
                _fireSetTimeoutCallbackEarlier();

                shepherd.on('ind', outCallback);

                emitClintReqMessage(shepherd, {
                    code: '0.04',
                    method: 'PUT',
                    url: '/rd/1?chk=out',
                    rsinfo: {
                        address: '127.0.0.1',
                        port: '5688'
                    },
                    payload: '',
                    headers: {}
                }, rsp);
            });

            it('should return error when device is sleeping', function (done) {
                var cnode = shepherd.find('cnode01');

                cnode.readReq('/x/0/x0', function (err) {
                    if (err) done();
                });
            });

            it ('should check out and cnode status changed to sleep with duration', function (done) {
                var rsp = {},
                    cnode,
                    outCallback = function (msg) {
                        if (msg.type === 'devStatus' || msg.data === 'offline') {
                            clientName = msg.cnode.clientName;
                            expect(rsp.end).to.have.been.calledWith('');
                            if (clientName === 'cnode01') {
                                expect(shepherd.find('cnode01').status).to.be.eql('offline');
                                shepherd.removeListener('ind', outCallback);
                                done();
                            }
                        }
                    };

                rsp.end = sinon.spy();

                shepherd.on('ind', outCallback);

                emitClintReqMessage(shepherd, {
                    code: '0.04',
                    method: 'PUT',
                    url: '/rd/1?chk=out&t=1',
                    rsinfo: {
                        address: '127.0.0.1',
                        port: '5688'
                    },
                    payload: '',
                    headers: {}
                }, rsp);
            });
        });

        describe('#checkIn cnode', function () {
            it('should check out and cnode status changed to online', function (done) {
                var observeReqStub = sinon.stub(CoapNode.prototype, 'observeReq', function (callback) {
                        return Q.resolve({
                            status: '2.05',
                            data: 'hb'
                        });
                    }),
                    delayStub = sinon.stub(_, 'delay', function (cb, time) {
                        setImmediate(cb);
                    }),
                    rsp = {},
                    cnode,
                    inCallback = function (msg) {
                        if (msg.type === 'devStatus' || msg.data === 'online') {
                            clientName = msg.cnode.clientName;
                            expect(rsp.end).to.have.been.calledWith('');
                            if (clientName === 'cnode01') {
                                observeReqStub.restore();
                                delayStub.restore();
                                expect(shepherd.find('cnode01').status).to.be.eql('online');
                                expect(shepherd.find('cnode01').port).to.be.eql('5690');
                                shepherd.removeListener('ind', inCallback);
                                done();
                            }
                        }
                    };

                rsp.end = sinon.spy();

                shepherd.on('ind', inCallback);

                emitClintReqMessage(shepherd, {
                    code: '0.04',
                    method: 'PUT',
                    url: '/rd/1?chk=in',
                    rsinfo: {
                        address: '127.0.0.1',
                        port: '5690'
                    },
                    payload: '',
                    headers: {}
                }, rsp);
            });
        });

        describe('#.lookup', function () {
            it('should not crash if "ep" not passed in', function () {
                var rsp = {},
                    req = {
                        code: '0.01',
                        method: 'GET',
                        url: '/lookup?lt=86400&lwm2m=1.0.0&mac=AA:AA:AA',
                        rsinfo: {
                            address: '127.0.0.1',
                            port: '5686'
                        },
                        payload: '</x/0>,</x/1>,</y/0>,</y/1>',
                        headers: {}
                    },
                    oldSetImmediate = global.setImmediate,
                    reqHandler;
                rsp.setOption = sinon.spy();
                rsp.end = sinon.spy();
                global.setImmediate = sinon.spy();
                emitClintReqMessage(shepherd, req, rsp);
                expect(global.setImmediate).to.have.been.called;
                reqHandler = global.setImmediate.args[0][0];
                global.setImmediate = oldSetImmediate;

                expect(reqHandler).not.to.throw();

                expect(rsp.setOption).not.to.have.been.called;
                expect(rsp.end).to.have.been.calledWith('');
                expect(rsp.code).to.eql('4.00');
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

        describe('#.acceptDevIncoming()', function () {
            it('should implement acceptDevIncoming and get not allow rsp', function (done) {
                var rsp = {};

                rsp.end = function (msg) {
                    expect(rsp.code).to.be.eql('4.05');
                    expect(msg).to.be.eql('');
                    expect(shepherd.find('cnode03')).to.equal(undefined);
                    done();
                };

                shepherd.acceptDevIncoming(function (devInfo, callback) {
                    if (devInfo.clientName === 'cnode03') {
                        callback(null, false);
                    } else {
                        callback(null, true);
                    }
                });

                emitClintReqMessage(shepherd, {
                    code: '0.01',
                    method: 'POST',
                    url: '/rd?ep=cnode03&lt=86400&lwm2m=1.0.0&mac=BB:BB:BB',
                    rsinfo: {
                        address: '127.0.0.1',
                        port: '5687'
                    },
                    payload: '</a/0>,</a/1>,</b/0>,</b/1>',
                    headers: {}
                }, rsp);
            });

            it('should implement acceptDevIncoming and create dev', function (done) {
                var rsp = {}, extra = { businessKey: 'hello_world' };

                rsp.setOption = sinon.spy();
                rsp.end = function (msg) {
                    expect(rsp.code).to.be.eql('2.01');
                    var node = shepherd.find('cnode03');
                    expect(node).to.be.instanceOf(CoapNode);
                    expect(node.clientName).to.equal('cnode03');
                    expect(node._extra).to.equal(extra);
                    done();
                };

                shepherd.acceptDevIncoming(function (devInfo, callback) {
                    callback(null, true, extra);
                });

                emitClintReqMessage(shepherd, {
                    code: '0.01',
                    method: 'POST',
                    url: '/rd?ep=cnode03&lt=86400&lwm2m=1.0.0&mac=BB:BB:BB',
                    rsinfo: {
                        address: '127.0.0.1',
                        port: '5687'
                    },
                    payload: '</a/0>,</a/1>,</b/0>,</b/1>',
                    headers: {}
                }, rsp);
            });
        });

        describe('#.stop()', function () {
            it('should stop shepherd', function () {
                return shepherd.stop().then(function () {
                    expect(shepherd._enabled).to.equal(false);
                    expect(shepherd._server).to.equal(null);
                });
            });
        });

        describe('#.reset()', function () {
            it('should reset shepherd', function () {
                var storageResetStub = sinon.stub(NedbStorage.prototype, 'reset', function () {});
                return shepherd.reset().then(function () {
                    storageResetStub.restore();
                    expect(shepherd._enabled).to.equal(true);
                    expect(storageResetStub).not.have.been.called;
                });
            });

            it('should remove db and reset shepherd', function () {
                var storageResetStub = sinon.stub(NedbStorage.prototype, 'reset', function () { return Q.fcall(function () {}); });
                return shepherd.reset(1).then(function () {
                    storageResetStub.restore();
                    expect(shepherd._enabled).to.equal(true);
                    expect(storageResetStub).have.been.called;
                });
            });
        });
    });
});

function emitClintReqMessage(shepherd, req, rsp) {
    shepherd._server.emit('request', req, rsp);
}

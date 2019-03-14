var _ = require('busyman'),
    Q = require('q'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect;

chai.use(sinonChai);

var NedbStorage = require('../lib/components/nedb-storage'),
    CoapNode = require('../lib/components/coap-node'),
    defaultConfig = require('../lib/config'),
    fixture = require('./fixture'),
    _verifySignatureSync = fixture._verifySignatureSync,
    _verifySignatureAsync = fixture._verifySignatureAsync;

var devAttrs = {
        clientName: 'coap-client',
        lifetime: 86400,
        ip: '192.168.1.100',
        port: '5685',
        mac: 'AA:BB:CC:DD:EE:00',
        version: '1.0.0',
        objList: { x: [0, 1] },
        ct: '11543',
        heartbeatEnabled: true
    };

var sObj = {
        0: {
            x0: 10,
            x1: 20
        },
        1: {
            x0: 100,
            x1: 200
        }
    };

var fakeShp,
    node,
    reqObj,
    rspObj;

describe('coap-node', function () {
    before(function () {
        fakeShp = { 
            emit: function () {},
            request: function (req, callback) {
                var deferred = Q.defer();
                if (_.isEqual(req, reqObj)) 
                    deferred.resolve(rspObj);

                return deferred.promise.nodeify(callback);
            },
            _newClientId: function () { return 1; },
            _config: Object.assign({}, defaultConfig),
            _storage: new NedbStorage('')
        };
        node = new CoapNode(fakeShp, devAttrs);

        node.so.init('x', 0, sObj[0]);
        node.so.init('x', 1, sObj[1]);
    });

    describe('Constructor Check', function () {
        it('new CoapNode()', function () {
            expect(node.shepherd).to.be.equal(fakeShp);
            expect(node.clientName).to.be.eql('coap-client');
            expect(node.ip).to.be.eql('192.168.1.100');
            expect(node.version).to.be.eql('1.0.0');
            expect(node.lifetime).to.be.eql(86400);
            expect(node.status).to.be.eql('offline');
            expect(node.objList).to.be.eql({ x: [0, 1] });
            expect(node.observedList).to.be.eql([]);
            expect(node._registered).to.be.false;
            expect(node._streamObservers).to.be.eql({});
            expect(node._lifeChecker).to.be.eql(null);
            expect(node._heartbeat).to.be.eql(null);
        });
    });

    describe('Signature Check', function () {
        it('new CoapNode()', function () {
            _verifySignatureSync(function (arg) { return new CoapNode(arg, {}); }, [fakeShp]);
            _verifySignatureSync(function (arg) { return new CoapNode(fakeShp, arg); }, ['object']);
        });

        it('#.lifeCheck()', function () {
            _verifySignatureSync(function (arg) { node.lifeCheck(arg); }, ['boolean']);
        });

        it('#.sleepCheck()', function () {
            _verifySignatureSync(function (arg) { node.sleepCheck(arg); }, ['boolean']);
        });

        it('#._reqObj()', function () {
            _verifySignatureSync(function (arg) { node._reqObj(arg, arg); }, ['string']);
        });

        it('#._setStatus()', function () {
            _verifySignatureSync(function (arg) { node._setStatus(arg); }, [['online', 'offline', 'sleep']]);
        });

        // Asynchronous APIs
        describe('#.readReq()', function () {
            it('should throw err if path is not a string', function () {
                _verifySignatureSync(function (arg) { node.readReq(arg).done(); }, ['string']);
            });

            it('should return err if not registered', function (done) {
                node._registered = false;
                node.readReq('x').fail(function (err) {
                    done();
                });
            });

            it('should return err if status is offline', function (done) {
                node._registered = true;
                node.readReq('x').fail(function (err) {
                    done();
                });
            });
        });

        describe('#.writeReq()', function () {
            it('should throw err if path is not a string', function () {
                _verifySignatureSync(function (arg) { node.writeReq(arg, 1).done(); }, ['string']);
            });

            it('should throw err if value is undefined', function () {
                expect(function () { return  node.writeReq('x/y/z', undefined); }).to.throw();
            });

            it('should return err if not registered', function (done) {
                node._registered = false;
                node.writeReq('x/y', {}).fail(function (err) {
                    done();
                });
            });

            it('should return err if status is offline', function (done) {
                node._registered = true;
                node.writeReq('x/y', {}).fail(function (err) {
                    done();
                });
            });
        });

        describe('#.executeReq()', function () {
            it('should throw err if path is not a string', function () {
                _verifySignatureSync(function (arg) { node.executeReq(arg, []).done(); }, ['string']);
            });

            it('should return err if not registered', function (done) {
                node._registered = false;
                node.executeReq('x/y/z', []).fail(function (err) {
                    done();
                });
            });

            it('should return err if status is offline', function (done) {
                node._registered = true;
                node.executeReq('x/y/z', []).fail(function (err) {
                    done();
                });
            });

            it('should return err if args is not an array', function () {
                return _verifySignatureAsync(function (arg) {
                    return node.executeReq('x/y/z', arg, undefined);
                }, ['undefined', 'null', 'array']);
            });
        });

        describe('#.discoverReq()', function () {
            it('should throw err if path is not a string', function () {
                _verifySignatureSync(function (arg) { node.discoverReq(arg).done(); }, ['string']);
            });

            it('should return err if not registered', function (done) {
                node._registered = false;
                node.discoverReq('x/y').fail(function (err) {
                    done();
                });
            });

            it('should return err if status is offline', function (done) {
                node._registered = true;
                node.discoverReq('x/y').fail(function (err) {
                    done();
                });
            });
        });

        describe('#.writeAttrReq()', function () {
            it('should throw err if path is not a string', function () {
                _verifySignatureSync(function (arg) { node.writeAttrsReq(arg, {}).done(); }, ['string']);
            });

            it('should throw err if attrs is not an object', function () {
                _verifySignatureSync(function (arg) { node.writeAttrsReq('x/y', arg).done(); }, ['object']);
            });

            it('should return err if not registered', function (done) {
                node._registered = false;
                node.writeAttrsReq('x/y', {}).fail(function (err) {
                    done();
                });
            });

            it('should return err if status is offline', function (done) {
                node._registered = true;
                node.writeAttrsReq('x/y', {}).fail(function (err) {
                    done();
                });
            });
        });

        describe('#.observeReq()', function () {
            it('should throw err if path is not a string', function () {
                _verifySignatureSync(function (arg) { node.observeReq(arg).done(); }, ['string']);
            });

            it('should return err if not registered', function (done) {
                node._registered = false;
                node.observeReq('x/y/z').fail(function (err) {
                    done();
                });
            });

            it('should return err if status is offline', function (done) {
                node._registered = true;
                node.observeReq('x/y/z').fail(function (err) {
                    done();
                });
            });
        });

        describe('#.cancelObserveReq()', function () {
            it('should throw err if path is not a string', function () {
                _verifySignatureSync(function (arg) { node.cancelObserveReq(arg).done(); }, ['string']);
            });

            it('should return err if not registered', function (done) {
                node._registered = false;
                node.cancelObserveReq('x/y/z').fail(function (err) {
                    done();
                });
            });

            it('should return err if status is offline', function (done) {
                node._registered = true;
                node.cancelObserveReq('x/y/z').fail(function (err) {
                    done();
                });
            });
        });

        describe('#.pingReq()', function () {
            it('should return err if not registered', function (done) {
                node._registered = false;
                node.pingReq().fail(function (err) {
                    done();
                });
            });
        });

        describe('#._updateAttrs()', function () { 
            it('should return err if attrs is not an object', function () {
                return _verifySignatureAsync(function (arg) { return node._updateAttrs(arg); }, ['object']);
            });
        });
    });

    describe('Functional Check', function () {
        before(function () {
            node._registered = true;
            node.status = 'online';
        });

        describe('#.lifeCheck()', function () {
            it('should open lifeCheck', function (done) {
                node.lifeCheck(true);
                if (node._lifeChecker !== null) done();
            });

            it('should close lifeCheck', function (done) {
                node.lifeCheck(false);
                if (node._lifeChecker === null) done();
            });
        });

        describe('#.sleepCheck()', function () {
            it('should open sleepCheck', function (done) {
                node.sleepCheck(true);
                if (node._sleepChecker === null) done();
            });

            it('should open sleepCheck', function (done) {
                node.sleepCheck(true, 10);
                if (node._sleepChecker !== null) done();
            });

            it('should close sleepCheck', function (done) {
                node.sleepCheck(false);
                if (node._sleepChecker === null) done();
            });
        });

        describe('#._reqObj()', function () {
            it('should return reqObj', function () {
                var obj = { 
                    hostname: '192.168.1.100', 
                    port: '5685', 
                    pathname: 'x', 
                    method: 'GET' 
                };

                expect(node._reqObj('GET', 'x')).to.be.eql(obj);
            });
        });

        describe('#.readReq()', function () {
            it('should read Resource and return status 2.05', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0/x0',
                    method: 'GET',
                    options: { Accept: 'application/json' }
                };
                rspObj = {
                    code: '2.05',
                    payload: 10
                };

                node.readReq('/x/0/x0').then(function (rsp) {
                    expect(rsp.status).to.equal('2.05');
                    expect(rsp.data).to.equal(10);
                    done();
                }).done();
            });

            it('should read Object Instance and return status 2.05', function (done) {
                var obj = {
                    x0: 10,
                    x1: 20
                };

                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0',
                    method: 'GET',
                    options: { Accept: 'application/json' }
                };
                rspObj = {
                    code: '2.05',
                    payload: obj
                };

                node.readReq('/x/0').then(function (rsp) {
                    if (rsp.status === '2.05' && rsp.data === obj)
                        done();
                });
            });

            it('should read Object and return status 2.05', function (done) {
                var obj = {
                    0: {
                        x0: 10,
                        x1: 20
                    },
                    1: {
                        x0: 100,
                        x1: 200
                    }
                };

                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x',
                    method: 'GET',
                    options: { Accept: 'application/json' }
                };
                rspObj = {
                    code: '2.05',
                    payload: obj
                };

                node.readReq('/x').then(function (rsp) {
                    if (rsp.status === '2.05' && rsp.data === obj)
                        done();
                });
            });
        });

        describe('#.writeReq()', function () {
            it('should write Resource and return status 2.04', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0/x0',
                    method: 'PUT',
                    payload: new Buffer([0x7b, 0x22, 0x62, 0x6e, 0x22, 0x3a, 0x22, 0x2f, 0x78, 0x2f, 0x30, 0x2f, 0x78, 0x30, 0x22, 0x2c, 0x22, 0x65, 0x22, 0x3a, 0x5b, 0x7b, 0x22, 0x6e, 0x22, 0x3a, 0x22, 0x22, 0x2c, 0x22, 0x76, 0x22, 0x3a, 0x31, 0x30, 0x7d, 0x5d, 0x7d]),
                    options: {
                        'Content-Format': 'application/json'
                    }
                };
                rspObj = {
                    code: '2.04'
                };

                node.writeReq('/x/0/x0', 10).then(function (rsp) {
                    if (rsp.status === '2.04')
                        done();
                });
            });

            it('should write Object Instance and return status 2.04', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0',
                    method: 'PUT',
                    payload: new Buffer([0x7b, 0x22, 0x62, 0x6e, 0x22, 0x3a, 0x22, 0x2f, 0x78, 0x2f, 0x30, 0x22, 0x2c, 0x22, 0x65, 0x22, 0x3a, 0x5b, 0x7b, 0x22, 0x6e, 0x22, 0x3a, 0x22, 0x78, 0x30, 0x22, 0x2c, 0x22, 0x76, 0x22, 0x3a, 0x31, 0x30, 0x7d, 0x2c, 0x7b, 0x22, 0x6e, 0x22, 0x3a, 0x22, 0x78, 0x31, 0x22, 0x2c, 0x22, 0x76, 0x22, 0x3a, 0x32, 0x30, 0x7d, 0x5d, 0x7d]),
                    options: {
                        'Content-Format': 'application/json'
                    }
                };
                rspObj = {
                    code: '2.04'
                };

                node.writeReq('/x/0', { x0: 10, x1: 20 }).then(function (rsp) {
                    if (rsp.status === '2.04')
                        done();
                });
            });
        });

        describe('#.executeReq()', function () {
            it('should execute Resource and return status 2.04', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0/x0',
                    method: 'POST',
                    payload: '10,20'
                };
                rspObj = {
                    code: '2.04'
                };

                node.executeReq('/x/0/x0', [ 10, 20 ]).then(function (rsp) {
                    if (rsp.status === '2.04')
                        done();
                });
            });
        });

        describe('#.discoverReq()', function () {
            it('should discover Resource and return status 2.05', function (done) {
                var obj = {
                    path: '/x/0/x0',
                    attrs: { 
                        pmin: 10, 
                        pmax: 60
                    }
                };

                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0/x0',
                    method: 'GET',
                    options: {
                        Accept: 'application/link-format'
                    }
                };
                rspObj = {
                    headers: {
                        'Content-Format': 'application/link-format'
                    },
                    code: '2.05',
                    payload: obj
                };

                node.discoverReq('/x/0/x0').then(function (rsp) {
                    if (rsp.status === '2.05' && _.isEqual(rsp.data, obj))
                        done();
                });
            });

            it('should discover Object Instance and return status 2.05', function (done) {
                var obj = {
                    path: '/x/0',
                    attrs: { 
                        pmin: 10, 
                        pmax: 60
                    },
                    resrcList: ['/x/0/x0', '/x/0/x1']
                };

                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0',
                    method: 'GET',
                    options: {
                        Accept: 'application/link-format'
                    }
                };
                rspObj = {
                    headers: {
                        'Content-Format': 'application/link-format'
                    },
                    code: '2.05',
                    payload: obj
                };

                node.discoverReq('/x/0').then(function (rsp) {
                    if (rsp.status === '2.05' && _.isEqual(rsp.data, obj))
                        done();
                });
            });

            it('should discover Object and return status 2.05', function (done) {
                var obj = {
                    path: '/x',
                    attrs: { 
                        pmin: 10, 
                        pmax: 60
                    },
                    resrcList: [ '/x/0/x0', '/x/0/x1', '/x/1/x0', '/x/1/x1' ]
                };

                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x',
                    method: 'GET',
                    options: {
                        Accept: 'application/link-format'
                    }
                };
                rspObj = {
                    headers: {
                        'Content-Format': 'application/link-format'
                    },
                    code: '2.05',
                    payload: obj
                };

                node.discoverReq('/x').then(function (rsp) {
                    if (rsp.status === '2.05' && _.isEqual(rsp.data, obj))
                        done();
                });
            });
        });

        describe('#.writeAttrsReq()', function () {
            it('should write Resource Attrs and return status 2.05', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0/x0',
                    method: 'PUT',
                    query: 'pmin=10&pmax=60'
                };
                rspObj = {
                    code: '2.04'
                };

                node.writeAttrsReq('/x/0/x0', { pmin: 10, pmax: 60 }).then(function (rsp) {
                    if (rsp.status === '2.04')
                        done();
                });
            });

            it('should write Object Instance Attrs and return status 2.05', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0',
                    method: 'PUT',
                    query: 'pmin=10&pmax=60'
                };
                rspObj = {
                    code: '2.04'
                };

                node.writeAttrsReq('/x/0', { pmin: 10, pmax: 60 }).then(function (rsp) {
                    if (rsp.status === '2.04')
                        done();
                });
            });

            it('should write Object Attrs and return status 2.05', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x',
                    method: 'PUT',
                    query: 'pmin=10&pmax=60'
                };
                rspObj = {
                    code: '2.04'
                };

                node.writeAttrsReq('/x', { pmin: 10, pmax: 60 }).then(function (rsp) {
                    if (rsp.status === '2.04')
                        done();
                });
            });
        });

        describe('#.observeReq()', function () {
            it('should observe Resource and return status 2.05 for number data', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0/x0',
                    method: 'GET',
                    options: { Accept: 'application/json' },
                    observe: true
                };
                rspObj.headers = { 'Content-Format': 'application/tlv' };
                rspObj.code = '2.05';
                rspObj.payload = 10;
                rspObj.close = function () {};
                rspObj.once = function () {};

                node.observeReq('/x/0/x0').then(function (rsp) {
                    if (rsp.status === '2.05' && rsp.data === 10)
                        done();
                });
            });

            it('should observe Resource and return status 2.05 for object data', function (done) {
                var obj = {
                    x0: 10,
                    x1: 20
                };

                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0',
                    method: 'GET',
                    options: { Accept: 'application/json' },
                    observe: true
                };
                rspObj.headers = { 'Content-Format': 'application/tlv' };
                rspObj.code = '2.05';
                rspObj.payload = obj;
                rspObj.close = function () {};
                rspObj.once = function () {};

                node.observeReq('/x/0').then(function (rsp) {
                    if (rsp.status === '2.05' && _.isEqual(rsp.data, obj))
                        done();
                });
            });

            it('should set observeStream._disableFiltering to false by default', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0/x0',
                    method: 'GET',
                    options: { Accept: 'application/json' },
                    observe: true
                };
                rspObj.headers = { 'Content-Format': 'application/tlv' };
                rspObj.code = '2.05';
                rspObj.payload = 10;
                rspObj.close = function () {};
                rspObj.once = function () {};

                node.observeReq('/x/0/x0').then(function (rsp) {
                    expect(rspObj._disableFiltering).to.equal(false);
                    if (rsp.status === '2.05' && rsp.data === 10)
                        done();
                });
            });

            it('should set observeStream._disableFiltering to true when shepherd config is set so', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0/x0',
                    method: 'GET',
                    options: { Accept: 'application/json' },
                    observe: true
                };
                rspObj.headers = { 'Content-Format': 'application/tlv' };
                rspObj.code = '2.05';
                rspObj.payload = 10;
                rspObj.close = function () {};
                rspObj.once = function () {};
                node.shepherd._config.disableFiltering = true;

                node.observeReq('/x/0/x0').then(function (rsp) {
                    node.shepherd._config.disableFiltering = defaultConfig.disableFiltering;
                    expect(rspObj._disableFiltering).to.equal(true);
                    if (rsp.status === '2.05' && rsp.data === 10)
                        done();
                });
            });

        });

        describe('#.cancelObserveReq()', function () {
            it('should cancel Resource observe and return status 2.05', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0/x0',
                    method: 'GET',
                    observe: false
                };
                rspObj = {
                    code: '2.05'
                };

                node.cancelObserveReq('/x/0/x0').then(function (rsp) {
                    if (rsp.status === '2.05')
                        done();
                });
            });

            it('should cancel Object Instance observe and return status 2.05', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/x/0',
                    method: 'GET',
                    observe: false
                };
                rspObj = {
                    code: '2.05'
                };

                node.cancelObserveReq('/x/0').then(function (rsp) {
                    if (rsp.status === '2.05')
                        done();
                });
            });
        });

        describe('#.pingReq()', function () {
            it('should ping cnode and return status 2.05', function (done) {
                reqObj = {
                    hostname: '192.168.1.100',
                    port: '5685',
                    pathname: '/ping',
                    method: 'POST'
                };
                rspObj = {
                    code: '2.05'
                };

                node.pingReq().then(function (rsp) {
                    if (rsp.status === '2.05')
                        done();
                });
            });
        });

        describe('#.dump()', function () {
            it('should return node record', function () {
                var dumper = {
                    clientName: 'coap-client',
                    clientId: 1,
                    ip: '192.168.1.100',
                    port: '5685',
                    mac: 'AA:BB:CC:DD:EE:00',
                    lifetime: 86400,
                    version: '1.0.0',
                    objList: { x: [0, 1] },
                    observedList: [],
                    heartbeatEnabled: true,
                    so: {
                        x: sObj
                    }
                },
                nDump = node.dump();

                delete nDump.joinTime;
                
                expect(nDump).to.be.eql(dumper);
            });
        });

        describe('#._setStatus()', function () {
            it('should set node status to online', function (done) {
                node._setStatus('online');
                if (node.status === 'online') done();
            });

            it('should set node status to offline', function (done) {
                node._setStatus('offline');
                if (node.status === 'offline') done();
            });
        });

        describe('#._updateAttrs()', function () {
            before(function (done) {
                var dumper = {
                    clientName: 'coap-client',
                    clientId: 1,
                    ip: '192.168.1.100',
                    port: '5685',
                    mac: 'AA:BB:CC:DD:EE:00',
                    lifetime: 86400,
                    version: '1.0.0',
                    objList: { x: [0, 1] },
                    observedList: [],
                    heartbeatEnabled: true,
                    so: {
                        x: sObj
                    }
                };

                node.shepherd._storage.save(node).then(function (data) {
                    expect(data).to.deep.equal(dumper);
                    done();
                }).done();
            });

            it('should update node attrs, and return diff', function (done) {
                var attrs = { lifetime: 60000, version: '1.0.1' }, oldClientName = node.clientName;
                node._updateAttrs(attrs).then(function (diff) {
                    expect(diff).to.deep.equal(attrs);
                    expect(node.lifetime).to.equal(attrs.lifetime);
                    expect(node.version).to.equal(attrs.version);
                    expect(node.clientName).to.equal(oldClientName);
                    done();
                }).done();
            });
        });

        describe('#._updateSoAndDb()', function () {
            it('should update Object and db, and return diff', function (done) {
                var data = {
                        1: {
                            x0: 33,
                            x1: 333
                        }
                    },
                    expected = {
                        x: {
                            0: { x0: 10, x1: 20 },
                            1: { x0: 33, x1: 333 }
                        }
                    };
                node._updateSoAndDb('/x', data).then(function (diff) {
                    expect(diff).to.deep.equal({ x: data });
                    var loaded = new CoapNode(node.shepherd, { clientName: node.clientName });
                    node.shepherd._storage.load(loaded).then(function () {
                        expect(loaded.dump().so).to.deep.equal(expected);
                        done();
                    }).done();
                }).done();
            });

            it('should update Object Instance and db, and return diff', function (done) {
                var data = {
                        x0: 109,
                        x1: 209
                    },
                    expected = {
                        x: {
                            0: { x0: 10, x1: 20 },
                            1: { x0: 109, x1: 209 }
                        }
                    };
                node._updateSoAndDb('/x/1', data).then(function (diff) {
                    expect(diff).to.deep.equal({ x: { 1: data } });
                    var loaded = new CoapNode(node.shepherd, { clientName: node.clientName });
                    node.shepherd._storage.load(loaded).then(function () {
                        expect(loaded.dump().so).to.deep.equal(expected);
                        done();
                    }).done();
                }).done();
            });

            it('should update Resource and db, and return diff', function (done) {
                var data = 199,
                    expected = {
                        x: {
                            0: { x0: 10, x1: 20 },
                            1: { x0: 199, x1: 209 }
                        }
                    };
                node._updateSoAndDb('/x/1/x0', data).then(function (diff) {
                    expect(diff).to.deep.equal({ x: { 1: { x0: data } } });
                    var loaded = new CoapNode(node.shepherd, { clientName: node.clientName });
                    node.shepherd._storage.load(loaded).then(function () {
                        expect(loaded.dump().so).to.deep.equal(expected);
                        done();
                    }).done();
                }).done();
            });
        });
    });
});
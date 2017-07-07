var fs = require('fs'),
    path = require('path'),
    stream = require('stream'),
    _ = require('busyman'),
    Q = require('q'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect;

chai.use(sinonChai);

var Coapdb = require('../lib/components/coapdb'),
    CoapNode = require('../lib/components/coap-node');

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

var dbPath = path.resolve('./test/database_test/coap.db'),
    fakeShp,
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
            _coapdb: new Coapdb(dbPath)
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
            expect(function () { return new CoapNode(fakeShp); }).to.throw();
            expect(function () { return new CoapNode(fakeShp, 'x'); }).to.throw();
            expect(function () { return new CoapNode(fakeShp, 1); }).to.throw();
            expect(function () { return new CoapNode(fakeShp, []); }).to.throw();
            expect(function () { return new CoapNode(null, {}); }).to.throw();
            expect(function () { return new CoapNode('x', {}); }).to.throw();
            expect(function () { return new CoapNode('1', {}); }).to.throw();
            expect(function () { return new CoapNode([], {}); }).to.throw();
            expect(function () { return new CoapNode({}, {}); }).to.throw();

            expect(function () { return new CoapNode(fakeShp, {}); }).not.to.throw();
        });

        it('#.lifeCheck()', function () {
            expect(function () { return node.lifeCheck(); }).to.throw(TypeError);
            expect(function () { return node.lifeCheck(undefined); }).to.throw(TypeError);
            expect(function () { return node.lifeCheck(null); }).to.throw(TypeError);
            expect(function () { return node.lifeCheck(NaN); }).to.throw(TypeError);
            expect(function () { return node.lifeCheck(10); }).to.throw(TypeError);
            expect(function () { return node.lifeCheck('xx'); }).to.throw(TypeError);
            expect(function () { return node.lifeCheck([]); }).to.throw(TypeError);
            expect(function () { return node.lifeCheck({}); }).to.throw(TypeError);
            expect(function () { return node.lifeCheck(new Date()); }).to.throw(TypeError);
            expect(function () { return node.lifeCheck(function () {}); }).to.throw(TypeError);

            expect(function () { return node.lifeCheck(true); }).not.to.throw(TypeError);
        });

        it('#.sleepCheck()', function () {
            expect(function () { return node.sleepCheck(); }).to.throw(TypeError);
            expect(function () { return node.sleepCheck(undefined); }).to.throw(TypeError);
            expect(function () { return node.sleepCheck(null); }).to.throw(TypeError);
            expect(function () { return node.sleepCheck(NaN); }).to.throw(TypeError);
            expect(function () { return node.sleepCheck(10); }).to.throw(TypeError);
            expect(function () { return node.sleepCheck('xx'); }).to.throw(TypeError);
            expect(function () { return node.sleepCheck([]); }).to.throw(TypeError);
            expect(function () { return node.sleepCheck({}); }).to.throw(TypeError);
            expect(function () { return node.sleepCheck(new Date()); }).to.throw(TypeError);
            expect(function () { return node.sleepCheck(function () {}); }).to.throw(TypeError);

            expect(function () { return node.sleepCheck(true); }).not.to.throw(TypeError);
        });

        it('#._reqObj()', function () {
            expect(function () { return node._reqObj('x'); }).to.throw();
            expect(function () { return node._reqObj('x', 1); }).to.throw();
            expect(function () { return node._reqObj('x', []); }).to.throw();
            expect(function () { return node._reqObj('x', {}); }).to.throw();
            expect(function () { return node._reqObj(null, 'x'); }).to.throw();
            expect(function () { return node._reqObj(1, 'x'); }).to.throw();
            expect(function () { return node._reqObj([], 'x'); }).to.throw();
            expect(function () { return node._reqObj({}, 'x'); }).to.throw();

            expect(function () { return node._reqObj('x', 'x'); }).not.to.throw();
        });

        it('#._setStatus()', function () {
            expect(function () { return node._setStatus(); }).to.throw();
            expect(function () { return node._setStatus('x'); }).to.throw();
            expect(function () { return node._setStatus(1); }).to.throw();
            expect(function () { return node._setStatus([]); }).to.throw();
            expect(function () { return node._setStatus({}); }).to.throw();

            expect(function () { return node._setStatus('online'); }).not.to.throw();
            expect(function () { return node._setStatus('offline'); }).not.to.throw();
        });

        // Asynchronous APIs
        describe('#.readReq()', function () {
            it('should throw err if path is not a string', function () {
                expect(function () { return  node.readReq([]); }).to.throw();
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
                expect(function () { return  node.writeReq([], 1); }).to.throw();
            });

            it('should throw err if path is object', function () {
                expect(function () { return  node.writeReq('x', 1); }).to.throw();
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
                expect(function () { return  node.executeReq([], []); }).to.throw();
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

            it('should return err if args is not an array', function (done) {
                node.executeReq('x/y/z', 10).fail(function (err) {
                    done();
                });
            });
        });

        describe('#.discoverReq()', function () {
            it('should throw err if path is not a string', function () {
                expect(function () { return  node.discoverReq([], []); }).to.throw();
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
                expect(function () { return  node.writeAttrsReq([], {}); }).to.throw();
            });

            it('should throw err if attrs is not an object', function () {
                expect(function () { return  node.writeAttrsReq('x/y', 10); }).to.throw();
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
                expect(function () { return  node.observeReq([], {}); }).to.throw();
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
                expect(function () { return  node.cancelObserveReq([], {}); }).to.throw();
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

        describe('#._updateObjectInstance()', function () { 
            it('should return err if oid is not a string or a number', function (done) {
                node._updateObjectInstance([], 0, {}).fail(function (err) {
                    done();
                });
            });

            it('should return err if iid is not a string or a number', function (done) {
                node._updateObjectInstance('x', [], {}).fail(function (err) {
                    done();
                });
            });

            it('should return err if data is not an object', function (done) {
                node._updateObjectInstance('x', [], {}).fail(function (err) {
                    done();
                });
            });
        });

        describe('#._updateResource()', function () { 
            it('should return err if oid is not a string or a number', function (done) {
                node._updateResource([], 0, 'z', 10).fail(function (err) {
                    done();
                });
            });

            it('should return err if iid is not a string or a number', function (done) {
                node._updateResource('x', [], 'z', 10).fail(function (err) {
                    done();
                });
            });

            it('should return err if rid is not a string or a number', function (done) {
                node._updateResource('x', 0, [], 10).fail(function (err) {
                    done();
                });
            });
        });

        describe('#._updateAttrs()', function () { 
            it('should return err if attrs is not an object', function (done) {
                node._updateObjectInstance('x').fail(function (err) {
                    done();
                });
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
                    if (rsp.status === '2.05' && rsp.data === 10)
                        done();
                });
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
            it('should observe Resource and return status 2.05', function (done) {
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

            it('should observe Resource and return status 2.05', function (done) {
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

        describe('#.dbSave()', function () {
            it('should save node record to db, and return node record', function (done) {
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

                node.dbSave().then(function (ndata) {
                    delete ndata._id;
                    delete ndata.joinTime;

                    if (_.isEqual(ndata, dumper)) done();
                });
            });
        });

        describe('#.dbRead()', function () {
            it('should read node record from db, and return node record', function (done) {
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

                node.dbRead().then(function (ndata) {
                    delete ndata.joinTime;
                    if (_.isEqual(ndata, dumper)) done();
                });
            });
        });

        describe('#._updateAttrs()', function () {
            it('should update node attrs, and return diff', function (done) {
                var attrs = { lifetime: 60000, version: '1.0.1' };
                node._updateAttrs(attrs).then(function (diff) {
                    if (_.isEqual(diff, attrs)) done();
                });
            });
        });
        
        describe('#._updateObjectInstance()', function () {
            it('should update Object Instance, and return diff', function (done) {
                var data = {
                        x0: 9,
                        x1: 19
                    };

                node._updateObjectInstance('x', 0, data).then(function (diff) {
                    if (_.isEqual(diff, data)) done();
                });
            });

            it('should not update Object Instance, and return bad path err', function (done) {
                var data = {
                        x0: 55,
                        x1: 555
                    };

                node._updateObjectInstance('a', 0, data).fail(function () {
                    done();
                });
            });

            it('should not update Object Instance, and return bad data err', function (done) {
                var data = {
                        a: 9,
                        b: 19
                    };

                node._updateObjectInstance('x', 0, data).fail(function () {
                    done();
                });
            });
        });

        describe('#._updateResource()', function () {
            it('should update Resource, and return diff', function (done) {
                node._updateResource('x', 0, 'x0', 99).then(function (diff) {
                    if (diff === 99) done();
                });
            });

            it('should not update Resource, and return bad data err', function (done) {
                node._updateResource('x', 0, 'xx', 99).fail(function () {
                    done();
                });
            });
        });

        describe('#._updateSoAndDb()', function () {
            it('should update Object and db, and return diff', function (done) {
                var data = {
                        1: {
                            x0: 33,
                            x1: 333
                        }
                    };
                node._updateSoAndDb('/x', data).then(function (diff) {
                    if (_.isEqual(diff[0], data[1])) done();
                });
            });

            it('should update Object Instance and db, and return diff', function (done) {
                var data = {
                        x0: 109,
                        x1: 209
                    };
                node._updateSoAndDb('/x/1', data).then(function (diff) {
                    if (_.isEqual(diff, data)) done();
                });
            });

            it('should update Resourse and db, and return diff', function (done) {
                node._updateSoAndDb('/x/1/x0', 199).then(function (diff) {
                    if (diff === 199) done();
                });
            });
        });

        describe('#.dbRemove()', function () {
            it('should read node record in db', function (done) {
                node.dbRemove().then(function () {
                    return node.dbRead();
                }).fail(function (err) {
                    done();
                });
            });
        });
    });
});
var fs = require('fs'),
    path = require('path'),
    should = require('should'),
    _ = require('busyman'),
    Coapdb = require('../lib/components/coapdb');
    CoapNode = require('../lib/components/coap-node');

var devAttrs = {
        clientName: 'coap-client',
        lifetime: 86400,
        ip: '192.168.1.100',
        port: '5685',
        mac: 'AA:BB:CC:DD:EE:00',
        version: '1.0.0',
        objList: { x: [0, 1] }
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
    fakeShp = { 
        emit: function () {},
        _newClientId: function () { return 1; },
        _coapdb: new Coapdb(dbPath)
    },
    node = new CoapNode(fakeShp, devAttrs);

node.so.init('x', 0, sObj[0]);
node.so.init('x', 1, sObj[1]);

describe('coap-node - Constructor Check', function () {
    it('new CoapNode()', function () {
        should(node.shepherd).be.equal(fakeShp);
        should(node.clientName).be.eql('coap-client');
        should(node.ip).be.eql('192.168.1.100');
        should(node.version).be.eql('1.0.0');
        should(node.lifetime).be.eql(86400);
        should(node.status).be.eql('offline');
        should(node.objList).be.eql({ x: [0, 1] });
        should(node._registered).be.false();
        should(node._streamObservers).be.eql({});
        should(node._lifeChecker).be.null();
        should(node._heartbeat).be.null();
    });
});

describe('coap-node - Signature Check', function () {
    it('new CoapNode()', function () {
        (function () { return new CoapNode(fakeShp); }).should.throw();
        (function () { return new CoapNode(fakeShp, 'x'); }).should.throw();
        (function () { return new CoapNode(fakeShp, 1); }).should.throw();
        (function () { return new CoapNode(fakeShp, []); }).should.throw();
        (function () { return new CoapNode(fakeShp, {}); }).should.not.throw();
        (function () { return new CoapNode(null, {}); }).should.throw();
        (function () { return new CoapNode('x', {}); }).should.throw();
        (function () { return new CoapNode('1', {}); }).should.throw();
        (function () { return new CoapNode([], {}); }).should.throw();
        (function () { return new CoapNode({}, {}); }).should.throw();
    });

    it('#._reqObj()', function () {
        (function () { return node._reqObj('x'); }).should.throw();
        (function () { return node._reqObj('x', 'x'); }).should.not.throw();
        (function () { return node._reqObj('x', 1); }).should.throw();
        (function () { return node._reqObj('x', []); }).should.throw();
        (function () { return node._reqObj('x', {}); }).should.throw();
        (function () { return node._reqObj(null, 'x'); }).should.throw();
        (function () { return node._reqObj(1, 'x'); }).should.throw();
        (function () { return node._reqObj([], 'x'); }).should.throw();
        (function () { return node._reqObj({}, 'x'); }).should.throw();
    });

    it('#._setStatus()', function () {
        (function () { return node._setStatus(); }).should.throw();
        (function () { return node._setStatus('x'); }).should.throw();
        (function () { return node._setStatus(1); }).should.throw();
        (function () { return node._setStatus([]); }).should.throw();
        (function () { return node._setStatus({}); }).should.throw();
        (function () { return node._setStatus('online'); }).should.not.throw();
        (function () { return node._setStatus('offline'); }).should.not.throw();
    });
});

describe('coap-node - Functional Check', function () {
    describe('#.lifeCheck()', function () {
        it('true', function (done) {
            node.lifeCheck(true);
            if (node._lifeChecker !== null) done();
        });

        it('false', function (done) {
            node.lifeCheck(false);
            if (node._lifeChecker === null) done();
        });
    });

    describe('#._reqObj()', function () {
        it('_reqObj(method, pathname)', function () {
            var reqObj = { 
                hostname: '192.168.1.100', 
                port: '5685', 
                pathname: 'x', 
                method: 'GET' 
            };

            should(node._reqObj('GET', 'x')).be.eql(reqObj);
        });
    });

    describe('#.readReq()', function () {
        it('readReq(path, callback) - not registered', function (done) {
            node.readReq('x').fail(function (err) {
                done();
            });
        });
    });

    describe('#.writeReq()', function () {
        it('writeReq(path, value, callback) - not registered', function (done) {
            node.writeReq('x/y', 1).fail(function (err) {
                done();
            });
        });
    });

    describe('#.executeReq()', function () {
        it('executeReq(path, value, callback) - not registered', function (done) {
            node.executeReq('x/y/z', []).fail(function (err) {
                done();
            });
        });
    });

    describe('#.discoverReq()', function () {
        it('discoverReq(path, callback) - not registered', function (done) {
            node.discoverReq('x/y').fail(function (err) {
                done();
            });
        });
    });

    describe('#.writeAttrReq()', function () {
        it('writeAttrReq(path, value, callback) - not registered', function (done) {
            node.writeAttrsReq('x/y', {}).fail(function (err) {
                done();
            });
        });
    });

    describe('#.observeReq()', function () {
        it('observeReq(path, callback) - not registered', function (done) {
            node.observeReq('x/y/z').fail(function (err) {
                done();
            });
        });
    });

    describe('#.cancelObserveReq()', function () {
        it('cancelObserveReq(path, callback) - not registered', function (done) {
            node.cancelObserveReq('x/y/z').fail(function (err) {
                done();
            });
        });
    });

    describe('#.ping()', function () {
        it('ping(callback) - not registered', function (done) {
            node.ping().fail(function (err) {
                done();
            });
        });
    });

    describe('#.dump()', function () {
        it('dump()', function () {
            var dumper = {
                clientName: 'coap-client',
                clientId: 1,
                ip: '192.168.1.100',
                port: '5685',
                mac: 'AA:BB:CC:DD:EE:00',
                lifetime: 86400,
                version: '1.0.0',
                objList: { x: [0, 1] },
                so: {
                    x: sObj
                }
            },
            nDump = node.dump();

            delete nDump.joinTime;
            
            should(nDump).be.eql(dumper);
        });
    });

    describe('#._setStatus()', function () {
        it('_setStatus(status) - online', function (done) {
            node._setStatus('online');
            if (node.status === 'online') done();
        });

        it('_setStatus(status) - offline', function (done) {
            node._setStatus('offline');
            if (node.status === 'offline') done();
        });
    });

    describe('#.dbSave()', function () {
        it('dbSave(callback)', function (done) {
            var dumper = {
                clientName: 'coap-client',
                clientId: 1,
                ip: '192.168.1.100',
                port: '5685',
                mac: 'AA:BB:CC:DD:EE:00',
                lifetime: 86400,
                version: '1.0.0',
                objList: { x: [0, 1] },
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
        it('dbRead(callback)', function (done) {
            var dumper = {
                clientName: 'coap-client',
                clientId: 1,
                ip: '192.168.1.100',
                port: '5685',
                mac: 'AA:BB:CC:DD:EE:00',
                lifetime: 86400,
                version: '1.0.0',
                objList: { x: [0, 1] },
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
        it('_updateAttrs(attrs, callback)', function (done) {
            var attrs = { lifetime: 60000, version: '1.0.1' };
            node._updateAttrs(attrs).then(function (diff) {
                if (_.isEqual(diff, attrs)) done();
            });
        });
    });
    
    describe('#._updateObjectInstance()', function () {
        it('_updateObjectInstance(oid, iid, data, callback)', function (done) {
            var data = {
                    x0: 9,
                    x1: 19
                };

            node._updateObjectInstance('x', 0, data).then(function (diff) {
                if (_.isEqual(diff, data)) done();
            });
        });

        it('_updateObjectInstance(oid, iid, data, callback) - bad path', function (done) {
            var data = {
                    x0: 55,
                    x1: 555
                };

            node._updateObjectInstance('a', 0, data).fail(function () {
                done();
            });
        });

        it('_updateObjectInstance(oid, iid, data, callback) - bad data', function (done) {
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
        it('_updateResource(oid, iid, rid, data, callback)', function (done) {
            node._updateResource('x', 0, 'x0', 99).then(function (diff) {
                if (diff === 99) done();
            });
        });

        it('_updateResource(oid, iid, rid, data, callback) - bad path', function (done) {
            node._updateResource('x', 0, 'xx', 99).fail(function () {
                done();
            });
        });
    });

    describe('#._updateSoAndDb()', function () {
        it('_updateSoAndDb(path, data, callback) - object', function (done) {
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

        it('_updateSoAndDb(path, data, callback) - instance', function (done) {
            var data = {
                    x0: 109,
                    x1: 209
                };
            node._updateSoAndDb('/x/1', data).then(function (diff) {
                if (_.isEqual(diff, data)) done();
            });
        });

        it('_updateSoAndDb(path, data, callback) - resourse', function (done) {
            node._updateSoAndDb('/x/1/x0', 199).then(function (diff) {
                if (diff === 199) done();
            });
        });
    });

    describe('#.dbRemove()', function () {
        it('dbRemove(callback)', function (done) {
            node.dbRemove().then(function () {
                return node.dbRead();
            }).fail(function (err) {
                done();
            });
        });
    });
});
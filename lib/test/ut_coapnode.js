var should = require('should'),
    _ = require('lodash'),
    CoapNode = require('../coapnode'),
    SmartObject = require('../smartobject');

var devAttrs = {
        clientName: 'coap-client',
        locationPath: '/rd/1',
        lifetime: 86400,
        ip: '192.168.1.100',
        port: '5685',
        mac: 'AA:BB:CC:DD:EE:00',
        version: '1.0.0',
        objList: { x: [0, 1] }
    };

var sObj1 = {
        x: {
            0: {
                x0: 10,
                x1: 20
            },
            1: {
                x0: 100,
                x1: 200
            }
        }
    };

var fakeShp = { _newLocationPath: function () {} };

var node = new CoapNode(fakeShp, devAttrs);

node.so.addObjects(sObj1);

describe('Constructor Check', function () {
    it('CoapNode(shepherd, devAttrs)', function () {
        should(node.shepherd).be.equal(fakeShp);
        should(node.clientName).be.eql('coap-client');
        should(node.ip).be.eql('192.168.1.100');
        should(node.version).be.eql('1.0.0');
        should(node.lifetime).be.eql(86400);
        should(node.status).be.eql('offline');
        should(node.objList).be.eql({ x: [0, 1] });
        should(node.so).be.eql(sObj1);
        should(node._registered).be.false();
        should(node._streamObservers).be.eql({});
        should(node._lifeChecker).be.null();
        should(node._heartbeat).be.null();
    });
});

describe('Signature Check', function () {
    it('CoapNode(shepherd, devAttrs)', function () {
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

    it('_reqObj(method, pathname)', function () {
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

    it('_setStatus(status)', function () {
        (function () { return node._setStatus(); }).should.throw();
        (function () { return node._setStatus('x'); }).should.throw();
        (function () { return node._setStatus(1); }).should.throw();
        (function () { return node._setStatus([]); }).should.throw();
        (function () { return node._setStatus({}); }).should.throw();
        (function () { return node._setStatus('online'); }).should.not.throw();
        (function () { return node._setStatus('offline'); }).should.not.throw();
    });
});

describe('Function Check', function () {
    it('enableLifeChecker()', function (done) {
        node.enableLifeChecker();
        if (node._lifeChecker !== null) done();
    });

    it('disableLifeChecker()', function (done) {
        node.disableLifeChecker();
        if (node._lifeChecker === null) done();
    });

    it('_reqObj(method, pathname)', function () {
        var reqObj = { 
            hostname: '192.168.1.100', 
            port: '5685', 
            pathname: 'x', 
            method: 'GET' 
        };

        should(node._reqObj('GET', 'x')).be.eql(reqObj);
    });

    it('read(path, callback) - not registered', function (done) {
        node.read('x').fail(function (err) {
            done();
        });
    });

    it('write(path, value, callback) - not registered', function (done) {
        node.write('x/y', 1).fail(function (err) {
            done();
        });
    });

    it('execute(path, value, callback) - not registered', function (done) {
        node.execute('x/y/z', []).fail(function (err) {
            done();
        });
    });

    it('discover(path, callback) - not registered', function (done) {
        node.discover('x/y').fail(function (err) {
            done();
        });
    });

    it('writeAttr(path, value, callback) - not registered', function (done) {
        node.writeAttrs('x/y', {}).fail(function (err) {
            done();
        });
    });

    it('observe(path, callback) - not registered', function (done) {
        node.observe('x/y/z').fail(function (err) {
            done();
        });
    });

    it('cancelObserve(path, callback) - not registered', function (done) {
        node.cancelObserve('x/y/z').fail(function (err) {
            done();
        });
    });

    it('ping(callback) - not registered', function (done) {
        node.ping().fail(function (err) {
            done();
        });
    });

    it('dump()', function () {
        var dumper = {
            clientName: 'coap-client',
            ip: '192.168.1.100',
            port: '5685',
            mac: 'AA:BB:CC:DD:EE:00',
            lifetime: 86400,
            version: '1.0.0',
            objList: { x: [0, 1] },
            so: sObj1
        },
        nDump = node.dump();

        delete nDump.joinTime;
        
        should(nDump).be.eql(dumper);
    });

    it('_setStatus(status) - online', function (done) {
        node._setStatus('online');
        if (node.status === 'online') done();
    });

    it('_setStatus(status) - offline', function (done) {
        node._setStatus('offline');
        if (node.status === 'offline') done();
    });

    it('dbSave(callback)', function (done) {
        var dumper = {
            clientName: 'coap-client',
            ip: '192.168.1.100',
            port: '5685',
            mac: 'AA:BB:CC:DD:EE:00',
            lifetime: 86400,
            version: '1.0.0',
            objList: { x: [0, 1] },
            so: sObj1
        };

        node.dbSave().then(function (ndata) {
            delete ndata._id;
            delete ndata.joinTime;

            if (_.isEqual(ndata, dumper)) done();
        });
    });

    it('dbRead(callback)', function (done) {
        var dumper = {
            clientName: 'coap-client',
            ip: '192.168.1.100',
            port: '5685',
            mac: 'AA:BB:CC:DD:EE:00',
            lifetime: 86400,
            version: '1.0.0',
            objList: { x: [0, 1] },
            so: sObj1
        };

        node.dbRead().then(function (ndata) {
            delete ndata.joinTime;

            if (_.isEqual(ndata, dumper)) done();
        });
    });

    it('_updateAttrs(attrs, callback)', function (done) {
        var attrs = { lifetime: 60000, version: '1.0.1' };
        node._updateAttrs(attrs).then(function (diff) {
            if (_.isEqual(diff, attrs)) done();
        });
    });

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

    it('_updateSo(path, data, callback) - object', function (done) {
        var data = {
                1: {
                    x0: 33,
                    x1: 333
                }
            };
        node._updateSo('/x', data).then(function (diff) {
            if (_.isEqual(diff[0], data[1])) done();
        });
    });

    it('_updateSo(path, data, callback) - instance', function (done) {
        var data = {
                x0: 109,
                x1: 209
            };
        node._updateSo('/x/1', data).then(function (diff) {
            if (_.isEqual(diff, data)) done();
        });
    });

    it('_updateSo(path, data, callback) - resourse', function (done) {
        node._updateSo('/x/1/x0', 199).then(function (diff) {
            if (diff === 199) done();
        });
    });

    it('dbRemove(callback)', function (done) {
        node.dbRemove().then(function () {
            return node.dbRead();
        }).fail(function (err) {
            done();
        });
    });
});


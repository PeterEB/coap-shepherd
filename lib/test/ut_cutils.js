var should = require('should'),
    cutils = require('../utils/cutils.js');

describe('Signature Check', function () {

    it('getTime', function () {
        (function () { cutils.getTime(); }).should.not.throw();
    });

    it('oidKey', function () {
        (function () { cutils.oidKey('x'); }).should.not.throw();
        (function () { cutils.oidKey(5); }).should.not.throw();
        (function () { cutils.oidKey({}); }).should.throw();
        (function () { cutils.oidKey([]); }).should.throw();
        (function () { cutils.oidKey(); }).should.throw();
    });

    it('oidNumber', function () {
        (function () { cutils.oidNumber('x'); }).should.not.throw();
        (function () { cutils.oidNumber(5); }).should.not.throw();
        (function () { cutils.oidNumber({}); }).should.throw();
        (function () { cutils.oidNumber([]); }).should.throw();
        (function () { cutils.oidNumber(); }).should.throw();
    });

    it('ridKey', function () {
        (function () { cutils.ridNumber('x', 'y'); }).should.not.throw();
        (function () { cutils.ridNumber(5, 'y'); }).should.not.throw();
        (function () { cutils.ridNumber('x', 5); }).should.not.throw();
        (function () { cutils.ridNumber(1, 5); }).should.not.throw();
        (function () { cutils.ridNumber({}, 'x'); }).should.throw();
        (function () { cutils.ridNumber([], 'x'); }).should.throw();
        (function () { cutils.ridNumber('x', []); }).should.throw();
        (function () { cutils.ridNumber('x', {}); }).should.throw();
        (function () { cutils.ridNumber(); }).should.throw();
    });

    it('ridNumber', function () {
        (function () { cutils.ridNumber('x', 'y'); }).should.not.throw();
        (function () { cutils.ridNumber(5, 'y'); }).should.not.throw();
        (function () { cutils.ridNumber('x', 5); }).should.not.throw();
        (function () { cutils.ridNumber(1, 5); }).should.not.throw();
        (function () { cutils.ridNumber({}, 'x'); }).should.throw();
        (function () { cutils.ridNumber([], 'x'); }).should.throw();
        (function () { cutils.ridNumber('x', []); }).should.throw();
        (function () { cutils.ridNumber('x', {}); }).should.throw();
        (function () { cutils.ridNumber(); }).should.throw();
    });

    it('getAttrsAndRsc', function () {
        (function () { cutils.getAttrsAndRsc('x'); }).should.not.throw();
        (function () { cutils.getAttrsAndRsc(5); }).should.throw();
        (function () { cutils.getAttrsAndRsc({}); }).should.throw();
        (function () { cutils.getAttrsAndRsc([]); }).should.throw();
        (function () { cutils.getAttrsAndRsc(); }).should.throw();
    });

    it('pathSlashParser', function () {
        (function () { cutils.pathSlashParser('x'); }).should.not.throw();
        (function () { cutils.pathSlashParser(5); }).should.throw();
        (function () { cutils.pathSlashParser({}); }).should.throw();
        (function () { cutils.pathSlashParser([]); }).should.throw();
        (function () { cutils.pathSlashParser(); }).should.throw();
    });

    it('getSoKeyObj', function () {
        (function () { cutils.getSoKeyObj('x'); }).should.not.throw();
        (function () { cutils.getSoKeyObj(5); }).should.throw();
        (function () { cutils.getSoKeyObj({}); }).should.throw();
        (function () { cutils.getSoKeyObj([]); }).should.throw();
        (function () { cutils.getSoKeyObj(); }).should.throw();
    });

    it('getSoValPath', function () {        
        (function () { cutils.getSoValPath('x'); }).should.not.throw();
        (function () { cutils.getSoValPath(5); }).should.throw();
        (function () { cutils.getSoValPath({}); }).should.throw();
        (function () { cutils.getSoValPath([]); }).should.throw();
        (function () { cutils.getSoValPath(); }).should.throw();
    });

    it('encodeJsonObj', function () {
        (function () { cutils.encodeJsonObj('x', 'y'); }).should.throw();
        (function () { cutils.encodeJsonObj('x/y', 'y'); }).should.throw();
        (function () { cutils.encodeJsonObj('x/y/z', 'y'); }).should.not.throw();
        (function () { cutils.encodeJsonObj('x', 5); }).should.throw();
        (function () { cutils.encodeJsonObj('x/y', 5); }).should.throw();
        (function () { cutils.encodeJsonObj('x/y/z', 5); }).should.not.throw();
        (function () { cutils.encodeJsonObj('x', {}); }).should.not.throw();
        (function () { cutils.encodeJsonObj('x', []); }).should.throw();
        (function () { cutils.encodeJsonObj(5, 'y'); }).should.throw();
        (function () { cutils.encodeJsonObj(1, 5); }).should.throw();
        (function () { cutils.encodeJsonObj({}, 'x'); }).should.throw();
        (function () { cutils.encodeJsonObj([], 'x'); }).should.throw();
        (function () { cutils.encodeJsonObj(); }).should.throw();
    });

    it('decodeJsonObj', function () {        
        (function () { cutils.decodeJsonObj('x', 'y'); }).should.throw();
        (function () { cutils.decodeJsonObj('x/y', 'y'); }).should.throw();
        (function () { cutils.decodeJsonObj('x/y/z', 'y'); }).should.not.throw();
        (function () { cutils.decodeJsonObj('x', 5); }).should.throw();
        (function () { cutils.decodeJsonObj('x/y', 5); }).should.throw();
        (function () { cutils.decodeJsonObj('x/y/z', 5); }).should.not.throw();
        (function () { cutils.decodeJsonObj('x', {}); }).should.not.throw();
        (function () { cutils.decodeJsonObj('x', []); }).should.throw();
        (function () { cutils.decodeJsonObj(5, 'y'); }).should.throw();
        (function () { cutils.decodeJsonObj(1, 5); }).should.throw();
        (function () { cutils.decodeJsonObj({}, 'x'); }).should.throw();
        (function () { cutils.decodeJsonObj([], 'x'); }).should.throw();
        (function () { cutils.decodeJsonObj(); }).should.throw();
    });

    it('dotPath', function () {        
        (function () { cutils.dotPath('xyz'); }).should.not.throw();
        (function () { cutils.dotPath(5); }).should.throw();
        (function () { cutils.dotPath({}); }).should.throw();
        (function () { cutils.dotPath([]); }).should.throw();
        (function () { cutils.dotPath(); }).should.throw();
    });

    it('createPath', function () {
        (function () { cutils.createPath('xyz'); }).should.not.throw();
        (function () { cutils.createPath(5); }).should.throw();
        (function () { cutils.createPath({}); }).should.throw();
        (function () { cutils.createPath([]); }).should.throw();
        (function () { cutils.createPath(); }).should.throw();
    });

    it('buildPathValuePairs', function () {
        (function () { cutils.buildPathValuePairs('/xyz', { a: { b: 1 } }); }).should.not.throw();
        (function () { cutils.buildPathValuePairs(3, { a: { b: 1 } }); }).should.throw();
        (function () { cutils.buildPathValuePairs([], { a: { b: 1 } }); }).should.throw();
        (function () { cutils.buildPathValuePairs({}, { a: { b: 1 } }); }).should.throw();
        (function () { cutils.buildPathValuePairs(undefined, { a: { b: 1 } }); }).should.throw();
        (function () { cutils.buildPathValuePairs(null, { a: { b: 1 } }); }).should.throw();
    });

});

describe('Functional Check', function () {

    it('oidKey', function () {
        should(cutils.oidKey('x')).be.eql('x');
        should(cutils.oidKey(9999)).be.eql(9999);
        should(cutils.oidKey(2051)).be.eql('cmdhDefEcValues');
        should(cutils.oidKey('2051')).be.eql('cmdhDefEcValues');
        should(cutils.oidKey('cmdhDefEcValues')).be.eql('cmdhDefEcValues');
    });

    it('oidNumber', function () {
        should(cutils.oidNumber('x')).be.eql('x');
        should(cutils.oidNumber(9999)).be.eql(9999);
        should(cutils.oidNumber(2051)).be.eql(2051);
        should(cutils.oidNumber('2051')).be.eql(2051);
        should(cutils.oidNumber('cmdhDefEcValues')).be.eql(2051);
    });

    it('ridKey', function () {
        should(cutils.ridKey('x', 1)).be.eql(1);
        should(cutils.ridKey('x', 1)).be.eql(1);
        should(cutils.ridKey(9999)).be.eql(9999);
        should(cutils.ridKey(9999, 1)).be.eql(1);
        should(cutils.ridKey(1, 9999)).be.eql(9999);
        should(cutils.ridKey(1, 'xxx')).be.eql('xxx');

        should(cutils.ridKey(5602)).be.eql('maxMeaValue');
        should(cutils.ridKey('5602')).be.eql('maxMeaValue');
        should(cutils.ridKey('maxMeaValue')).be.eql('maxMeaValue');
        should(cutils.ridKey('lwm2mServer', 5)).be.eql('disableTimeout');
        should(cutils.ridKey('lwm2mServer', '5')).be.eql('disableTimeout');
        should(cutils.ridKey(1, 5)).be.eql('disableTimeout');
        should(cutils.ridKey(1, '5')).be.eql('disableTimeout');
        should(cutils.ridKey(1, 'disableTimeout')).be.eql('disableTimeout');
        should(cutils.ridKey('1', 'disableTimeout')).be.eql('disableTimeout');
    });

    it('ridNumber', function () {
        should(cutils.ridNumber('x', 1)).be.eql(1);
        should(cutils.ridNumber('x', 1)).be.eql(1);
        should(cutils.ridNumber(9999)).be.eql(9999);
        should(cutils.ridNumber(9999, 1)).be.eql(1);
        should(cutils.ridNumber(1, 9999)).be.eql(9999);
        should(cutils.ridNumber(1, 'xxx')).be.eql('xxx');

        should(cutils.ridNumber(5602)).be.eql(5602);
        should(cutils.ridNumber('5602')).be.eql(5602);
        should(cutils.ridNumber('maxMeaValue')).be.eql(5602);
        should(cutils.ridNumber('lwm2mServer', 5)).be.eql(5);
        should(cutils.ridNumber('lwm2mServer', '5')).be.eql(5);
        should(cutils.ridNumber(1, 5)).be.eql(5);
        should(cutils.ridNumber(1, '5')).be.eql(5);
        should(cutils.ridNumber(1, 'disableTimeout')).be.eql(5);
        should(cutils.ridNumber('1', 'disableTimeout')).be.eql(5);
    });

    it('getAttrsAndRsc', function () {
        should(cutils.getAttrsAndRsc('</1/2>;pmin=10;pmax=60,</1/2/1>,</1/2/2>')).be.eql({ attrs: { pmin: 10, pmax: 60 }, resrcList: { '2': ['1', '2'] } });
        should(cutils.getAttrsAndRsc('</1/2/1>;pmin=10;pmax=60;gt=1;lt=100;stp=1')).be.eql({ attrs: { pmin: 10, pmax: 60, gt: 1, lt: 100, stp: 1 }});
    });

    it('pathSlashParser', function () {
        should(cutils.pathSlashParser('/x/y/z')).be.eql(['x', 'y', 'z']);
        should(cutils.pathSlashParser('/x/y/z/')).be.eql(['x', 'y', 'z']);
        should(cutils.pathSlashParser('x/y/z/')).be.eql(['x', 'y', 'z']);
        should(cutils.pathSlashParser('x/y/z')).be.eql(['x', 'y', 'z']);
    });

    it('getSoKeyObj', function () {
        should(cutils.getSoKeyObj('/1/2/3')).be.eql({ oid: 'lwm2mServer', iid: 2, rid: 'defaultMaxPeriod' });
        should(cutils.getSoKeyObj('/lwm2mServer/2/3')).be.eql({ oid: 'lwm2mServer', iid: 2, rid: 'defaultMaxPeriod' });
        should(cutils.getSoKeyObj('/1/2/defaultMaxPeriod')).be.eql({ oid: 'lwm2mServer', iid: 2, rid: 'defaultMaxPeriod' });
        should(cutils.getSoKeyObj('/lwm2mServer/2/defaultMaxPeriod')).be.eql({ oid: 'lwm2mServer', iid: 2, rid: 'defaultMaxPeriod' });
    });

    it('getSoValPath', function () {        
        should(cutils.getSoValPath('/1/2/3')).be.eql('/1/2/3');
        should(cutils.getSoValPath('/lwm2mServer/2/3')).be.eql('/1/2/3');
        should(cutils.getSoValPath('/1/2/defaultMaxPeriod')).be.eql('/1/2/3');
        should(cutils.getSoValPath('/lwm2mServer/2/defaultMaxPeriod')).be.eql('/1/2/3');
    });

    it('encodeJsonObj', function () {
        should(cutils.encodeJsonObj('x', { 1: {  0: 'x', 1: 5 }, 2: {  0: true }})).be.eql({ e: [{ n: '1/0', sv: 'x' }, { n: '1/1', v: 5 }, { n: '2/0', bv: true }] });
        should(cutils.encodeJsonObj('x/y', {  0: 'x', 1: 5 })).be.eql({ e: [{ n: '0', sv: 'x' }, { n: '1', v: 5 }] });
        should(cutils.encodeJsonObj('x/y/z', 5)).be.eql(5);
    });

    it('decodeJsonObj', function () {
        should(cutils.decodeJsonObj('x', { e: [{ n: '1/0', sv: 'x' }, { n: '1/1', v: 5 }, { n: '2/0', bv: true }] })).be.eql({ 1: {  0: 'x', 1: 5 }, 2: {  0: true }});
        should(cutils.decodeJsonObj('x/y', { e: [{ n: '0', sv: 'x' }, { n: '1', v: 5 }] })).be.eql({  0: 'x', 1: 5 });
        should(cutils.decodeJsonObj('x/y/z', 5)).be.eql(5);
    });

    it('dotPath', function () {
        should(cutils.dotPath('.x.y.z')).be.eql('x.y.z');
        should(cutils.dotPath('x.y.z.')).be.eql('x.y.z');
        should(cutils.dotPath('/x.y.z.')).be.eql('x.y.z');
        should(cutils.dotPath('/x.y/z.')).be.eql('x.y.z');
        should(cutils.dotPath('/x/y/z')).be.eql('x.y.z');
        should(cutils.dotPath('x/y/z/')).be.eql('x.y.z');
        should(cutils.dotPath('/x.y/z.')).be.eql('x.y.z');
        should(cutils.dotPath('/x.y/z/')).be.eql('x.y.z');
    });

    it('createPath', function () {
        should(cutils.createPath('/', 'x', 'y', 'z')).be.eql('x/y/z');
        should(cutils.createPath('.', 'x', 'y', 'z')).be.eql('x.y.z');
        should(cutils.createPath('', 'x', 'y', 'z')).be.eql('xyz');
        should(cutils.createPath('')).be.eql('');
    });

    it('buildPathValuePairs(rootPath, obj)', function () {
        should(cutils.buildPathValuePairs('/x/y/z', { a: { b: 3 } })).be.eql({ 'x.y.z.a.b': 3});
        should(cutils.buildPathValuePairs('/x/y/z', 3)).be.eql({ 'x.y.z': 3});
        should(cutils.buildPathValuePairs('/x/y/z', 'hello.world')).be.eql({ 'x.y.z': 'hello.world'});
        should(cutils.buildPathValuePairs('/x/y/z', [3, 2, 1])).be.eql({ 'x.y.z.0':3, 'x.y.z.1':2, 'x.y.z.2':1 });
        should(cutils.buildPathValuePairs('/x/y/z', [{ m: 3}, {m: 2}])).be.eql({ 'x.y.z.0.m': 3, 'x.y.z.1.m': 2 });
    });
});

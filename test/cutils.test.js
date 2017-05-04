var expect = require('chai').expect,
    cutils = require('../lib/components/cutils.js');
    
describe('cutils', function () {
    describe('Signature Check', function () {

        it('#.getTime()', function () {
            expect(function () { cutils.getTime(); }).not.to.throw();
        });

        it('#.oidKey()', function () {
            expect(function () { cutils.oidKey({}); }).to.throw();
            expect(function () { cutils.oidKey([]); }).to.throw();
            expect(function () { cutils.oidKey(); }).to.throw();

            expect(function () { cutils.oidKey('x'); }).not.to.throw();
            expect(function () { cutils.oidKey(5); }).not.to.throw();
        });

        it('#.oidNumber()', function () {
            expect(function () { cutils.oidNumber({}); }).to.throw();
            expect(function () { cutils.oidNumber([]); }).to.throw();
            expect(function () { cutils.oidNumber(); }).to.throw();

            expect(function () { cutils.oidNumber('x'); }).not.to.throw();
            expect(function () { cutils.oidNumber(5); }).not.to.throw();
        });

        it('#.ridKey()', function () {
            expect(function () { cutils.ridNumber({}, 'x'); }).to.throw();
            expect(function () { cutils.ridNumber([], 'x'); }).to.throw();
            expect(function () { cutils.ridNumber('x', []); }).to.throw();
            expect(function () { cutils.ridNumber('x', {}); }).to.throw();
            expect(function () { cutils.ridNumber(); }).to.throw();

            expect(function () { cutils.ridNumber('x', 'y'); }).not.to.throw();
            expect(function () { cutils.ridNumber(5, 'y'); }).not.to.throw();
            expect(function () { cutils.ridNumber('x', 5); }).not.to.throw();
            expect(function () { cutils.ridNumber(1, 5); }).not.to.throw();
        });

        it('#.ridNumber()', function () {
            expect(function () { cutils.ridNumber({}, 'x'); }).to.throw();
            expect(function () { cutils.ridNumber([], 'x'); }).to.throw();
            expect(function () { cutils.ridNumber('x', []); }).to.throw();
            expect(function () { cutils.ridNumber('x', {}); }).to.throw();
            expect(function () { cutils.ridNumber(); }).to.throw();

            expect(function () { cutils.ridNumber('x', 'y'); }).not.to.throw();
            expect(function () { cutils.ridNumber(5, 'y'); }).not.to.throw();
            expect(function () { cutils.ridNumber('x', 5); }).not.to.throw();
            expect(function () { cutils.ridNumber(1, 5); }).not.to.throw();
        });

        it('#.getPathArray()', function () {
            expect(function () { cutils.getPathArray(5); }).to.throw();
            expect(function () { cutils.getPathArray({}); }).to.throw();
            expect(function () { cutils.getPathArray([]); }).to.throw();
            expect(function () { cutils.getPathArray(); }).to.throw();

            expect(function () { cutils.getPathArray('x'); }).not.to.throw();
        });

        it('#.getPathIdKey()', function () {
            expect(function () { cutils.getPathIdKey(5); }).to.throw();
            expect(function () { cutils.getPathIdKey({}); }).to.throw();
            expect(function () { cutils.getPathIdKey([]); }).to.throw();
            expect(function () { cutils.getPathIdKey(); }).to.throw();

            expect(function () { cutils.getPathIdKey('x'); }).not.to.throw();
        });

        it('#.getNumPath()', function () {        
            expect(function () { cutils.getNumPath(5); }).to.throw();
            expect(function () { cutils.getNumPath({}); }).to.throw();
            expect(function () { cutils.getNumPath([]); }).to.throw();
            expect(function () { cutils.getNumPath(); }).to.throw();

            expect(function () { cutils.getNumPath('x'); }).not.to.throw();
        });

        it('#.decodeLinkFormat()', function () {
            expect(function () { cutils.decodeLinkFormat(5); }).to.throw();
            expect(function () { cutils.decodeLinkFormat({}); }).to.throw();
            expect(function () { cutils.decodeLinkFormat([]); }).to.throw();
            expect(function () { cutils.decodeLinkFormat(); }).to.throw();

            expect(function () { cutils.decodeLinkFormat('x'); }).not.to.throw();
        });

        it('#.encodeJson()', function () {
            expect(function () { cutils.encodeJson('x', 'y'); }).to.throw();
            expect(function () { cutils.encodeJson('x/y', 'y'); }).to.throw();
            expect(function () { cutils.encodeJson('x', 5); }).to.throw();
            expect(function () { cutils.encodeJson('x/y', 5); }).to.throw();
            expect(function () { cutils.encodeJson('x', []); }).to.throw();
            expect(function () { cutils.encodeJson(5, 'y'); }).to.throw();
            expect(function () { cutils.encodeJson(1, 5); }).to.throw();
            expect(function () { cutils.encodeJson({}, 'x'); }).to.throw();
            expect(function () { cutils.encodeJson([], 'x'); }).to.throw();
            expect(function () { cutils.encodeJson(); }).to.throw();

            expect(function () { cutils.encodeJson('x/y/z', 'y'); }).not.to.throw();
            expect(function () { cutils.encodeJson('x/y/z', 5); }).not.to.throw();
            expect(function () { cutils.encodeJson('x', {}); }).not.to.throw();
        });

        it('#.decodeJson()', function () {        
            expect(function () { cutils.decodeJson('x', 'y'); }).to.throw();
            expect(function () { cutils.decodeJson('x/y', 'y'); }).to.throw();
            expect(function () { cutils.decodeJson('x', 5); }).to.throw();
            expect(function () { cutils.decodeJson('x/y', 5); }).to.throw();
            expect(function () { cutils.decodeJson('x', []); }).to.throw();
            expect(function () { cutils.decodeJson(5, 'y'); }).to.throw();
            expect(function () { cutils.decodeJson(1, 5); }).to.throw();
            expect(function () { cutils.decodeJson({}, 'x'); }).to.throw();
            expect(function () { cutils.decodeJson([], 'x'); }).to.throw();
            expect(function () { cutils.decodeJson(); }).to.throw();

            expect(function () { cutils.decodeJson('x/y/z', {e:[]}); }).not.to.throw();
            expect(function () { cutils.decodeJson('x', {e:[]}); }).not.to.throw();
        });

        it('#.dotPath()', function () {        
            expect(function () { cutils.dotPath(5); }).to.throw();
            expect(function () { cutils.dotPath({}); }).to.throw();
            expect(function () { cutils.dotPath([]); }).to.throw();
            expect(function () { cutils.dotPath(); }).to.throw();

            expect(function () { cutils.dotPath('xyz'); }).not.to.throw();
        });

        it('#.createPath()', function () {
            expect(function () { cutils.createPath(5); }).to.throw();
            expect(function () { cutils.createPath({}); }).to.throw();
            expect(function () { cutils.createPath([]); }).to.throw();
            expect(function () { cutils.createPath(); }).to.throw();

            expect(function () { cutils.createPath('xyz'); }).not.to.throw();
        });

        it('#.buildPathValuePairs()', function () {
            expect(function () { cutils.buildPathValuePairs(3, { a: { b: 1 } }); }).to.throw();
            expect(function () { cutils.buildPathValuePairs([], { a: { b: 1 } }); }).to.throw();
            expect(function () { cutils.buildPathValuePairs({}, { a: { b: 1 } }); }).to.throw();
            expect(function () { cutils.buildPathValuePairs(undefined, { a: { b: 1 } }); }).to.throw();
            expect(function () { cutils.buildPathValuePairs(null, { a: { b: 1 } }); }).to.throw();
            
            expect(function () { cutils.buildPathValuePairs('/xyz', { a: { b: 1 } }); }).not.to.throw();
        });

    });

    describe('Functional Check', function () {
        it('#.oidKey()', function () {
            expect(cutils.oidKey('x')).to.be.eql('x');
            expect(cutils.oidKey(9999)).to.be.eql(9999);
            expect(cutils.oidKey(2051)).to.be.eql('cmdhDefEcValues');
            expect(cutils.oidKey('2051')).to.be.eql('cmdhDefEcValues');
            expect(cutils.oidKey('cmdhDefEcValues')).to.be.eql('cmdhDefEcValues');
        });

        it('#.oidNumber()', function () {
            expect(cutils.oidNumber('x')).to.be.eql('x');
            expect(cutils.oidNumber(9999)).to.be.eql(9999);
            expect(cutils.oidNumber(2051)).to.be.eql(2051);
            expect(cutils.oidNumber('2051')).to.be.eql(2051);
            expect(cutils.oidNumber('cmdhDefEcValues')).to.be.eql(2051);
        });

        it('#.ridKey()', function () {
            expect(cutils.ridKey('x', 1)).to.be.eql(1);
            expect(cutils.ridKey('x', 1)).to.be.eql(1);
            expect(cutils.ridKey(9999)).to.be.eql(9999);
            expect(cutils.ridKey(9999, 1)).to.be.eql(1);
            expect(cutils.ridKey(1, 9999)).to.be.eql(9999);
            expect(cutils.ridKey(1, 'xxx')).to.be.eql('xxx');

            expect(cutils.ridKey(5602)).to.be.eql('maxMeaValue');
            expect(cutils.ridKey('5602')).to.be.eql('maxMeaValue');
            expect(cutils.ridKey('maxMeaValue')).to.be.eql('maxMeaValue');
            expect(cutils.ridKey('lwm2mServer', 5)).to.be.eql('disableTimeout');
            expect(cutils.ridKey('lwm2mServer', '5')).to.be.eql('disableTimeout');
            expect(cutils.ridKey(1, 5)).to.be.eql('disableTimeout');
            expect(cutils.ridKey(1, '5')).to.be.eql('disableTimeout');
            expect(cutils.ridKey(1, 'disableTimeout')).to.be.eql('disableTimeout');
            expect(cutils.ridKey('1', 'disableTimeout')).to.be.eql('disableTimeout');
        });

        it('#.ridNumber()', function () {
            expect(cutils.ridNumber('x', 1)).to.be.eql(1);
            expect(cutils.ridNumber('x', 1)).to.be.eql(1);
            expect(cutils.ridNumber(9999)).to.be.eql(9999);
            expect(cutils.ridNumber(9999, 1)).to.be.eql(1);
            expect(cutils.ridNumber(1, 9999)).to.be.eql(9999);
            expect(cutils.ridNumber(1, 'xxx')).to.be.eql('xxx');

            expect(cutils.ridNumber(5602)).to.be.eql(5602);
            expect(cutils.ridNumber('5602')).to.be.eql(5602);
            expect(cutils.ridNumber('maxMeaValue')).to.be.eql(5602);
            expect(cutils.ridNumber('lwm2mServer', 5)).to.be.eql(5);
            expect(cutils.ridNumber('lwm2mServer', '5')).to.be.eql(5);
            expect(cutils.ridNumber(1, 5)).to.be.eql(5);
            expect(cutils.ridNumber(1, '5')).to.be.eql(5);
            expect(cutils.ridNumber(1, 'disableTimeout')).to.be.eql(5);
            expect(cutils.ridNumber('1', 'disableTimeout')).to.be.eql(5);
        });

        it('#.getPathArray()', function () {
            expect(cutils.getPathArray('/x/y/z')).to.be.eql(['x', 'y', 'z']);
            expect(cutils.getPathArray('/x/y/z/')).to.be.eql(['x', 'y', 'z']);
            expect(cutils.getPathArray('x/y/z/')).to.be.eql(['x', 'y', 'z']);
            expect(cutils.getPathArray('x/y/z')).to.be.eql(['x', 'y', 'z']);
        });

        it('#.getPathIdKey()', function () {
            expect(cutils.getPathIdKey('/1/2/3')).to.be.eql({ oid: 'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod' });
            expect(cutils.getPathIdKey('/lwm2mServer/2/3')).to.be.eql({ oid: 'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod' });
            expect(cutils.getPathIdKey('/1/2/defaultMaxPeriod')).to.be.eql({ oid: 'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod' });
            expect(cutils.getPathIdKey('/lwm2mServer/2/defaultMaxPeriod')).to.be.eql({ oid: 'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod' });
        });

        it('#.getNumPath()', function () {        
            expect(cutils.getNumPath('/1/2/3')).to.be.eql('/1/2/3');
            expect(cutils.getNumPath('/lwm2mServer/2/3')).to.be.eql('/1/2/3');
            expect(cutils.getNumPath('/1/2/defaultMaxPeriod')).to.be.eql('/1/2/3');
            expect(cutils.getNumPath('/lwm2mServer/2/defaultMaxPeriod')).to.be.eql('/1/2/3');
        });

        it('#.decodeLinkFormat()', function () {
            expect(cutils.decodeLinkFormat('</1/2>;pmin=10;pmax=60,</1/2/1>,</1/2/2>')).to.be.eql({ path:'/1/2', attrs: { pmin: 10, pmax: 60 }, resrcList: ['/1/2/1', '/1/2/2'] });
            expect(cutils.decodeLinkFormat('</1/2/1>;pmin=10;pmax=60;gt=1;lt=100;st=1')).to.be.eql({ path:'/1/2/1', attrs: { pmin: 10, pmax: 60, gt: 1, lt: 100, st: 1 }});
        });

        it('#.encodeJson()', function () {
            expect(cutils.encodeJson('x', { 1: {  0: 'x', 1: 5 }, 2: {  0: true }})).to.be.eql({ bn: '/x', e: [{ n: '1/0', sv: 'x' }, { n: '1/1', v: 5 }, { n: '2/0', bv: true }] });
            expect(cutils.encodeJson('x/y', { 0: 'x', 1: 5, 2: new Date(100000) })).to.be.eql({ bn: '/x/y', e: [{ n: '0', sv: 'x' }, { n: '1', v: 5 }, { n: '2', v: 100000 }] });
            expect(cutils.encodeJson('x/y/z', 5)).to.be.eql({ bn: '/x/y/z', e: [{ n: '', v: 5}]});
            expect(cutils.encodeJson('x/y/z', new Date(100000))).to.be.eql({ bn: '/x/y/z', e: [{ n: '', v: 100000}]});
        });

        it('#.decodeJson()', function () {
            expect(cutils.decodeJson('x', { e: [{ n: '1/0', sv: 'x' }, { n: '1/1', v: 5 }, { n: '2/0', bv: true }] })).to.be.eql({ 1: {  0: 'x', 1: 5 }, 2: {  0: true }});
            expect(cutils.decodeJson('x/y', { e: [{ n: '0', sv: 'x' }, { n: '1', v: 5 }] })).to.be.eql({  0: 'x', 1: 5 });
            expect(cutils.decodeJson('x/y/z', { e: [{ n: '', v: 5}]})).to.be.eql(5);
        });

        it('#.dotPath()', function () {
            expect(cutils.dotPath('.x.y.z')).to.be.eql('x.y.z');
            expect(cutils.dotPath('x.y.z.')).to.be.eql('x.y.z');
            expect(cutils.dotPath('/x.y.z.')).to.be.eql('x.y.z');
            expect(cutils.dotPath('/x.y/z.')).to.be.eql('x.y.z');
            expect(cutils.dotPath('/x/y/z')).to.be.eql('x.y.z');
            expect(cutils.dotPath('x/y/z/')).to.be.eql('x.y.z');
            expect(cutils.dotPath('/x.y/z.')).to.be.eql('x.y.z');
            expect(cutils.dotPath('/x.y/z/')).to.be.eql('x.y.z');
        });

        it('#.createPath()', function () {
            expect(cutils.createPath('/', 'x', 'y', 'z')).to.be.eql('x/y/z');
            expect(cutils.createPath('.', 'x', 'y', 'z')).to.be.eql('x.y.z');
            expect(cutils.createPath('', 'x', 'y', 'z')).to.be.eql('xyz');
            expect(cutils.createPath('')).to.be.eql('');
        });

        it('#.buildPathValuePairs()', function () {
            expect(cutils.buildPathValuePairs('/x/y/z', { a: { b: 3 } })).to.be.eql({ 'x.y.z.a.b': 3});
            expect(cutils.buildPathValuePairs('/x/y/z', 3)).to.be.eql({ 'x.y.z': 3});
            expect(cutils.buildPathValuePairs('/x/y/z', 'hello.world')).to.be.eql({ 'x.y.z': 'hello.world'});
            expect(cutils.buildPathValuePairs('/x/y/z', [3, 2, 1])).to.be.eql({ 'x.y.z.0':3, 'x.y.z.1':2, 'x.y.z.2':1 });
            expect(cutils.buildPathValuePairs('/x/y/z', [{ m: 3}, {m: 2}])).to.be.eql({ 'x.y.z.0.m': 3, 'x.y.z.1.m': 2 });
        });
    });
});
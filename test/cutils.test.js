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

        it('#.getAttrsAndRsc()', function () {
            expect(function () { cutils.getAttrsAndRsc(5); }).to.throw();
            expect(function () { cutils.getAttrsAndRsc({}); }).to.throw();
            expect(function () { cutils.getAttrsAndRsc([]); }).to.throw();
            expect(function () { cutils.getAttrsAndRsc(); }).to.throw();

            expect(function () { cutils.getAttrsAndRsc('x'); }).not.to.throw();
        });

        it('#.pathSlashParser()', function () {
            expect(function () { cutils.pathSlashParser(5); }).to.throw();
            expect(function () { cutils.pathSlashParser({}); }).to.throw();
            expect(function () { cutils.pathSlashParser([]); }).to.throw();
            expect(function () { cutils.pathSlashParser(); }).to.throw();

            expect(function () { cutils.pathSlashParser('x'); }).not.to.throw();
        });

        it('#.getSoKeyObj()', function () {
            expect(function () { cutils.getSoKeyObj(5); }).to.throw();
            expect(function () { cutils.getSoKeyObj({}); }).to.throw();
            expect(function () { cutils.getSoKeyObj([]); }).to.throw();
            expect(function () { cutils.getSoKeyObj(); }).to.throw();

            expect(function () { cutils.getSoKeyObj('x'); }).not.to.throw();
        });

        it('#.getSoValPath()', function () {        
            expect(function () { cutils.getSoValPath(5); }).to.throw();
            expect(function () { cutils.getSoValPath({}); }).to.throw();
            expect(function () { cutils.getSoValPath([]); }).to.throw();
            expect(function () { cutils.getSoValPath(); }).to.throw();

            expect(function () { cutils.getSoValPath('x'); }).not.to.throw();
        });

        it('#.encodeJsonObj()', function () {
            expect(function () { cutils.encodeJsonObj('x', 'y'); }).to.throw();
            expect(function () { cutils.encodeJsonObj('x/y', 'y'); }).to.throw();
            expect(function () { cutils.encodeJsonObj('x', 5); }).to.throw();
            expect(function () { cutils.encodeJsonObj('x/y', 5); }).to.throw();
            expect(function () { cutils.encodeJsonObj('x', []); }).to.throw();
            expect(function () { cutils.encodeJsonObj(5, 'y'); }).to.throw();
            expect(function () { cutils.encodeJsonObj(1, 5); }).to.throw();
            expect(function () { cutils.encodeJsonObj({}, 'x'); }).to.throw();
            expect(function () { cutils.encodeJsonObj([], 'x'); }).to.throw();
            expect(function () { cutils.encodeJsonObj(); }).to.throw();

            expect(function () { cutils.encodeJsonObj('x/y/z', 'y'); }).not.to.throw();
            expect(function () { cutils.encodeJsonObj('x/y/z', 5); }).not.to.throw();
            expect(function () { cutils.encodeJsonObj('x', {}); }).not.to.throw();
        });

        it('#.decodeJsonObj()', function () {        
            expect(function () { cutils.decodeJsonObj('x', 'y'); }).to.throw();
            expect(function () { cutils.decodeJsonObj('x/y', 'y'); }).to.throw();
            expect(function () { cutils.decodeJsonObj('x', 5); }).to.throw();
            expect(function () { cutils.decodeJsonObj('x/y', 5); }).to.throw();
            expect(function () { cutils.decodeJsonObj('x', []); }).to.throw();
            expect(function () { cutils.decodeJsonObj(5, 'y'); }).to.throw();
            expect(function () { cutils.decodeJsonObj(1, 5); }).to.throw();
            expect(function () { cutils.decodeJsonObj({}, 'x'); }).to.throw();
            expect(function () { cutils.decodeJsonObj([], 'x'); }).to.throw();
            expect(function () { cutils.decodeJsonObj(); }).to.throw();

            expect(function () { cutils.decodeJsonObj('x/y/z', 'y'); }).not.to.throw();
            expect(function () { cutils.decodeJsonObj('x/y/z', 5); }).not.to.throw();
            expect(function () { cutils.decodeJsonObj('x', {}); }).not.to.throw();
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

        it('#.getAttrsAndRsc()', function () {
            expect(cutils.getAttrsAndRsc('</1/2>;pmin=10;pmax=60,</1/2/1>,</1/2/2>')).to.be.eql({ attrs: { pmin: 10, pmax: 60 }, resrcList: { '2': ['lifetime', 'defaultMinPeriod'] } });
            expect(cutils.getAttrsAndRsc('</1/2/1>;pmin=10;pmax=60;gt=1;lt=100;stp=1')).to.be.eql({ attrs: { pmin: 10, pmax: 60, gt: 1, lt: 100, stp: 1 }});
        });

        it('#.pathSlashParser()', function () {
            expect(cutils.pathSlashParser('/x/y/z')).to.be.eql(['x', 'y', 'z']);
            expect(cutils.pathSlashParser('/x/y/z/')).to.be.eql(['x', 'y', 'z']);
            expect(cutils.pathSlashParser('x/y/z/')).to.be.eql(['x', 'y', 'z']);
            expect(cutils.pathSlashParser('x/y/z')).to.be.eql(['x', 'y', 'z']);
        });

        it('#.getSoKeyObj()', function () {
            expect(cutils.getSoKeyObj('/1/2/3')).to.be.eql({ oid: 'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod' });
            expect(cutils.getSoKeyObj('/lwm2mServer/2/3')).to.be.eql({ oid: 'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod' });
            expect(cutils.getSoKeyObj('/1/2/defaultMaxPeriod')).to.be.eql({ oid: 'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod' });
            expect(cutils.getSoKeyObj('/lwm2mServer/2/defaultMaxPeriod')).to.be.eql({ oid: 'lwm2mServer', iid: '2', rid: 'defaultMaxPeriod' });
        });

        it('#.getSoValPath()', function () {        
            expect(cutils.getSoValPath('/1/2/3')).to.be.eql('/1/2/3');
            expect(cutils.getSoValPath('/lwm2mServer/2/3')).to.be.eql('/1/2/3');
            expect(cutils.getSoValPath('/1/2/defaultMaxPeriod')).to.be.eql('/1/2/3');
            expect(cutils.getSoValPath('/lwm2mServer/2/defaultMaxPeriod')).to.be.eql('/1/2/3');
        });

        it('#.encodeJsonObj()', function () {
            expect(cutils.encodeJsonObj('x', { 1: {  0: 'x', 1: 5 }, 2: {  0: true }})).to.be.eql({ e: [{ n: '1/0', sv: 'x' }, { n: '1/1', v: 5 }, { n: '2/0', bv: true }] });
            expect(cutils.encodeJsonObj('x/y', { 0: 'x', 1: 5, 2: new Date(100000) })).to.be.eql({ e: [{ n: '0', sv: 'x' }, { n: '1', v: 5 }, { n: '2', v: 100000 }] });
            expect(cutils.encodeJsonObj('x/y/z', 5)).to.be.eql(5);
            expect(cutils.encodeJsonObj('x/y/z', new Date(100000))).to.be.eql(100000);
        });

        it('#.decodeJsonObj()', function () {
            expect(cutils.decodeJsonObj('x', { e: [{ n: '1/0', sv: 'x' }, { n: '1/1', v: 5 }, { n: '2/0', bv: true }] })).to.be.eql({ 1: {  0: 'x', 1: 5 }, 2: {  0: true }});
            expect(cutils.decodeJsonObj('x/y', { e: [{ n: '0', sv: 'x' }, { n: '1', v: 5 }] })).to.be.eql({  0: 'x', 1: 5 });
            expect(cutils.decodeJsonObj('x/y/z', 5)).to.be.eql(5);
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
var should = require('should'),
    SmartObject = require('../lib/smartobject.js');

describe('Signature Check', function () {
    var so = new SmartObject();

    it('addObjects(sObjs)', function () {
        (function () { so.addObjects(1); }).should.throw();
        (function () { so.addObjects('xxx'); }).should.throw();
        (function () { so.addObjects([]); }).should.throw();
        (function () { so.addObjects({}); }).should.not.throw();
    });

    it('addIObjects(iObjs)', function () {
        (function () { so.addIObjects(1, []); }).should.throw();
        (function () { so.addIObjects('1', {}); }).should.not.throw();
        (function () { so.addIObjects(1, 1); }).should.throw();
        (function () { so.addIObjects(1, 'xxx'); }).should.throw();
        (function () { so.addIObjects(1); }).should.throw();
        (function () { so.addIObjects(1, null); }).should.throw();
    });

    it('addResources(oid, iid, rObjs)', function () {
        (function () { so.addResources(1, 20 ,[]); }).should.throw();
        (function () { so.addResources('1', '20', {}); }).should.not.throw();
        (function () { so.addResources(1, 20, 1); }).should.throw();
        (function () { so.addResources(1, 20, 'xxx'); }).should.throw();
        (function () { so.addResources(1, 20, null); }).should.throw();
        (function () { so.addResources(1, 20); }).should.throw();
        (function () { so.addResources(1); }).should.throw();
        (function () { so.addResources(1, null); }).should.throw();
    });
});

describe('Functional Check', function () {
    var so = new SmartObject(),
        sObj = {
            'x': {
                0: {
                    'x1': 1,
                    'x2': 2
                },
                1: {
                    'y1': 3,
                    'y2': 4
                }
            }
        },
        iobj = {
            0: {
                'ri1': 'hi'
            },
            1: {
                'ri2': 100
            }
        },
        resrc = {
            'r1': 3,
            'r2': 4
        };

    it('addObjects(sObjs)', function () {
        so.addObjects(sObj);
        should(so.x).be.eql(sObj.x);
    });

    it('addIObjects(oid, iObjs)', function () {
        so.addIObjects('new', iobj);
        should(so.new).be.eql(iobj);
    });

    it('addResources(oid, iid, rObjs)', function () {
        so.addResources('hiver', 3, resrc);
        so.addResources(3200, 0, { 5502: 1});
        should(so.hiver[3]).be.eql(resrc);
    });

    it('dump()', function () {
        should(so.dump()).be.eql({
            x: { '0': { x1: 1, x2: 2 }, '1': { y1: 3, y2: 4 } },
            'new': { '0': { ri1: 'hi' }, '1': { ri2: 100 } },
            hiver: { '3': { r1: 3, r2: 4 } },
            dIn: { '0' : { dInPolarity: 1 }}
        });
    });
});
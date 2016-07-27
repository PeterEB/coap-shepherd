var fs = require('fs'),
    path = require('path'),
    _ = require('busyman'),
    should = require('should'),
    Coapdb = require('../lib/components/coapdb.js');

var nodeMock1 = {
    clientName: 'mock01',
    locationPath: '1',
    lifetime: 86400,
    ip: '192.168.1.100',
    version: '1.0.0',
    so: {
        lwm2mServer: {
            0: {
                lifetime: 86400,
                defaultMinPeriod: 1,
                defaultMaxPeriod: 60
            }
        },
        connMonitor: { 
            0: { 
                ip: '192.168.1.100' 
            } 
        }
    }
};

var nodeMock2 = {
    clientName: 'mock02',
    locationPath: '2',
    lifetime: 85741,
    ip: '192.168.1.110',
    version: '1.0.0',
    so: {
        lwm2mServer: {
            0: {
                lifetime: 85741,
                defaultMinPeriod: 1,
                defaultMaxPeriod: 50
            }
        }
    }
};

var nodeMock3 = {
    clientName: 'mock03',
    locationPath: '3',
    lifetime: 84321,
    ip: '192.168.1.120',
    version: '1.0.0',
    so: {
        lwm2mServer: {
            0: {
                lifetime: 84321,
                defaultMinPeriod: 1,
                defaultMaxPeriod: 40
            }
        }
    }
};


describe('coapdb - Functional Check', function () {
    var dbPath = path.resolve('./test/database_test/coap.db'),
        coapdb;
            
    before(function () {
        coapdb = new Coapdb(dbPath);
    });

    describe('#.insert()', function () {
        it('insert nodeMock1', function (done) {
            coapdb.insert(nodeMock1).then(function (doc) {
                delete doc._id;
                if (_.isEqual(doc, nodeMock1)) done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('insert nodeMock2', function (done) {
            coapdb.insert(nodeMock2).then(function (doc) {
                delete doc._id;
                if (_.isEqual(doc, nodeMock2)) done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('insert nodeMock1', function (done) {
            coapdb.insert(nodeMock1).then(function (doc) {

            }).fail(function (err) {
                if (err.errorType === 'uniqueViolated') done();
            });
        });

        it('insert nodeMock2', function (done) {
            coapdb.insert(nodeMock2).then(function (doc) {

            }).fail(function (err) {
                if (err.errorType === 'uniqueViolated') done();
            });
        });
    });

    describe('#.findByClientName()', function () {
        it('find nodeMock1', function (done) {
            coapdb.findByClientName('mock01').then(function (doc) {
                delete doc._id;
                if (_.isEqual(doc, nodeMock1)) done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('find nodeMock2', function (done) {
            coapdb.findByClientName('mock02').then(function (doc) {
                delete doc._id;
                if (_.isEqual(doc, nodeMock2)) done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('find nodeMock3', function (done) {
            coapdb.findByClientName('mock03').then(function (doc) {
                if (_.isNull(doc)) done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('insert nodeMock3', function (done) {
            coapdb.insert(nodeMock3).then(function (doc) {
                delete doc._id;
                if (_.isEqual(doc, nodeMock3)) done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('find nodeMock3', function (done) {
            coapdb.findByClientName('mock03').then(function (doc) {
                delete doc._id;
                if (_.isEqual(doc, nodeMock3)) done();
            }).fail(function (err) {
                console.log(err);
            });
        });
    });

    describe('#.exportClientNames()', function () {
        it('find all client names', function (done) {
            coapdb.exportClientNames().then(function (names) {
                var allNames = ['mock01', 'mock02', 'mock03'],
                    hasAll = true;

                _.forEach(names, function (name) {
                    if (!_.includes(allNames, name)) hasAll = false;
                });

                if (hasAll) done();
            }).fail(function (err) {
                console.log(err);
            });
        });
    });

    describe('#.replace()', function () {
        it('cannot replace clientName', function (done) {
            coapdb.replace('nock01', 'clientName', 'nock04').then(function (num) {
                console.log(num);
            }).fail(function (err) {
                if (err) done();
            });
        });

        it('cannot replace locationPath', function (done) {
            coapdb.replace('nock01', 'locationPath', '/rd/5').then(function (num) {
                console.log(num);
            }).fail(function (err) {
                if (err) done();
            });
        });

        it('replace ip', function (done) {
            coapdb.replace('mock01', 'ip', '192.168.1.101').then(function (num) {
                return coapdb.findByClientName('mock01');
            }).then(function (doc) {
                if (doc.ip === '192.168.1.101') done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('replace lifetime', function (done) {
            coapdb.replace('mock01', 'lifetime', 86000).then(function (num) {
                return coapdb.findByClientName('mock01');
            }).then(function (doc) {
                if (doc.lifetime === 86000) done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('replace version', function (done) {
            coapdb.replace('mock01', 'version', '1.0.1').then(function (num) {
                return coapdb.findByClientName('mock01');
            }).then(function (doc) {
                if (doc.version === '1.0.1') done();
            }).fail(function (err) {
                console.log(err);
            });
        });
            
        it('replace so.lwm2mServer.0.defaultMinPeriod', function (done) {
            coapdb.replace('mock01', 'so.lwm2mServer.0.defaultMinPeriod', 10).then(function (num) {
                return coapdb.findByClientName('mock01');
            }).then(function (doc) {
                if (doc.so.lwm2mServer[0].defaultMinPeriod === 10) done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('replace so.connMonitor', function (done) {
            coapdb.replace('mock01', 'so.connMonitor', { 1: { ip: '192.168.1.102' } }).then(function (num) {
                return coapdb.findByClientName('mock01');
            }).then(function (doc) {
                if (_.isEqual(doc.so.connMonitor, { 1: { ip: '192.168.1.102' } })) done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('find nothing', function (done) {
            coapdb.replace('mock04', 'connMonitor.1', { ip: '192.168.1.130' } ).then(function (num) {

            }).fail(function (err) {
                if (err) done();
            });
        });

        it('find nothing', function (done) {
            coapdb.replace('mock01', 'connMonitor.30', { ip: '192.168.1.103' } ).then(function (num) {

            }).fail(function (err) {
                if (err) done();
            });
        });


        it('find nothing', function (done) {
            coapdb.replace('mock01', 'connMonitor1.100', { ip: '192.168.1.104' } ).then(function (num) {

            }).fail(function (err) {
                if (err) done();
            });
        });
    });

    describe('#.modify()', function () {
        it('cannot modifiy clientName', function (done) {
            coapdb.modify('mock01', 'clientName', 'hello').then(function (diff) {

            }).fail(function (err) {
                if (err) done();
            });
        });

        it('modify ip', function (done) {
            coapdb.modify('mock01', 'ip', '192.168.1.105').then(function (diff) {
                if (diff.ip === '192.168.1.105') done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('modify lifetime', function (done) {
            coapdb.modify('mock01', 'lifetime', 81000).then(function (diff) {
                if (diff.lifetime === 81000) done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('modify version', function (done) {
            coapdb.modify('mock01', 'version', '1.0.2').then(function (diff) {
                if (diff.version === '1.0.2') done();
            }).fail(function (err) {
                console.log(err);
            });
        }); 

        it('modify so.lwm2mServer', function (done) {
            coapdb.modify('mock01', 'so.lwm2mServer', { 0: { defaultMinPeriod: 30, defaultMaxPeriod: 60 } }).then(function (diff) {
                if (_.isEqual(diff, { 0: { defaultMinPeriod: 30 } })) done();
            }).fail(function (err) {
                console.log(err);
            });
        }); 

        it('modify so.lwm2mServer.0', function (done) {
            coapdb.modify('mock01', 'so.lwm2mServer.0', { defaultMaxPeriod: 100 }).then(function (diff) {
                if (_.isEqual(diff, { defaultMaxPeriod: 100 })) done();
            }).fail(function (err) {
                console.log(err);
            });
        }); 

        it('modify so.lwm2mServer.0', function (done) {
            coapdb.modify('mock01', 'so.lwm2mServer.0', { defaultMaxPeriod: 100 }).then(function (diff) {
                if (_.isEqual(diff, {})) done();
            }).fail(function (err) {
                console.log(err);
            });
        }); 

        it('find nothing', function (done) {
            coapdb.modify('mock01', 'so.lwm2mServer.0', { defaultMaxPeriodx: 100 }).then(function (diff) {
            }).fail(function (err) {
                if (err) done();
            });
        }); 

        it('find nothing', function (done) {
            coapdb.modify('mock01', 'connMonitor1.100', { ip: '192.168.1.104' } ).then(function (diff) {
            }).fail(function (err) {
                if (err) done();
            });
        });
    });

    describe('#.remove()', function () {
        it('remove mock01', function (done) {
            coapdb.removeByClientName('mock01').then(function (num) {
                return coapdb.findByClientName('mock01');
            }).then(function (doc) {
                if (_.isNull(doc)) done();
            });
        });

        it('remove mock02', function (done) {
            coapdb.removeByClientName('mock02').then(function (num) {
                return coapdb.findByClientName('mock02');
            }).then(function (doc) {
                if (_.isNull(doc)) done();
            });
        });

        it('remove mock03', function (done) {
            coapdb.removeByClientName('mock03').then(function (num) {
                return coapdb.findByClientName('mock03');
            }).then(function (doc) {
                if (_.isNull(doc)) done();
            });
        });

        it('find nothing', function (done) {
            coapdb.removeByClientName('mock04').then(function (num) {
                if (num === 0) done();
            }).fail(function (err) {
                console.log(err);
            });
        });
    });
});
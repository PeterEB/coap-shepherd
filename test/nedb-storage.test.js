var fs = require('fs'),
    path = require('path'),
    _ = require('busyman'),
    expect = require('chai').expect,
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    Datastore = require('nedb'),

    defaultConfig = require('../lib/config'),
    CoapNode = require('../lib/components/coap-node'),
    StorageInterface = require('../lib/components/storage-interface'),
    NedbStorage = require('../lib/components/nedb-storage.js'),
    fixture = require('./fixture'),
    _verifySignatureSync = fixture._verifySignatureSync,
    _verifySignatureAsync = fixture._verifySignatureAsync,

    baseDir = './test/database_test',
    alterDir = baseDir + '/new_dir',
    alterPath = alterDir + '/test.db',
    storage;

chai.use(sinonChai);

var shepherd = {
    emit: function () {},
    request: function (req, callback) {
        var deferred = Q.defer();
        deferred.resolve({});
        return deferred.promise.nodeify(callback);
    },
    _newClientId: function () { return 1; },
    _config: Object.assign({}, defaultConfig)
};

var cnode1 = _createNode({
    clientName: 'mock01',
    clientId: 1,
    locationPath: '1',
    lifetime: 86400,
    ip: '192.168.1.100',
    port: '5685',
    mac: 'AA:BB:CC:DD:EE:11',
    version: '1.0.0',
    heartbeatEnabled: true,
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
    },
    objList: {
        lwm2mServer: [0],
        connMonitor: [0]
    }
});

var cnode2 = _createNode({
    clientName: 'mock02',
    clientId: 2,
    locationPath: '2',
    lifetime: 85741,
    ip: '192.168.1.110',
    port: '5686',
    mac: 'AA:BB:CC:DD:EE:22',
    version: '1.0.0',
    heartbeatEnabled: false,
    so: {
        lwm2mServer: {
            0: {
                lifetime: 85741,
                defaultMinPeriod: 1,
                defaultMaxPeriod: 50
            }
        }
    },
    objList: {
        lwm2mServer: [0]
    },
    observedList: ['/lwm2mServer/0/defaultMinPeriod']
});

var cnode3 = _createNode({
    clientName: 'mock03',
    clientId: 3,
    locationPath: '3',
    lifetime: 84321,
    ip: '192.168.1.120',
    port: '5687',
    mac: 'AA:BB:CC:DD:EE:33',
    version: '1.0.0',
    heartbeatEnabled: true,
    so: {
        lwm2mServer: {
            0: {
                lifetime: 84321,
                defaultMinPeriod: 1,
                defaultMaxPeriod: 40
            }
        }
    },
    objList: {
        lwm2mServer: [0]
    }
});

describe('nedb-storage', function () {
    before(function (done) {
        storage = new NedbStorage('');
        var dir = path.resolve(baseDir);
        if (!fs.existsSync(dir))
            fs.mkdir(dir, function (err) {
                expect(err).to.equal(null);
                done();
            });
        else
            done();
    });

    describe('Constructor Check', function () {
        before(function (done) {
            _clearAlterPath(done);
        });

        it('should create an instance of StorageInterface', function () {
            expect(storage).to.be.instanceOf(StorageInterface);
        });

        it('should raise an error if dbPath is not a string', function () {
            var _createDatabaseStub = sinon.stub(NedbStorage.prototype, '_createDatabase', function () {});
            _verifySignatureSync(function (arg) { new NedbStorage(arg); }, ['string']);
            _createDatabaseStub.restore();
            expect(_createDatabaseStub).to.have.been.calledOnce;
        });

        it('should create the directory of dbPath if not exists', function () {
            var ensureIndexStub = sinon.stub(Datastore.prototype, 'ensureIndex', function (options, cb) {
                    cb(null);
                });

            new NedbStorage(alterPath);

            ensureIndexStub.restore();
            expect(fs.existsSync(path.resolve(alterDir))).to.eql(true);
            expect(ensureIndexStub).has.been.calledWith({ fieldName: 'clientName', unique: true });
        });

        it('should create a inMemoryOnly backend nedb when dbPath is empty', function () {
            var storage = new NedbStorage('');

            expect(storage._db.inMemoryOnly).to.eql(true);
        });

        after(function (done) {
            setTimeout(function () {
                _clearAlterPath(done);
            }, 100);
        });
    });

    describe('Signature Check', function () {
        it('#.save', function () {
            _verifySignatureSync(function (arg) { storage.save(arg); }, [cnode1]);
        });

        it('#.load', function () {
            _verifySignatureSync(function (arg) { storage.load(arg); }, [cnode1]);
        });

        it('#.remove', function () {
            _verifySignatureSync(function (arg) { storage.remove(arg); }, [cnode1]);
        });

        it('#.updateAttrs', function () {
            _verifySignatureSync(function (arg) { storage.updateAttrs(arg, null); }, [cnode1]);
            _verifySignatureSync(function (arg) { storage.updateAttrs(cnode1, arg); }, ['null', 'object']);
        });

        it('#.patchSo', function () {
            _verifySignatureSync(function (arg) { storage.patchSo(arg, null); }, [cnode1]);
            _verifySignatureSync(function (arg) { storage.patchSo(cnode1, arg); }, ['null', 'object']);
        });
    });

    describe('Functional Check', function () {
        describe('#.save', function () {
            it('should reject when db error occurred', function () {
                var updateStub = _createUpdateStub('db error');

                var promise = storage.save(cnode1);

                return promise.catch(function (err) {
                    updateStub.restore();
                    expect(err).to.be.instanceOf(Error);
                    expect(err.message).to.eql('db error');
                });
            });

            it('should save the node', function (done) {
                var promise = storage.save(cnode1);

                promise.then(function (data) {
                    expect(data).to.deep.equal(cnode1.dump());
                    storage._db.findOne({ clientName: cnode1.clientName }, { _id: 0 }, function (err, doc) {
                        expect(err).to.eql(null);
                        expect(doc).to.deep.equal(cnode1.dump());
                        storage._db.count({}, function (err, count) {
                            expect(err).to.eql(null);
                            expect(count).to.eql(1);
                            done();
                        });
                    });
                }).done();
            });

            it('should save a new node', function (done) {
                var promise = storage.save(cnode2);

                promise.then(function () {
                    storage._db.findOne({ clientName: cnode2.clientName }, { _id: 0 }, function (err, doc) {
                        expect(err).to.eql(null);
                        expect(doc).to.deep.equal(cnode2.dump());
                        storage._db.count({}, function (err, count) {
                            expect(err).to.eql(null);
                            expect(count).to.eql(2);
                            done();
                        });
                    });
                }).done();
            });

            it('should save another node', function (done) {
                var promise = storage.save(cnode3);

                promise.then(function () {
                    storage._db.findOne({ clientName: cnode3.clientName }, { _id: 0 }, function (err, doc) {
                        expect(err).to.eql(null);
                        expect(doc).to.deep.equal(cnode3.dump());
                        storage._db.count({}, function (err, count) {
                            expect(err).to.eql(null);
                            expect(count).to.eql(3);
                            done();
                        });
                    });
                }).done();
            });

            it('should actually update some value', function (done) {
                cnode1.version = '2.0.0';
                cnode1.so.init('connMonitor', 0, { ip: '192.168.1.110' });

                var promise = storage.save(cnode1);

                promise.then(function () {
                    storage._db.findOne({ clientName: cnode1.clientName }, { _id: 0 }, function (err, doc) {
                        expect(err).to.eql(null);
                        expect(doc).to.deep.equal(cnode1.dump());
                        expect(doc.version).to.eql('2.0.0');
                        expect(doc.so.connMonitor[0].ip).to.eql('192.168.1.110');
                        storage._db.count({}, function (err, count) {
                            expect(err).to.eql(null);
                            expect(count).to.eql(3);
                            done();
                        });
                    });
                }).done();
            })
        });

        describe('#.load', function () {
            it('should reject when db error occurred', function () {
                var findOneStub = sinon.stub(Datastore.prototype, 'findOne', function (query, proj, cb) { cb(new Error('db error')); });
                var cnode = _createNode({ clientName: cnode1.clientName });

                var promise = storage.load(cnode);

                return promise.catch(function (err) {
                    findOneStub.restore();
                    expect(err).to.be.instanceOf(Error);
                    expect(err.message).to.eql('db error');
                });
            });

            it('should reject when node clientName can not be found', function () {
                var cnode = _createNode({ clientName: 'mockXX' });

                var promise = storage.load(cnode);

                return promise.catch(function (err) {
                    expect(err).to.be.instanceOf(Error);
                });
            });

            it('should load cnode', function () {
                var cnode = _createNode({ clientName: cnode1.clientName });

                var promise = storage.load(cnode);

                return promise.then(function () {
                    expect(cnode.dump()).to.deep.equal(cnode1.dump());
                });
            });
        });

        describe('#.loadAll', function () {
            it('should reject when db error occurred', function () {
                var findStub = sinon.stub(Datastore.prototype, 'find', function (query, proj, cb) { cb(new Error('db error')); });

                var promise = storage.loadAll();

                return promise.catch(function (err) {
                    findStub.restore();
                    expect(findStub).to.have.been.called;
                    expect(err).to.be.instanceOf(Error);
                    expect(err.message).to.eql('db error');
                });
            });

            it('should return all node data if everything is ok', function () {
                var promise = storage.loadAll();

                return promise.then(function (attrs) {
                    attrs.sort(function (a, b) {
                        if (a.clientName < b.clientName) return -1;
                        if (a.clientName > b.clientName) return 1;
                        return 0;
                    });
                    expect(attrs).to.deep.equal([cnode1.dump(), cnode2.dump(), cnode3.dump()]);
                });
            });
        });

        describe('#.remove', function () {
            it('should reject when db error occurred', function (done) {
                var removeStub = sinon.stub(Datastore.prototype, 'remove', function (query, options, cb) { cb(new Error('db error')); });

                var promise = storage.remove(cnode3);

                promise.catch(function (err) {
                    removeStub.restore();
                    expect(err).to.be.instanceOf(Error);
                    expect(err.message).to.eql('db error');
                    storage._db.count({}, function (err, count) {
                        expect(err).to.eql(null);
                        expect(count).to.eql(3);
                        done();
                    });
                }).done();
            });

            it('should not reject when node not found', function (done) {
                var cnode = _createNode({ clientName: 'clientX' });

                var promise = storage.remove(cnode);

                promise.then(function (deleted) {
                    expect(deleted).to.eql(false);
                    storage._db.count({}, function (err, count) {
                        expect(err).to.eql(null);
                        expect(count).to.eql(3);
                        done();
                    });
                }).done();
            });

            it('should delete a node when it can be found', function (done) {
                var promise = storage.remove(cnode3);

                promise.then(function (deleted) {
                    expect(deleted).to.eql(true);
                    storage._db.findOne({ clientName: cnode3.clientName }, function (err, doc) {
                        expect(err).to.eql(null);
                        expect(doc).to.eql(null);
                        storage._db.count({}, function (err, count) {
                            expect(err).to.eql(null);
                            expect(count).to.eql(2);
                            done();
                        });
                    });
                }).done();
            })
        });

        describe('#.updateAttrs', function () {
            it('should reject when db error occurred', function () {
                var updateStub = _createUpdateStub('db error');

                var promise = storage.updateAttrs(cnode2, { ip: '192.168.1.111' });

                return promise.catch(function (err) {
                    updateStub.restore();
                    expect(err).to.be.instanceOf(Error);
                    expect(err.message).to.eql('db error');
                });
            });

            it('should do nothing if diff is null', function () {
                var updateStub = _createUpdateStub('should not call me');

                var promise = storage.updateAttrs(cnode2, null);

                return promise.then(function (diff) {
                    updateStub.restore();
                    expect(updateStub).not.to.been.called;
                    expect(diff).to.eql(null);
                });
            });

            it('should do nothing if diff is {}}', function () {
                var updateStub = _createUpdateStub('should not call me');

                var promise = storage.updateAttrs(cnode2, {});

                return promise.then(function (diff) {
                    updateStub.restore();
                    expect(updateStub).not.to.been.called;
                    expect(diff).to.eql(null);
                });
            });

            it('should reject if clientName is included in diff', function () {
                var updateStub = _createUpdateStub('should not call me');

                var promise = storage.updateAttrs(cnode2, { clientName: 'newClientName' });

                return promise.catch(function (err) {
                    updateStub.restore();
                    expect(err).to.be.instanceOf(Error);
                    expect(err.message).to.contains('clientName');
                });
            });

            it('should do update if everything is ok', function (done) {
                var diff = {
                    ip: '192.168.1.112',
                    lifetime: 85742,
                    version: '1.0.2',
                    objList: {
                        lwm2mServer: [2, 3],
                        connMonitor: [0]
                    },
                    observedList: ['/lwm2mServer/0/defaultMaxPeriod']
                };
                var expected = _.merge(cnode2.dump(), diff);

                var promise = storage.updateAttrs(cnode2, diff);

                promise.then(function (arg) {
                    expect(arg).to.be.equal(diff);
                    storage._db.findOne({ clientName: cnode2.clientName }, { _id: 0 }, function (err, doc) {
                        expect(err).to.eql(null);
                        expect(doc).to.deep.equal(expected);
                        done();
                    });
                }).done();
            });
        });

        describe('#.patchSo', function () {
            it('should reject when db error occurred', function () {
                var diff = {
                    lwm2mServer: {
                        0: {
                            lifetime: 85747,
                        }
                    }
                };
                var updateStub = _createUpdateStub('db error');

                var promise = storage.patchSo(cnode2, diff);

                return promise.catch(function (err) {
                    updateStub.restore();
                    expect(err).to.be.instanceOf(Error);
                    expect(err.message).to.eql('db error');
                });
            });

            it('should do nothing if diff is null', function () {
                var updateStub = _createUpdateStub('should not call me');

                var promise = storage.patchSo(cnode2, null);

                return promise.then(function (diff) {
                    updateStub.restore();
                    expect(updateStub).not.to.been.called;
                    expect(diff).to.eql(null);
                });
            });

            it('should do nothing if diff is {}}', function () {
                var updateStub = _createUpdateStub('should not call me');

                var promise = storage.patchSo(cnode2, {});

                return promise.then(function (diff) {
                    updateStub.restore();
                    expect(updateStub).not.to.been.called;
                    expect(diff).to.eql(null);
                });
            });

            it('should do update if everything is ok', function (done) {
                var diff = {
                    lwm2mServer: {
                        0: {
                            defaultMaxPeriod: 57
                        }
                    },
                    connMonitor: {
                        0: {
                            ip: '192.168.1.110'
                        }
                    }
                };
                var expected = _.merge(cnode2.so.dumpSync(), diff);

                var promise = storage.patchSo(cnode2, diff);

                promise.then(function (arg) {
                    expect(arg).to.be.equal(diff);
                    storage._db.findOne({ clientName: cnode2.clientName }, { _id: 0 }, function (err, doc) {
                        expect(err).to.eql(null);
                        expect(doc.so).to.deep.equal(expected);
                        done();
                    });
                }).done();
            });
        });

        describe('#.reset', function () {
            it('should reject when db error occurred for remove', function (done) {
                var removeStub = sinon.stub(Datastore.prototype, 'remove', function (query, options, cb) { cb(new Error('db error')); });

                var promise = storage.reset();

                promise.catch(function (err) {
                    removeStub.restore();
                    expect(removeStub).to.have.been.called;
                    expect(err).to.be.instanceOf(Error);
                    expect(err.message).to.eql('db error');
                    storage._db.count({}, function (err, count) {
                        expect(err).to.eql(null);
                        expect(count).to.eql(2);
                        done();
                    });
                }).done();
            });

            it('should reject when db error occurred for loadDatabase', function (done) {
                var removeStub = sinon.stub(Datastore.prototype, 'remove', function (query, options, cb) { cb(null); });
                var loadDatabaseStub = sinon.stub(Datastore.prototype, 'loadDatabase', function (cb) { cb(new Error('db error')); });

                var promise = storage.reset();

                promise.catch(function (err) {
                    removeStub.restore();
                    loadDatabaseStub.restore();
                    expect(removeStub).to.have.been.called;
                    expect(loadDatabaseStub).to.have.been.called;
                    expect(err).to.be.instanceOf(Error);
                    expect(err.message).to.eql('db error');
                    storage._db.count({}, function (err, count) {
                        expect(err).to.eql(null);
                        expect(count).to.eql(2);
                        done();
                    });
                }).done();
            });

            it('should remove all nodes if everything is ok', function (done) {
                var promise = storage.reset();

                promise.then(function (numRemoved) {
                    expect(numRemoved).to.eql(2);
                    storage._db.count({}, function (err, count) {
                        expect(err).to.eql(null);
                        expect(count).to.eql(0);
                        done();
                    });
                }).done();
            });
        });
    });

    after(function (done) {
        var dir = path.resolve(baseDir);
        if (fs.existsSync(dir))
            fs.rmdir(dir, function (err) {
                // just ignore err
                done();
            });
        else
            done();
    });
});

function _clearAlterPath(done) {
    if (fs.existsSync(alterPath))
        fs.unlink(alterPath, function (err) {
            expect(err).to.equal(null);
            if (fs.existsSync(alterDir))
                fs.rmdir(alterDir, function (err) {
                    expect(err).to.equal(null);
                    done();
                });
            else
                done();
        });
    else
        done();
}

function _createNode(attr) {
    return new CoapNode(shepherd, attr);
}

function _createUpdateStub(msg) {
    return sinon.stub(Datastore.prototype, 'update', function (query, update, options, cb) {
        cb(new Error(msg));
    });
}

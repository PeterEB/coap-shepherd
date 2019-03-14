var Q = require('q'),
    expect = require('chai').expect;

var _typedArguments = {
    'undefined': undefined,
    'null': null,
    'number': 9527,
    'nan': NaN,
    'string': 'hello',
    'array': [],
    'boolean': true,
    'function': function () {},
    'object': {}
};

var _globalSetTimeout = global.setTimeout;

function _verifySyncCall(func, arg, type, errorExpected) {
    if (errorExpected)
        expect(function () { func(arg); }, 'for ' + type + ' argument').to.throw(TypeError);
    else
        expect(function () { func(arg); }, 'for ' + type + ' argument').not.to.throw(TypeError);
}

function _verifyAsyncCall(func, arg, type, errorExpected) {
    var deferred = Q.defer();

    func(arg).done(function () {
        if (errorExpected)
            try {
                expect(function (){}, 'for ' + type + ' argument').to.throw(TypeError);
            } catch (err) {
                deferred.reject(err);
            }
        else
            deferred.resolve();
    }, function (err) {
        if ((err instanceof TypeError) && !errorExpected)
            try {
                expect(function (){ throw err; }, 'for ' + type + ' argument').not.to.throw(TypeError);
            } catch (err) {
                deferred.reject(err);
            }
        else
            deferred.resolve();
    });

    return deferred.promise;
}

function _verifySignature(func, acceptedTypes, verifier) {
    acceptedTypes = acceptedTypes || [];

    var results = [], invalids = acceptedTypes.filter(function (type) {
        return (typeof type === 'string') && (Object.keys(_typedArguments).indexOf(type) < 0);
    });
    if (invalids.length) throw new TypeError('Invalid acceptedTypes: ' + JSON.stringify(invalids));

    Object.keys(_typedArguments).forEach(function (type) {
        results.push(verifier(func, _typedArguments[type], type, acceptedTypes.indexOf(type) < 0));
    });

    acceptedTypes.filter(function (type) { return (typeof type === 'object') && !Array.isArray(type); }).forEach(function (type) {
        results.push(verifier(func, type, 'custom', false));
    });

    acceptedTypes.filter(function (type) { return Array.isArray(type); }).forEach(function (types) {
        types.forEach(function (type) {
            results.push(verifier(func, type, type, false));
        });
    });

    return results;
}

function _verifySignatureSync(func, acceptedTypes) {
    _verifySignature(func, acceptedTypes, _verifySyncCall);
}

function _verifySignatureAsync(func, acceptedTypes) {
    return Q.all(_verifySignature(func, acceptedTypes, _verifyAsyncCall));
}

function _fireSetTimeoutCallbackEarlier(counter, delay) {
    counter = counter || 1;
    delay = delay || 50;
    var timerCb;

    global.setTimeout = function (cb, delay) {
        if (!--counter) {
            timerCb = cb;
            global.setTimeout = _globalSetTimeout;
            return _globalSetTimeout(function () {}, delay);
        }
        else
            return _globalSetTimeout(cb, delay);
    };

    _globalSetTimeout(function () {
        timerCb();
    }, delay);
}

module.exports = {
    _verifySignatureSync: _verifySignatureSync,
    _verifySignatureAsync: _verifySignatureAsync,
    _fireSetTimeoutCallbackEarlier: _fireSetTimeoutCallbackEarlier
};

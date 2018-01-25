var fs = require('fs'),
    path = require('path');

var shepherd = require('../index.js');

try {
    fs.unlinkSync(path.resolve('../lib/database/coap.db'));
} catch (e) {
    console.log(e);
}

shepherd.on('ready', function () {
    console.log('>> coap-shepherd server start!');

    shepherd.permitJoin(180);
});

shepherd.on('ind', handler);

shepherd.on('error', errHandler);

shepherd.start(function (err) {
    if (err) throw err;
});

// // stop test
// setTimeout(function () {
//     shepherd.stop(function (err, rsp) {
//         if (err) throw err;
//     });
// }, 5000);

// // reset test
// setTimeout(function () {
//     shepherd.reset(function (err) {
//         if (err) throw err;
//     });
// }, 10000);

// // announce test
// setTimeout(function () {
//     shepherd.announce('Awesome!', function (err, rsp) {
//         if (err) throw err;
//     });
// }, 15000);

function reqHandler (err, rsp) {
    if (err) console.log(err);
    else console.log(rsp);  
}

function errHandler (err) {
    throw err;
}

function handler (msg) {
    var cnode;
    console.log(msg.type + ': ' + msg.data);

    if (msg.type === 'devIncoming') {
        cnode = msg.cnode;

setTimeout(function () { cnode.observeReq('/31024/10', reqHandler); }, 1000);
// setTimeout(function () { cnode.observeReq('/3303/0', reqHandler); }, 30000);
setTimeout(function () { cnode.writeReq('/31024/10', { '1': 33 }, reqHandler); }, 3000);
setTimeout(function () { cnode.writeReq('/31024/10', { '1': 34 }, reqHandler); }, 4000);
setTimeout(function () { cnode.writeReq('/31024/10', { '1': 35 }, reqHandler); }, 5000);
setTimeout(function () { cnode.readReq('/31024/10/1', reqHandler); }, 6000);

// read test
        // setTimeout(function () { cnode.readReq('/3303/0/5700', reqHandler); }, 5000);
        // setTimeout(function () { cnode.readReq('/3303/0/5701', reqHandler); }, 10000);
        // setTimeout(function () { cnode.readReq('/3303/0/5702', reqHandler); }, 15000);
        // setTimeout(function () { cnode.readReq('/3303/0/5703', reqHandler); }, 20000);
        // setTimeout(function () { cnode.readReq('/3303/0/5704', reqHandler); }, 25000);
        // setTimeout(function () { cnode.readReq('/3303/0', reqHandler); }, 30000);
        
// discover test
        // setTimeout(function () { cnode.discoverReq('/3303/0/5700', reqHandler); }, 5000);
        // setTimeout(function () { cnode.discoverReq('/3303/0/5701', reqHandler); }, 10000);
        // setTimeout(function () { cnode.discoverReq('/3303/0/5702', reqHandler); }, 15000);
        // setTimeout(function () { cnode.discoverReq('/3303/0/5703', reqHandler); }, 20000);
        // setTimeout(function () { cnode.discoverReq('/3303/0/5704', reqHandler); }, 25000);
        // setTimeout(function () { cnode.discoverReq('/3303/0', reqHandler); }, 30000);
        // setTimeout(function () { cnode.discoverReq('/3303', reqHandler); }, 35000);

// write test
        // setTimeout(function () { cnode.writeReq('/3303/0/5700', 19, reqHandler); }, 3000);
        // setTimeout(function () { cnode.writeReq('/3303/0/5701', 'C', reqHandler); }, 8000);
        // setTimeout(function () { cnode.writeReq('/3303/0/5702', 'Hum', reqHandler); }, 13000);
        // setTimeout(function () { cnode.writeReq('/3303/0/5703', 'Hum', reqHandler); }, 18000);
        // setTimeout(function () { cnode.writeReq('/3303/0/5704', 'Hum', reqHandler); }, 23000);
        // setTimeout(function () { cnode.writeReq('/3303/0', { 5700: 87, 5701: 'F' }, reqHandler); }, 28000);

// writeAttr test
        // setTimeout(function () { cnode.writeAttrsReq('/3303/0/5700', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 3000);
        // setTimeout(function () { cnode.writeAttrsReq('/3303/0/5701', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 8000);
        // setTimeout(function () { cnode.writeAttrsReq('/3303/0/5702', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 13000);
        // setTimeout(function () { cnode.writeAttrsReq('/3303/0/5703', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 18000);
        // setTimeout(function () { cnode.writeAttrsReq('/3303/0/5704', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 23000);
        // setTimeout(function () { cnode.writeAttrsReq('/3303/0', { 'pmin': 10, 'pmax': 30 }, reqHandler); }, 28000);
        // setTimeout(function () { cnode.writeAttrsReq('/3303', { 'pmin': 10, 'pmax': 30 }, reqHandler); }, 33000);

// exec test    
        // setTimeout(function () { cnode.executeReq('/3303/0/5700', ['Peter', 'world'], reqHandler); }, 5000);
        // setTimeout(function () { cnode.executeReq('/3303/0/5701', ['Peter', 'world'], reqHandler); }, 10000);
        // setTimeout(function () { cnode.executeReq('/3303/0/5702', ['Peter', 'world'], reqHandler); }, 15000);
        // setTimeout(function () { cnode.executeReq('/3303/0/5703', ['Peter', 'world'], reqHandler); }, 20000);
        // setTimeout(function () { cnode.executeReq('/3303/0/5704', ['Peter', 'world'], reqHandler); }, 25000);

// observe test
        // setTimeout(function () { cnode.observeReq('/3303/0/5700', reqHandler); }, 5000);
        // setTimeout(function () { cnode.observeReq('/3303/0/5701', reqHandler); }, 10000);
        // setTimeout(function () { cnode.observeReq('/3303/0/5702', reqHandler); }, 15000);
        // setTimeout(function () { cnode.observeReq('/3303/0/5703', reqHandler); }, 20000);
        // setTimeout(function () { cnode.observeReq('/3303/0/5704', reqHandler); }, 25000);
        // setTimeout(function () { cnode.observeReq('/3303/0', reqHandler); }, 30000);

// cancelObserve test
        // setTimeout(function () { cnode.cancelObserveReq('/3303/0/5702', reqHandler); }, 10000); 

// ping test
        // setTimeout(function () { cnode.pingReq(reqHandler); }, 3000);

// remove test
//        setTimeout(function () { shepherd.remove('nodeTest'); }, 10000);
    } 
}

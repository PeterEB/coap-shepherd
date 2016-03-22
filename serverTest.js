var shepherd = require('./lib/coap-shepherd.js');

var cnode;

shepherd.on('ready', function () {
    console.log('>> coap-shepherd server start!');
    shepherd.permitJoin(300);
});

shepherd.on('ind', handler);

shepherd.on('error', errHandler);

shepherd.start(function (err) {
    if (err) throw err;
});

// // stop test
// setTimeout(function () {
//     shepherd.stop(function (err, msg) {
//         if (err) throw err;
//     });
// }, 20000);

// // restart test
// setTimeout(function () {
//     shepherd.start(function (err, msg) {
//         if (err) throw err;
//     });
// }, 30000);

// // announce test
// setTimeout(function () {
//     shepherd.announce('Awesome!', function (err, msg) {
//         if (err) throw err;
//     });
// }, 15000);

function reqHandler (err, msg) {
    if (err) console.log(err);
    else console.log(msg);  
}

function errHandler (err) {
    throw err;
}

function handler (ind) {
    console.log(ind);
    
    if (ind.type === 'registered') {
        cnode = shepherd.find('nodeTest');

// // read test
//         setTimeout(function () { cnode.read('/3303/0/5700', reqHandler); }, 5000);
//         setTimeout(function () { cnode.read('/3303/0/5701', reqHandler); }, 10000);
//         setTimeout(function () { cnode.read('/3303/0/5702', reqHandler); }, 15000);
//         setTimeout(function () { cnode.read('/3303/0/5703', reqHandler); }, 20000);
//         setTimeout(function () { cnode.read('/3303/0/5704', reqHandler); }, 25000);
//         setTimeout(function () { cnode.read('/3303/0', reqHandler); }, 30000);
//         setTimeout(function () { cnode.read('/3303', reqHandler); }, 35000);

// // discover test
//         setTimeout(function () { cnode.discover('/3303/0/5700', reqHandler); }, 5000);
//         setTimeout(function () { cnode.discover('/3303/0/5701', reqHandler); }, 10000);
//         setTimeout(function () { cnode.discover('/3303/0/5702', reqHandler); }, 15000);
//         setTimeout(function () { cnode.discover('/3303/0/5703', reqHandler); }, 20000);
//         setTimeout(function () { cnode.discover('/3303/0/5704', reqHandler); }, 25000);
//         setTimeout(function () { cnode.discover('/3303/0', reqHandler); }, 30000);
//         setTimeout(function () { cnode.discover('/3303', reqHandler); }, 35000);

// // write test
//         setTimeout(function () { cnode.write('/3303/0/5700', 19, reqHandler); }, 3000);
//         setTimeout(function () { cnode.write('/3303/0/5701', 'C', reqHandler); }, 8000);
//         setTimeout(function () { cnode.write('/3303/0/5702', 'Hum', reqHandler); }, 13000);
//         setTimeout(function () { cnode.write('/3303/0/5703', 'Hum', reqHandler); }, 18000);
//         setTimeout(function () { cnode.write('/3303/0/5704', 'Hum', reqHandler); }, 23000);
//         setTimeout(function () { cnode.write('/3303/0', { 5700: 87, 5701: 'F' }, reqHandler); }, 28000);

// // writeAttr test
//         setTimeout(function () { cnode.writeAttr('/3303/0/5700', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 3000);
//         setTimeout(function () { cnode.writeAttr('/3303/0/5701', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 8000);
//         setTimeout(function () { cnode.writeAttr('/3303/0/5702', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 13000);
//         setTimeout(function () { cnode.writeAttr('/3303/0/5703', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 18000);
//         setTimeout(function () { cnode.writeAttr('/3303/0/5704', { 'pmin': 10, 'pmax': 30, 'gt': 0 }, reqHandler); }, 23000);
//         setTimeout(function () { cnode.writeAttr('/3303/0', { 'pmin': 10, 'pmax': 30 }, reqHandler); }, 28000);
//         setTimeout(function () { cnode.writeAttr('/3303', { 'pmin': 10, 'pmax': 30 }, reqHandler); }, 33000);

// // exec test    
//         setTimeout(function () { cnode.execute('/3303/0/5700', ['Peter', 'world'], reqHandler); }, 5000);
//         setTimeout(function () { cnode.execute('/3303/0/5701', ['Peter', 'world'], reqHandler); }, 10000);
//         setTimeout(function () { cnode.execute('/3303/0/5702', ['Peter', 'world'], reqHandler); }, 15000);
//         setTimeout(function () { cnode.execute('/3303/0/5703', ['Peter', 'world'], reqHandler); }, 20000);
//         setTimeout(function () { cnode.execute('/3303/0/5704', ['Peter', 'world'], reqHandler); }, 25000);

// // observe test
//         setTimeout(function () { cnode.observe('/3303/0/5700', reqHandler); }, 5000);
//         setTimeout(function () { cnode.observe('/3303/0/5701', reqHandler); }, 10000);
//         setTimeout(function () { cnode.observe('/3303/0/5702', reqHandler); }, 15000);
//         setTimeout(function () { cnode.observe('/3303/0/5703', reqHandler); }, 20000);
//         setTimeout(function () { cnode.observe('/3303/0/5704', reqHandler); }, 25000);
    }
}

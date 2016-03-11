var shepherd = require('./lib/coap-shepherd.js');

var cnode;

shepherd.on('ind', handler);
shepherd.on('error', errHandler);

function handler (ind) {
    console.log(ind);
    
    if (ind.type === 'registered') {
        cnode = shepherd.find('nodeTest');
        
        // setTimeout(function () { cnode.read('/3303/0/5702', reqHandler); }, 5000);
        // setTimeout(function () { cnode.write('/3303/0/5703', 23, reqHandler); }, 10000);
        // setTimeout(function () { cnode.execute('/3303/0/5704', ['Peter', 'world'], reqHandler); }, 15000);
        // setTimeout(function () { cnode.discover('/3303/0', reqHandler); }, 20000);
        // setTimeout(function () { cnode.observe('/3303/0', reqHandler); }, 25000);
    }
}

function reqHandler (err, msg) {
    if (err) console.log(err);
    else console.log(msg);  
}

function errHandler (err) {
    throw err;
}

shepherd.start(function (err, msg) {
    if (err) throw err;
});

// setTimeout(function () {
//     server.stop();
// }, 10000);

// setTimeout(function () {
//     server.start(function (err, msg) {
//         if (err) throw err;
//     });
// }, 20000);
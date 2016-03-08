var server = require('./lib/coap-shepherd.js');

var cnode;

server.on('ind', handler);

function handler (msg) {
    console.log(msg.type);
    
    if (msg.type === 'registered') {
        cnode = msg.data;
        cnode.execute('/3303/0/5704', [1, 2], function (err, res) {
            if (err)
                console.log(err);
            else
                console.log(res);  
        });
    } else if (msg.type === 'update') {
        console.log(msg.data);
    } else if (msg.type === 'notify') {
        console.log(msg.data);
    }
}

server.start(function (err, msg) {
    if (err)
        throw err;
});

// setTimeout(function () {
//     cnode.read('/3303/0/5700', function (err, msg) {
//         if (err)
//             console.log(err);
//         else
//             console.log(msg);  
//     });
// }, 10000);

// setTimeout(function () {
//     server.stop();
// }, 10000);

// setTimeout(function () {
//     server.start(function (err, msg) {
//         if (err)
//             throw err;
//     });
// }, 20000);
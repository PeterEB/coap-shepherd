var shepherd = require('../index.js');
var Discovery = require('udp-discovery').Discovery;
var discover = new Discovery();

var cnode;

var name = 'coap-shepherd-ip-broadcast',
    interval = 500,
    available = true,
    serv = {
        port: 80,
        proto: 'tcp',
        addrFamily: 'IPv4'
    };

shepherd.on('ready', function () {
    console.log('>> coap-shepherd server start!');
    shepherd.permitJoin(180);

    discover.announce(name, serv, interval, available);

    discover.on('MessageBus', function(event, data) {
        console.log(data);
    });
});

shepherd.on('ind', handler);

shepherd.on('error', errHandler);

shepherd.start(function (err) {
    if (err) throw err;
});

function reqHandler (err, rsp) {
    if (err) console.log(err);
    else console.log(rsp);  
}

function errHandler (err) {
    throw err;
}

function handler (msg) {
    console.log(msg.data);
}

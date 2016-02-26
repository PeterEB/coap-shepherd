var server = require('./lib/coap-shepherd.js');

var cnode;

server.on('ind', handler);

function handler (msg) {
    console.log(msg.type);
    
    if (msg.type === 'registered') {
        cnode = msg.data;
        cnode.observe('/3303/0/5702').then(function (res) {
            console.log(res.status);
        }, function (err) {
            console.log(err);
        });
    } else if (msg.type === 'notify') {
        console.log(msg.data);
    }
    
}

server.start(function (err, msg) {
    if (err)
        throw err;
});

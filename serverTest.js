var server = require('./lib/coap-shepherd.js');

server.on('ind', handler);

function handler (msg) {
    console.log(msg.type);
    
    if (msg.type === 'registered') {
        msg.data.observe('/3303/0/5700').then(function (res) {
            console.log(res);
        }, function (err) {
            console.log(err);
        });
    } else if (msg.type === 'notify') {
        console.log(msg);
    }
    
}

server.start(function (err, msg) {
    if (err)
        throw err;
});

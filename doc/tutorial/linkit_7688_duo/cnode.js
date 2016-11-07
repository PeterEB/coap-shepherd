/***************************************************
 * coap-node                                       *
 ***************************************************/
var so = require('./smartobj.js'),
    CoapNode = require('coap-node');

var coapNode = new CoapNode('my_cnode', so);

coapNode.on('registered', function () {
    console.log('>> CoAP node is registered to a server');
});

so.hal.board.on('ready', function () {
    console.log('>> Blink the led for few times');
    so.hal.blinkLed(10);

    // Register to the server after Arduino ready to communicate
    console.log('>> Register to a server...');
    coapNode.register('192.168.1.115', 5683, function (err, msg) {
        console.log(msg);
    });
});
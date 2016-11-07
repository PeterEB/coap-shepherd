Tutorial
===========

This tutorial will show you how to build a LWM2M network with `coap-shepherd`, `coap-node` and `smartobject`.

Before you start, you need to prepare some hardware:

1. PC, Raspberry Pi, or other Node.js platform  
2. Linkit Smart 7688 Duo  
3. LED
4. Push button

## Section A: Build Your SmartObject

### 1. Create a folder /testfirmata and install `firmata` in it

```sh
mkdir testfirmata && cd testfirmata
```

```sh
npm install firmata@0.10.1
```

### 2. Remove node-serialport modules in /firmata/node_modules

```sh
rm -rf node_modules/firmata/node_modules/serialport/
```

### 3. Compress the `firmata` folder

```sh
tar -cvf firmata.tar node_modules/firmata
```

### 4. Use SCP to transfer the compressed file to the board:

```sh
scp firmata.tar root@mylinkit.local:/root   # replace the host name or ip with yours Linkit 7688 Duo
```

### 5. ssh into the board

```sh
ssh root@mylinkit.local   # replace the host name or ip with yours Linkit 7688 Duo
```

### 6 Create a folder /app and decompress firmata.tar in it

```sh
mkdir app
```

```sh
tar -xvf firmata.tar -C app/
```

### 7. Create smartobj.js in /app folder

```sh
cd app 
```

```sh
touch smartobj.js
```

### 8 install the `smartobject` module in /app folder

```sh
npm install smartobject
```

### 9. Edit smartobj.js, we will use `firmata` as the hal controller

* [[1] SmartObject Constructor](https://github.com/PeterEB/smartobject#API_smartobject)
* [[2] Light Control Object Instance code template](https://github.com/PeterEB/smartobject/blob/master/docs/templates.md#tmpl_lightCtrl)
* [[3] Create an Object Instance](https://github.com/PeterEB/smartobject#API_init)

```js
var Board = require('firmata'),
    SmartObject = require('smartobject');

var board = new Board("/dev/ttyS0");

// hardware initialization, see [1]
var so = new SmartObject({
    board: board,
    ledPin: 2        // onboard led pin
});

// Create a Light Control Object Instance in so, see [2] and [3]
so.init('lightCtrl', 0, {
    onOff: {
        read: function (cb) {
            var board = this.parent.hal.board,
                ledPin = this.parent.hal.ledPin,
                ledState = board.pins[ledPin].value;

            process.nextTick(function () {
                cb(null, ledState);
            });
        },
        write: function (val, cb) {
            var board = this.parent.hal.board,
                ledPin = this.parent.hal.ledPin,
                ledState = val ? board.HIGH : board.LOW;

    		board.digitalWrite(ledPin, ledState);

            process.nextTick(function () {
                cb(null, board.pins[ledPin].value);
            });
        }
    }
});

// Use so.read() and so.write() methods to blink the led for few times
// We will use a led blink driver to replace this snippet later
var blinkLed = function () {
    var times = 20,
        blinker = setInterval(function () {
            times -= 1;
            if (times === 0)
                clearInterval(blinker);

            so.read('lightCtrl', 0, 'onOff', function (err, data) {
                if (err)
                    return console.log(err);

                so.write('lightCtrl', 0, 'onOff', !data, function (err, val) {
                    if (err)
                        return console.log(err);
                });
            });
        }, 200);
}

board.on("ready", function() {
    console.log('>> Arduino is ready to communicate');

    // Set a mode for a pin
    board.pinMode(so.hal.ledPin, board.MODES.OUTPUT);

    // Blink our led
    blinkLed();
});
```

### 10. Test the led

```sh
node smartobj.js
```

### 11. Make a led blink driver

```js
var Board = require('firmata'),
    SmartObject = require('smartobject');

var board = new Board("/dev/ttyS0");

// Add our led blink driver to hal
var so = new SmartObject({
    board: board,
    ledPin: 2, 
    blinkLed: null      // we'll implement the driver in the setup function
}, function () {
    this.hal.blinkLed = function (times) {
        times = 2 * times;
        
        var blinker = setInterval(function () {
            times -= 1;
            if (times === 0)
                clearInterval(blinker);

            so.read('lightCtrl', 0, 'onOff', function (err, data) {
                if (err)
                    return console.log(err);

                so.write('lightCtrl', 0, 'onOff', !data, function (err, val) {
                    if (err)
                        return console.log(err);
                });
            });
        }, 200);
    }
});

so.init('lightCtrl', 0, {
    // ... code remains the same
});

board.on("ready", function() {
    console.log('>> Arduino is ready to communicate');

    // Set a mode for a pin
    board.pinMode(so.hal.ledPin, board.MODES.OUTPUT);

    // Blink our led by the driver
    so.hal.blinkLed(10);
});
```

### 12. Test the led blink driver

```sh
node smartobj.js
```

### 13. The push button

```js
var Board = require('firmata'),
    SmartObject = require('smartobject');

var board = new Board("/dev/ttyS0");

// Add our led blink driver to hal
var so = new SmartObject({
    board: board,
    ledPin: 2,
    buttonPin: 3, 
    blinkLed: null,      // we'll implement the driver in the setup function
    pollButton: null
}, function () {
    this.hal.blinkLed = function (times) {
        // ... code remains the same
    }

    this.hal.pollButton = function () {
        setInterval(function () {
            so.read('pushButton', 0, 'dInState', function (err, data) {
                var buttonState = data;
                if (err)
                    return console.log(err);

                // Led will light up acoording to the button state
                so.write('lightCtrl', 0, 'onOff', buttonState ? 1 : 0, function () {});
            });
        }, 100);
    };
});

so.init('lightCtrl', 0, {
    // ... code remains the same
});

// Push Button Smart Object:
// https://github.com/PeterEB/smartobject/blob/master/docs/templates.md#tmpl_button
so.init('pushButton', 0, {
    dInState: {
        read: function (cb) {
            var board = this.parent.hal.board,
                buttonPin = this.parent.hal.buttonPin,
                buttonState = board.pins[buttonPin].value;

            process.nextTick(function () {
                cb(null, buttonState);
            });
        }
    }
});

board.on("ready", function() {
    console.log('>> Arduino is ready to communicate');

    // Set a mode for a pin
    board.pinMode(so.hal.ledPin, board.MODES.OUTPUT);
    board.pinMode(so.hal.buttonPin, board.MODES.INPUT);
                
    // Register to get the digital value 
    board.digitalRead(so.hal.buttonPin, function(value) {});

    // Blink our led by the driver
    so.hal.pollButton();
});

```

### 14. Test the push button and watch the led

```sh
node smartobj.js
```

## Section B: Network Protocol Come In
In this section, we will use lightweight M2M (LWM2M) to build the IoT network. At server side, we'll use `coap-shepherd` to create the LWM2M server, and use `coap-node` on our Linkit 7688 Duo machine to create the LWM2M client. You can build a MQTT network with `mqtt-shepherd` and `mqtt-node` as well, they follow the similar pattern with smartobject module.

## Client-side (On our Linkit 7688 Duo machine)

### 1. Our so is a module that abstract all the hardware and drivers

* [[1] coap-node basic usage](https://github.com/PeterEB/coap-node#Usage)

```js
var Board = require('firmata'),
    SmartObject = require('smartobject');

// ... code remains the same

// take off this line for our demo can go nicely
// (since we'll let the led blink when machine booted up, but the led is also controlled by the button. That conflicts.)
// so.hal.pollButton();

// export our so
module.exports = so;
```

### 2. Install the `coap-node` module in /app folder

```sh
npm install coap-node
```

### 3. Create a file client.js in /app folder and write some code

```js
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
```

## Server-side (On our PC, RaspberryPi, or BeagleBone)

### 1. Create a folder /cserver and a server.js in it

```sh
mkdir cserver && cd cserver
```

```sh
touch server.js
```

### 2. Install the `coap-shepherd` module in /cserver folder

```sh
npm install coap-shepherd
```

### 3. Edit server.js

* [[1] coap-shepherd basic usage](https://github.com/PeterEB/coap-shepherd#Usage)
* [[2] cserver 'ind' event and qnode APIs](https://github.com/PeterEB/coap-shepherd#5-apis-and-events)

```js
var cserver = require('coap-shepherd');

// see [1]
cserver.on('ready', function () {
    console.log('>> coap-shepherd server start!');
    console.log('>> Permit devices joining for 120 seconds');
    cserver.permitJoin(120);
});

cserver.start(function (err) {
    if (err) 
        console.log(err);
});

// see [2]
cserver.on('ind', function (msg) {
    switch (msg.type) {
        case 'devIncoming':
            // When our 'my_cnode' comes in, we read the led and button current states back
            var cnode = msg.cnode;
            if (cnode.clientName === 'my_cnode') {
                cnode.readReq('lightCtrl/0/onOff', function (err, rsp) {
                    if (!err)
                        console.log('>> Current led state at machine: ' + rsp.data);    // rsp = { status, data }
                });

                cnode.readReq('pushButton/0/dInState', function (err, rsp) {
                    if (!err)
                        console.log('>> Current button state at machine: ' + rsp.data); // rsp = { status, data }
                });
            }
            break;

        case 'devStatus':
            // When 'my_cnode' is online, we tell the machine to report the led change to server
            var cnode = msg.cnode;
            if (cnode.clientName === 'my_cnode' && msg.data === 'online') {
                // setting for notification of led state reporting
                cnode.observeReq('lightCtrl/0/onOff', function (err, rsp) {
                    console.log('>> Led observation starts: ');
                    console.log(rsp);
                });
            }
            break;

        case 'devNotify':
			var data = msg.data;
            if (data && data.path === '/lightCtrl/0/onOff') {
                console.log('>> Led state at machine changed: ');
                console.log('    ' + data.value);
            }
            break;

        default:
            // Not deal with other msg.type in this example
            break;
    }
});
```

## Section C: Start LWM2M Machine Network

### At server-side (on PC)

```sh
node server
```

### At client-side (on Linkit 7688 Duo)

```sh
node client
```

Tutorial
===========

This tutorial will show you how to build a LWM2M network with `coap-shepherd`, `coap-node` and `smartobject`.

Before you start, you need to prepare some hardware:

* PC, Raspberry, beaglebone or other Node.js platform  
* Linkit Smart 7688 Duo  
* 

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

```js
var Board = require('firmata'),
    SmartObject = require('smartobject');

var board = new Board("/dev/ttyS0");

var so = new SmartObject({
    board: board
});

so.init('lightCtrl', 0, function () {
    onOff: {
        read: function (cb) {
            var board = this.parent.hal.board,
                ledState = board.pins[2].value;

            process.nextTick(function () {
                cb(null, ledState);
            });
        },
        write: function (val, cb) {
            var board = this.parent.hal.board,
                ledState = val ? board.HIGH : board.LOW;

    		board.digitalWrite(2, ledState);

            process.nextTick(function () {
                cb(null, board.pins[2].value);
            });
        }
    }
});

board.on("ready", function() {
	board.pinMode(2, board.MODES.OUTPUT);
});
```


## Section B: Network Protocol Come In
In this section, we will use lightweight M2M (LWM2M) to build the IoT network. At server side, we'll use `coap-shepherd` to create the LWM2M server, and use `coap-node` on our Linkit 7688 Duo machine to create the LWM2M client. You can build a MQTT network with `mqtt-shepherd` and `mqtt-node` as well, they follow the similar pattern with smartobject module.

## Client-side (On our Linkit 7688 Duo machine)

### 1. Our so is a module that abstract all the hardware and drivers

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
    console.log('registered');
});

so.hal.board.on('ready', function () {
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

```js
var cserver = require('coap-shepherd');

cserver.on('ready', function () {
    console.log('>> coap-shepherd server start!');
    console.log('>> Permit devices joining for 120 seconds');
    shepherd.permitJoin(120);
});

cserver.start(function (err) {
    if (err) 
		console.log(err);
});

cserver.on('ind', function (msg) {
    switch (msg.type) {
        case 'devIncoming':

            break;

        case 'devStatus':

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

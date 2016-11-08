Tutorial
===========

This tutorial will show you how to build a LWM2M network with [`coap-shepherd`](https://github.com/PeterEB/coap-shepherd), [`coap-node` ](https://github.com/PeterEB/coap-node)and [`smartobject`](https://github.com/PeterEB/smartobject).
	
#### Prepare your hardware

* Server-side machine: PC, [Raspberry Pi](https://www.raspberrypi.org/), or other Node.js platform  
* Client-side machine: [Linkit Smart 7688 Duo](https://labs.mediatek.com/site/global/developer_tools/mediatek_linkit_smart_7688/training_docs/linkit_smart_7688_duo/index.gsp)  
* LED
* Push button

<a name="SectionA"></a>
## Section A: Using Firmata with Node.js

This section illustrates the MPU and MCU communication using Firmata protocol in MediaTek [Linkit 7688 Duo](https://labs.mediatek.com/site/global/developer_tools/mediatek_linkit_smart_7688/training_docs/linkit_smart_7688_duo/firmata_nodejs/index.gsp) with Node.js.

## Setup MCU

### 1. Install Arduino IDE

Set up the MCU by launching [Arduino IDE 1.6.5](https://www.arduino.cc/en/Main/OldSoftwareReleases#previous) on your computer

### 2. Install Linkit Smart 7688 Duo in Board Manager 

In Arduino IDE, on the File menu click Preferences then insert http://download.labs.mediatek.com/package_mtk_linkit_smart_7688_test_index.json to the Additional Boards Manager URLs.

### 3. Copy the Firmata sketch to Arduino

Copy the sketch code to the Arduino IDE. The sketch used in this example is from: https://gist.github.com/edgarsilva/e73c15a019396d6aaef2

### 4. Upload to Linkit 7688 Duo with network port

Tool --> Port --> Network port

Click Upload!

## Setup MPU

While you can install Firmata using NPM on LinkIt 7688 Duo, the process is a bit long. So you’ll need to install Firmata on your computer and then use SCP to transfer the compressed file to the Linkit 7688 Duo.

### 1. Create a folder /testfirmata and install `firmata` in it

```sh
mkdir testfirmata && cd testfirmata
```

```sh
npm install firmata@0.10.1
```

### 2. Remove node-serialport modules in /firmata/node_modules

We need to remove it because serialport is already available on LinkIt Smart 7688 system image.

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

### 5. ssh into the board (Linkit 7688 Duo)

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

<br />

<a name="SectionB"></a>
## Section B: Build Your SmartObject

Let's abstract a led and a push button into a smart object with Firmata.

### 1. Create smartobj.js in /app folder on Linkit 7688 Duo

```sh
cd app 
```

```sh
touch smartobj.js
```

### 2 install the `smartobject` module in /app folder

```sh
npm install smartobject
```

### 3. Edit smartobj.js, we will use `firmata` as the hal controller

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

### 4. Test the led

```sh
node smartobj.js
```

### 5. Make a led blink driver

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

### 6. Test the led blink driver

```sh
node smartobj.js
```

### 7. The push button

* [[1] Push Button Smart Object](https://github.com/PeterEB/smartobject/blob/master/docs/templates.md#tmpl_button)

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

// see [1]
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

### 8. Test the push button and watch the led

```sh
node smartobj.js
```

<br />

<a name="SectionC"></a>
## Section C: Network Protocol Come In

In this section, we will use lightweight M2M (LWM2M) to build the IoT network. At server side, we'll use `coap-shepherd` to create the LWM2M server, and use `coap-node` on our Linkit 7688 Duo machine to create the LWM2M client. You can build a MQTT network with `mqtt-shepherd` and `mqtt-node` as well, they follow the similar pattern with smartobject module.

## Client-side (On Linkit 7688 Duo)

### 1. Our `so` is a module that abstract all the hardware and drivers

In step 7@section B, we've build a nice smart object in smartobj.js, let's add the following line to the end of the file:

```js
var Board = require('firmata'),
    SmartObject = require('smartobject');

// ... code remains the same

// export our so
module.exports = so;
```

### 2. Install the `coap-node` module in /app folder

```sh
npm install coap-node
```

### 3. Create a file client.js in /app folder and write some code

* [[1] coap-node basic usage](https://github.com/PeterEB/coap-node#Usage)

```js
var so = require('./smartobj.js'),
    CoapNode = require('coap-node');

// see [1]
var coapNode = new CoapNode('my_cnode', so);

coapNode.on('registered', function () {
    console.log('>> CoAP node is registered to a server');
});

so.hal.board.on('ready', function () {
    console.log('>> Blink the led for few times');
    so.hal.blinkLed(10);

    // Register to the server after Arduino ready to communicate
    console.log('>> Register to a server...');

    // replace the ip with yours server-side machine 
    coapNode.register('192.168.1.115', 5683, function (err, msg) {    
        console.log(msg);
    });
});
```

## Server-side (On PC or Raspberry Pi)

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

<br />

<a name="SectionD"></a>
## Section D: Start LWM2M Network

### At server-side (on PC or Raspberry Pi)

```sh
node server
```

### At client-side (on Linkit 7688 Duo)

```sh
node client
```

/***************************************************
 * smartobject                                       *
 ***************************************************/
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

module.exports = so;
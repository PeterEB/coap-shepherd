var Board = require('firmata'),
    SmartObject = require('smartobject');

var board = new Board("/dev/ttyS0");

var so = new SmartObject({
    board: board,
    ledPin: 2
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

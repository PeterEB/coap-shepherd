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

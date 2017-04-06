var CONSTANTS = {
    TTYPE: {
        root: 0,
        obj: 1,
        inst: 2,
        rsc: 3
    },
    TAG: {
        notfound: '_notfound_', 
        unreadable: '_unreadable_', 
        exec: '_exec_', 
        unwritable: '_unwritable_', 
        unexecutable: '_unexecutable_'
    },
    ERR: {
        success: 0,
        notfound: 1,
        unreadable: 2,
        unwritable: 3,
        unexecutable: 4,
        timeout: 5,
        badtype: 6
    },
    RSP: {
        ok: '2.00', 
        created: '2.01', 
        deleted: '2.02', 
        changed: '2.04', 
        content: '2.05', 
        badreq: '4.00',
        unauth: '4.01', 
        forbid: '4.03', 
        notfound: '4.04', 
        notallowed: '4.05', 
        timeout: '4.08', 
        serverError: '5.00'
    }
};

module.exports = CONSTANTS;

module.exports = (function () {
    'use strict';

    var pj = require('../package.json');
    var fs = require('fs');
    var ascii = fs.readFileSync(__dirname + '/../splash.txt', 'ascii') + '\n' +
                '                                         v' + pj.version;

    return {
        ascii: ascii
    };
}());

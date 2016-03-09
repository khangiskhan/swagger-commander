var ArgumentHelp = require('./ArgumentHelp');
var util = require('util');

function ParameterHelp(name, signature, description) {
    ArgumentHelp.call(this, name, signature, description);
    this.argumentName = '--' + name + ' <' + name + '>';
}
util.inherits(ParameterHelp, ArgumentHelp);

module.exports = ParameterHelp;

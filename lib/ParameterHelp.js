var ArgumentHelp = require('./ArgumentHelp');
var util = require('util');
var logColors = require('./logColors');
var DEFAULT_HEADER = 'Optional Parameters';

function ParameterHelp(name, signature, description, parameters, header) {
    ArgumentHelp.call(this, name, signature, description, parameters, header);
    this.argumentName = '--' + name + ' <' + name + '>';
    this.header = logColors.parameterHelpHeader(header || DEFAULT_HEADER);
    this.argumentSignature = logColors.parameterHelpHeader(signature);
}
util.inherits(ParameterHelp, ArgumentHelp);

module.exports = ParameterHelp;

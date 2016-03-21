var ArgumentHelp = require('./ArgumentHelp');
var util = require('util');
var logColors = require('./logColors');
var DEFAULT_HEADER = 'Optional Parameters';

function ParameterHelp(name, signature, parameterType, description, parameters, header) {
    ArgumentHelp.call(this, name, signature, description, parameters, header);
    this.argumentName = '--' + name + ' <' + name + '>';
    this.header = logColors.parameterHelpHeader(header || DEFAULT_HEADER);
    if (signature.trim() === 'file') {
        // swagger-client (swaggerJS) currently doesn't support uploads from node
        this.argumentSignature = logColors.parameterHelpHeader(signature) +
            logColors.unsupported(' Data type: "file", is currently unsupported');
    } else {
        this.argumentSignature = logColors.parameterHelpHeader(signature);
    }
}
util.inherits(ParameterHelp, ArgumentHelp);

module.exports = ParameterHelp;

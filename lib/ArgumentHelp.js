/*
 * Copyright (c) 2015-2016 Khang Nguyen
 * MIT Licensed
 */
var htmlToText = require('html-to-text');
var _ = require('underscore');
var logColors = require('./logColors');
var DEFAULT_HEADER = 'Required Parameters (Arguments)';

function ArgumentHelp(name, signature, parameterType, description, parameters, header) {
    this.header = logColors.argumentHelpHeader(header || DEFAULT_HEADER);
    this.argumentName = '<' + name + '>';
    this.argumentSignature = logColors.argumentHelpHeader(signature);
    this.description = description;
    this.parameterType = parameterType;
}

ArgumentHelp.prototype.htmlSignaturePretty = function () {
    var signature = this.argumentSignature;
    // Add line breaks after </div>
    var regEx = /(<\/div>)/g;
    var sigPretty = signature.replace(regEx, '$1<br>');
    // Add line breaks after opening brackets '{'
    regEx = /(\{)/g;
    sigPretty = sigPretty.replace(regEx, '$1<br>');
    // Add '-' to object keys TODO add spaces instead of '-'
    regEx = /(<span class="propName)/g;
    sigPretty = sigPretty.replace(regEx, '-$1');
    return htmlToText.fromString(sigPretty);
};

ArgumentHelp.prototype.showHelp = function () {
    var header = this.header;
    console.log('  ' + header + ':\n');
    // Show name
    var argumentNameLine = '   ' + this.argumentName;
    if (this.description) {
        argumentNameLine += ' - ' + this.description;
    }
    console.log(argumentNameLine);
    console.log('     Parameter Type: ' + this.parameterType);
    if (this.argumentSignature.length < 30) {
        console.log('     Data Type: ' + this.argumentSignature);
    } else {
        console.log('     Data Type:');
        var argumentSigPretty = this.htmlSignaturePretty();
        var sigLines = argumentSigPretty.split('\n');
        _.each(sigLines, function (line) {
            console.log('     ' + line);
        });
    }

    console.log();
};

module.exports = ArgumentHelp;

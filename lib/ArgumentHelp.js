var htmlToText = require('html-to-text');

function ArgumentHelp(name, signature, description) {
    this.argumentName = '<' + name + '>';
    this.argumentSignature = signature;
    this.description = description;
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
}

module.exports = ArgumentHelp;

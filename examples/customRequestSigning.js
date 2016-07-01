// Example of a swagger-js (swagger-client) custom request signer.
//    usage: swagger-commander pet getPetById 1 -C "api_key, ./examples/CustomRequestSigning.js" -d
//
// See https://github.com/swagger-api/swagger-js for more info about custom request signing

var CustomRequestSigner = function (name) {
    this.name = name;
    this._btoa = _hashFunction;
};

CustomRequestSigner.prototype.apply = function (obj, authorizations) {
    var hashFunction = this._btoa;
    var hash = hashFunction(obj.url);

    obj.headers["signature"] = hash;
    return true;
};

function _hashFunction(url) {
    return new Buffer(url).toString('base64');
}

module.exports = CustomRequestSigner;

var _ = require('lodash'),
    Swagger = require('swagger-client'),
    path = require('path'),
    logger;

function parseAuthConfig(authConfigObject, log) {
    logger = log;
    var swaggerClientAuthObj;
    var authTypes = {
        PASSWORD: 'password',
        QUERY: 'query',
        HEADER: 'header',
        CUSTOM: 'customSigner'
    };

    _.each(authConfigObject, function (conf, authName) {
        var authType = _.get(conf, 'type'),
            authObj;
        if (!authType) {
            logger.error('Auth property type is required for authConfig: ', authName);
        } else if (authType === authTypes.PASSWORD) {
            authObj = _parsePasswordAuthConf(conf);
        } else if (authType === authTypes.HEADER) {
            authObj = _parseHeaderAuthConf(conf);
        } else if (authType === authTypes.QUERY) {
            authObj = _parseQueryAuthConf(conf);
        } else if (authType === authTypes.CUSTOM) {
            authObj = _parseCustomAuthConf(conf, authName);
        } else {
            logger.error('Auth type in config not recognized or supported: ', authType);
        }

        if (authObj) {
            swaggerClientAuthObj = swaggerClientAuthObj || {};
            swaggerClientAuthObj[authName] = authObj;
        }
    });

    return swaggerClientAuthObj;
}

function _parsePasswordAuthConf(conf) {
    var user = _.get(conf, 'userName'),
        password = _.get(conf, 'password');

    if (user && password) {
        return new Swagger.PasswordAuthorization(user, password);
    } else {
        logger.error('Invalid password auth configuration');
    }

    return null;
}
function _parseHeaderAuthConf(conf) {
    var header = _.get(conf, 'nameOfHeader'),
        value = _.get(conf, 'value');
    if (header && value) {
        return new Swagger.ApiKeyAuthorization(header, value, 'header');
    } else {
        logger.error('Invalid header auth configuration');
    }

    return null;
}
function _parseQueryAuthConf(conf) {
    var query = _.get(conf, 'nameOfQueryKey'),
        value = _.get(conf, 'value');
    if (query && value) {
        return new Swagger.ApiKeyAuthorization(query, value, 'query');
    } else {
        logger.error('Invalid header auth configuration');
    }

    return null;
}
function _parseCustomAuthConf(conf, authName) {
    var pathToSigner = _.get(conf, 'path');
    if (authName && pathToSigner) {
        try {
            var CustomSigner = require(path.resolve(pathToSigner));
            if (CustomSigner instanceof Function) {
                return new CustomSigner();
            } else {
                logger.error('The custom signer at "' + pathToSigner + '" is not a Node exported function');
            }
        } catch (e) {
            logger.error('Error requiring the custom request signer: ', e);
        }
    } else {
        logger.error('Invalid custom auth signer configuration');
    }

    return null;
}

module.exports = parseAuthConfig;

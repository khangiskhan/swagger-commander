#!/usr/bin/env node

/*
 * Copyright (c) 2015-2016 Khang Nguyen
 * MIT Licensed
 */

var _         = require('lodash');
var Swagger   = require('swagger-client');
var winston   = require('winston');
var fs        = require('fs');
var chalk     = require('chalk');
var validUrl  = require('url-validator');
var path      = require('path');

// Custom libs
var CONFIG_FILE_PATH      = __dirname + '/config/config.json';
var LOCAL_CONFIG_NAME     = '.swagger-commander.json';
var config                = require(CONFIG_FILE_PATH);
var splash                = require('./lib/splash');
var apiCommander          = require('./lib/apiCommander');
var apiOperationCommander = require('./lib/apiOperationCommander');
var authConfigParser      = require('./lib/parseAuthConfig');
var logger    = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                colorize: true,
                level: 'info'
            })
        ]
    });

// Check current working directory for local config file
var localConfig = getLocalConfig('./' + LOCAL_CONFIG_NAME);
if (localConfig) {
    config = localConfig;
}

apiCommander.init(logger);
apiOperationCommander.init(logger);

if (process.argv[2] === 'set-swagger-url') {
    if (process.argv[3]) {
        setSwaggerUrlConfig(process.argv[3]);
        if (localConfig) {
            logger.warn('Local swagger file detected in current directory, ' +
                    'the swagger-url in the local file has not been changed, you must do that manually');
        }
    } else {
        logger.error('No swagger file URL given');
    }
    return;
}

var swagSpecURL = config.swagger_spec_url;
if (!swagSpecURL) {
    logger.error('Swagger spec URL not set');
    return;
}

// parse auth config
var authObj;
if (_.has(config, 'auth')) {
    authObj = authConfigParser(_.get(config, 'auth'), logger);
}

//swagSpecURL = 'http://petstore.swagger.io/v2/swagger.json'; // DEMO url
new Swagger({
        url: swagSpecURL,
        authorizations: authObj,
        usePromise: true
    }
).then(commanderSetup)
 .catch(function (err) {
     logger.error('Error connecting to Swagger file URL: ' + swagSpecURL);
     logger.error(err);
 });

/*************
 *  Methods  *
 *************/
function commanderSetup(client) {
    var parentCommand = process.argv[2];

    // Split by "tags"
    var apis = client.apis;

    // Commander can't contain white spaces in commands,
    // so we need to replace API keys that have whitespaces
    var keyNoWhiteSpace;
    _.each(apis, function (obj, key) {
        if (hasWhitespace(key) === true) {
            keyNoWhiteSpace = key.replace(/ /g, '');
            apis[keyNoWhiteSpace] = obj;
            delete apis[key];
        }
    });

    var unrecognizedParentCommand = parentCommand && !_.has(apis, parentCommand);

    // If no parentCommand, create the commander that just shows the available resources
    // Otherwise, if parentCommand given, create subCommand program that shows the operations for that resource
    if (!parentCommand || unrecognizedParentCommand) {
        if (unrecognizedParentCommand && (parentCommand !== '-h') && (parentCommand !== '--help')) {
            logger.error('Unrecognized parent command: ' + parentCommand);
        }

        logAdditionalInfo(true, client);
        apiCommander.setupParentcommand(process.argv, apis);
    } else if (parentCommand) {
        logAdditionalInfo(false);
        apiOperationCommander.setupSubcommand(process.argv,
                                              apis[parentCommand],
                                              client.clientAuthorizations,
                                              parentCommand);
    }

    // Commander in apiCommander and apiOperationCommander never return the thread
    // so any code here is unreachable
}

function setSwaggerUrlConfig(swaggerFileUrl) {
    if (!validUrl(swaggerFileUrl)) {
        logger.warn('this URL does not appear to be valid');
    }

    var swagConfig = {
        'swagger_spec_url': swaggerFileUrl
    };

    fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(swagConfig), function (err) {
        if (err) {
            logger.info('There has been an error setting Swagger file URL.');
            logger.error(err.message);
            return;
        }
        logger.info('Swagger file URL changed to: ', swaggerFileUrl);
    });
}

function getLocalConfig(filePath) {
    try {
        var resolvePath = path.resolve(filePath);
        var localConfig = require(resolvePath);
        return localConfig;
    } catch (e) {
        return null;
    }
}

function hasWhitespace(s) {
    return s.indexOf(' ') >= 0;
}

function logAdditionalInfo(showStartupInfo, client) {
    if (showStartupInfo) {
        // Show splash and version info
        console.log(chalk.green(splash.ascii) + '\n'); // show splash
        if (client.info && client.info.title) {
            console.log(client.info.title + ' ' + client.info.version);
        }
    }

    if (localConfig) {
        logger.info('Using local swagger-config file "' + LOCAL_CONFIG_NAME + '" in current directory');
    }
}

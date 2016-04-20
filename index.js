#!/usr/bin/env node

/*
 * Copyright (c) 2015-2016 Khang Nguyen
 * MIT Licensed
 */

var _         = require('underscore');
var commander = require('commander');
var Swagger   = require('swagger-client');
var winston   = require('winston');
var fs        = require('fs');
var chalk     = require('chalk');

// Custom libs
var CONFIG_FILE_PATH      = __dirname + '/config/config.json';
var config                = require(CONFIG_FILE_PATH);
var apiCommander          = require('./lib/apiCommander');
var apiOperationCommander = require('./lib/apiOperationCommander');
var logger    = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                colorize: true,
                level: 'info'
            })
        ]
    });

apiCommander.init(logger);
apiOperationCommander.init(logger);

if (process.argv[2] === 'set-swagger-url') {
    if (process.argv[3]) {
        setSwaggerUrlConfig(process.argv[3]);
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

//swagSpecURL = 'http://petstore.swagger.io/v2/swagger.json'; // DEMO url
new Swagger({
        url: swagSpecURL,
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
            console.log('replaced')
            keyNoWhiteSpace = key.replace(/ /g, '');
            apis[keyNoWhiteSpace] = obj;
            delete apis[key];
        }
    });

    var unrecognizedParentCommand = parentCommand && !_.has(apis, parentCommand);

    // If parentCommand given, create subcommand program
    // Otherwise, just show the available APIs
    if (!parentCommand || unrecognizedParentCommand) {
        if (unrecognizedParentCommand && (parentCommand !== '-h') && (parentCommand !== '--help')) {
            logger.error('Unrecognized parent command: ' + parentCommand);
        }
        commander
            .usage('[parent-command] [options]');

        commander.on('--help', function () {
            console.log('  Config:');
            console.log();
            console.log('    to point swagger-commander to a different swagger file URL:');
            console.log(chalk.blue('       swagger-commander set-swagger-url <url>'));
        });

        apiCommander.setupParentcommand(apis);
    } else if (parentCommand) {
        commander
            .usage(parentCommand + ' [sub-command] [options]');
        apiOperationCommander.setupSubcommand(apis[parentCommand]);
    }

    return client;
}

function setSwaggerUrlConfig(swaggerFileUrl) {
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

function hasWhitespace(s) {
    return s.indexOf(' ') >= 0;
}

#!/usr/bin/env node
var _         = require('underscore');
var commander = require('commander');
var Swagger   = require('swagger-client');
var winston   = require('winston');

// Custom libs
var config                = require('./config/config.json');
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

var swagSpecURL = config.swagger_spec_url;
if (!swagSpecURL) {
    logger.error('Swagger spec URL not set');
    return;
}

swagSpecURL = 'http://petstore.swagger.io/v2/swagger.json'; // DEMO url
new Swagger({
        url: swagSpecURL,
        usePromise: true
    }
).then(commanderSetup)
 .catch(function (err) {
     console.error(err);
 });

/*************
 *  Methods  *
 *************/
function commanderSetup(client) {
    var parentCommand = process.argv[2];

    // Split by "tags"
    var apis = client.apis;

    var unrecognizedParentCommand = parentCommand && !_.has(apis, parentCommand);

    // If parentCommand given, create subcommand program
    // Otherwise, just show the available APIs
    if (!parentCommand || unrecognizedParentCommand) {
        if (unrecognizedParentCommand) {
            logger.error('Unrecognized parent command: ' + parentCommand);
        }
        commander
            .usage('[parent-command] [options]');
        apiCommander.setupParentcommand(apis);
    } else if (parentCommand) {
        commander
            .usage(parentCommand + ' [sub-command] [options]');
        apiOperationCommander.setupSubcommand(apis[parentCommand]);
    }

    return client;
}

#!/usr/bin/env node

var _         = require('underscore');
var commander = require('commander');
var Swagger   = require('swagger-client');
//var util      = require('util');
var winston   = require('winston');
//var chalk     = require('chalk');

var logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                colorize: true,
                level: 'info'
            })
        ]
    });
var config    = require('./config/config.json');
//var logColors = require('./lib/logColors');
var apiCommander = require('./lib/apiCommander');
var apiOperationCommander = require('./lib/apiOperationCommander');

apiCommander.init(logger);
apiOperationCommander.init(logger);

var swagSpecURL = config.swagger_spec_url;
if (!swagSpecURL) {
    logger.error('Swagger spec URL not set');
    return;
}

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

    // If parentCommand given, create subcommand program
    // Otherwise, just show the available APIs
    if (!parentCommand || !_.has(apis, parentCommand)) {
        commander
            .usage('[parent-command] [options]');
        apiCommander.setupParentcommand(parentCommand, apis);
    } else if (parentCommand) {
        commander
            .usage(parentCommand + ' [sub-command] [options]');
        apiOperationCommander.setupSubcommand(apis[parentCommand]);
    }

    return client;
}

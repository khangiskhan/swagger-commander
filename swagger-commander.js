#!/usr/bin/env node

var _         = require('underscore');
var commander = require('commander');
var Swagger   = require('swagger-client');
var util      = require('util');
var winston   = require('winston');
var chalk     = require('chalk');

var config    = require('./config/config.json');
var logColors = require('./lib/logColors');
var ArgumentHelp = require('./lib/ArgumentHelp');
var ParameterHelp = require('./lib/ParameterHelp');

//var logger    = require('./lib/logger').init();
var logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                colorize: true,
                level: 'info'
            })
        ]
    });

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

function commanderSetup(client) {
    var parentCommand = process.argv[2];

    // Split by "tags"
    var apis = client.apis;

    // If parentCommand given, create subcommand program
    // Otherwise, just create the high level commands
    if (!parentCommand || !_.has(apis, parentCommand)) {
        commander
            .usage('[parent-command] [options]');
        setupParentcommand(parentCommand, apis);
    } else if (parentCommand) {
        commander
            .usage(parentCommand + ' [sub-command] [options]');
        setupSubcommand(apis[parentCommand]);
    }

    return client;
}

function setupParentcommand(parentCommand, apis) {
    _.each(apis, function (api, apiKey) {
        if (apiKey !== 'help') {
            createCommandForApi(api);
        }
    });

    commander.parse(process.argv);
    if (parentCommand) {
        logger.error('Unrecognized parent command: ' + parentCommand);
    }
    commander.help();
}
function createCommandForApi(apiObj) {
    var cmd,
        desc;

    cmd = apiObj.label;
    desc = apiObj.description;

    var cmdObj =
        commander
            .command(cmd)
            .description(desc);
    return cmdObj;
}

function setupSubcommand(apiObj) {
    logger.debug('Setting up operations for: ' + apiObj.label);
    var operations = apiObj.operations;

    _.each(
        operations,
        createCommandForApiOperation.bind(this, apiObj)
    );

    if (!process.argv[3]) {
        // No sub-command given
        commander.help();
    }

    // Remove the parentCommand
    process.argv.splice(2, 1);
    commander.parse(process.argv);
}
function createCommandForApiOperation(apiObj, op, opKey) {
    var cmdName,
        cmdObj,
        path,
        desc,
        cmdAction;
    var optionKeys = [];
    var argumentNames = [];

    logger.debug('Operation: ' + opKey);
    cmdName = opKey;
    path = op.basePath + op.path;
    desc = op.method.toUpperCase() + ' ' + path + ' ' + op.summary;
    cmdAction = apiObj[opKey];

    var parameterHelp = [];
    var argumentHelp = [];

    // Add required parameters as arguments
    var parameters = op.parameters; // Array
    _.each(parameters,
        function (parameter) {
            // --optionArg <optionArg>
            if (parameter.required === true) {
                cmdName += ' <' + parameter.name + '>';
                argumentNames.push(parameter.name);
                argumentHelp.push(new ArgumentHelp(parameter.name, parameter.signature, parameter.description));
            } else {
                parameterHelp.push(new ParameterHelp(parameter.name, parameter.signature, parameter.description));
            }
        }
    );

    // build command
    cmdObj = commander
                .command(cmdName)
                .description(desc);

    // Add remaining parameters as options
    optionKeys = addParameterOptionsToCommand(cmdObj, op);

    addDefaultOptionsToCommand(cmdObj);

    // Add action
    cmdObj.action(
        runAction.bind(this, cmdAction, argumentNames, optionKeys)
    )
    .on('--help',
        function (argHelp, paramsHelp, note) {
            if (argHelp && argHelp.length > 0) {
                showCustomParameterHelp(argHelp, 'Required Parameters (Arguments)');
            }
            if (paramsHelp && paramsHelp.length > 0) {
                showCustomParameterHelp(paramsHelp, 'Optional Parameters');
            }
            if (note) {
                showImplementationNoteHelp(note);
            }
        }.bind(this, argumentHelp, parameterHelp, op.description)
    );
}

function showImplementationNoteHelp(note) {
    console.log('  Implementation Note: ' + note + '\n');
    console.log();
}

function showCustomParameterHelp(args, header) {
    console.log('  ' + header + ':\n');
    var sigLines,
        argumentSigPretty;
    _.each(args, function (argHelpObj) {
        // Show name
        console.log('   ' + argHelpObj.argumentName + ' - ' + argHelpObj.description);
        if (argHelpObj.argumentSignature.length < 30) {
            console.log('     Data Type: ' + logColors.argumentSignature(argHelpObj.argumentSignature));
        } else {
            console.log('     Data Type:');
            argumentSigPretty = argHelpObj.htmlSignaturePretty();
            sigLines = argumentSigPretty.split('\n');
            _.each(sigLines, function (line) {
                console.log(logColors.argumentSignature('     ' + line));
            });
        }
    });
    console.log();
}

function runAction(cmdAction, argumentNames, optionKeys) {
    var args = Array.prototype.slice.call(arguments);
    var opts = args[args.length - 1]; // Commander options is last

    // check log level arguments
    if (opts.verbose) {
        logger.transports.console.level = 'verbose';
    }
    if (opts.debug) {
        logger.transports.console.level = 'debug';
    }

    // Get the required arguments from the arguments array
    var requiredArgumentValues = args.slice(3, args.length - 1);
    if (requiredArgumentValues.length !== argumentNames.length) {
        logger.error('argument mismatch...');
    }
    var requiredArguments = {};
    for (var i = 0; i < requiredArgumentValues.length; i++) {
        var key = argumentNames[i];
        requiredArguments[key] = requiredArgumentValues[i];
    }

    var optionalArguments = {};
    _.each(optionKeys, function (name) {
        // TODO check function due to Commander bug with some
        // option names that overlap Commander properties
        if (opts[name] && !_.isFunction(opts[name])) {
            optionalArguments[name] = opts[name];
        }
    });

    var actionArguments = _.extend(requiredArguments, optionalArguments);
    logger.verbose('Calling action with options: ' + util.inspect(actionArguments));
    cmdAction(actionArguments)
        .then(
            handleCommandResponse.bind(this, opts),//success
            handleCommandResponse.bind(this, opts) //fail
        )
        .catch(
            function (err) {
                logger.error('Error running command...', err);
            }
        );
}

function handleCommandResponse(opts, response) {
    var responseData;
    if (opts.fullResponse || opts.verbose) {
        responseData = util.inspect(response);
    } else {
        responseData = response.data;
    }

    logger.info('status:', response.status);
    if (opts.prettyResponse) {
        try {
            // can't use logger here since it messes up the formatting
            console.log('data:', JSON.parse(responseData));
        } catch (e) {
            // error in JSON parsing, fallback
            logger.info(responseData);
        }
    } else {
        logger.info('data: ' + responseData);
    }
}

function addDefaultOptionsToCommand(commandObject) {
    commandObject
        .option('-v, --verbose', 'Display verbose (all) level log details')
        .option('-d, --debug', 'Display debug level log details')
        .option('-F, --fullResponse', 'Display the full response object from Swagger')
        .option('-P, --prettyResponse', 'Display pretty formatted response');
}

// Adds optional parameters (parameter.required == false)
// as a Commander.option and returns an
// array of the option names (keys) added.
function addParameterOptionsToCommand(commandObject, operation) {
    /* Example parameter = {
     *  name: 'petId',
     *  in: 'path',
     *  description: 'ID of pet to return',
     *  required: true,
     *  type: 'integer',
     *  format: 'int64',
     *  default: undefined,
     *  modelSignature: { type: 'long', definitions: [Object] },
     *  signature: 'long',
     *  sampleJSON: undefined,
     *  responseClassSignature: 'long'
     * }
     */
    var parameters = operation.parameters; // Array
    var optionArg,
        optionDescription,
        optionNames = [];
    _.each(parameters,
        function (parameter) {
            if (parameter.required === false) {
                optionNames.push(parameter.name);
                // --optionArg <optionArg>
                optionArg = '--' + parameter.name + ' <' + parameter.name + '>';

                // Build the description
                optionDescription = parameter.description;
                optionDescription += ', ParameterType=' + parameter.in;
                commandObject.option(optionArg, optionDescription);
            }
        }
    );

    return optionNames;
}

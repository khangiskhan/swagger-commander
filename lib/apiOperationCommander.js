/*
 * Copyright (c) 2015-2016 Khang Nguyen
 * MIT Licensed
 */
var commander = require('commander');
var _ = require('underscore');
var util = require('util');
var ArgumentHelp = require('./ArgumentHelp');
var ParameterHelp = require('./ParameterHelp');
var logger;

module.exports = {
    init: init,
    setupSubcommand: setupSubcommand
};

function init(log) {
    logger = log;
}

function setupSubcommand(apiObj) {
    logger.debug('Setting up operations for: ' + apiObj.label);
    var operations = apiObj.operations;

    var commandObjects = _.map(
        operations,
        createCommandForApiOperation.bind(this, apiObj)
    );

    // Use our customHelp when -h/--help is used
    commander.outputHelp = commander.outputHelp.bind(commander, customHelp);

    commander
        .option('-E, --expandOperations', 'Show all operation details');

    if (!process.argv[3]) {
        // No sub-command given
        commander.help(customHelp);
    }

    // Remove the parentCommand
    process.argv.splice(2, 1);
    commander.parse(process.argv);

    if (commander.expandOperations) {
        _.each(commandObjects, function (obj) {
            obj.outputHelp();
            console.log();
            console.log('========================================');
        });
    }
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
                argumentHelp.push(
                    new ArgumentHelp(parameter.name, parameter.signature, parameter.in, parameter.description));
            } else {
                parameterHelp.push(
                    new ParameterHelp(parameter.name, parameter.signature, parameter.in, parameter.description));
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
                _.each(argHelp, function (argHelpObj) {
                    argHelpObj.showHelp();
                });
            }
            if (paramsHelp && paramsHelp.length > 0) {
                _.each(paramsHelp, function (paramsHelpObj) {
                    paramsHelpObj.showHelp();
                });
            }
            if (note) {
                showImplementationNoteHelp(note);
            }
        }.bind(this, argumentHelp, parameterHelp, op.description)
    );

    return cmdObj;
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
        logger.debug(requiredArgumentValues[i]);
        requiredArguments[key] = parseBody(requiredArgumentValues[i]);
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
    if (opts.fullResponse) {
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
                if (parameter.in === 'body') {
                    commandObject.option(optionArg, optionDescription, parseBody);
                } else {
                    commandObject.option(optionArg, optionDescription);
                }
            }
        }
    );

    return optionNames;
}

function showImplementationNoteHelp(note) {
    console.log('  Implementation Note: ' + note + '\n');
    console.log();
}

function customHelp(originalHelp) {
    var reg = /Commands:/;
    return originalHelp.replace(reg, 'Sub-Commands (Operations):');
}

function parseBody(bodyString) {
    try {
        return JSON.parse(bodyString);
    } catch (e) {
        logger.warn('Invalid JSON object argument. All JSON arguments must be enclosed in single quotes: ');
        logger.warn('   Example: swagger-commander pet addPet \'{"id": 42, "name": "foo"}\'');
        return bodyString;
    }
}

var _         = require('underscore');
var commander = require('commander');
var Swagger   = require('swagger-client');
var util      = require('util');
var winston   = require('winston');

// TODO
//var logger    = require('./lib/logger').init();
var logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                colorize: true,
                level: 'info'
            })
        ]
    });

// TODO
var swagSpecURL = 'http://petstore.swagger.io/v2/swagger.json';

var parentCommand = process.argv[2];
new Swagger({
        url: swagSpecURL,
        usePromise: true
    }
).then(commanderSetup)
 .catch(function (err) {
     console.error(err);
 });

function setupSubcommand(apiObj) {
    logger.info('Setting up operations for: ' + apiObj.label);
    var operations = apiObj.operations;

    var cmdName,
        cmdObj,
        path,
        desc,
        cmdAction;

    _.each(operations,
        function (op, opKey) {
            var optionKeys = [];
            var argumentNames = [];

            logger.info('Operation: ' + opKey);
            cmdName = opKey;
            path = op.basePath + op.path;
            desc = op.method.toUpperCase() + ' ' + path + ' ' + op.summary;
            cmdAction = apiObj[opKey];

            // Add required parameters as arguments
            var parameters = op.parameters; // Array
            _.each(parameters,
                function (parameter) {
                    // --optionArg <optionArg>
                    if (parameter.required === true) {
                        cmdName += ' <' + parameter.name + '>';
                        argumentNames.push(parameter.name);
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
            );
        }
    );
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
            function (response) {
                if (opts.fullResponse || opts.verbose) {
                    logger.info('FULL response: ' + util.inspect(response));
                } else {
                    logger.info('status:', response.status);
                    logger.info('data:', response.data);
                }
            }
        );
}

function addDefaultOptionsToCommand(commandObject) {
    commandObject
        .option('-v, --verbose', 'Display verbose (all) level log details')
        .option('-d, --debug', 'Display debug level log details')
        .option('-F, --fullResponse', 'Display the full response object from Swagger');
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

function setupParentcommand(parentCommand, apis) {
    _.each(apis, function (api, apiKey) {
        if (apiKey !== 'help') {
            showApis(api);
        }
    });

    commander.parse(process.argv);
    if (parentCommand) {
        logger.error('Unrecognized parent command: ' + parentCommand);
    }
    commander.outputHelp();
}
function showApis(apiObj) {
    var cmd,
        desc;

    cmd = apiObj.label;
    desc = apiObj.description;

    var cmdObj =
        commander
            .command(cmd)
            .option('-T, test', 'testing')
            .description(desc)
            .action(function (opts) {
                console.log('opts', opts);
            });
    return cmdObj;
}

function commanderSetup(client) {
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

        if (!process.argv[3]) {
            // No sub-command given
            commander.outputHelp();
        }

        // Remove the parentCommand
        process.argv.splice(2, 1);
        commander.parse(process.argv);
    }

    return client;
}

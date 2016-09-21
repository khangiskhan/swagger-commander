/*
 * Copyright (c) 2015-2016 Khang Nguyen
 * MIT Licensed
 */
var commander = require('commander');
var _ = require('lodash');
var Swagger   = require('swagger-client');
var util = require('util');
var ArgumentHelp = require('./ArgumentHelp');
var ParameterHelp = require('./ParameterHelp');
var path = require('path');
var logger;
var fs = require('fs');

module.exports = {
    init: init,
    setupSubcommand: setupSubcommand
};

function init(log) {
    logger = log;
}

var clientAuthorizations;

function setupSubcommand(processArgs, apiObj, clientAuthObj, parentCommand) {
    commander
        .usage(parentCommand + ' [sub-command] [options]');

    clientAuthorizations = clientAuthObj;

    logger.debug('Setting up operations for: ' + apiObj.label);
    var operations = apiObj.operations;
    var allCommandNames;
    var commandObjects = _.map(
        operations,
        createCommandForApiOperation.bind(this, apiObj)
    );
    //allCommandNames = _.pluck(commandObjects, '_name');
    allCommandNames = _.map(commandObjects, '_name');

    // Use our customHelp when -h/--help is used
    commander.outputHelp = commander.outputHelp.bind(commander, customHelp);

    commander
        .option('-E, --expandOperations', 'Show detailed help for every sub-command/operation for resource ' + apiObj.label);

    var subCommandArg = processArgs[3];
    if (!subCommandArg) {
        // No sub-command given
        commander.help(customHelp);

    }
    // Check that the sub-command exists
    else if ((_.indexOf(allCommandNames, subCommandArg) < 0) &&
               (subCommandArg.charAt(0) !== '-')) {
        logger.error('sub-command not recognized: ' + subCommandArg);
        commander.help(customHelp);
    }
    // Manually handle the -E option, which is an option for the parent commander
    else if (subCommandArg === '-E' || subCommandArg === '--expandOperations') {
        _.each(commandObjects, function (obj) {
            obj.outputHelp();
            console.log();
            console.log('========================================');
        });
        return;
    }

    if (commander.expandOperations) {
        _.each(commandObjects, function (obj) {
            obj.outputHelp();
            console.log();
            console.log('========================================');
        });
    }

    // Remove the parentCommand
    processArgs.splice(2, 1);
    commander.parse(processArgs);
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
                argumentNames.push({name: parameter.name, type: parameter.in});
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
    var requiredArguments = {},
        key,
        value;
    for (var i = 0; i < requiredArgumentValues.length; i++) {
        key = argumentNames[i].name;
        value = requiredArgumentValues[i];

        logger.debug(value);
        if (isFileArgument(value)) {
            value = parseFileArgument(value.slice(1));
        }

        // if argument type is "body", then parse JSON
        requiredArguments[key] = (argumentNames[i].type === 'body') ? parseBody(value) : value;
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

    // Check auth
    var auth = getAuthObject(opts);
    if (auth) {
        //logger.debug('auth obj: ', auth);
        // only 1 key, but each for ease
        _.each(auth, function (authObj, authName) {
            clientAuthorizations.add(authName, authObj);
            logger.debug('Calling action with auth: ', util.inspect(authObj, {depth: null}));
        });
    }

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
        responseData = util.inspect(response, {depth: null});
    } else {
        responseData = response.data;
    }

    logger.info('status:', response.status);
    if (opts.prettyResponse) {
        try {
            // can't use logger here since it messes up the formatting
            var parsed = JSON.parse(responseData);
            console.log('data:', JSON.stringify(parsed, null, 2));
        } catch (e) {
            // error in JSON parsing, fallback
            logger.info(responseData);
        }
    } else {
        logger.info('data: ' + responseData);
    }

    if (response.status === 0) {
        logger.error('error with server response: ', response.errObj.code);
        logger.error('  -> check that your Swagger spec/file URL is valid');
        logger.error('  -> details:' + util.inspect(response));
    }
}

function addDefaultOptionsToCommand(commandObject) {
    commandObject
        .option('-v, --verbose', 'Display verbose (all) level log details')
        .option('-d, --debug', 'Display debug level log details')
        .option('-F, --fullResponse', 'Display the full response object from Swagger')
        .option('-P, --prettyResponse', 'Display pretty formatted response')
        .option('-W, --passwordAuth "<authName>, <username>, <password>"', 'Use password auth', parsePasswordAuth)
        .option('-K, --apiHeaderAuth "<authName>, <nameOfHeader>, <value>"',
                'Use header auth', parseKeyAuth.bind(this, 'header'))
        .option('-Q, --apiQueryKeyAuth "<authName>, <nameOfQueryKey>, <value>"',
                'Use query key auth', parseKeyAuth.bind(this, 'query'))
        .option('-C, --customAuthSigner "<authName>, <pathToSigner>"',
                'Use a swagger-js custom request signer. Arg pathToSigner is the full file path to the node.js file',
                parseCustomSigner);
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
        logger.warn('Invalid JSON object argument.');
        logger.warn('   Example: swagger-commander pet addPet \'{"id": 42, "name": "foo"}\'');
        return bodyString;
    }
}

function _trim(str) {
    return str.trim();
}

function getAuthObject(opts) {
    var auth;
    if (opts.passwordAuth) {
        auth = opts.passwordAuth;
    } else if (opts.apiHeaderAuth) {
        auth = opts.apiHeaderAuth;
    } else if (opts.apiQueryKeyAuth) {
        auth = opts.apiQueryKeyAuth;
    } else if (opts.cookieAuth) {
        auth = opts.cookieAuth;
    } else if (opts.customAuthSigner) {
        auth = opts.customAuthSigner;
    }
    return auth;
}

function parsePasswordAuth(string) {
    var values = string.split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/).map(_trim);
    if (values.length !== 3) {
        logger.error('Unexpected input for password auth');
        return false;
    }
    var authName = values[0],
        user = values[1],
        password = values[2],
        authObj = {};
    authObj[authName] = new Swagger.PasswordAuthorization(user, password);
    return authObj;
}

function parseKeyAuth(type, string) {
    var values = string.split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/).map(_trim);
    if (values.length !== 3) {
        logger.error('Unexpected input for api-key auth');
        return false;
    }
    var authName = values[0],
        apiKey = values[1],
        apiValue = values[2],
        authObj = {};

    authObj[authName] = new Swagger.ApiKeyAuthorization(apiKey, apiValue, type);
    return authObj;
}

function parseCustomSigner(string) {
    var values = string.split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/).map(_trim);
    try {
        var authName = values[0];
        var pathString = values[1];
        var CustomSigner = require(path.resolve(pathString));
        var authObj = {};
        authObj[authName] = new CustomSigner(authName);
        return authObj;
    } catch (e) {
        logger.error('Error requiring the custom request signer: ', e);
    }
    return false;
}

function isFileArgument(argument) {
    return argument.charAt(0) === '@' ? true : false;
}

function parseFileArgument(file) {
    var fileContents = fs.readFileSync(file, 'utf8');
    logger.debug('file: ' + fileContents);
    return fileContents;
}

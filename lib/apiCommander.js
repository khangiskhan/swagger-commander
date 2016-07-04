/*
 * Copyright (c) 2015-2016 Khang Nguyen
 * MIT Licensed
 */

var commander = require('commander');
var _         = require('underscore');
var chalk     = require('chalk');
var logger;

function init(log) {
    logger = log;
}

function setupParentcommand(processArgs, apis) {
    _.each(apis, function (api, apiKey) {
        // Ignore the help apiKey returned by SwaggerClient
        if (apiKey !== 'help') {
            createCommandForApi(api, apiKey);
        }
    });

    commander
        .usage('[parent-command] [options]');

    commander.on('--help', function () {
        console.log('  Config:');
        console.log();
        console.log('    to point swagger-commander to a different swagger file URL:');
        console.log(chalk.blue('       swagger-commander set-swagger-url <url>'));
    });

    // Use our customHelp when -h/--help is used
    commander.outputHelp = commander.outputHelp.bind(commander, customHelp);

    // *** We specify this option here, but it is handled in apiOperationCommander.js
    commander
        .option('-E, --expandOperations', 'Show detailed help for every sub-command under [parent-command]');

    commander.parse(processArgs);
    //console.log(chalk.green(splash.ascii) + '\n');
    commander.help(customHelp);
}
function createCommandForApi(apiObj, commandName) {
    var cmd,
        desc;

    cmd = commandName;
    desc = apiObj.description;

    var cmdObj =
        commander
            .command(cmd)
            .description(desc);

    return cmdObj;
}

function customHelp(originalHelp) {
    var reg = /Commands:/;
    return originalHelp.replace(reg, 'Parent-Commands (Resources):');
}

module.exports = {
    init: init,
    setupParentcommand: setupParentcommand
};

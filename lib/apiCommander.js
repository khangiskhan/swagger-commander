var commander = require('commander');
var _         = require('underscore');
var chalk     = require('chalk');
var splash    = require('./splash');
var logger;

function init(log) {
    logger = log;
}

function setupParentcommand(apis) {
    _.each(apis, function (api, apiKey) {
        // Ignore the help apiKey returned by SwaggerClient
        if (apiKey !== 'help') {
            createCommandForApi(api);
        }
    });

    // Use our customHelp when -h/--help is used
    commander.outputHelp = commander.outputHelp.bind(commander, customHelp);

    commander.parse(process.argv);
    console.log(chalk.green(splash.ascii) + '\n');
    commander.help(customHelp);
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

function customHelp(originalHelp) {
    var reg = /Commands:/;
    return originalHelp.replace(reg, 'Parent-Commands (Resources):');
}

module.exports = {
    init: init,
    setupParentcommand: setupParentcommand
};

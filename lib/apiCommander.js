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
        if (apiKey !== 'help') {
            createCommandForApi(api);
        }
    });

    commander.parse(process.argv);
    console.log(chalk.green(splash.ascii) + '\n');
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

module.exports = {
    init: init,
    setupParentcommand: setupParentcommand
};

var commander = require('commander');
var _ = require('underscore');
var logger;

function init(log) {
    logger = log;
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

module.exports = {
    init: init,
    setupParentcommand: setupParentcommand
};

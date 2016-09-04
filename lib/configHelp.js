var chalk     = require('chalk');

module.exports = function showConfigHelp() {
    console.log('  Config:');
    console.log();
    console.log('    to point swagger-commander to a different swagger file URL:');
    console.log(chalk.blue('       swagger-commander set-swagger-url <url>'));
}
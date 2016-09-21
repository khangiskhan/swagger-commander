/*global describe, it, before*/
/*jshint -W079, expr:true */
var chai = require('chai'),
    expect = chai.expect,
    fs = require('fs'),
    exec = require('child_process').exec;

var petOutput = fs.readFileSync(__dirname + '/data/petOutput.txt', 'utf8');
var petGetPetByIdHelp = fs.readFileSync(__dirname + '/data/petGetPetByIdHelp.txt', 'utf8');
//var swagSpecURL = 'http://petstore.swagger.io/v2/swagger.json';
describe('Test apiOperationCommander commands', function () {
    before('test', function (done) {
        done();
    });

    it('should show pet overview', function (done) {
        var cmd = __dirname + '/../../index.js pet';
        exec(cmd, function (error, stdout, stderr) {
            expect(stdout).to.be.defined;
            expect(error).to.be.null;
            expect(stderr).to.be.equal('');
            expect(stdout.trim()).to.equal(petOutput.trim());
            done();
        });
    });

    it('should show pet getPetById help', function (done) {
        var cmd = __dirname + '/../../index.js pet getPetById -h';
        exec(cmd, function (error, stdout, stderr) {
            expect(stdout).to.be.defined;
            expect(error).to.be.null;
            expect(stderr).to.be.equal('');
            expect(stdout.trim()).to.equal(petGetPetByIdHelp.trim());
            done();
        });
    });

    it('should add the pet', function (done) {
        var cmd = __dirname + '/../../index.js pet addPet \'{"name": "Weasley"}\'';
        exec(cmd, function (error, stdout, stderr) {
            expect(stdout).to.be.defined;
            expect(error).to.be.null;
            expect(stderr).to.be.equal('');
            expect(stdout.match(/status: 200/g)).to.have.length(1);
            // make sure name made it through
            expect(stdout.match(/"name":"Weasley"/g)).to.have.length(1);

            // get the pet that we just added
            var addedPetId = /"id":(\w+),/.exec(stdout)[1];
            var getByIdCmd = __dirname + '/../../index.js pet getPetById ' + addedPetId;
            exec(getByIdCmd, function (error, stdout, stderr) {
                expect(stdout).to.be.defined;
                expect(error).to.be.null;
                expect(stderr).to.be.equal('');
                expect(stdout.match(/status: 200/g)).to.have.length(1);
                expect(stdout.match(/"name":"Weasley"/g)).to.have.length(1);
                done();
            });
        });
    });

    it('should add the pet using @file argument', function (done) {
        var cmd = __dirname + '/../../index.js pet addPet @test/fvt/data/addPetArg.json';
        exec(cmd, function (error, stdout, stderr) {
            expect(stdout).to.be.defined;
            expect(error).to.be.null;
            expect(stderr).to.be.equal('');
            expect(stdout.match(/status: 200/g)).to.have.length(1);
            expect(stdout.match(/"name":"Weasley"/g)).to.have.length(1);

            // get the pet that we just added
            var addedPetId = /"id":(\w+),/.exec(stdout)[1];
            var getByIdCmd = __dirname + '/../../index.js pet getPetById ' + addedPetId;
            exec(getByIdCmd, function (error, stdout, stderr) {
                expect(stdout).to.be.defined;
                expect(error).to.be.null;
                expect(stderr).to.be.equal('');
                expect(stdout.match(/status: 200/g)).to.have.length(1);
                expect(stdout.match(/"name":"Weasley"/g)).to.have.length(1);
                done();
            });
        });
    });

});

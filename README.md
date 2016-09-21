# Swagger Commander
![Build Status](https://travis-ci.org/khangiskhan/swagger-commander.svg?branch=master)

Inspired by Swagger UI, Swagger Commander is a plug & play command-line (terminal, CLI, console, etc) tool to visualize and consume Swagger API's. Simply point the tool to a Swagger specification (file) URL and you can immediately view and consume your API endpoints.  Under the covers, swagger-commander uses swagger-client.

## Installation

Install globally as root:

    # npm install -g swagger-commander

On Ubuntu or Mac OS X systems install using sudo:

    $ sudo npm install -g swagger-commander

## Usage

Point swagger-commander to a Swagger spec (file) URL:

    $ swagger-commander set-swagger-url <url>
      example: swagger-commander set-swagger-url http://petstore.swagger.io/v2/swagger.json

* For a list of other Swagger specs for API's including Gmail, Instagram, & more, visit https://apis.guru/browse-apis/

Show available resources/commands for the Swagger API you just set

    $ swagger-commander -h

## Example using Swagger petstore demo

Show available sub-commands for the "pet" resource (output not shown)

    $ swagger-commander pet -h

Show detailed help for the "addPet" operation (output not shown)  

    $ swagger-commander pet addPet -h

Run the addPet operation (notice the JSON enclosed in single quotes)

    $ swagger-commander pet addPet '{"name":"Weasley", "status":"sold"}'
    info: status: 200
    info: data: {"id":1459973494707,"name":"Weasley","photoUrls":[],"tags":[],"status":"sold"}

Optionally use file as argument

    $ swagger-commander pet addPet @path/to/file/pet.json

Get the pet object you just created

    $ swagger-commander pet getPetById 1459973494707
    info: status: 200
    info: data: {"id":1459973494707,"name":"Weasley","photoUrls":[],"tags":[],"status":"sold"}

## Authorizations

One time auth using header key or password auth (more available through help commands):

    $ swagger-commander pet addPet {} -K "someHeaderAuth,nameOfHeader,someValue"
    $ swagger-commander pet addPet {} -W "somePasswordAuth,user_name,password"

Note the authorization nickname, such as <b>someHeaderAuth</b> and <b>somePasswordAuth</b> in the above example, must match the security requirement in the specification (see the <a href="https://github.com/OAI/OpenAPI-Specification/blob/master/README.md">OAI Specification</a> for details).

Store/save auth parameters:

    $ TODO coming soon

## Local swagger-commander config

By default, swagger-commander uses a global config file to run, but it will look in the current working directory for a file named "<b>.swagger-commander.json</b>" and use that instead.

##### Available config options for ".swagger-commander.json"
* "swagger_spec_url" - The full url to a Swagger spec.
* "auth" - A map of objects where the key matches the auth nickname defined in the Swagger spec, and the value is an auth object which varies depending on the type.  See examples/.swagger-commander.json for complete details.

.swagger-commander.json example:

    {
        "swagger_spec_url": "http://petstore.swagger.io/v2/swagger.json",
        "auth": {
            "somePasswordAuth": {
                "type": "password",
                "userName": "someUser",
                "password": "somePassword"
            },
            "api_key": {
                "type": "header",
                "nameOfHeader": "api_key",
                "value": "special-key"
            }
        }
    }

## Help

* JSON/Object arguments must be enclosed in single quotes and follow valid JSON rules (arguments enclosed in double quotes, etc)
* Array arguments are comma seperated strings (DO NOT include array brackets)

        $ swagger-commander pet findPetsByStatus "available, sold"

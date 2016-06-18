# Swagger Commander

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

## Help

* JSON/Object arguments must be enclosed in single quotes and follow valid JSON rules (arguments enclosed in double quotes, etc)
* Array arguments are comma seperated strings (DO NOT include array brackets)

        $ swagger-commander pet findPetsByStatus "available, sold"

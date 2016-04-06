# Swagger Commander

Inspired by Swagger UI, Swagger Commander is a plug & play command-line/terminal/CLI tool to visualize and consume Swagger API's. Simply point the tool to a Swagger specification (file) URL and you can immediately view and consume your API endpoints.

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


/*jslint node:true, sloppy:false, nomen:true*/
"use strict";

var path = require('path');
var nconf = require('nconf');
var nval = require('nconf-validator')(nconf);

//
// Setup custom nconf provider to use:
//   1. Non-changable vars
//   2. Command-line arguments
//   3. Environment vars
//   4. External source (will be added later)
//   5. Default values
//
var config = new nconf.Provider({
  stores: [
    {
      "name": "overrides",
      "type": "literal",
      "app": {
        "id": "myapp",
        "name": "My App!"
      }
    },
    {
      "name": "command-line",
      "type": "argv",
      "app:env": {
        "describe": "The applicaton environment",
        "type": "string"
      }
    },
    {
      "name": "environment",
      "type": "env",
      "whitelist": ["app:env", "server:ip", "server:port", "db:host", "db:port", "db:user", "db:password"]
    },
    {
      "name": "external",
      "type": "literal"
    },
    {
      "name": "defaults",
      "type": "literal",
      "app": {
        "env": "development"
      }
    }
  ]
});

//
// Setup nconf-validator to perform following checks:
//   1. app:env - one of the string in "development", "production", "test"
//
config.addRule("app:env", ["development", "production", "test"]);

//
// Run validation on `config`
//
nval.validate(config);

// 
// Load environment dependent configuration
// 
var file = path.join(__dirname, 'config', config.get('app:env') + '.json');
config.use('external', {type: 'file', file: file});

//
// Setup nconf-validator to perform some more checks:
//   2. server:ip - a valid IP address
//   3. server:port - a valid port number
//   4. db:host - a valid domain name
//   5. db:port - a valid port number
//   6. db:user - a custom check
//   7. db:password - a custom check
//
config.addRule("server:ip", "ip");
config.addRule("server:port", "port");
config.addRule("db:host", "fqdn");
config.addRule("db:port", "port");
config.addRule("db:user", function (x) { return x.length > 0 && x.length < 16; });
config.addRule("db:password", function (x) { return x.length > 0; });

//
// Run validation on `config` again!
//
nval.validate(config);

module.exports = nconf;

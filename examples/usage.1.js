/*jslint node:true, sloppy:false, nomen:true*/
"use strict";

var path = require('path');
var nconf = require('nconf');
var nval = require('nconf-validator')(nconf);

//
// Setup nconf (default) to use:
//   1. Command-line arguments
//   2. Default values
//
nconf.argv()
     .defaults({app_ip: "120.0.0.1", app_port: 3000});

//
// Setup nconf-validator to perform following checks:
//   1. app_ip: a valid IP address
//   2. app_port: a valid port number
//
nval.addRule("app_ip", "ip");
nval.addRule("app_port", "port");

//
// Run validation on `nval`
//
nval.validate();

module.exports = nconf;

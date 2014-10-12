var validator = require("validator"),
    util = require('util');


// 
// Globals
// 

// Supported builtin checks
var BUILTINS = [Object, Array, String, Number, Boolean];
var BOOL_VALUES = {true: ["true", "1", "yes"], false: ["false", "0", "no"]};
var ERRMSG = {"MAX_LEN": 15, "TRIM_LEN_2": 4, "TRIM_STR": "..."};
var ARRAY_REGEX = (function() {
  // REF: Simplified version of http://stackoverflow.com/a/8497474/155813
  var reNotQuoted = /[^,'"\\]+(\\.[^,'"\\]*)*/.source,
    reSingleQuoted = /'[^'\\]*(\\\S[^'\\]*)*'/.source,
    reDoubleQuoted = /"[^"\\]*(\\\S[^"\\]*)*"/.source,
    reValue = "\\s*(?:(" + reNotQuoted + ")|(" + reSingleQuoted + ")|(" + reDoubleQuoted + "))\\s*",
    reCSV = reValue + "(?:," + reValue + ")+",
    re = "^(?:(?:" + reCSV + ")|(?:\\[" + reCSV + "\\]))$";
  return new RegExp(re);
})();
var DEFAULT_CLAIM = "a valid value";

// Check if given value is a string
function isString(value) {
  return (typeof value === 'string') || (value instanceof String);
}

// Check if given value is an object
function isObject(value, nullIsObject) {
  var result = (typeof value === 'object') || (value instanceof Object);
  return (nullIsObject || value !== null) && result;
}

// An exception to be raised when validation fails
var ValidatorError = function(value, claim, key) {
  Error.captureStackTrace(this, this);
  this.name = 'ValidatorError';
  this.key = isString(key) ? key : '';
  this.value = value;
  this.claim = claim;
  Object.defineProperty(this, 'message', {
    enumerable: true,
    configurable: true,
    get: function() {
      var x = this.value;
      if (!isString(x)) {
        x = JSON.stringify(x);
      }
      if (x.length > ERRMSG.MAX_LEN) { 
        x = x.substr(0, ERRMSG.TRIM_LEN_2) + ERRMSG.TRIM_STR + x.substr(-ERRMSG.TRIM_LEN_2);
      }
      return "'" + this.key + "' must be " + this.claim + " (Current value: " + x + ")";
    }
  });
};
util.inherits(ValidatorError, Error);

// Raise ValidatorError if `isValid` is falsy
function check(value, claim, isValid) {
  if (!claim) {
    claim = DEFAULT_CLAIM;
  }
  // console.log("Checking if " + value + " is " + claim);
  if (!isValid) {
    throw new ValidatorError(value, claim);
  }
}


// 
// Predefined checks
// 

// Simple predefined checks.
// These are accessible to users by key names.
var simpleChecks = {
  "*": function(x) { },
  int: function(x) {
    check(x, "an integer", validator.isInt(x));
  },
  nat: function(x) {
    check(x, "a positive integer", validator.isInt(x, 0));
  },
  port: function(x) {
    check(x, "within range 0 - 65535", validator.isInt(x, 0, 65535));
  },
  fqdn: function(x) {
    check(x, "a domain name", validator.isFQDN(x));
  },
  url: function(x) {
    check(x, "a URL", validator.isURL(x));
  },
  email: function(x) {
    check(x, "an email address", validator.isEmail(x));
  },
  ip: function(x) {
    check(x, "an IP address", validator.isIP(x));
  },
  ipv4: function(x) {
    check(x, "an IPv4 address", validator.isIP(x, 4));
  },
  ipv6: function(x) {
    check(x, "an IPv6 address", validator.isIP(x, 6));
  },
  uuid: function(x) {
    check(x, "a UUID", validator.isUUID(x));
  },
  uuid3: function(x) {
    check(x, "a version 3 UUID", validator.isUUID(x, 3));
  },
  uuid4: function(x) {
    check(x, "a version 4 UUID", validator.isUUID(x, 4));
  },
  uuid5: function(x) {
    check(x, "a version 5 UUID", validator.isUUID(x, 5));
  },
  duration: function(x) {
    check(x, "a positive integer", validator.isInt(x, 0));
  },
  timestamp: function(x) {
    check(x, "a positive integer", validator.isInt(x, 0));
  },
  date: function(x) {
    check(x, "a date", validator.isDate(x));
  },
  isbn: function(x) {
    check(x, "a book number", validator.isISBN(x));
  },
  json: function(x) {
    check(x, "a JSON object", validator.isJSON(x));
  }
};

// Checks to be performed when a builtin 
// function is passed as a check. 
var manualTypeChecks = {
  "Object": function(x) {
    if (isString(x)) {
      try {
        JSON.parse(x);
        return true;
      } catch (err) {
        return false;
      }
    }
    return isObject(x);
  },
  "Array": function(x) {
    if (isString(x)) {
      return ARRAY_REGEX.test(x.trim());
    }
    return Array.isArray(x);
  },
  "String": function(x) {
    return isString(x);
  },
  "Number": function(x) {
    return !Array.isArray(x) && (x - parseFloat(x) + 1) >= 0;
  },
  "Boolean": function(x) {
    if (!isString(x)) {
      x = JSON.stringify(x);
    }
    x = x.toLowerCase();
    return (BOOL_VALUES[false].indexOf(x) >= 0 || BOOL_VALUES[true].indexOf(x) >= 0);
  }
};

// Checks to be performed in specific situations.
// These are not directly exposed to users.
var manualChecks = {
  containsCheck: function(options, x) {
    check(x, "one of the possible values: " + options.join(","), validator.isIn(x, options));
  },
  typeCheck: function(fn, x) {
    var name = fn.name;
    check(x, "an instance of type " + name, manualTypeChecks[name](x));
  },
  customCheck: function(fn, x) {
    check(x, DEFAULT_CLAIM, fn(x));
  }
};

// Aliases
simpleChecks.domain = simpleChecks.fqdn;
simpleChecks.ipaddress = simpleChecks.ip;
simpleChecks.integer = simpleChecks.int;

// Map user given check to a function that can be 
//   directly called to validate given value.
// This function is not exposed to users.
function getCheck(check) {
  var checkFn;

  if (BUILTINS.indexOf(check) >= 0) {
    // if `check` is a built-in JavaScript constructor,
    // check that the value is of that type
    checkFn = manualChecks.typeCheck.bind(null, check);

  } else if (typeof check === "string") {
    // store declared type
    if (!simpleChecks[check]) {
      throw new Error("unknown check: " + check);
    }
    // use a format check
    checkFn = simpleChecks[check];

  } else if (Array.isArray(check)) {
    // check that the value is a valid option
    checkFn = manualChecks.containsCheck.bind(null, check);

  } else if (typeof check === "function") {
    // user given `check` function
    checkFn = manualChecks.customCheck.bind(null, check);

  } else {
    // invalid `check`
    throw new Error("`check` must be a function or a known check string.");
  }

  return checkFn;
}


// 
// A class to manage user given checks.
// 

// Constructor
var NConfValidator = function (config) {
  this.rules = {};
  this.config = config;
};

// Add new check for given key to this validator.
NConfValidator.prototype.addRule = function addRule (key, check) {
  if (typeof this.rules[key] === "undefined") {
    this.rules[key] = [];
  }
  this.rules[key].push(check);
}

// Clear all checks for given key from this validator.
// If no key is given, clear all checks from this validator.
NConfValidator.prototype.clearRules = function clearRules (key) {
  if (typeof key === "undefined") {
    this.rules = {};
  } else {
    delete this.rules[key];
  }
}

// Perform validation for all rules on given config.
// If no config is given, perform validation on default nconf.
NConfValidator.prototype.validate = function validate (config, silent) {
  var rules = this.rules;
  var errors = [];
  if (arguments.length === 0) {
    config = this.config;
  }
  Object.keys(rules).forEach(function (key) {
    var checks = rules[key];
    var value = config.get(key);
    checks.forEach(function (check) {
      var checkFn = getCheck(check);
      try {
        checkFn(value);
      } catch (err) {
        if (!err.key) {
          err.key = key;
        }
        if (!silent) {
          throw err;
        }
        errors.push(err);
      }
    });
  }.bind(this));
  return errors;
}


// 
// Module exports
// 

// For quick use
module.exports = function (nconf) {
  return new NConfValidator(nconf);
};

module.exports.ValidatorError = ValidatorError;
module.exports.NConfValidator = NConfValidator;

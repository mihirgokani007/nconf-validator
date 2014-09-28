var check = require("validator").check;

var NConfValidator = (function () {

  var BUILT_INS = [Object, Array, String, Number, Boolean];

  // Simple predefined checks.
  // These are accessible to users by key names.
  var formatChecks = {
    "*": function() { },
    int: function(x) {
      check(x, "must be an integer").isInt();
    },
    nat: function(x) {
      check(x, "must be a positive integer").isInt().min(0);
    },
    port: function(x) {
      check(x, "must be within range 0 - 65535").isInt().min(0).max(65535);
    },
    fqdn: function(x) {
      check(x, "must be a domain name").isFQDN();
    },
    url: function(x) {
      check(x, "must be a URL").isUrl();
    },
    email: function(x) {
      check(x, "must be an email address").isEmail();
    },
    ip: function(x) {
      check(x, "must be an IP address").isIP();
    },
    ipv4: function(x) {
      check(x, "must be an IPv4 address").isIPv4();
    },
    ipv6: function(x) {
      check(x, "must be an IPv6 address").isIPv6();
    },
    uuid: function(x) {
      check(x, "must be a UUID").isUUID();
    },
    uuid3: function(x) {
      check(x, "must be a version 3 UUID").isUUID(3);
    },
    uuid4: function(x) {
      check(x, "must be a version 4 UUID").isUUID(4);
    },
    uuid5: function(x) {
      check(x, "must be a version 5 UUID").isUUID(5);
    },
    duration: function(x) {
      check(x, "must be a positive integer").isInt().min(0);
    },
    timestamp: function(x) {
      check(x, "must be a positive integer").isInt().min(0);
    },
    date: function(x) {
      check(x, "must be a date").isDate();
    },
    isbn: function(x) {
      check(x, "must be a book number").isISBN();
    },
    json: function(x) {
      check(x, "must be a JSON string").isJSON();
    }
  };

  // Checks to be performed in specific situations.
  // These are not directly exposed to users.
  var manualChecks = {
    containsCheck: function(options, x) {
      check(x, "must be one of the possible values: " + JSON.stringify(options)).isIn(options);
    },
    typeCheck: function(fn, x) {
      check(Object.prototype.toString.call(x), "must be of type " + fn.name)
        .equals(Object.prototype.toString.call(new fn()));
    }
  };

  // Aliases
  formatChecks.domain = formatChecks.fqdn;
  formatChecks.ipaddress = formatChecks.ip;
  formatChecks.integer = formatChecks.int;

  // Map user given check to a function that can be 
  //   directly called to validate given value.
  // This function is not exposed to users.
  function fn (check) {
    var checkFn;

    if (BUILT_INS.indexOf(check) >= 0) {
      // if `check` is a built-in JavaScript constructor,
      // check that the value is of that type
      checkFn = manualChecks.typeCheck.bind(null);

    } else if (typeof check === "string") {
      // store declared type
      if (!formatChecks[check]) {
        throw new Error("unknown check: " + check);
      }
      // use a format check
      checkFn = formatChecks[check];

    } else if (Array.isArray(check)) {
      // check that the value is a valid option
      checkFn = manualChecks.containsCheck.bind(null, check);

    } else if (typeof check === "function") {
      checkFn = check;

    } else {
      throw new Error("`check` must be a function or a known check string.");
    }

    return checkFn;
  }

  // A class to manage user given checks.
  var Validator = function (config) {
    this.rules = {};
    this.config = config;
  };

  // Add new check for given key to this validator.
  Validator.prototype.addRule = function addRule (key, check) {
    if (typeof this.rules[key] === "undefined") {
      this.rules[key] = [];
    }
    this.rules[key].push(check);
  }

  // Clear all checks for given key from this validator.
  // If no key is given, clear all checks from this validator.
  Validator.prototype.clearRules = function clearRules (key) {
    if (typeof key === "undefined") {
      this.rules = {};
    } else {
      delete this.rules[key];
    }
  }

  // Perform validation for all rules on given config.
  // If no config is given, perform validation on default nconf.
  Validator.prototype.validate = function validate (config) {
    var rules = this.rules;
    if (arguments.length === 0) {
      config = this.config;
    }
    Object.keys(rules).forEach(function (key) {
      var checks = rules[key];
      var value = config.get(key);
      checks.forEach(function (check) {
        var checkFn = fn(check);
        checkFn(value);
      });
    });
  }

  return Validator;

})();

module.exports = function (nconf) {
  var validator = new NConfValidator(nconf);
  nconf.Provider.prototype.validator = validator;
  return validator;
};

module.exports.NConfValidator = NConfValidator;


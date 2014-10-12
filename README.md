# nconf-validator

Validation plugin for [nconf][0]


## Installation

### Installing npm (node package manager)
``` bash
  $ curl http://npmjs.org/install.sh | sh
```

### Installing nconf
``` bash
  $ [sudo] npm install nconf
```

### Installing nconf-validator
``` bash
  $ [sudo] npm install nconf-validator
```


## Usage
Following is a basic usage of the plugin. See the [`examples`](examples) directory for more usage examples.

### Require
Since `nconf-validator` is a [`nconf`][0] plugin, `nconf` must be loaded prior to `nconf-validator` and its reference must be passed as a required argument. So to use `nconf-validator`, the code looks something like this:
```js
var nconf = require('nconf');
var nval = require('nconf-validator')(nconf);
```

### Add rules
To add validation rules, [`NConfValidator#addRule()`](#nconfvalidator-addrule) method can be used as follows:
```js
nval.addRule("app_ip", "ip");
nval.addRule("app_port", "port");
```
The above lines setup nconf-validator to perform following checks:
  1. `app_ip`: a valid IP address
  2. `app_port`: a valid port number

### Validate
Finally run validation on `nval`
```js
nval.validate();
```
Note that [`NConfValidator#validate()`](#nconfvalidator-validate) method is never called automatically. It must be called manually when one or more config values change and needs to be validated.


## API

### `NConfValidator`

It is the main validator class for instantiating new instance of the validator. The signature of this class is as follows:
```js
NConfValidator(<config?>);
```

While instantiating you provide reference to an instance of `nconf.Provider`, which will be used when no provider is specified to the [`NConfValidator#validate()`](#nconfvalidator-validate) method (will be explained later). Following snippet shows how to create a new instance of [`NConfValidator`](#nconfvalidator) in common scenarios:
```js
var nconf = require('nconf');
var validator = require('nconf-validator');

var config = new nconf.Provider({
    // Provider configuration
});

var nval = new validator.NConfValidator(config);

// Use `nval` properties as described in their respective sections. 
// `nval.addRule( ... )`
// `nval.validate( ... )`

```

As a convenience, you can directly call `validator` passing the reference to the default nconf provider.
```js
var nconf = require('nconf');
var nval = require('nconf-validator')(nconf);

// Use `nval` properties as described in their respective sections. 
// `nval.addRule( ... )`
// `nval.validate( ... )`

```


### `NConfValidator#addRule()`

Add validation rules to the validator. The signature of this function is as follows:
```js
addRule(<prop>, <rule>);
```
* `prop`
  It is a config property to be validated. This is specified in the same format as expected by `nconf.get()`. See the documentation of `nconf.get()` for more details.

* `rule`
  Specifies a validation rule for the given property. You can add multiple rules for a single property by calling [`NConfValidator#addRule()`](#nconfvalidator-addrule) multiple times with same `prop` value, in which case all the rules are validated. A rule can be one of the following:

  1. A predefined format string
    There are several predefined formats for validation that you can use, most of which are self-explanatory:
    * `*` - any value is valid
    * `int` - integer
    * `nat` - positive integer (natural number)
    * `port` - positive integer (0 - 65535)
    * `fqdn`, `domain` - fully qualified domain name
    * `url` - valid URL
    * `email` - valid email address
    * `ipv4`, `ip`, `ipaddress` - IPv4 addresses
    * `ipv6` - IPv6 addresses
    * `uuid` - Any UUID
    * `uuid3`, `uuid4`, `uuid5` - UUID v3, v4, and v5, respectively
    * `duration` - positive integer (milliseconds)
    * `timestamp` - positive integer (Unix timestamps)
    * `date` - date as understood by javascript `Date.parse()`
    * `isbn` - international standard book number
    * `json`, `object` - javascript object literal

  2. An array of values
    If given rule is an instance of an Array, it is considered as an enumeration of valid values. For example, the following rule checks that the value of `some:prop` is one of `a`, `b`, and `c`:
    ```js
    someValidator.addRule('some:prop', ['a', 'b', 'c'])
    ```
    Note that it is recommended to use only strings as array items when `argv` or `env` sources are used.

  3. A built-in javascript type
    If `format` is set to one of the built-in JavaScript constructors, `Object`, `Array`, `String`, `Number`, or `Boolean`, only the validation will check that the setting is of that type. For example, following rule could be added to check that the value of `some:prop` is a valid boolean expression (there's a reason it is called *expression* and not just boolean value):
    ```js
    someValidator.addRule('some:prop', Boolean)
    ```

    Many times, when the value is read from environment or command line, it is only available as a string. So best efforts are made to check that given expression (string representation of the object) can be transformed to an instance of the type to be checked. 

    Following listing shows valid expressions for each of the builtin types:
    * `String` - Any valid string.
    * `Number` - Any numeric value, e.g. 42, -1, 3.14
    * `Boolean` - One of `true`, `yes`, `1`, `false`, `no`, `0`. The comparison is case independent.
    * `Object` - A JSON representation.
    * `Array` - A comma separated values (may or may not be enclosed in square brackets). Quotation marks can be used to group values, e.g. [val1, "value 2", "values 3,4, and 5"]. Note that on some platforms quotation marks are automatically removed, so you must escape quotation marks if you want to pass them to `nconf-validator`.

  4. A user-given function
    You can also provide your own format checking function. For example, following shows a custom check which passes only when value of `some:prop` is of length 10:
    ```js
    someValidator.addRule('some:prop', function(x) { return x.length === 10; })
    ```
    A custom check function receives a value to be validated and it must return truthy or falsy value to indicate whether or not value is valid.


### `NConfValidator#validate()`

Perform validation with given rules registered with the validator. The rules are validated in the sequence they were added. The signature of this function is as follows:
```js
validate(<conf?>, <silent?>);
```
* `conf`
  The `conf` argument must be an instance of `nconf.Provider`. It is optional if you've specified the value of the default `nconf` while creating instance of [`NConfValidator`](#nconfvalidator). However if both are specified, the `conf` provided to the [`NConfValidator#validate()`](#nconfvalidator-validate) method will take precedence. Note that this precedence does not form a configuration hierarchy. So if some key `K` is present in the config you've provided while creating instance of [`NConfValidator`](#nconfvalidator), but not in the config provided to the [`NConfValidator#validate()`](#nconfvalidator-validate) method, it'll not be present while validating.

* `silent`
  An optional `silent` argument controls whether exception is thrown (if truthy) or errors are returned to the caller (if falsy). In the later case, a list of all validation errors are returned, or an empty list if there are no errors. Each item in this list is a [`ValidatorError`](#validatorerror) object. However if `silent` is not given or evaluates to `false`, only the first validation error (again an instance of [`ValidatorError`](#validatorerror)) is thrown.


### `ValidatorError`

This class is used to instantiate objects which are thrown or returned from the [`NConfValidator#validate()`](#nconfvalidator-validate) method. It inherits from the builtin `Error` class and has following properties:
* `value`
  The value which was validated but turned out to be invalid.
* `claim`
  A string describing the format that was expected (e.g. "a positive integer").
* `key`
  Name of the property which was validated.
* `name`
  A constant string `"ValidatorError"` - the name of this function.
* `message`
  A dynamic property that gives a properly formatted error message containing the above properties. This cannot be set, but you may override the [`ValidatorError`](#validatorerror) to provide your own implementation of its properties.

If you may need this for your own purpose, the signature of this class is as follows:
```js
ValidatorError(<value>, <claim>, <key?>);
```
where `value`, `claim`, and `key` are as explained above.


## End Matter

### Afterword

While comparing `nconf` with [`convict`][2], I felt both of these awesome libraries were lacking some essential features that was available in the other. `nconf` was very easy to extend, so I made this little `nconf` plugin to add validation which was available in the other library.

### Author

[Mihir Gokani][1]


[0]: https://github.com/indexzero/nconf
[1]: https://github.com/mihirgokani007
[2]: https://github.com/mozilla/node-convict


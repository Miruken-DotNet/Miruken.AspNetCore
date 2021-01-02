define(['exports', '@miruken/core', 'validatejs'], function (exports, core, validatejs) { 'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var validatejs__default = /*#__PURE__*/_interopDefaultLegacy(validatejs);

    var constraintMetadataKey = Symbol("constraint-metadata");
    /**
     * Specifies validation constraints on properties and methods.
     * @method constraints
     */

    var constraint = core.Metadata.decorator(constraintMetadataKey, (target, key, descriptor, constraints) => {
      if (core.$isNothing(descriptor) || key === "constructor") {
        throw new SyntaxError("Constraints cannot be applied to classes or constructors.");
      }

      if (constraints.length === 0) return;
      var current = core.Metadata.getOrCreateOwn(constraintMetadataKey, target, key, () => ({}));
      constraints.forEach(constraint => _mergeConstraints(current, constraint));
    });
    var valid = constraint({
      nested: true
    });

    function _mergeConstraints(target, source) {
      Reflect.ownKeys(source).forEach(key => {
        var newValue = source[key],
            curValue = target[key];

        if (core.$isPlainObject(curValue) && !Array.isArray(curValue)) {
          _mergeConstraints(curValue, newValue);
        } else {
          target[key] = Array.isArray(newValue) ? newValue.slice() : newValue;
        }
      });
    }

    var validatorsCount = 0;
    var validators = validatejs__default['default'].validators;
    /**
     * Register custom validator with [validate.js](http://validatejs.org).
     * <pre>
     *    @customValidator
     *    class CustomValidators {
     *        static uniqueUserName(userName, @type(Database) db) {
     *            if (db.hasUserName(userName)) {
     *               return `UserName ${userName} is already taken`;
     *            }
     *        }
     *    })
     * </pre>
     * would register a uniqueUserName validator with a Database dependency.
     * @function customValidator
     */

    function customValidator(target) {
      if (arguments.length > 1) {
        throw new SyntaxError("@customValidator can only be applied to a class.");
      }

      var prototype = target.prototype;
      Reflect.ownKeys(prototype).forEach(key => {
        var descriptor = Object.getOwnPropertyDescriptor(prototype, key);

        if (_isCustomValidator(key, descriptor)) {
          _assignInstanceValidator(target, prototype, key, descriptor);
        }
      });
      Reflect.ownKeys(target).forEach(key => {
        var descriptor = Object.getOwnPropertyDescriptor(target, key);

        if (_isCustomValidator(key, descriptor)) {
          _assignStaticValidator(target, key, descriptor);
        }
      });
    }

    function _isCustomValidator(key, descriptor) {
      if (key === "constructor" || key.startsWith("_")) {
        return false;
      }

      var {
        value
      } = descriptor;
      return core.$isFunction(value) && value.length > 0;
    }

    function _assignStaticValidator(target, key, descriptor) {
      var _design$get;

      var designArgs = (_design$get = core.design.get(target, key)) == null ? void 0 : _design$get.args;

      if ((designArgs == null ? void 0 : designArgs.length) > 0) {
        var {
          value
        } = descriptor;

        descriptor.value = function (...args) {
          var composer = core.$composer;

          if (core.$isNothing(composer)) {
            throw new Error(`@customValidator on static method '${target.name}.${key}' not invoked properly.`);
          }

          if ((designArgs == null ? void 0 : designArgs.length) > 0) {
            var _deps = composer.$resolveArgs(designArgs);

            if (core.$isNothing(_deps)) {
              throw new Error(`One or more dependencies could not be resolved for method '${target.name}.${key}'.`);
            }

            return value.call(this, ..._deps, ...args);
          }

          return value.apply(this, deps);
        };
      }

      _assignCustomValidator(target, key, descriptor.value);
    }

    function _assignInstanceValidator(target, prototype, key, descriptor) {
      var _design$get2;

      var designArgs = (_design$get2 = core.design.get(prototype, key)) == null ? void 0 : _design$get2.args;

      descriptor.value = function (...args) {
        var composer = core.$composer;

        if (core.$isNothing(composer)) {
          throw new Error(`@customValidator on instance method '${target.name}.${key}' not invoked properly.`);
        }

        var validator = composer.resolve(target) || Reflect.construct(target, core.emptyArray);

        if ((designArgs == null ? void 0 : designArgs.length) > 0) {
          var _deps2 = composer.$resolveArgs(designArgs);

          if (core.$isNothing(_deps2)) {
            throw new Error(`One or more dependencies could not be resolved for method '${target.name}.${key}'.`);
          }

          return validator[key].call(validator, ..._deps2, ...args);
        }

        return validator[key].apply(validator, args);
      };

      _assignCustomValidator(target, key, descriptor.value);
    }

    function _assignCustomValidator(target, key, fn) {
      var tag = key;

      if (validators.hasOwnProperty(tag)) {
        tag = `${tag}-${validatorsCount++}`;
      }

      validators[tag] = fn;
      var method = target[key];

      target[key] = function (...args) {
        if (args.length === 3 && core.isDescriptor(args[2])) {
          return core.decorate((t, k, d, options) => constraint({
            [tag]: options
          })(t, k, d), args);
        }

        if (core.$isFunction(method)) {
          return method.apply(target, args);
        }
      };
    }

    var email = constraint({
      email: true
    });

    var _ = core.createKey();

    class ValidateProvider extends core.FilterSpecProvider {
      constructor({
        validateResult,
        validateAsync
      } = {}) {
        super(new core.FilterSpec(ValidateFilter));

        var _this = _(this);

        _this.validateResult = validateResult === true;
        _this.validateAsync = validateAsync === true;
      }

      get validateResult() {
        return _(this).validateResult;
      }

      get validateAsync() {
        return _(this).validateAsync;
      }

    }
    var validate = core.createFilterDecorator((target, key, descriptor, [options]) => {
      return new ValidateProvider(options);
    });

    var _$1 = core.createKey();
    /**
     * Identifies a validation failure.
     * @class ValidationError
     * @constructor
     * @param {ValidationResult}  results  -  validation results
     * @param {string}            message  -  message
     * @extends Error
     */


    class ValidationError extends Error {
      constructor(results, message) {
        super(message || "Validation error");
        _$1(this).results = results;

        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, this.constructor);
        }
      }

      get results() {
        return _$1(this).results;
      }

    }

    var _dec, _dec2, _dec3, _dec4, _class;
    var ValidateFilter = (_dec = core.allowMultiple(false), _dec2 = core.conformsTo(core.Filtering), _dec3 = core.provides(), _dec4 = core.singleton(), _dec(_class = _dec2(_class = _dec3(_class = _dec4(_class = class ValidateFilter {
      get order() {
        return core.Stage.Validation;
      }

      next(callback, {
        provider,
        composer,
        next,
        abort
      }) {
        if (!(provider instanceof ValidateProvider)) {
          return abort();
        }

        if (provider.validateAsync) {
          var _result = validateAsync(callback, composer).then(() => next());

          return provider.validateResult ? _result.then(resp => validateAsync(resp, composer)) : _result;
        }

        validateSync(callback, composer);
        var result = next();

        if (provider.validateResult) {
          if (core.$isPromise(result)) {
            return result.then(resp => validateSync(resp, composer));
          }

          validateSync(result, composer);
        }

        return result;
      }

    }) || _class) || _class) || _class) || _class);

    function validateSync(target, handler) {
      var results = handler.validate(target);

      if (!results.valid) {
        throw new ValidationError(results);
      }

      return target;
    }

    function validateAsync(target, handler) {
      if (core.$isNothing(target)) {
        return Promise.resolve();
      }

      return handler.validateAsync(target).then(results => {
        if (!results.valid) {
          throw new ValidationError(results);
        }

        return target;
      });
    }

    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }

      return obj;
    }

    function _initializerDefineProperty(target, property, descriptor, context) {
      if (!descriptor) return;
      Object.defineProperty(target, property, {
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
        writable: descriptor.writable,
        value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
      });
    }

    function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
      var desc = {};
      Object.keys(descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
      });
      desc.enumerable = !!desc.enumerable;
      desc.configurable = !!desc.configurable;

      if ('value' in desc || desc.initializer) {
        desc.writable = true;
      }

      desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
      }, desc);

      if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
      }

      if (desc.initializer === void 0) {
        Object.defineProperty(target, property, desc);
        desc = null;
      }

      return desc;
    }

    /**
     * Policy for validating instnces.
     * @property {Function} provides
     */

    var validates = core.ContravariantPolicy.createDecorator("validates");

    var _dec$1, _dec2$1, _class$1, _class2;
    validatejs__default['default'].Promise = Promise;
    validatejs__default['default'].validators.nested = core.Undefined;
    var detailed = {
      format: "detailed",
      cleanAttributes: false
    };
    /**
     * Handler for performing validation using [validate.js](http://validatejs.org)
     * <p>
     * Classes participate in validation by declaring specifying constraints on properties.
     * </p>
     * <pre>
     * class Address {
     *         @requried
     *         line:    "",
     *         @is.required
     *         city:    "",
     *         @length.is(2)
     *         @required
     *         state:   ""
     *         @length.is(5)
     *         @required
     *         zipcode:
     *     }
     * }
     * </pre>
     * @class ValidateJsHandler
     * @extends Handler
     */

    var ValidateJsHandler = (_dec$1 = core.provides(), _dec2$1 = core.singleton(), _dec$1(_class$1 = _dec2$1(_class$1 = (_class2 = class ValidateJsHandler extends core.Handler {
      validateJS(validation, {
        composer
      }) {
        var target = validation.object,
            nested = {},
            constraints = buildConstraints(target, nested, composer);

        if (constraints) {
          var scope = validation.scope,
              results = validation.results;

          if (validation.isAsync) {
            return composer.$compose(() => validatejs__default['default'].async(target, constraints, detailed)).then(valid => validateNestedAsync(composer, scope, results, nested)).catch(errors => {
              if (errors instanceof Error) {
                return Promise.reject(errors);
              }

              return validateNestedAsync(composer, scope, results, nested).then(() => mapResults(results, errors));
            });
          } else {
            var errors = composer.$compose(() => validatejs__default['default'](target, constraints, detailed));

            for (var key in nested) {
              var child = nested[key];

              if (Array.isArray(child)) {
                for (var i = 0; i < child.length; ++i) {
                  composer.validate(child[i], scope, results.addKey(key + "." + i));
                }
              } else {
                composer.validate(child, scope, results.addKey(key));
              }
            }

            mapResults(results, errors);
          }
        }
      }

    }, (_applyDecoratedDescriptor(_class2.prototype, "validateJS", [validates], Object.getOwnPropertyDescriptor(_class2.prototype, "validateJS"), _class2.prototype)), _class2)) || _class$1) || _class$1);

    function validateNestedAsync(composer, scope, results, nested) {
      var pending = [];

      for (var key in nested) {
        var child = nested[key];

        if (Array.isArray(child)) {
          for (var i = 0; i < child.length; ++i) {
            var childResults = results.addKey(key + "." + i);
            childResults = composer.validateAsync(child[i], scope, childResults);
            pending.push(childResults);
          }
        } else {
          var _childResults = results.addKey(key);

          _childResults = composer.validateAsync(child, scope, _childResults);
          pending.push(_childResults);
        }
      }

      return Promise.all(pending);
    }

    function mapResults(results, errors) {
      if (errors) {
        errors.forEach(error => results.addKey(error.attribute).addError(error.validator, {
          message: error.error,
          value: error.value
        }));
      }
    }

    function buildConstraints(target, nested, composer) {
      var constraints;
      constraint.getKeys(target, (criteria, key) => {
        (constraints || (constraints = {}))[key] = criteria;

        var _loop = function (name) {
          if (name === "nested") {
            var child = target[key];

            if (child) {
              nested[key] = child;
            }
          } else if (!(name in validatejs__default['default'].validators)) {
            validatejs__default['default'].validators[name] = function (...args) {
              var validator = composer.resolve(name);

              if (!validator) {
                throw new Error(`Unable to resolve validator '${name}'.`);
              }

              if (!core.$isFunction(validator.validate)) {
                throw new Error(`Validator '${name}' is missing 'validate' method.`);
              }

              return validator.validate(...args);
            };
          }
        };

        for (var name in criteria) {
          _loop(name);
        }
      });
      return constraints;
    }

    var _$2 = core.createKeyChain();
    /**
     * Captures structured validation errors.
     * @class ValidationResult
     * @constructor
     * @extends Base
     */


    class ValidationResult extends core.Base {
      /**
       * true if object is valid, false otherwisw.
       * @property {boolean} valid
       * @readOnly
       */
      get valid() {
        var {
          errors,
          summary
        } = _$2(this);

        if (errors || summary) {
          return false;
        }

        var ownKeys = Object.getOwnPropertyNames(this);

        for (var i = 0; i < ownKeys.length; ++i) {
          var key = ownKeys[i];

          if (_isReservedKey(key)) {
            continue;
          }

          var result = this[key];

          if (result instanceof ValidationResult && !result.valid) {
            return false;
          }
        }

        return true;
      }
      /**
       * Gets aggregated validation errors.
       * @property {Object} errors
       * @readOnly
       */


      get errors() {
        if (_$2(this).summary) {
          return _$2(this).summary;
        }

        var errors = _$2(this).errors;

        if (errors) {
          _$2(this).summary = {};

          for (var _name in errors) {
            _$2(this).summary[_name] = errors[_name].slice();
          }
        }

        var ownKeys = Object.getOwnPropertyNames(this);

        for (var i = 0; i < ownKeys.length; ++i) {
          var key = ownKeys[i];

          if (_isReservedKey(key)) {
            continue;
          }

          var result = this[key],
              keyErrors = result instanceof ValidationResult && result.errors;

          if (keyErrors) {
            _$2(this).summary = _$2(this).summary || {};

            for (name in keyErrors) {
              var named = keyErrors[name];

              var existing = _$2(this).summary[name];

              for (var ii = 0; ii < named.length; ++ii) {
                var error = core.pcopy(named[ii]);
                error.key = error.key ? key + "." + error.key : key;

                if (existing) {
                  existing.push(error);
                } else {
                  _$2(this).summary[name] = existing = [error];
                }
              }
            }
          }
        }

        return _$2(this).summary;
      }
      /**
       * Gets or adds validation results for the key.
       * @method addKey
       * @param  {string} key  -  property name
       * @results {ValidationResult} named validation results.
       */


      addKey(key) {
        return this[key] || (this[key] = new ValidationResult());
      }
      /**
       * Adds a named validation error.
       * @method addError
       * @param  {string}  name   -  validator name
       * @param  {Object}  error  -  literal error details
       * @example
       *     Standard Keys:
       *        key      => contains the invalid key
       *        message  => contains the error message
       *        value    => contains the invalid valid
       */


      addError(name, error) {
        var errors = _$2(this).errors || (_$2(this).errors = {}),
            named = errors[name];

        if (named) {
          named.push(error);
        } else {
          errors[name] = [error];
        }

        _$2(this).summary = null;
        return this;
      }
      /**
       * Clears all validation results.
       * @method reset
       * @returns {ValidationResult} receiving results
       * @chainable
       */


      reset() {
        delete _$2(this).errors;
        delete _$2(this).summary;
        var ownKeys = Object.getOwnPropertyNames(this);

        for (var i = 0; i < ownKeys.length; ++i) {
          var key = ownKeys[i];

          if (_isReservedKey(key)) {
            continue;
          }

          var result = this[key];

          if (result instanceof ValidationResult) {
            delete this[key];
          }
        }

        return this;
      }

    }
    var IGNORE = ["valid", "errors", "addKey", "addError", "reset"];

    function _isReservedKey(key) {
      return IGNORE.indexOf(key) >= 0;
    }

    var _dec$2, _class$2, _descriptor, _temp, _dec2$2, _dec3$1, _dec4$1, _dec5, _class3, _class4, _descriptor2, _temp2, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _class6, _class7;
    var ValidationErrorData = (_dec$2 = core.design([ValidationErrorData]), (_class$2 = (_temp = class ValidationErrorData {
      constructor(propertyName, errors, nested) {
        _defineProperty(this, "propertyName", void 0);

        _defineProperty(this, "errors", void 0);

        _initializerDefineProperty(this, "nested", _descriptor, this);

        this.propertyName = propertyName;
        this.errors = errors;
        this.nested = nested;
      }

    }, _temp), (_descriptor = _applyDecoratedDescriptor(_class$2.prototype, "nested", [_dec$2], {
      configurable: true,
      enumerable: true,
      writable: true,
      initializer: null
    })), _class$2));
    var ValidationErrorDataArray = (_dec2$2 = core.surrogate(ValidationError), _dec3$1 = core.typeId("Miruken.Validate.ValidationErrors[], Miruken.Validate"), _dec4$1 = core.property("$values"), _dec5 = core.design([ValidationErrorData]), _dec2$2(_class3 = _dec3$1(_class3 = (_class4 = (_temp2 = class ValidationErrorDataArray {
      constructor(errors) {
        _initializerDefineProperty(this, "errors", _descriptor2, this);

        this.errors = errors;
      }

    }, _temp2), (_descriptor2 = _applyDecoratedDescriptor(_class4.prototype, "errors", [_dec4$1, _dec5], {
      configurable: true,
      enumerable: true,
      writable: true,
      initializer: null
    })), _class4)) || _class3) || _class3);
    var ValidationMapping = (_dec6 = core.provides(), _dec7 = core.singleton(), _dec8 = core.formats(ValidationError), _dec9 = core.mapsFrom(ValidationErrorDataArray), _dec10 = core.formats(ValidationErrorDataArray), _dec11 = core.mapsFrom(ValidationError), _dec6(_class6 = _dec7(_class6 = (_class7 = class ValidationMapping extends core.Handler {
      mapToValidationErrorData({
        object: {
          errors
        }
      }) {
        return new ValidationError(createResults(errors));
      }

      mapToValidationError({
        object: {
          results
        }
      }) {
        return new ValidationErrorDataArray(createErrors(results));
      }

    }, (_applyDecoratedDescriptor(_class7.prototype, "mapToValidationErrorData", [_dec8, _dec9], Object.getOwnPropertyDescriptor(_class7.prototype, "mapToValidationErrorData"), _class7.prototype), _applyDecoratedDescriptor(_class7.prototype, "mapToValidationError", [_dec10, _dec11], Object.getOwnPropertyDescriptor(_class7.prototype, "mapToValidationError"), _class7.prototype)), _class7)) || _class6) || _class6);

    function createErrors(results) {
      return Object.getOwnPropertyNames(results).map(key => {
        var errorData = new ValidationErrorData(key),
            keyResults = results[key];
        var {
          errors
        } = keyResults;

        if (!core.$isNothing(errors)) {
          var messages = Object.values(errors).flatMap(details => details).filter(detail => core.$isNothing(detail.key)).map(detail => detail.message);

          if (messages.length > 0) {
            errorData.errors = messages;
          }
        }

        var nested = createErrors(keyResults);

        if (nested.length > 0) {
          errorData.nested = nested;
        }

        return errorData;
      });
    }

    function createResults(errors, owner) {
      var results = owner || new ValidationResult();
      errors == null ? void 0 : errors.forEach(error => {
        var {
          propertyName,
          errors,
          nested
        } = error,
            keyResults = results.addKey(propertyName);
        errors == null ? void 0 : errors.forEach(message => keyResults.addError("server", {
          message
        }));

        if ((nested == null ? void 0 : nested.length) > 0) {
          createResults(nested, keyResults);
        }
      });
      return results;
    }

    var _$3 = core.createKeyChain();
    /**
     * Callback representing the validation of an object.
     * @class Validation
     * @constructor
     * @param   {Object}    object  -  object to validate
     * @param   {boolean}   async   -  true if validate asynchronously
     * @param   {Any}       scope   -  scope of validation
     * @param   {ValidationResult} results  -  results to validate to
     * @extends Base
     */


    var Validation = core.Base.extend(core.CallbackControl, {
      constructor(object, async, scope, results) {
        var _this = _$3(this);

        _this.object = object;
        _this.async = !!async;
        _this.scope = scope;
        _this.results = results || new ValidationResult();
        _this.promises = [];
      },

      get isAsync() {
        return _$3(this).async;
      },

      get object() {
        return _$3(this).object;
      },

      get scope() {
        return _$3(this).scope;
      },

      get results() {
        return _$3(this).results;
      },

      get callbackPolicy() {
        return validates.policy;
      },

      get callbackResult() {
        if (_$3(this).result === undefined) {
          var {
            results,
            promises
          } = _$3(this);

          _$3(this).result = promises.length > 0 ? Promise.all(promises).then(res => results) : this.isAsync ? Promise.resolve(results) : results;
        }

        return _$3(this).result;
      },

      set callbackResult(value) {
        _$3(this).result = value;
      },

      addAsyncResult(result) {
        if (core.$isPromise(result)) {
          if (!this.isAsync) return false;

          _$3(this).promises.push(result);
        }

        _$3(this).result = undefined;
      },

      dispatch(handler, greedy, composer) {
        var target = this.object,
            source = core.$classOf(target);
        if (core.$isNothing(source)) return false;
        validates.dispatch(handler, this, this, source, composer, true, this.addAsyncResult.bind(this));
        return true;
      },

      toString() {
        var scope = this.scope != null ? ` scope '${String(this.scope)}'` : "";
        return `Validation | ${this.object}${scope}`;
      }

    });

    var validateThatMetadataKey = Symbol("validate-that-metadata");
    /**
     * Marks method as providing contextual validation.
     * @method validateThat
     */

    var validateThat = core.Metadata.decorator(validateThatMetadataKey, (target, key, descriptor) => {
      var _design$get;

      if (core.$isNothing(descriptor)) {
        throw new SyntaxError("@validateThat cannot be applied to classes.");
      }

      if (key === "constructor") {
        throw new SyntaxError("@validateThat cannot be applied to constructors.");
      }

      var {
        value
      } = descriptor;

      if (!core.$isFunction(value)) {
        throw new SyntaxError("@validateThat can only be applied to methods.");
      }

      core.Metadata.getOrCreateOwn(validateThatMetadataKey, target, key, core.True);
      var args = (_design$get = core.design.get(target, key)) == null ? void 0 : _design$get.args;

      if (args && args.length > 0) {
        descriptor.value = function (validation, composer) {
          var deps = composer.$resolveArgs(args);

          if (core.$isNothing(deps)) {
            throw new Error("One or more dependencies could not be resolved.");
          }

          if (args.length > 0) {
            var index = 0;

            for (var i = 0; i < args.length && index < 2; ++i) {
              if (core.$isNothing(args[i])) {
                deps[i] = arguments[index++];
              }
            }
          }

          return value.apply(this, deps);
        };
      }
    });

    core.Handler.implement({
      /**
       * Validates the object in the scope.
       * @method validate 
       * @param   {Object} object     -  object to validate
       * @param   {Object} scope      -  scope of validation
       * @param   {Object} [results]  -  validation results
       * @returns {ValidationResult}  validation results.
       * @for Handler
       */
      validate(object, scope, results) {
        if (core.$isNothing(object)) {
          throw new TypeError("Missing object to validate.");
        }

        var validation = new Validation(object, false, scope, results);
        this.handle(validation, true);
        results = validation.results;

        _bindValidationResults(object, results);

        _validateThat(validation, null, this);

        return results;
      },

      /**
       * Validates the object asynchronously in the scope.
       * @method validateAsync
       * @param   {Object} object     - object to validate
       * @param   {Object} scope      - scope of validation
       * @param   {Object} [results]  - validation results
       * @returns {Promise} promise of validation results.
       * @async
       */
      validateAsync(object, scope, results) {
        if (core.$isNothing(object)) {
          throw new TypeError("Missing object to validate.");
        }

        var validation = new Validation(object, true, scope, results);
        this.handle(validation, true);
        return Promise.resolve(validation.callbackResult).then(() => {
          results = validation.results;

          _bindValidationResults(object, results);

          var asyncResults = [];

          _validateThat(validation, asyncResults, this);

          return asyncResults.length > 0 ? Promise.all(asyncResults).then(() => results) : results;
        });
      },

      $valid(target, scope) {
        return this.$aspect((_, composer) => composer.validate(target, scope).valid);
      },

      $validAsync(target, scope) {
        return this.$aspect((_, composer) => composer.validateAsync(target, scope).then(results => results.valid));
      }

    });

    function _validateThat(validation, asyncResults, composer) {
      var object = validation.object;
      validateThat.getKeys(object, (_, key) => {
        var validator = object[key],
            returnValue = validator.call(object, validation, composer);

        if (asyncResults && core.$isPromise(returnValue)) {
          asyncResults.push(returnValue);
        }
      });
    }

    function _bindValidationResults(object, results) {
      Object.defineProperty(object, "$validation", {
        enumerable: false,
        configurable: true,
        writable: false,
        value: results
      });
    }

    core.HandlerBuilder.implement({
      withValidation() {
        return this.addTypes(from => from.types(ValidateFilter, ValidateJsHandler, ValidationMapping));
      }

    });

    function matches(pattern, flags) {
      var criteria = {
        format: pattern
      };

      if (flags) {
        criteria.flags = flags;
      }

      return constraint(criteria);
    }

    var length = {
      is(len) {
        return constraint({
          length: {
            is: len
          }
        });
      },

      atLeast(len) {
        return constraint({
          length: {
            minimum: len
          }
        });
      },

      atMost(len) {
        return constraint({
          length: {
            maximum: len
          }
        });
      }

    };

    function includes(...members) {
      members = core.$flatten(members, true);
      return constraint({
        inclusion: members
      });
    }
    function excludes(...members) {
      members = core.$flatten(members, true);
      return constraint({
        exclusion: members
      });
    }

    var number = constraint({
      numericality: {
        noStrings: true
      }
    });
    Object.assign(number, {
      strict: constraint({
        numericality: {
          strict: true
        }
      }),
      onlyInteger: constraint({
        numericality: {
          onlyInteger: true
        }
      }),

      equalTo(val) {
        return constraint({
          numericality: {
            equalTo: val
          }
        });
      },

      greaterThan(val) {
        return constraint({
          numericality: {
            greaterThan: val
          }
        });
      },

      greaterThanOrEqualTo(val) {
        return constraint({
          numericality: {
            greaterThanOrEqualTo: val
          }
        });
      },

      lessThan(val) {
        return constraint({
          numericality: {
            lessThan: val
          }
        });
      },

      lessThanOrEqualTo(val) {
        return constraint({
          numericality: {
            lessThanOrEqualTo: val
          }
        });
      },

      divisibleBy(val) {
        return constraint({
          numericality: {
            divisibleBy: val
          }
        });
      },

      odd: constraint({
        numericality: {
          odd: true
        }
      }),
      even: constraint({
        numericality: {
          even: true
        }
      })
    });

    var required = constraint({
      presence: true
    });
    var notEmpty = constraint({
      presence: {
        allowEmpty: false
      }
    });

    var url = constraint({
      url: true
    });
    Object.assign(url, {
      schemes(schemes) {
        return constraint({
          url: {
            schemes
          }
        });
      },

      allowLocal(allowLocal) {
        return constraint({
          url: {
            allowLocal
          }
        });
      }

    });

    exports.ValidateFilter = ValidateFilter;
    exports.ValidateJsHandler = ValidateJsHandler;
    exports.ValidateProvider = ValidateProvider;
    exports.Validation = Validation;
    exports.ValidationError = ValidationError;
    exports.ValidationErrorData = ValidationErrorData;
    exports.ValidationErrorDataArray = ValidationErrorDataArray;
    exports.ValidationMapping = ValidationMapping;
    exports.ValidationResult = ValidationResult;
    exports.constraint = constraint;
    exports.customValidator = customValidator;
    exports.email = email;
    exports.excludes = excludes;
    exports.includes = includes;
    exports.length = length;
    exports.matches = matches;
    exports.notEmpty = notEmpty;
    exports.number = number;
    exports.required = required;
    exports.url = url;
    exports.valid = valid;
    exports.validate = validate;
    exports.validateThat = validateThat;
    exports.validates = validates;

    Object.defineProperty(exports, '__esModule', { value: true });

});

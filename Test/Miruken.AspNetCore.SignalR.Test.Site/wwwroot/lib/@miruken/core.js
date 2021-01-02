define(['exports', 'reflect-metadata'], function (exports, reflectMetadata) { 'use strict';

  /*
    base2 - copyright 2007-2009, Dean Edwards
    http://code.google.com/p/base2/
    http://www.opensource.org/licenses/mit-license.php

    Contributors:
      Doeke Zanstra
  */
  var Undefined$1 = K(),
      Null = K(null),
      True = K(true),
      False = K(false),
      emptyArray = Object.freeze([]);

  var __prototyping,
      _counter = 1;

  var _IGNORE = K(),
      _BASE = /\bbase\b/,
      _HIDDEN = ["constructor", "toString"],
      // only override these when prototyping
  _slice = Array.prototype.slice; // =========================================================================
  // base2/Base.js
  // =========================================================================
  // http://dean.edwards.name/weblog/2006/03/base/


  var _subclass = function (_instance, _static) {
    // Build the prototype.
    __prototyping = this.prototype;

    var _prototype = new this();

    if (_instance) extend(_prototype, _instance);
    __prototyping = undefined; // Create the wrapper for the constructor function.

    var _constructor = _prototype.constructor;

    function _class() {
      // Don't call the constructor function when prototyping.
      if (!__prototyping) {
        if (this && (this.constructor == _class || this.__constructing || // The line below allows extension from real classes
        Object.getPrototypeOf(this) instanceof _class)) {
          // Instantiation.
          this.__constructing = true;

          var instance = _constructor.apply(this, arguments);

          delete this.__constructing;
          if (instance) return instance;
        } else {
          // Casting.
          var target = arguments[0];
          if (target instanceof _class) return target;
          var cls = _class;

          do {
            if (cls.coerce) {
              var cast = cls.coerce.apply(_class, arguments);
              if (cast) return cast;
            }
          } while ((cls = cls.ancestor) && cls != exports.Base);

          return extend(target, _prototype);
        }
      }

      return this;
    }
    _prototype.constructor = _class; // Build the static interface.

    Object.setPrototypeOf(_class, this);
    if (_static) extend(_class, _static);
    _class.ancestor = this;
    _class.prototype = _prototype;
    if (_class.init) _class.init();
    return _class;
  };

  exports.Base = _subclass.call(Object, {
    constructor: function () {
      if (arguments.length > 0 && typeOf(arguments[0]) === 'object') {
        this.extend(arguments[0]);
      }
    },
    extend: delegate(extend),
    toString: function () {
      if (this.constructor.toString == Function.prototype.toString) {
        return "[object base2.Base]";
      } else {
        return "[object " + this.constructor.toString().slice(1, -1) + "]";
      }
    }
  }, exports.Base = {
    ancestorOf: function (klass) {
      return _ancestorOf(this, klass);
    },
    extend: _subclass,
    implement: function (source) {
      if (typeof source == "function") {
        source = source.prototype;
      } // Add the interface using the extend() function.


      extend(this.prototype, source);
      return this;
    }
  });

  exports.Base.base = exports.Base.prototype.base = function () {// call this method from any other method to invoke that method's ancestor
  }; // =========================================================================
  // base2/Package.js
  // =========================================================================


  var Package = exports.Base.extend({
    constructor: function (_private, _public) {
      var pkg = this,
          openPkg;
      pkg.extend(_public);

      if (pkg.name && pkg.name != "base2") {
        if (_public.parent === undefined) pkg.parent = base2;
        openPkg = pkg.parent && pkg.parent[pkg.name];

        if (openPkg) {
          if (!(openPkg instanceof Package)) {
            throw new Error(format("'%1' is reserved and cannot be used as a package name", pkg.name));
          }

          pkg.namespace = openPkg.namespace;
        } else {
          if (pkg.parent) {
            pkg.version = pkg.version || pkg.parent.version;
            pkg.parent.addName(pkg.name, pkg);
          }

          pkg.namespace = format("var %1=%2;", pkg.name, pkg.toString().slice(1, -1));
        }
      }

      if (_private) {
        _private.__package = this;
        _private.package = openPkg || this; // This string should be evaluated immediately after creating a Package object.

        var namespace = "var base2=(function(){return this.base2})(),_private=base2.toString;" + base2.namespace;
        var imports = csv(pkg.imports),
            name;

        for (var i = 0; name = imports[i]; i++) {
          var ns = lookup(name) || lookup("js." + name);
          if (!ns) throw new ReferenceError(format("Object not found: '%1'.", name));
          namespace += ns.namespace;
        }

        if (openPkg) namespace += openPkg.namespace;

        _private.init = function () {
          if (pkg.init) pkg.init();
        };

        _private.imports = namespace + lang.namespace + "this.init();"; // This string should be evaluated after you have created all of the objects
        // that are being exported.

        namespace = "";
        var nsPkg = openPkg || pkg;
        var exports$1 = csv(pkg.exports);

        for (var i = 0; name = exports$1[i]; i++) {
          var fullName = pkg.name + "." + name;
          nsPkg.namespace += "var " + name + "=" + fullName + ";";
          namespace += "if(!" + fullName + ")" + fullName + "=" + name + ";";
        }

        _private.exported = function () {
          if (nsPkg.exported) nsPkg.exported(exports$1);
        };

        _private.exports = "if(!" + pkg.name + ")var " + pkg.name + "=this.__package;" + namespace + "this._label_" + pkg.name + "();this.exported();"; // give objects and classes pretty toString methods

        var packageName = pkg.toString().slice(1, -1);

        _private["_label_" + pkg.name] = function () {
          for (var name in nsPkg) {
            var object = nsPkg[name];

            if (object && object.ancestorOf == exports.Base.ancestorOf && name != "constructor") {
              // it's a class
              object.toString = K("[" + packageName + "." + name + "]");
            }
          }
        };
      }

      if (openPkg) return openPkg;

      function lookup(names) {
        names = names.split(".");
        var value = base2,
            i = 0;

        while (value && names[i] != null) {
          value = value[names[i++]];
        }

        return value;
      }
    },
    exports: "",
    imports: "",
    name: "",
    namespace: "",
    parent: null,
    open: function (_private, _public) {
      _public.name = this.name;
      _public.parent = this.parent;
      return new Package(_private, _public);
    },
    addName: function (name, value) {
      if (!this[name]) {
        this[name] = value;
        this.exports += "," + name;
        this.namespace += format("var %1=%2.%1;", name, this.name);

        if (value && value.ancestorOf == exports.Base.ancestorOf && name != "constructor") {
          // it's a class
          value.toString = K("[" + this.toString().slice(1, -1) + "." + name + "]");
        }

        if (this.exported) this.exported([name]);
      }
    },
    addPackage: function (name) {
      var pkg = new Package(null, {
        name: name,
        parent: this
      });
      this.addName(name, pkg);
      return pkg;
    },
    package: function (_private, _public) {
      _public.parent = this;
      return new Package(_private, _public);
    },
    toString: function () {
      return format("[%1]", this.parent ? this.parent.toString().slice(1, -1) + "." + this.name : this.name);
    }
  }); // =========================================================================
  // base2/Abstract.js
  // =========================================================================

  var Abstract = exports.Base.extend({
    constructor: function () {
      throw new TypeError("Abstract class cannot be instantiated.");
    }
  }); // =========================================================================
  // base2/Module.js
  // =========================================================================

  var _moduleCount = 0;
  var Module = Abstract.extend(null, {
    namespace: "",
    extend: function (_interface, _static) {
      // Extend a module to create a new module.
      var module = this.base();
      var index = _moduleCount++;
      module.namespace = "";
      module.partial = this.partial;
      module.toString = K("[base2.Module[" + index + "]]");
      Module[index] = module; // Inherit class methods.

      module.implement(this); // Implement module (instance AND static) methods.

      if (_interface) module.implement(_interface); // Implement static properties and methods.

      if (_static) {
        extend(module, _static);
        if (module.init) module.init();
      }

      return module;
    },
    implement: function (_interface) {
      var module = this;
      var id = module.toString().slice(1, -1);

      if (typeof _interface == "function") {
        if (!_ancestorOf(_interface, module)) {
          this.base(_interface);
        }

        if (_ancestorOf(Module, _interface)) {
          // Implement static methods.
          for (var name in _interface) {
            if (typeof module[name] == "undefined") {
              var property = _interface[name];

              if (typeof property == "function" && property.call && _interface.prototype[name]) {
                property = _createStaticModuleMethod(_interface, name);
              }

              module[name] = property;
            }
          }

          module.namespace += _interface.namespace.replace(/base2\.Module\[\d+\]/g, id);
        }
      } else {
        // Add static interface.
        extend(module, _interface); // Add instance interface.

        _extendModule(module, _interface);
      }

      return module;
    },
    partial: function () {
      var module = Module.extend();
      var id = module.toString().slice(1, -1); // partial methods are already bound so remove the binding to speed things up

      module.namespace = this.namespace.replace(/(\w+)=b[^\)]+\)/g, "$1=" + id + ".$1");
      this.forEach(function (method, name) {
        module[name] = partial(bind(method, module));
      });
      return module;
    }
  });
  Module.prototype.base = Module.prototype.extend = _IGNORE;

  function _extendModule(module, _interface) {
    var proto = module.prototype;
    var id = module.toString().slice(1, -1);

    for (var name in _interface) {
      var property = _interface[name],
          namespace = "";

      if (!proto[name]) {
        if (name == name.toUpperCase()) {
          namespace = "var " + name + "=" + id + "." + name + ";";
        } else if (typeof property == "function" && property.call) {
          namespace = "var " + name + "=base2.lang.bind('" + name + "'," + id + ");";
          proto[name] = _createModuleMethod(module, name);
        }

        if (module.namespace.indexOf(namespace) == -1) {
          module.namespace += namespace;
        }
      }
    }
  }

  function _createStaticModuleMethod(module, name) {
    return function () {
      return module[name].apply(module, arguments);
    };
  }

  function _createModuleMethod(module, name) {
    return function () {
      var args = _slice.call(arguments);

      args.unshift(this);
      return module[name].apply(module, args);
    };
  }
  function pcopy(object) {
    // Prototype-base copy.
    // Doug Crockford / Richard Cornford
    _dummy.prototype = object;
    return new _dummy();
  }

  function _dummy() {}
  // lang/extend.js
  // =========================================================================

  function extend(object, source) {
    // or extend(object, key, value)
    if (object && source) {
      var useProto = __prototyping;

      if (arguments.length > 2) {
        // Extending with a key/value pair.
        var key = source;
        source = {};
        source[key] = arguments[2];
        useProto = true;
      }

      var proto = (typeof source == "function" ? Function : Object).prototype; // Add constructor, toString etc

      if (useProto) {
        var i = _HIDDEN.length,
            key;

        while (key = _HIDDEN[--i]) {
          var desc = getPropertyDescriptors(source, key);

          if (!desc || desc.enumerable && desc.value != proto[key]) {
            desc = _override(object, key, desc);
            if (desc) Object.defineProperty(object, key, desc);
          }
        }
      } // Copy each of the source object's properties to the target object.


      var props = getPropertyDescriptors(source);
      Reflect.ownKeys(props).forEach(function (key) {
        if (typeof proto[key] == "undefined" && key !== "base") {
          var desc = props[key];

          if (desc.enumerable) {
            desc = _override(object, key, desc);
            if (desc) Object.defineProperty(object, key, desc);
          }
        }
      });
    }

    return object;
  }

  function _ancestorOf(ancestor, fn) {
    // Check if a function is in another function's inheritance chain.
    while (fn) {
      if (!fn.ancestor) return false;
      fn = fn.ancestor;
      if (fn == ancestor) return true;
    }

    return false;
  }

  function _override(object, key, desc) {
    var value = desc.value;
    if (value === _IGNORE) return;

    if (typeof value !== "function" && "value" in desc) {
      return desc;
    }

    var ancestor = getPropertyDescriptors(object, key);
    if (!ancestor) return desc;
    var superObject = __prototyping; // late binding for prototypes;

    if (superObject) {
      var sprop = getPropertyDescriptors(superObject, key);

      if (sprop && (sprop.value != ancestor.value || sprop.get != ancestor.get || sprop.set != ancestor.set)) {
        superObject = null;
      }
    }

    if (value) {
      var avalue = ancestor.value;

      if (avalue && _BASE.test(value)) {
        desc.value = function () {
          var b = this.base;

          this.base = function () {
            var b = this.base,
                method = superObject && superObject[key] || avalue;
            this.base = Undefined$1; // method overriden in ctor

            var ret = method.apply(this, arguments);
            this.base = b;
            return ret;
          };

          var ret = value.apply(this, arguments);
          this.base = b;
          return ret;
        };
      }

      return desc;
    }

    var get = desc.get,
        aget = ancestor.get;

    if (get) {
      if (aget && _BASE.test(get)) {
        desc.get = function () {
          var b = this.base;

          this.base = function () {
            var b = this.base,
                get = superObject && getPropertyDescriptors(superObject, key).get || aget;
            this.base = Undefined$1; // getter overriden in ctor            

            var ret = get.apply(this, arguments);
            this.base = b;
            return ret;
          };

          var ret = get.apply(this, arguments);
          this.base = b;
          return ret;
        };
      }
    } else if (superObject) {
      desc.get = function () {
        var get = getPropertyDescriptors(superObject, key).get;
        return get.apply(this, arguments);
      };
    } else {
      desc.get = aget;
    }

    var set = desc.set,
        aset = ancestor.set;

    if (set) {
      if (aset && _BASE.test(set)) {
        desc.set = function () {
          var b = this.base;

          this.base = function () {
            var b = this.base,
                set = superObject && getPropertyDescriptors(superObject, key).set || aset;
            this.base = Undefined$1; // setter overriden in ctor            

            var ret = set.apply(this, arguments);
            this.base = b;
            return ret;
          };

          var ret = set.apply(this, arguments);
          this.base = b;
          return ret;
        };
      }
    } else if (superObject) {
      desc.set = function () {
        var set = getPropertyDescriptors(superObject, key).set;
        return set.apply(this, arguments);
      };
    } else {
      desc.set = aset;
    }

    return desc;
  }
  function getPropertyDescriptors(obj, key) {
    var chain = key ? null : [],
        own = false,
        prop;

    do {
      if (key) {
        prop = Reflect.getOwnPropertyDescriptor(obj, key);
        if (prop) return prop.own = own, prop;
      } else {
        chain.unshift({
          obj,
          own
        });
      }
    } while ((own = false, obj = Object.getPrototypeOf(obj)));

    if (chain) {
      var props = {};
      chain.forEach(function (c) {
        Reflect.ownKeys(c.obj).forEach(function (key) {
          if (!Reflect.has(props, key)) {
            prop = Reflect.getOwnPropertyDescriptor(c.obj, key);
            if (prop) props[key] = (prop.own = c.own, prop);
          }
        });
      });
      return props;
    }
  } // =========================================================================
  // lang/instanceOf.js
  // =========================================================================

  function instanceOf(object, klass) {
    // Handle exceptions where the target object originates from another frame.
    // This is handy for JSON parsing (amongst other things).
    if (typeof klass != "function") {
      throw new TypeError("Invalid 'instanceOf' operand.");
    }

    if (object == null) return false;
    if (object.constructor == klass) return true;
    if (klass.ancestorOf) return klass.ancestorOf(object.constructor);
    /*@if (@_jscript_version < 5.1)
      // do nothing
    @else @*/

    if (object instanceof klass) return true;
    /*@end @*/
    // If the class is a base2 class then it would have passed the test above.

    if (exports.Base.ancestorOf == klass.ancestorOf) return false; // base2 objects can only be instances of Object.

    if (exports.Base.ancestorOf == object.constructor.ancestorOf) return klass == Object;

    switch (klass) {
      case Array:
        return _toString.call(object) == "[object Array]";

      case Date:
        return _toString.call(object) == "[object Date]";

      case RegExp:
        return _toString.call(object) == "[object RegExp]";

      case Function:
        return typeOf(object) == "function";

      case String:
      case Number:
      case Boolean:
        return typeOf(object) == typeof klass.prototype.valueOf();

      case Object:
        return true;
    }

    return false;
  }
  var _toString = Object.prototype.toString; // =========================================================================
  // lang/typeOf.js
  // =========================================================================
  // http://wiki.ecmascript.org/doku.php?id=proposals:typeof

  function typeOf(object) {
    var type = typeof object;

    switch (type) {
      case "object":
        return object == null ? "null" : typeof object.constructor == "function" && _toString.call(object) != "[object Date]" ? typeof object.constructor.prototype.valueOf() // underlying type
        : type;

      case "function":
        return typeof object.call == "function" ? type : "object";

      default:
        return type;
    }
  }
  function assignID(object, name) {
    // Assign a unique ID to an object.
    if (!name) name = object.nodeType == 1 ? "uniqueID" : "base2ID";
    if (!object.hasOwnProperty(name)) object[name] = "b2_" + _counter++;
    return object[name];
  }
  function format(string) {
    // Replace %n with arguments[n].
    // e.g. format("%1 %2%3 %2a %1%3", "she", "se", "lls");
    // ==> "she sells sea shells"
    // Only %1 - %9 supported.
    var args = arguments;
    var pattern = new RegExp("%([1-" + (arguments.length - 1) + "])", "g");
    return (string + "").replace(pattern, function (match, index) {
      return args[index];
    });
  }
  function csv(string) {
    return string ? (string + "").split(/\s*,\s*/) : [];
  }
  function bind(fn, context) {
    var lateBound = typeof fn != "function";

    if (arguments.length > 2) {
      var args = _slice.call(arguments, 2);

      return function () {
        return (lateBound ? context[fn] : fn).apply(context, args.concat.apply(args, arguments));
      };
    } else {
      // Faster if there are no additional arguments.
      return function () {
        return (lateBound ? context[fn] : fn).apply(context, arguments);
      };
    }
  }
  function partial(fn) {
    // Based on Oliver Steele's version.
    var args = _slice.call(arguments, 1);

    return function () {
      var specialised = args.concat(),
          i = 0,
          j = 0;

      while (i < args.length && j < arguments.length) {
        if (specialised[i] === undefined) specialised[i] = arguments[j++];
        i++;
      }

      while (j < arguments.length) {
        specialised[i++] = arguments[j++];
      }

      if (Array2.contains(specialised, undefined)) {
        specialised.unshift(fn);
        return partial.apply(null, specialised);
      }

      return fn.apply(this, specialised);
    };
  }
  function delegate(fn, context) {
    return function () {
      var args = _slice.call(arguments);

      args.unshift(this);
      return fn.apply(context, args);
    };
  }
  /**
   * Determines if `value` is null or undefined.
   * @method $isNothing
   * @param    {Any}     value  -  value to test
   * @returns  {boolean} true if value null or undefined.
   */

  function $isNothing(value) {
    return value == null;
  }
  /**
   * Determines if `value` is not null or undefined.
   * @method $isSomething
   * @param    {Any}     value  -  value to test
   * @returns  {boolean} true if value not null or undefined.
   */

  function $isSomething(value) {
    return value != null;
  }
  /**
   * Determines if `str` is a string.
   * @method $isString
   * @param    {Any}     str  -  string to test
   * @returns  {boolean} true if a string.
   */

  function $isString$1(str) {
    return typeOf(str) === "string" || str instanceof String;
  }
  /**
   * Determines if `sym` is a symbol.
   * @method $isSymbol
   * @param    {Any} sym  -  symbol to test
   * @returns  {boolean} true if a symbol.
   */

  function $isSymbol(sym) {
    return Object(sym) instanceof Symbol;
  }
  /**
   * Determines if `bool` is a boolean.
   * @method $isBoolean
   * @param    {Any}     bool  -  boolean to test
   * @returns  {boolean} true if a boolean.
   */

  function $isBoolean(bool) {
    return typeOf(bool) === "boolean" || bool instanceof Boolean;
  }
  /**
   * Determines if `obj` is a number.
   * @method $isNumber
   * @param    {Any}      value          -  number to test
   * @param    {boolean}  allowInfinity  -  true if allow infinity
   * @returns  {boolean} true if a number.
   */

  function $isNumber(value, allowInfinity) {
    if (typeOf(value) !== "number" && !(value instanceof Number)) {
      return false;
    }

    var number = +value; // NaN is the only JavaScript value that never equals itself.

    if (number !== Number(value)) {
      return false;
    }

    if (allowInfinity !== true && (number === Infinity || number === !Infinity)) {
      return false;
    }

    return true;
  }
  /**
   * Determines if `fn` is a function.
   * @method $isFunction
   * @param    {Any}     fn  -  function to test
   * @returns  {boolean} true if a function.
   */

  function $isFunction(fn) {
    return fn instanceof Function;
  }
  /**
   * Determines if `obj` is an object.
   * @method $isObject
   * @param    {Any}     obj  - object to test
   * @returns  {boolean} true if an object.
   */

  function $isObject(obj) {
    return typeOf(obj) === "object";
  }
  /**
   * Determines if `obj` is a plain object or literal.
   * @method $isPlainObject
   * @param    {Any}     obj  -  object to test
   * @returns  {boolean} true if a plain object.
   */

  function $isPlainObject(obj) {
    return $isObject(obj) && obj.constructor === Object;
  }
  /**
   * Determines if `promise` is a promise.
   * @method $isPromise
   * @param    {Any}     promise  -  promise to test
   * @returns  {boolean} true if a promise. 
   */

  function $isPromise(promise) {
    return promise && $isFunction(promise.then);
  }
  /**
   * Determines if `value` implements the interable protocol.
   * @method $isIterable
   * @param    {Any}     value  -  any value
   * @returns  {boolean} true if iterable. 
   */

  function $isIterable(value) {
    return Symbol.iterator in Object(value);
  }
  /**
   * Gets the class `instance` is a member of.
   * @method $classOf
   * @param    {Object}  instance  - object
   * @returns  {Function} instance class. 
   */

  function $classOf(instance) {
    return instance == null ? undefined : instance.constructor;
  }
  /**
   * Returns a function that returns `value`.
   * @method $lift
   * @param    {Any}      value  -  any value
   * @returns  {Function} function that returns value.
   */

  function $lift(value) {
    return function () {
      return value;
    };
  }
  /**
   * Recursively flattens and optionally prune an array.
   * @method $flatten
   * @param    {Array}   arr    -  array to flatten
   * @param    {boolean} prune  -  true if prune null items
   * @returns  {Array}   flattend/pruned array or `arr`
   */

  function $flatten(arr, prune) {
    if (!Array.isArray(arr)) return arr;
    var items = arr.map(item => $flatten(item, prune));
    if (prune) items = items.filter($isSomething);
    return [].concat(...items);
  }
  /**
   * Determines whether `obj1` and `obj2` are considered equal.
   * <p>
   * Objects are considered equal if the objects are strictly equal (===) or
   * either object has an equals method accepting other object that returns true.
   * </p>
   * @method $equals
   * @param    {Any}     obj1  -  first object
   * @param    {Any}     obj2  -  second object
   * @returns  {boolean} true if the obejcts are considered equal, false otherwise.
   */

  function $equals(obj1, obj2) {
    if (obj1 === obj2) {
      return true;
    }

    if (obj1 && $isFunction(obj1.equals)) {
      return obj1.equals(obj2);
    } else if (obj2 && $isFunction(obj2.equals)) {
      return obj2.equals(obj1);
    }

    return false;
  }

  function K(k) {
    return function () {
      return k;
    };
  }

  function isDescriptor(desc) {
    if (!desc || !desc.hasOwnProperty) {
      return false;
    }

    var keys = ["value", "initializer", "get", "set"];

    for (var i = 0, l = keys.length; i < l; i++) {
      if (desc.hasOwnProperty(keys[i])) {
        return true;
      }
    }

    return false;
  }
  function decorate(decorator, args) {
    var [target, key, descriptor] = args || emptyArray;

    if (isDescriptor(descriptor)) {
      return decorator(target, key, descriptor, emptyArray);
    }

    return function (target, key, descriptor) {
      return decorator(target, key, descriptor, args);
    };
  }

  /**
   * Provides an abstraction for meta-data management.
   * http://blog.wolksoftware.com/decorators-metadata-reflection-in-typescript-from-novice-to-expert-part-4
   * @class Metadata
   */

  class Metadata extends Abstract {
    /**
     * Checks metadata on the prototype chain of an object or property.
     * @static
     * @method has
     * @param   {Any}     metadataKey  -  metadata key
     * @param   {Any}     target       -  originating target
     * @param   {Any}     [targetKey]  -  property key
     * @returns {boolean} true if found metadata for `metadataKey`. 
     */
    static has(metadataKey, target, targetKey) {
      if (target) {
        return targetKey ? Reflect.hasMetadata(metadataKey, target, targetKey) : Reflect.hasMetadata(metadataKey, target);
      }

      return false;
    }
    /**
     * Checks metadata on the object or property.
     * @static
     * @method hasOwn
     * @param   {Any}     metadataKey  -  metadata key
     * @param   {Any}     target       -  originating target
     * @param   {Any}     [targetKey]  -  property key
     * @returns {boolean} true if owns metadata for `metadataKey`. 
     */


    static hasOwn(metadataKey, target, targetKey) {
      if (target) {
        return targetKey ? Reflect.hasOwnMetadata(metadataKey, target, targetKey) : Reflect.hasOwnMetadata(metadataKey, target);
      }

      return false;
    }
    /**
     * Gets metadata on the prototype chain of an object or property.
     * @static
     * @method get
     * @param   {Any}  metadataKey  -  metadata key
     * @param   {Any}  target       -  originating target
     * @param   {Any}  [targetKey]  -  property key
     * @returns {Any} the metadata for the `metadataKey`. 
     */


    static get(metadataKey, target, targetKey) {
      if (target) {
        return targetKey ? Reflect.getMetadata(metadataKey, target, targetKey) : Reflect.getMetadata(metadataKey, target);
      }
    }
    /**
     * Gets owning metadata of an object or property.
     * @static
     * @method getOwn
     * @param   {Any}  metadataKey  -  metadata key
     * @param   {Any}  target       -  owning target
     * @param   {Any}  [targetKey]  -  property key
     * @returns {Any} the metadata for the `metadataKey`. 
     */


    static getOwn(metadataKey, target, targetKey) {
      if (target) {
        return targetKey ? Reflect.getOwnMetadata(metadataKey, target, targetKey) : Reflect.getOwnMetadata(metadataKey, target);
      }
    }
    /**
     * Gets owning metadata of an object or property or lazily creates it.
     * @static
     * @method getOrCreateOwn
     * @param   {Any}       metadataKey  -  metadata key
     * @param   {Any}       target       -  owning target
     * @param   {Any}       [targetKey]  -  property key
     * @param   {Function}  creator      -  creates metadata if missing
     * @returns {Any} the metadata for the `metadataKey`. 
     */


    static getOrCreateOwn(metadataKey, target, targetKey, creator) {
      if (arguments.length === 3) {
        creator = targetKey;
        targetKey = undefined;
      }

      if (!$isFunction(creator)) {
        throw new TypeError("creator must be a function.");
      }

      var metadata = this.getOwn(metadataKey, target, targetKey);

      if (metadata === undefined) {
        metadata = creator(metadataKey, target, targetKey);
        this.define(metadataKey, metadata, target, targetKey);
      }

      return metadata;
    }
    /**
     * Defines metadata on an object or property.
     * @static
     * @method define
     * @param   {Any}  metadataKey  -  metadata key
     * @param   {Any}  metadata     -  metadata value
     * @param   {Any}  target       -  owning target
     * @param   {Any}  [targetKey]  -  property key
     */


    static define(metadataKey, metadata, target, targetKey) {
      if (target) {
        return targetKey ? Reflect.defineMetadata(metadataKey, metadata, target, targetKey) : Reflect.defineMetadata(metadataKey, metadata, target);
      }
    }
    /**
     * Removes metadata from an object or property.
     * @static
     * @method remove
     * @param   {Any}  metadataKey  -  metadata key
     * @param   {Any}  target       -  owning target
     * @param   {Any}  [targetKey]  -  property key
     */


    static remove(metadataKey, target, targetKey) {
      if (target) {
        return targetKey ? Reflect.deleteMetadata(metadataKey, target, targetKey) : Reflect.deleteMetadata(metadataKey, target);
      }
    }
    /**
     * Copies or replaces all metadata from `source` onto `target`.
     * @static
     * @method copyOwn
     * @param   {Any}  target  -  recieves metadata
     * @param   {Any}  source  -  provides metadata
     */


    static copyOwn(target, source) {
      this.copyOwnKey(target, source);
      Reflect.ownKeys(source).forEach(sourceKey => this.copyOwnKey(target, source, sourceKey));
    }
    /**
     * Copies or replaces all `sourceKey` metadata from `source` onto `target`.
     * @static
     * @method copyOwnKey
     * @param   {Any}  target     -  recieves metadata
     * @param   {Any}  source     -  provides metadata
     * @param   {Any}  sourceKey  -  source property to copy from
     */


    static copyOwnKey(target, source, sourceKey) {
      var metadataKeys = Reflect.getOwnMetadataKeys(source, sourceKey);
      metadataKeys.forEach(metadataKey => {
        var sourceMetadata = this.getOwn(metadataKey, source, sourceKey);

        if (sourceMetadata) {
          var copyMetadata = sourceMetadata == null ? void 0 : sourceMetadata.copyMetadata;

          if ($isFunction(copyMetadata)) {
            var targetMetadata = copyMetadata.call(sourceMetadata, target, source, sourceKey, metadataKey);

            if (targetMetadata) {
              this.define(metadataKey, targetMetadata, target, sourceKey);
            }
          } else {
            this.define(metadataKey, sourceMetadata, target, sourceKey);
          }
        }
      });
    }
    /**
     * Merges all metadata from `source` onto `target`.
     * @static
     * @method mergeOwn
     * @param   {Any}   target  -  recieves metadata
     * @param   {Any}   source  -  provides metadata
     */


    static mergeOwn(target, source) {
      this.mergeOwnKey(target, source, undefined);
      Reflect.ownKeys(source).forEach(sourceKey => this.mergeOwnKey(target, source, sourceKey));
    }
    /**
     * Merges all `sourceKey` metadata from `source` onto `target`.
     * @static
     * @method mergeOwnKey
     * @param   {Any}      target     -  recieves metadata
     * @param   {Any}      source     -  provides metadata
     * @param   {Any}      sourceKey  -  source property to copy from
     */


    static mergeOwnKey(target, source, sourceKey) {
      var metadataKeys = Reflect.getOwnMetadataKeys(source, sourceKey);
      metadataKeys.forEach(metadataKey => {
        var targetMetadata = this.getOwn(metadataKey, target, sourceKey),
            sourceMetadata = this.getOwn(metadataKey, source, sourceKey);

        if (targetMetadata) {
          var mergeMetadata = targetMetadata == null ? void 0 : targetMetadata.mergeMetadata;

          if ($isFunction(mergeMetadata)) {
            mergeMetadata.call(targetMetadata, sourceMetadata, target, source, sourceKey, metadataKey);
          }
        } else {
          var copyMetadata = sourceMetadata == null ? void 0 : sourceMetadata.copyMetadata;

          if ($isFunction(copyMetadata)) {
            var _targetMetadata = copyMetadata.call(sourceMetadata, target, source, sourceKey, metadataKey);

            if (_targetMetadata) {
              this.define(metadataKey, _targetMetadata, target, sourceKey);
            }
          } else {
            this.define(metadataKey, sourceMetadata, target, sourceKey);
          }
        }
      });
    }
    /**
     * Collects metadata on the prototype chain of an object or property.
     * @static
     * @method collect
     * @param   {Any}       metadataKey  -  metadata key
     * @param   {Any}       target       -  originating target
     * @param   {Any}       [targetKey]  -  property key
     * @param   {Function}  collector    -  receives metadata.
     *                                      stops collecting if true is returned.
     * @returns {boolean} true if any `collector` returned true, false otherwise.
     */


    static collect(metadataKey, target, targetKey, collector) {
      if (arguments.length === 3) {
        collector = targetKey;
        targetKey = undefined;
      }

      if (!$isFunction(collector)) {
        throw new TypeError("collector must be a function.");
      }

      while (target && target !== exports.Base.prototype && target !== Object.prototype && target !== Abstract.prototype) {
        var metadata = this.getOwn(metadataKey, target, targetKey);

        if (metadata && collector(metadata, metadataKey, target, targetKey)) {
          return true;
        }

        target = Object.getPrototypeOf(target);
      }

      return false;
    }
    /**
     * Builds a metadata decorator.
     * @static
     * @method decorator
     * @param  {Any}       metadataKey  -  metadata key
     * @param  {Function}  handler      -  handler function
     */


    static decorator(metadataKey, handler) {
      function decorator(...args) {
        return decorate(handler, args);
      }

      decorator.get = _metadataGetter.bind(this, metadataKey, false);
      decorator.getOwn = _metadataGetter.bind(this, metadataKey, true);
      decorator.getKeys = _metadataKeyGetter.bind(this, metadataKey, false);
      decorator.getOwnKeys = _metadataKeyGetter.bind(this, metadataKey, true);
      decorator.getOrCreateOwn = this.getOrCreateOwn.bind(this, metadataKey);
      decorator.collect = _metadataCollector.bind(this, metadataKey);
      decorator.collectKeys = _metadataKeyCollector.bind(this, metadataKey);
      return decorator;
    }

  }

  function _metadataGetter(metadataKey, own, target, targetKey) {
    return own ? this.getOwn(metadataKey, target, targetKey) : this.get(metadataKey, target, targetKey);
  }

  function _metadataKeyGetter(metadataKey, own, target, callback) {
    var found = false;
    if (!$isFunction(callback)) return false;
    var keys = Reflect.ownKeys(own ? target : getPropertyDescriptors(target)).concat("constructor");
    keys.forEach(key => {
      if (key === "base" || key === "extend") {
        return;
      }

      var metadata = own ? this.getOwn(metadataKey, target, key) : this.get(metadataKey, target, key);

      if (metadata) {
        callback(metadata, key);
        found = true;
      }
    });
    return found;
  }

  function _metadataCollector(metadataKey, target, targetKey, callback) {
    if (!callback && $isFunction(targetKey)) {
      [targetKey, callback] = [null, targetKey];
    }

    if (!$isFunction(callback)) return;
    this.collect(metadataKey, target, targetKey, callback);
  }

  function _metadataKeyCollector(metadataKey, target, callback) {
    if (!$isFunction(callback)) return;
    var keys = Reflect.ownKeys(getPropertyDescriptors(target)).concat("constructor");
    keys.forEach(key => this.collect(metadataKey, target, key, callback));
  }

  /**
   * Delegates properties and methods to another object.<br/>
   * See {{#crossLink "Protocol"}}{{/crossLink}}
   * @class Delegate
   * @extends Base
   */

  class Delegate extends exports.Base {
    /**
     * Delegates the property get on `protocol`.
     * @method get
     * @param   {Protocol} protocol  - receiving protocol
     * @param   {string}   key       - key of the property
     * @returns {Any} result of the proxied get.
     */
    get(protocol, key) {}
    /**
     * Delegates the property set on `protocol`.
     * @method set
     * @param   {Protocol} protocol  - receiving protocol
     * @param   {string}   key       - key of the property
     * @param   {Object}   value     - value of the property
     */


    set(protocol, key, value) {}
    /**
     * Delegates the method invocation on `protocol`.
     * @method invoke
     * @param   {Protocol} protocol    - receiving protocol
     * @param   {string}   methodName  - name of the method
     * @param   {Array}    args        - method arguments
     * @returns {Any} result of the proxied invocation.
     */


    invoke(protocol, methodName, args) {}

  }
  /**
   * Delegates properties and methods to an object.
   * @class ObjectDelegate
   * @constructor
   * @param   {Object}  object  - receiving object
   * @extends Delegate
   */

  class ObjectDelegate extends Delegate {
    constructor(object) {
      super();
      Object.defineProperty(this, "object", {
        value: object
      });
    }

    get(protocol, key) {
      var object = this.object;

      if (object) {
        return object[key];
      }
    }

    set(protocol, key, value) {
      var object = this.object;

      if (object) {
        return object[key] = value;
      }
    }

    invoke(protocol, methodName, args) {
      var object = this.object;

      if (object) {
        var method = object[methodName];
        return method && method.apply(object, args);
      }
    }

  }
  /**
   * Delegates properties and methods to an array.
   * @class ArrayDelegate
   * @constructor
   * @param   {Array}  array  - receiving array
   * @extends Delegate
   */

  class ArrayDelegate extends Delegate {
    constructor(array) {
      super();
      Object.defineProperty(this, "array", {
        value: array
      });
    }

    get(protocol, key) {
      var array = this.array;
      return array && array.reduce((result, object) => object[key], undefined);
    }

    set(protocol, key, value) {
      var array = this.array;
      return array && array.reduce((result, object) => object[key] = value, undefined);
    }

    invoke(protocol, methodName, args) {
      var array = this.array;
      return array && array.reduce((result, object) => {
        var method = object[methodName];
        return method ? method.apply(object, args) : result;
      }, undefined);
    }

  }

  /**
   * Declares methods and properties independent of a class.
   * <pre>
   *    var Auditing = Protocol.extend({
   *        get level() {},
   *        record(activity) {}
   *    })
   * </pre>
   * @class Protocol
   * @constructor
   * @param   {Delegate}  delegate  -  delegate
   * @extends Base
   */

  var protocolGet = Symbol(),
      protocolSet = Symbol(),
      protocolInvoke = Symbol(),
      protocolDelegate = Symbol(),
      protocolMetadataKey = Symbol();
  var Protocol = exports.Base.extend({
    constructor(delegate) {
      if ($isNothing(delegate)) {
        delegate = new Delegate();
      } else if ($isFunction(delegate.toDelegate)) {
        delegate = delegate.toDelegate();

        if (!(delegate instanceof Delegate)) {
          throw new TypeError("'toDelegate' method did not return a Delegate.");
        }
      } else if (!(delegate instanceof Delegate)) {
        if (Array.isArray(delegate)) {
          delegate = new ArrayDelegate(delegate);
        } else {
          delegate = new ObjectDelegate(delegate);
        }
      }

      Object.defineProperty(this, protocolDelegate, {
        value: delegate,
        writable: false
      });
    },

    [protocolGet](key) {
      var delegate = this[protocolDelegate];
      return delegate && delegate.get(this.constructor, key);
    },

    [protocolSet](key, value) {
      var delegate = this[protocolDelegate];
      return delegate && delegate.set(this.constructor, key, value);
    },

    [protocolInvoke](methodName, args) {
      var delegate = this[protocolDelegate];
      return delegate && delegate.invoke(this.constructor, methodName, args);
    }

  }, {
    /**
     * Determines if `target` is a {{#crossLink "Protocol"}}{{/crossLink}}.
     * @static
     * @method isProtocol
     * @param   {Any}      target  -  target to test
     * @returns {boolean}  true if the target is a Protocol.
     */
    isProtocol(target) {
      return target && target.prototype instanceof Protocol;
    },

    /**
     * Determines if `target` conforms to this protocol.
     * @static
     * @method isAdoptedBy
     * @param   {Any}      target  -  target to test
     * @returns {boolean}  true if the target conforms to this protocol.
     */
    isAdoptedBy(target) {
      if (!target) return false;

      if (this === target || target && target.prototype instanceof this) {
        return true;
      }

      var metaTarget = $isFunction(target) ? target.prototype : target;
      if (!$isObject(metaTarget)) return false;
      return Metadata.collect(protocolMetadataKey, metaTarget, protocols => protocols.has(this) || [...protocols].some(p => this.isAdoptedBy(p)));
    },

    /**
     * Marks `target` as conforming to this protocol.
     * @static
     * @method adoptBy
     * @param   {Any}      target  -  conforming target
     * @returns {boolean}  true if the this protocol could be adopted.
     */
    adoptBy(target) {
      if (!target) return;
      var metaTarget = $isFunction(target) ? target.prototype : target;

      if (Metadata.collect(protocolMetadataKey, metaTarget, p => p.has(this))) {
        return false;
      }

      var protocols = Metadata.getOrCreateOwn(protocolMetadataKey, metaTarget, () => new Set());
      protocols.add(this);
      var protocolAdopted = target.protocolAdopted;

      if ($isFunction(protocolAdopted)) {
        protocolAdopted.call(target, this);
      }

      return true;
    },

    /**
     * Notifies the `protocol` has been adopted.
     * @statics protocolAdopted
     * @method 
     * @param   {Protocol} protocol  -  protocol adopted
     */
    protocolAdopted(protocol) {
      var prototype = this.prototype,
          protocolProto = Protocol.prototype,
          props = getPropertyDescriptors(protocol.prototype);
      Reflect.ownKeys(props).forEach(key => {
        if (getPropertyDescriptors(protocolProto, key) || getPropertyDescriptors(prototype, key)) return;
        Object.defineProperty(prototype, key, props[key]);
      });
    },

    /**
     * Determines if `target` conforms to this protocol and is toplevel.
     * @static
     * @method isToplevel
     * @param   {Any}      target    -  target to test
     * @returns {boolean}  true if the target conforms to this toplevel protocol.
     */
    isToplevel(target) {
      var protocols = $protocols(target);
      return protocols.indexOf(this) >= 0 && protocols.every(p => p === this || !this.isAdoptedBy(p));
    },

    /**
     * Creates a protocol binding over the object.
     * @static
     * @method coerce
     * @param   {Object} object  -  object delegate
     * @returns {Object} protocol instance delegating to object. 
     */
    coerce(object) {
      return new this(object);
    }

  });
  /**
   * Protocol base requiring exact conformance (toplevel).
   * @class StrictProtocol
   * @constructor
   * @param   {Delegate}  delegate  -  delegate
   * @extends Protocol     
   */

  var StrictProtocol = Protocol.extend();
  /**
   * Protocol base requiring no conformance.
   * @class DuckTyping
   * @constructor
   * @param   {Delegate}  delegate  -  delegate
   * @extends Protocol     
   */

  var DuckTyping = Protocol.extend();
  /**
   * Determines if `protocol` is a protocol.
   * @method $isProtocol
   * @param    {Any}     protocol  - target to test
   * @returns  {boolean} true if a protocol.
   */

  var $isProtocol = Protocol.isProtocol;
  /**
   * Gets all the `target` protocols.
   * @method $protocols
   * @param    {Any}     target  -  target
   * @param    {boolean} own     -  true if own protocols
   * @returns  {Array} conforming protocols.
   */

  function $protocols(target, own) {
    if (!target) return [];

    if ($isFunction(target)) {
      target = target.prototype;
    }

    var protocols = !own ? new Set() : Metadata.getOwn(protocolMetadataKey, target);

    if (!own) {
      var add = protocols.add.bind(protocols);
      Metadata.collect(protocolMetadataKey, target, ps => ps.forEach(p => [p, ...$protocols(p)].forEach(add)));
    }

    return protocols && [...protocols] || [];
  }
  /**
   * Marks a class as a {{#crossLink "Protocol"}}{{/crossLink}}.
   * @method protocol
   * @param  {Array}  args  -  protocol args
   */

  function protocol(...args) {
    if (args.length === 0) {
      return function (...args) {
        return _protocol.apply(null, args);
      };
    }

    return _protocol(...args);
  }

  function _protocol(target) {
    if ($isFunction(target)) {
      target = target.prototype;
    }

    Reflect.ownKeys(target).forEach(key => {
      if (key === "constructor") return;
      var descriptor = Object.getOwnPropertyDescriptor(target, key);
      if (!descriptor.enumerable) return;

      if ($isFunction(descriptor.value)) {
        descriptor.value = function (...args) {
          return this[protocolInvoke](key, args);
        };
      } else {
        var isSimple = descriptor.hasOwnProperty("value") || descriptor.hasOwnProperty("initializer");

        if (isSimple) {
          delete descriptor.value;
          delete descriptor.writable;
        }

        if (descriptor.get || isSimple) {
          descriptor.get = function () {
            return this[protocolGet](key);
          };
        }

        if (descriptor.set || isSimple) {
          descriptor.set = function (value) {
            return this[protocolSet](key, value);
          };
        }
      }

      Object.defineProperty(target, key, descriptor);
    });
  }
  /**
   * Marks a class or protocol as conforming to one or more
   * {{#crossLink "Protocol"}}{{/crossLink}}s.
   * @method conformsTo
   * @param    {Array}    protocols  -  conforming protocols
   * @returns  {Function} the conformsTo decorator.
   */


  function conformsTo(...protocols) {
    protocols = $flatten(protocols, true);

    if (!protocols.every($isProtocol)) {
      throw new TypeError("Only Protocols can be conformed to.");
    }

    return protocols.length === 0 ? Undefined : adopt;

    function adopt(target, key, descriptor) {
      if (isDescriptor(descriptor)) {
        throw new SyntaxError("@conformsTo can only be applied to classes.");
      }

      protocols.forEach(protocol => protocol.adoptBy(target));
    }
  }

  /**
   * Defines an enumeration.
   * <pre>
   *    const Color = Enum({
   *        red:   1,
   *        green: 2,
   *        blue:  3
   *    })
   * </pre>
   * @class Enum
   * @constructor
   * @param  {Any}     value    -  enum value
   * @param  {string}  name     -  enum name
   * @param  {number}  ordinal  -  enum position
   */

  var Defining = Symbol();
  var Enum = exports.Base.extend({
    get description() {
      var _name$match;

      var name = this.name;
      return name == null ? "undefined" : ((_name$match = name.match(/[A-Z][a-z]+|[0-9]+/g)) == null ? void 0 : _name$match.join(" ")) || name;
    },

    toJSON() {
      var value = this.valueOf();
      return value != null && value !== this && $isFunction(value.toJSON) ? value.toJSON() : value;
    },

    toString() {
      return this.name;
    }

  }, {
    coerce(choices, behavior) {
      var baseEnum;

      if (this === Enum) {
        baseEnum = SimpleEnum;
      } else if (this === Flags) {
        baseEnum = Flags;
      } else {
        return;
      }

      var en = baseEnum.extend(behavior, {
        coerce(value) {
          return this.fromValue(value);
        }

      });
      var isCustom = $isFunction(choices);

      if (isCustom) {
        en = en.extend({
          constructor() {
            if (!this.constructor[Defining]) {
              throw new TypeError("Enums cannot be instantiated.");
            }

            this.base(...arguments);
          }

        });
        en[Defining] = true;
        choices = choices((...args) => Reflect.construct(en, args));
      } else {
        en[Defining] = true;
      }

      var names = Object.keys(choices);
      var items = names.map((name, ordinal) => {
        var item = choices[name],
            choice = isCustom ? item : new en(item, name);

        if (isCustom) {
          createReadonlyProperty(choice, "name", name);
        }

        createReadonlyProperty(choice, "ordinal", ordinal);
        createReadonlyProperty(en, name, choice);
        return choice;
      });
      createReadonlyProperty(en, "names", Object.freeze(names));
      createReadonlyProperty(en, "items", Object.freeze(items));
      delete en[Defining];
      return en;
    },

    fromName(name) {
      if (!$isString$1(name)) {
        throw new TypeError(`The name '${name}' is not a valid string.`);
      }

      var choice = this[name];

      if (!choice) {
        throw new TypeError(`'${name}' is not a valid choice for this Enum.`);
      }

      return choice;
    }

  });

  Enum.prototype.valueOf = function () {
    return "value" in this ? this.value : this;
  };
  /**
   * Defines a simple value enumeration.
   * <pre>
   *    const Color = Enum({
   *        red:   1
   *        blue:  2
   *        green: 3
   *    })
   * </pre>
   * @class SimpleEnum
   * @constructor
   * @param  {Any}    value   -  choice value
   * @param  {string} [name]  -  choice name
   */


  var SimpleEnum = Enum.extend({
    constructor(value, name) {
      if (!this.constructor[Defining]) {
        throw new TypeError("Enums cannot be instantiated.");
      }

      createReadonlyProperty(this, "value", value);
      createReadonlyProperty(this, "name", name);
    }

  }, {
    fromValue(value) {
      var match = this.items.find(item => item.value == value);

      if (!match) {
        throw new TypeError(`${value} is not a valid value for this Enum.`);
      }

      return match;
    }

  });
  /**
   * Defines a flags enumeration.
   * <pre>
   *    const DayOfWeek = Flags({
   *        monday:     1 << 0,
   *        tuesday:    1 << 1,
   *        wednesday:  1 << 2,
   *        thursday:   1 << 3,
   *        friday:     1 << 4,
   *        saturday:   1 << 5,
   *        sunday:     1 << 6
   *    })
   * </pre>
   * @class Enum
   * @constructor
   * @param  {Any}    value   -  flag value
   * @param  {string} [name]  -  flag name
   */

  var Flags = Enum.extend({
    constructor(value, name) {
      if (!$isNumber(value) || !Number.isInteger(value)) {
        throw new TypeError(`Flag named '${name}' has value '${value}' which is not an integer`);
      }

      createReadonlyProperty(this, "value", value);
      createReadonlyProperty(this, "name", name);
    },

    hasFlag(flag) {
      flag = +flag;
      return (this & flag) === flag;
    },

    addFlag(flag) {
      return $isSomething(flag) ? this.constructor.fromValue(this | flag) : this;
    },

    removeFlag(flag) {
      return $isSomething(flag) ? this.constructor.fromValue(this & ~flag) : this;
    },

    constructing(value, name) {}

  }, {
    fromValue(value) {
      value = +value;
      var name,
          names = this.names;

      for (var i = 0; i < names.length; ++i) {
        var flag = this[names[i]];

        if (flag.value === value) {
          return flag;
        }

        if (flag.value > 0 && (value & flag.value) === flag.value) {
          name = name ? name + "," + flag.name : flag.name;
        }
      }

      return new this(value, name);
    },

    fromName(name) {
      if (!$isString$1(name)) {
        throw new TypeError(`The name '${name}' is not a valid string.`);
      }

      var flags = name.split(",");
      var value = 0;

      for (var i = 0; i < flags.length; ++i) {
        var flag = flags[i],
            choice = this[flag];

        if (!choice) {
          throw new TypeError(`'${flag}' is not a valid choice for this Flags.`);
        }

        if (flags.length === 1) return choice;
        value += choice.value;
      }

      return this.fromValue(value);
    }

  });

  function createReadonlyProperty(object, name, value) {
    Object.defineProperty(object, name, {
      value: value,
      writable: false,
      configurable: false
    });
  }

  var _dec, _class;
  var baseExtend = exports.Base.extend,
      baseImplement = exports.Base.implement,
      baseProtoExtend = exports.Base.prototype.extend;
  /**
   * Type of property method.
   * @class PropertyType
   * @extends Enum
   */

  var MethodType = Enum({
    /**
     * Getter property method
     * @property {number} Get
     */
    Get: 1,

    /**
     * Setter property method
     * @property {number} Set
     */
    Set: 2,

    /**
     * Method invocation
     * @property {number} Invoke
     */
    Invoke: 3
  });
  /**
   * Variance enum
   * @class Variance
   * @extends Enum
   */

  var Variance = Enum({
    /**
     * Matches a more specific type than originally specified.
     * @property {number} Covariant
     */
    Covariant: 1,

    /**
     * Matches a more generic (less derived) type than originally specified.
     * @property {number} Contravariant
     */
    Contravariant: 2,

    /**
     * Matches only the type originally specified.
     * @property {number} Invariant
     */
    Invariant: 3
  });

  exports.Base.extend = function (...args) {
    var constraints = args,
        decorators = [];

    if (this === Protocol) {
      decorators.push(protocol);
    } else if ($isProtocol(this)) {
      decorators.push(protocol, conformsTo(this));
    }

    if (args.length > 0 && Array.isArray(args[0])) {
      constraints = args.shift();
    }

    while (constraints.length > 0) {
      var constraint = constraints[0];

      if (!constraint) {
        break;
      } else if ($isProtocol(constraint)) {
        decorators.push(conformsTo(constraint));
      } else if (constraint.prototype instanceof exports.Base || constraint.prototype instanceof Module) {
        decorators.push(mixin(constraint));
      } else if ($isFunction(constraint)) {
        decorators.push(constraint);
      } else {
        break;
      }

      constraints.shift();
    }

    var members = args.shift() || {},
        classMembers = args.shift() || {},
        derived = baseExtend.call(this, members, classMembers);
    Metadata.copyOwn(derived, classMembers);
    Metadata.copyOwn(derived.prototype, members);

    if (decorators.length > 0) {
      derived = Reflect.decorate(decorators, derived);
    }

    return derived;
  };

  exports.Base.implement = function (source) {
    if (source && $isProtocol(this) && $isObject(source)) {
      source = protocol(source) || source;
    }

    var type = baseImplement.call(this, source);
    Metadata.mergeOwn(type.prototype, source);
    return type;
  };

  exports.Base.prototype.extend = function (key, value) {
    if (!key) return this;
    var numArgs = arguments.length;

    if (numArgs === 1) {
      if (this instanceof Protocol) {
        key = protocol(key) || key;
      }

      var instance = baseProtoExtend.call(this, key);
      Metadata.mergeOwn(instance, key);
      return instance;
    }

    return baseProtoExtend.call(this, key, value);
  };
  /**
   * Decorates a class with behaviors to mix in.
   * @method mixin
   * @param    {Array}    ...behaviors  -  behaviors
   * @returns  {Function} the mixin decorator.
   */


  function mixin(...behaviors) {
    behaviors = $flatten(behaviors, true);
    return function (target) {
      if (behaviors.length > 0 && $isFunction(target.implement)) {
        behaviors.forEach(b => target.implement(b));
      }
    };
  }
  /**
   * Protocol for targets that manage initialization.
   * @class Initializing
   * @extends Protocol
   */

  var Initializing = Protocol.extend({
    /**
     * Perform any initialization after construction..
     */
    initialize() {}

  });
  /**
   * Protocol for targets that have parent/child relationships.
   * @class Parenting
   * @extends Protocol
   */

  var Parenting = Protocol.extend({
    /**
     * Creates a new child of the parent.
     * @method newChild
     * @returns {Object} the new child.
     */
    newChild() {}

  });
  /**
   * Protocol for targets that can be started.
   * @class Starting
   * @extends Protocol
   */

  var Starting = Protocol.extend({
    /**
     * Starts the reciever.
     * @method start
     */
    start() {}

  });
  /**
   * Base class for startable targets.
   * @class Startup
   * @uses Starting
   * @extends Base
   */

  var Startup = (_dec = conformsTo(Starting), _dec(_class = class Startup extends exports.Base {
    start() {}

  }) || _class);
  /**
   * Creates a decorator builder.<br/>
   * See [Decorator Pattern](http://en.wikipedia.org/wiki/Decorator_pattern)
   * @method
   * @param   {Object}   decorations  -  object defining decorations
   * @erturns {Function} function to build decorators.
   */

  function $decorator(decorations) {
    return function (decoratee) {
      if ($isNothing(decoratee)) {
        throw new TypeError("No decoratee specified.");
      }

      var decorator = Object.create(decoratee);
      Object.defineProperty(decorator, "getDecoratee", {
        configurable: false,
        value: () => decoratee
      });

      if (decorations && $isFunction(decorator.extend)) {
        decorator.extend(decorations);
      }

      return decorator;
    };
  }
  /**
   * Decorates an instance using the 
   * [Decorator Pattern](http://en.wikipedia.org/wiki/Decorator_pattern).
   * @method
   * @param   {Object}   decoratee    -  decoratee
   * @param   {Object}   decorations  -  object defining decorations
   * @erturns {Function} function to build decorators.
   */

  function $decorate(decoratee, decorations) {
    return $decorator(decorations)(decoratee);
  }
  /**
   * Gets the decoratee used in the  
   * [Decorator Pattern](http://en.wikipedia.org/wiki/Decorator_pattern).
   * @method
   * @param   {Object}   decorator  -  possible decorator
   * @param   {boolean}  deepest    -  true if deepest decoratee, false if nearest.
   * @erturns {Object}   decoratee if present, otherwise decorator.
   */

  function $decorated(decorator, deepest) {
    var getDecoratee, decoratee;

    while (decorator && (getDecoratee = decorator.getDecoratee) && $isFunction(getDecoratee) && (decoratee = getDecoratee())) {
      if (!deepest) return decoratee;
      decorator = decoratee;
    }

    return decorator;
  }
  var $compose2 = (f, g) => (...args) => f(g(...args));
  var $compose = (...fns) => fns.reduce($compose2);
  var $pipe = (...fns) => fns.reduceRight($compose2);

  // Embedded private-parts package https://github.com/philipwalton/private-parts/blob/master/private-parts.js
  // to minimize depenendcies and add mofifications to support prototype chains.

  /**
   * A function that returns a function that allows you to associate
   * a public object with its private counterpart.
   * @param {Function|Object} factory An optional argument that, is present, will
   *   be used to create new objects in the store.
   *   If factory is a function, it will be invoked with the key as an argument
   *   and the return value will be the private instance.
   *   If factory is an object, the private instance will be a new object with
   *   factory as it's prototype.
   */
  function createKey(factory) {
    // Create the factory based on the type of object passed.
    factory = typeof factory == 'function' ? factory : createBound(factory); // Store is used to map public objects to private objects.

    var store = new WeakMap(); // Seen is used to track existing private objects.

    var seen = new WeakMap();
    /**
     * An accessor function to get private instances from the store.
     * @param {Object} key The public object that is associated with a private
     *   object in the store.
     */

    return function storeGet(key) {
      if (typeof key != 'object') return;
      var value = store.get(key);

      if (!value) {
        // Make sure key isn't already the private instance of some existing key.
        // This check helps prevent accidental double privatizing.
        if (seen.has(key)) {
          value = key;
        } else {
          value = factory(key, storeGet);
          store.set(key, value);
          seen.set(value, true);
        }
      }

      return value;
    };
  }
  /**
   * Function.prototype.bind doesn't work in PhantomJS or Safari 5.1,
   * so we have to manually bind until support is dropped.
   * This function is effectively `Object.create.bind(null, obj, {})`
   * @param {Object} obj The first bound parameter to `Object.create`
   * @return {Function} The bound function.
   */

  function createBound(obj) {
    return function () {
      return Object.create(obj || Object.prototype);
    };
  }
  /**
  * Private key chain 
  */


  function createKeyChain() {
    return createKey(buildKeyChain);
  }

  function buildKeyChain(key, storeGet) {
    var obj = Object.getPrototypeOf(key);
    return obj === Object.prototype || obj == null ? Object.create(null) : Object.create(storeGet(obj));
  }

  var CallbackControl = Protocol.extend({
    /**
     * Tags this callback for boundary checking.
     * @property {Any} bounds
     * @readOnly
     */
    get bounds() {},

    /**
     * Returns true if this callback can participate in batching.
     * @property {Boolean} canBatch
     * @readOnly
     */
    get canBatch() {},

    /**
     * Returns true if this callback can participate in filtering.
     * @property {Boolean} canFilter
     * @readOnly
     */
    get canFilter() {},

    /**
     * Returns true if this callback can participate in inference.
     * @property {Boolean} canInfer
     * @readOnly
     */
    get canInfer() {},

    /**
     * Gets the callback policy.
     * @property {Function} policy
     * @readOnly
     */
    callbackPolicy: undefined,

    /**
     * Guards the callback dispatch.
     * @method dispatch
     * @param   {Object}   handler     -  target handler
     * @param   {Any}      binding     -  usually Binding
     * @returns {Function} truthy if dispatch can proceed.
     * If a function is returned it will be called after
     * the dispatch with *this* callback as the receiver.
     */
    guardDispatch(handler, binding) {},

    /**
     * Dispatches the callback.
     * @method dispatch
     * @param   {Object}   handler     -  target handler
     * @param   {boolean}  greedy      -  true if handle greedily
     * @param   {Handler}  [composer]  -  composition handler
     * @returns {boolean} true if the callback was handled, false otherwise.
     */
    dispatch(handler, greedy, composer) {}

  });

  /**
   * Annotates invariance.
   * @attribute $eq
   */

  var $eq = $createQualifier();
  /**
   * Annotates use value as is.
   * @attribute $use
   */

  var $use = $createQualifier();
  /**
   * Annotates lazy semantics.
   * @attribute $lazy
   */

  var $lazy = $createQualifier();
  /**
   * Annotates function to be evaluated.
   * @attribute $eval
   */

  var $eval = $createQualifier();
  /**
   * Annotates zero or more semantics.
   * @attribute $all
   */

  var $all = $createQualifier();
  /**
   * Annotates 
   * @attribute use {{#crossLink "Parenting"}}{{/crossLink}} protocol.
   * @attribute $child
   */

  var $child = $createQualifier();
  /**
   * Annotates optional semantics.
   * @attribute $optional
   */

  var $optional = $createQualifier();
  /**
   * Annotates Promise expectation.
   * @attribute $promise
   */

  var $promise = $createQualifier();
  /**
   * Annotates synchronous.
   * @attribute $instant
   */

  var $instant = $createQualifier();
  var nextKey = Symbol();

  function visit(visitor) {
    var next = this[nextKey];

    if ($isFunction(next)) {
      return next.call(this, visitor);
    }
  }
  function $contents(input) {
    if (new.target) {
      this.$getContents = function () {
        return input;
      };

      this[nextKey] = function (visitor) {
        return visitor.call($contents, input);
      };
    } else {
      if ($isSomething(input)) {
        var getContents = input.$getContents;
        return $isFunction(getContents) ? getContents.call(input) : input;
      }
    }
  }
  $contents.prototype.visit = visit;
  $contents.key = Symbol();
  function $createQualifier() {
    var key = Symbol();

    function qualifier(input, ...args) {
      if (new.target) {
        throw new Error("Qualifiers should not be called with the new operator.");
      }

      if (qualifier.test(input)) {
        return input;
      }

      if (!(input instanceof $contents)) {
        input = new $contents(input);
      }

      var next = input[nextKey],
          state = args.length == 0 ? emptyArray : args,
          decorator = Object.create(input, {
        [key]: {
          writable: false,
          configurable: false,
          value: state
        },
        [nextKey]: {
          writable: false,
          configurable: false,
          value: function (visitor) {
            var result = input[nextKey](visitor);
            return visitor.call(qualifier, result, state) || result;
          }
        }
      });
      decorator.visit = visit;
      return decorator;
    }

    qualifier.getArgs = function (input) {
      if ($isSomething(input)) {
        return input[key];
      }
    };

    qualifier.test = function (input) {
      return $isSomething(input) && !!input[key];
    };

    qualifier.key = key;
    return qualifier;
  }

  var _$1 = createKey();

  var TypeFlags = Flags({
    None: 0,
    Lazy: 1 << 1,
    Array: 1 << 2,
    Optional: 1 << 3,
    Invariant: 1 << 4,
    Protocol: 1 << 5
  });
  var qualifiers = {
    [$eq.key](typeInfo) {
      typeInfo.flags = typeInfo.flags.addFlag(TypeFlags.Invariant);
    },

    [$lazy.key](typeInfo) {
      typeInfo.flags = typeInfo.flags.addFlag(TypeFlags.Lazy);
    },

    [$optional.key](typeInfo) {
      typeInfo.flags = typeInfo.flags.addFlag(TypeFlags.Optional);
    },

    [$all.key](typeInfo) {
      typeInfo.flags = typeInfo.flags.addFlag(TypeFlags.Array);
    },

    [$contents.key](input) {
      var type = input,
          flags = TypeFlags.None;

      if (Array.isArray(input)) {
        if (input.length !== 1) {
          throw new SyntaxError("Array type specification expects a single type.");
        }

        type = input[0];
        flags = flags.addFlag(TypeFlags.Array);
      }

      if ($isProtocol(type)) {
        flags = flags.addFlag(TypeFlags.Protocol);
      }

      return new TypeInfo(type, flags);
    }

  };
  class TypeInfo extends exports.Base {
    constructor(type, flags) {
      super();

      if (type && !$isFunction(type)) {
        throw new TypeError("The type is not a constructor function.");
      }

      this.type = type;
      this.flags = flags;
    }

    get type() {
      return _$1(this).type;
    }

    set type(value) {
      var type = this.type;

      if (type) {
        if (type !== value) {
          throw new TypeError("TypeInfo type cannot be changed once set.");
        }

        return;
      }

      _$1(this).type = value;
    }

    get flags() {
      return _$1(this).flags;
    }

    set flags(value) {
      _$1(this).flags = value || TypeFlags.None;
    }

    validate(value, require) {
      var type = this.type,
          flags = this.flags;

      if ($isNothing(value)) {
        if (flags.hasFlag(TypeFlags.Optional)) {
          return true;
        } else if (require) {
          throw new TypeError("The value is nothing.");
        }

        return false;
      }

      if (flags.hasFlag(TypeFlags.Array)) {
        if (!Array.isArray(value)) {
          if (require) {
            throw new TypeError("The value is not an array.");
          }

          return false;
        }

        for (var i = 0; i < value.length; ++i) {
          var item = value[i];

          if ($isNothing(item)) {
            if (require) {
              throw new TypeError(`Array element at index ${i} is nothing.`);
            }

            return false;
          }

          if (!validateType(type, flags, item, i, require)) {
            return false;
          }
        }

        return true;
      }

      return validateType(type, flags, value, null, require);
    }

    merge(otherTypeInfo) {
      var type = this.type,
          otherType = otherTypeInfo.type;

      if ($isNothing(type)) {
        this.type = otherType;
      } else if (otherType && type !== otherType) {
        throw new TypeError("Cannot change type once set.");
      }

      this.flags = this.flags.addFlag(otherTypeInfo.flags);
      return this;
    }

    static parse(spec) {
      if ($isNothing(spec)) {
        return new TypeInfo();
      }

      return spec instanceof $contents ? spec.visit(function (input, state) {
        return this.key in qualifiers ? qualifiers[this.key](input, state) : input;
      }) : qualifiers[$contents.key](spec);
    }

    static registerQualifier(qualifier, visitor) {
      if ($isNothing(qualifier) || !$isSymbol(qualifier.key)) {
        throw new TypeError("The qualifier argument is not valid.");
      }

      if (!$isFunction(visitor)) {
        throw new TypeError("The visitor argument must be a function.");
      }

      qualifiers[qualifier.key] = visitor;
    }

  }

  function validateType(type, flags, value, index, require) {
    if ($isNothing(type)) return true;

    if (type === Boolean) {
      if (!$isBoolean(value)) {
        if (require) {
          if (index == null) {
            throw new TypeError("The value is not a boolean.");
          } else {
            throw new TypeError(`The element at index ${index} is not a boolean.`);
          }
        }

        return false;
      }
    } else if (type === Number) {
      if (!$isNumber(value)) {
        if (require) {
          if (index == null) {
            throw new TypeError("The value is not a number.");
          } else {
            throw new TypeError(`The element at index ${index} is not a number.`);
          }
        }

        return false;
      }
    } else if (type === String) {
      if (!$isString$1(value)) {
        if (require) {
          if (index == null) {
            throw new TypeError("The value is not a string.");
          } else {
            throw new TypeError(`The element at index ${index} is not a string.`);
          }
        }

        return false;
      }
    } else if (flags.hasFlag(TypeFlags.Protocol)) {
      if (!type.isAdoptedBy(value)) {
        if (require) {
          if (index == null) {
            throw new TypeError(`The value does not conform to protocol ${type}.`);
          } else {
            throw new TypeError(`The element at index ${index} does not conform to protocol ${type}.`);
          }
        }

        return false;
      }
    } else if (!(value instanceof type)) {
      if (require) {
        if (index == null) {
          throw new TypeError(`The value is not an instance of ${type}.`);
        } else {
          throw new TypeError(`The element at index ${index} is not an instance of ${type}.`);
        }
      }

      return false;
    }

    return true;
  }

  var designMetadataKey = Symbol("design-metadata"),
      paramTypesKey = "design:paramtypes",
      propertyTypeKey = "design:type",
      returnTypeKey = "design:returnType";
  /**
   * Custom Metadata to bridge Typescript annotations.
   * @class DesignMetadata
   */

  class DesignMetadata extends Metadata {
    static get(metadataKey, target, targetKey) {
      var meta = super.get(metadataKey, target, targetKey);

      if (!meta && metadataKey === designMetadataKey && !this.hasOwn(metadataKey, target, targetKey)) {
        if ($isFunction(target) && !targetKey) {
          meta = this.getOwn(metadataKey, target.prototype, "constructor");
        }

        if (!meta) {
          meta = getDesignFromTypescript(target, targetKey);
        }
      }

      return meta;
    }

    static getOwn(metadataKey, target, targetKey) {
      var meta = super.getOwn(metadataKey, target, targetKey);

      if (!meta && metadataKey === designMetadataKey) {
        if ($isFunction(target) && !targetKey) {
          meta = this.getOwn(metadataKey, target.prototype, "constructor");
        }

        if (!meta) {
          meta = getDesignFromTypescript(target, targetKey);
        }
      }

      return meta;
    }

  }

  function getDesignFromTypescript(target, targetKey) {
    var meta;
    var args = Reflect.getOwnMetadata(paramTypesKey, target, targetKey);

    if (args) {
      meta = {
        args: mergeTypeInfo(args)
      };
      var returnType = Reflect.getOwnMetadata(returnTypeKey, target, targetKey);

      if (returnType) {
        meta.returnType = TypeInfo.parse(returnType);
      }
    } else {
      var propertyType = Reflect.getOwnMetadata(propertyTypeKey, target, targetKey);

      if (propertyType) {
        meta = {
          propertyType: TypeInfo.parse(propertyType)
        };
      } else {
        var _returnType = Reflect.getOwnMetadata(returnTypeKey, target, targetKey);

        if (_returnType) {
          meta = {
            returnType: TypeInfo.parse(_returnType)
          };
        }
      }
    }

    Metadata.define(designMetadataKey, meta, target, targetKey);
    return meta;
  }
  /**
   * Attaches argument/property metadata compatible with Typescript.
   * @method design
   */


  var design = DesignMetadata.decorator(designMetadataKey, (target, key, descriptor, types) => {
    if ($isNothing(descriptor)) {
      var meta = design.getOrCreateOwn(target, "constructor", () => ({})),
          metap = design.getOrCreateOwn(target.prototype, "constructor", () => ({})),
          args = mergeTypeInfo(types, meta ? meta.args : null);
      meta.args = metap.args = args;
      return;
    }

    var {
      value
    } = descriptor;

    if ($isFunction(value)) {
      var _meta = design.getOrCreateOwn(target, key, () => ({})),
          _args = mergeTypeInfo(types, _meta ? _meta.args : null);

      _meta.args = _args;
    } else if (types.length !== 1) {
      throw new SyntaxError(`@design for property '${key}' expects a single property type.`);
    } else if (DesignMetadata.has(designMetadataKey, target, key)) {
      throw new SyntaxError(`@design for property '${key}' should only be specified on getter or setter.`);
    } else {
      var _meta2 = design.getOrCreateOwn(target, key, () => ({})),
          _args2 = mergeTypeInfo(types, _meta2 ? _meta2.args : null);

      _meta2.propertyType = _args2[0];
    }
  });
  /**
   * Attaches method return metadata compatible with Typescript.
   * @method returns
   */

  var returns = DesignMetadata.decorator(designMetadataKey, (target, key, descriptor, args) => {
    if ($isNothing(descriptor)) {
      throw new SyntaxError(`@returns cannot be applied to classes.`);
    }

    var {
      value
    } = descriptor;

    if ($isFunction(value)) {
      if (key === "constructor") {
        throw new SyntaxError(`@returns cannot be applied to constructors.`);
      }

      if (args.length != 1 || args[0] == null) {
        throw new SyntaxError(`@returns for method '${key}' expects a single return type.`);
      }

      var meta = returns.getOrCreateOwn(target, key, () => ({})),
          returnType = TypeInfo.parse(args[0]);
      meta.returnType = returnType;
    } else {
      throw new SyntaxError(`@returns ('${key}') cannot be applied to properties.`);
    }
  });
  var type = createTypeInfoFlagsDecorator();
  var all = createTypeInfoFlagsDecorator(TypeFlags.Array);
  var exact = createTypeInfoFlagsDecorator(TypeFlags.Invariant);
  var lazy = createTypeInfoFlagsDecorator(TypeFlags.Lazy);
  var optional = createTypeInfoFlagsDecorator(TypeFlags.Optional);

  function createTypeInfoFlagsDecorator(typeFlags) {
    return createTypeInfoDecorator((key, typeInfo, [type, flags]) => {
      if (type) {
        typeInfo.merge(TypeInfo.parse(type));
      }

      if (typeFlags) {
        typeInfo.flags = typeInfo.flags.addFlag(typeFlags);
      }

      if (flags) {
        typeInfo.flags = typeInfo.flags.addFlag(flags);
      }
    });
  }

  function createTypeInfoDecorator(configure) {
    if (!$isFunction(configure)) {
      throw new TypeError("The configure argument must be a function.");
    }

    return function (target, key, parameterIndex) {
      if (target != null && (key == null || typeof key == "string") && typeof parameterIndex == "number") {
        return decorator(target, key, parameterIndex, emptyArray);
      }

      var args = [...arguments];
      return function () {
        return decorator(...arguments, args);
      };
    };

    function decorator(target, key, parameterIndex, configArgs) {
      var signature = design.getOrCreateOwn(target, key || "constructor", () => ({})),
          args = signature.args || [],
          typeInfo = args[parameterIndex] || (args[parameterIndex] = new TypeInfo());
      configure(key, typeInfo, configArgs);

      if (!signature.args) {
        signature.args = args;
      }
    }
  }

  function mergeTypeInfo(types, args) {
    var result = types.map((type, index) => {
      var otherInfo;
      if (args) otherInfo = args[index];
      if (type == null) return otherInfo;
      var typeInfo = TypeInfo.parse(type);
      return otherInfo == null ? typeInfo : otherInfo.merge(typeInfo);
    });

    if (args && args.length > types.length) {
      for (var i = types.length; i < args.length; ++i) {
        result.push(args[i]);
      }
    }

    return result;
  }

  var _$2 = createKeyChain();
  /**
   * Helper class to simplify array manipulation.
   * @class ArrayManager
   * @constructor
   * @param  {Array}  [...items]  -  initial items
   * @extends Base
   */


  class ArrayManager extends exports.Base {
    constructor(items) {
      super();
      _$2(this).items = [];

      if (items) {
        this.append(items);
      }
    }
    /** 
     * Gets the array.
     * @method getItems
     * @returns  {Array} array.
     */


    getItems() {
      return _$2(this).items;
    }
    /** 
     * Gets the item at array `index`.
     * @method getIndex
     * @param    {number}  index - index of item
     * @returns  {Any} item at index.
     */


    getIndex(index) {
      var {
        items
      } = _$2(this);

      if (items.length > index) {
        return items[index];
      }
    }
    /** 
     * Sets `item` at array `index` if empty.
     * @method setIndex
     * @param    {number}  index - index of item
     * @param    {Any}     item  - item to set
     * @returns  {ArrayManager} array manager.
     * @chainable
     */


    setIndex(index, item) {
      var {
        items
      } = _$2(this);

      if (items[index] === undefined) {
        items[index] = this.mapItem(item);
      }

      return this;
    }
    /** 
     * Inserts `item` at array `index`.
     * @method insertIndex
     * @param    {number}   index - index of item
     * @param    {Item}     item  - item to insert
     * @returns  {ArrayManager} array manager.
     * @chainable
     */


    insertIndex(index, item) {
      _$2(this).items.splice(index, 0, this.mapItem(item));

      return this;
    }
    /** 
     * Replaces `item` at array `index`.
     * @method replaceIndex
     * @param    {number}   index - index of item
     * @param    {Item}     item  - item to replace
     * @returns  {ArrayManager} array manager.
     * @chainable
     */


    replaceIndex(index, item) {
      _$2(this).items[index] = this.mapItem(item);
      return this;
    }
    /** 
     * Removes the item at array `index`.
     * @method removeIndex
     * @param    {number}   index - index of item
     * @returns  {ArrayManager} array manager.
     * @chainable
     */


    removeIndex(index) {
      var {
        items
      } = _$2(this);

      if (items.length > index) {
        items.splice(index, 1);
      }

      return this;
    }
    /** 
     * Appends one or more items to the end of the array.
     * @method append
     * @returns  {ArrayManager} array manager.
     * @chainable
     */


    append()
    /* items */
    {
      var newItems;

      if (arguments.length === 1 && Array.isArray(arguments[0])) {
        newItems = arguments[0];
      } else if (arguments.length > 0) {
        newItems = arguments;
      }

      if (newItems) {
        for (var i = 0; i < newItems.length; ++i) {
          _$2(this).items.push(this.mapItem(newItems[i]));
        }
      }

      return this;
    }
    /** 
     * Merges the items into the array.
     * @method merge
     * @param    {Array}  items - items to merge from
     * @returns  {ArrayManager} array manager.
     * @chainable
     */


    merge(items) {
      for (var index = 0; index < items.length; ++index) {
        var item = items[index];

        if (item !== undefined) {
          this.setIndex(index, item);
        }
      }

      return this;
    }
    /** 
     * Optional mapping for items before adding to the array.
     * @method mapItem
     * @param    {Any}  item  -  item to map
     * @returns  {Any}  mapped item.
     */


    mapItem(item) {
      return item;
    }
    /** 
     * Returns an Iterable over the managed array.
     * @returns  {Iterable}  the array iterator.
     */


    [Symbol.iterator]() {
      return this.getItems()[Symbol.iterator]();
    }

  }
  var prevSymbol = Symbol("prev"),
      nextSymbol = Symbol("next"),
      indexSymbol = Symbol("index");
  /**
   * Maintains a simple doublely-linked list with indexing.
   * Indexes are partially ordered according to the order comparator.
   * @class IndexedList
   * @constructor
   * @param  {Function}  order  -  partially orders items
   * @extends Base
   */

  class IndexedList extends exports.Base {
    constructor(order = defaultOrder) {
      super();

      var _this = _$2(this);

      _this.index = Object.create(null);
      _this.order = order;
    }
    /** 
     * Determines if list is empty.
     * @property isEmpty
     * @returns  {boolean}  true if list is empty, false otherwise.
     */


    get isEmpty() {
      return !_$2(this).head;
    }
    /** 
     * Gets the first node at `index`.
     * @method getFirst
     * @param    {Any} index  -  index of node
     * @returns  {Any}  the first node at index.
     */


    getFirst(index) {
      return index && _$2(this).index[index];
    }
    /** 
     * Inserts `node` at `index`.
     * @method insert
     * @param  {Any}  node   -  node to insert
     * @param  {Any}  index  -  index to insert at
     * @returns  {IndexedList}  the updated list.
     * @chainable
     */


    insert(node, index) {
      var indexedNode = this.getFirst(index);
      var insert = indexedNode;

      if (index) {
        insert = insert || _$2(this).head;

        while (insert && _$2(this).order(node, insert) >= 0) {
          insert = insert[nextSymbol];
        }
      }

      if (insert) {
        var prev = insert[prevSymbol];
        node[nextSymbol] = insert;
        node[prevSymbol] = prev;
        insert[prevSymbol] = node;

        if (prev) {
          prev[nextSymbol] = node;
        }

        if (_$2(this).head === insert) {
          _$2(this).head = node;
        }
      } else {
        node[nextSymbol] = null;

        var tail = _$2(this).tail;

        if (tail) {
          node[prevSymbol] = tail;
          tail[nextSymbol] = node;
        } else {
          _$2(this).head = node;
          node[prevSymbol] = null;
        }

        _$2(this).tail = node;
      }

      if (index) {
        node[indexSymbol] = index;

        if (!indexedNode) {
          _$2(this).index[index] = node;
        }
      }

      return this;
    }
    /** 
     * Removes `node` from the list.
     * @method remove
     * @param  {Any}  node  -  node to remove
     * @returns  {IndexedList}  the updated list.
     * @chainable
     */


    remove(node) {
      var prev = node[prevSymbol],
          next = node[nextSymbol];

      if (prev) {
        if (next) {
          prev[nextSymbol] = next;
          next[prevSymbol] = prev;
        } else {
          _$2(this).tail = prev;
          delete prev[nextSymbol];
        }
      } else if (next) {
        _$2(this).head = next;
        delete next[prevSymbol];
      } else {
        delete _$2(this).head;
        delete _$2(this).tail;
      }

      var index = node[indexSymbol];

      if (this.getFirst(index) === node) {
        if (next && next[indexSymbol] === index) {
          _$2(this).index[index] = next;
        } else {
          delete _$2(this).index[index];
        }
      }

      return this;
    }
    /** 
     * Returns an Iterator from the first index node.
     * If no index is present, it starts from the head.
     * @method indexed
     * @param  {Any}  index  -  index to iterate from.
     * @returns  {Iterator}  the indexed iterator.
     */


    *fromIndex(index) {
      var node = this.getFirst(index) || _$2(this).head;

      while (node) {
        yield node;
        node = node[nextSymbol];
      }
    }
    /** 
     * Returns an Iterable over the indexed list.
     * @returns  {Iterable}  the list iterator.
     */


    *[Symbol.iterator]() {
      var node = _$2(this).head;

      while (node) {
        yield node;
        node = node[nextSymbol];
      }
    }

  }

  function defaultOrder(a, b) {
    if (a === undefined && b === undefined) {
      return 0;
    }

    if (a === undefined) {
      return 1;
    }

    if (b === undefined) {
      return -1;
    }

    if (a < b) {
      return -1;
    }

    if (a > b) {
      return 1;
    }

    return 0;
  }

  class Binding {
    constructor(constraint, owner, handler, key, removed) {
      if (new.target === Binding) {
        throw new Error("Binding cannot be instantiated.  Use Binding.create().");
      }

      this.constraint = constraint;
      this.owner = owner;
      this.handler = handler;
      this.key = key;

      if (removed) {
        this.removed = removed;
      }
    }

    getMetadata(metadata) {
      if ($isNothing(metadata)) {
        throw new Error("The metadata is required.");
      }

      var get = metadata.get;

      if (!$isFunction(get)) {
        throw new Error("The metadata.get method is missing.");
      }

      var key = this.key;
      if ($isNothing(key)) return;
      var owner = this.owner;
      if ($isNothing(owner)) return;
      return get.call(metadata, owner, key);
    }

    getParentMetadata(metadata) {
      if ($isNothing(metadata)) {
        throw new Error("The metadata is required.");
      }

      var get = metadata.get;

      if (!$isFunction(get)) {
        throw new Error("The metadata.get method is missing.");
      }

      var key = this.key;
      if ($isNothing(key)) return;
      var owner = this.owner,
          parent = $isFunction(owner) ? owner : $classOf(owner);
      return get.call(metadata, parent);
    }

    static create(constraint, owner, handler, key, removed) {
      var bindingType;
      var invariant = $eq.test(constraint),
          custom = $eval.test(constraint);
      constraint = $contents(constraint);

      if ($isNothing(constraint)) {
        bindingType = invariant ? BindingNone : BindingEverything;
      } else if (custom) {
        bindingType = BindingCustom;
      } else if ($isProtocol(constraint)) {
        bindingType = invariant ? BindingInvariant : BindingProtocol;
      } else if ($isFunction(constraint)) {
        bindingType = invariant ? BindingInvariant : BindingClass;
      } else if ($isString$1(constraint)) {
        bindingType = BindingString;
      } else if (constraint instanceof RegExp) {
        bindingType = invariant ? BindingNone : BindingRegExp;
      } else {
        bindingType = BindingNone;
      }

      return new bindingType(constraint, owner, handler, key, removed);
    }

  }

  class BindingNone extends Binding {
    match() {
      return false;
    }

  }

  class BindingInvariant extends Binding {
    match(match) {
      return this.constraint === match;
    }

  }

  class BindingEverything extends Binding {
    match(match, variance) {
      return variance !== Variance.Invariant;
    }

  }

  class BindingProtocol extends Binding {
    match(match, variance) {
      var constraint = this.constraint;

      if (constraint === match) {
        return true;
      } else if (variance === Variance.Covariant) {
        return $isProtocol(match) && match.isAdoptedBy(constraint);
      } else if (variance === Variance.Contravariant) {
        return !$isString$1(match) && constraint.isAdoptedBy(match);
      }

      return false;
    }

  }

  class BindingClass extends Binding {
    match(match, variance) {
      var constraint = this.constraint;
      if (constraint === match) return true;

      if (variance === Variance.Contravariant) {
        return match.prototype instanceof constraint;
      }

      if (variance === Variance.Covariant) {
        return match.prototype && (constraint.prototype instanceof match || $isProtocol(match) && match.isAdoptedBy(constraint));
      }

      return false;
    }

  }

  class BindingString extends Binding {
    match(match, variance) {
      if (!$isString$1(match)) return false;
      return variance === Variance.Invariant ? this.constraint == match : this.constraint.toLowerCase() == match.toLowerCase();
    }

  }

  class BindingRegExp extends Binding {
    match(match, variance) {
      return variance !== Variance.Invariant && this.constraint.test(match);
    }

  }

  class BindingCustom extends Binding {
    match(match, variance) {
      return this.constraint.call(this, match, variance);
    }

  }

  var BindingScope = Protocol.extend({
    /**
     * Gets associated binding metadata.
     * @property {BindingMetadata} metadata
     * @readOnly
     */
    get metadata() {}

  });

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

  var _$3 = createKey();

  class BindingMetadata {
    constructor() {
      _defineProperty(this, "name", undefined);

      _$3(this).values = new Map();
    }

    get isEmpty() {
      return $isNothing(this.name) && _$3(this).values.size === 0;
    }

    has(key) {
      if ($isNothing(key)) {
        throw new Error("The key is required.");
      }

      return _$3(this).values.has(key);
    }

    get(key) {
      if ($isNothing(key)) {
        throw new Error("The key is required.");
      }

      return _$3(this).values.get(key);
    }

    set(key, value) {
      if ($isNothing(key)) {
        throw new Error("The key argument is required.");
      }

      return _$3(this).values.set(key, value);
    }

    mergeInto(other) {
      if (!(other instanceof BindingMetadata)) {
        throw new TypeError("The other argument is not a BindingMetadata.");
      }

      for (var [key, value] of _$3(this).values) {
        other.set(key, value);
      }
    }

  }

  var _dec$1, _class$1;

  var _$4 = createKeyChain();
  /**
   * Callback representing the covariant resolution of a key.
   * @class Inquiry
   * @constructor
   * @param   {any}      key    -  inquiry key
   * @param   {boolean}  many   -  inquiry cardinality
   * @param   {Inquiry}  parent -  parent inquiry
   * @extends Base
   */


  var Inquiry = (_dec$1 = conformsTo(CallbackControl, BindingScope), _dec$1(_class$1 = class Inquiry extends exports.Base {
    constructor(key, many, parent) {
      if ($isNothing(key)) {
        throw new Error("The key argument is required.");
      }

      super();

      var _this = _$4(this);

      if ($isSomething(parent)) {
        if (!(parent instanceof Inquiry)) {
          throw new TypeError("The parent is not an Inquiry.");
        }

        _this.parent = parent;
      }

      _this.key = key;
      _this.many = !!many;
      _this.resolutions = [];
      _this.promises = [];
      _this.instant = $instant.test(key);
      _this.metadata = new BindingMetadata();
    }

    get key() {
      return _$4(this).key;
    }

    get isMany() {
      return _$4(this).many;
    }

    get parent() {
      return _$4(this).parent;
    }

    get handler() {
      return _$4(this).handler;
    }

    get binding() {
      return _$4(this).binding;
    }

    get metadata() {
      return _$4(this).metadata;
    }

    get resolutions() {
      return _$4(this).resolutions;
    }

    get callbackPolicy() {
      return provides.policy;
    }

    get callbackResult() {
      if (_$4(this).result === undefined) {
        var _resolutions = this.resolutions,
            promises = _$4(this).promises;

        if (promises.length == 0) {
          _$4(this).result = this.isMany ? _resolutions : _resolutions[0];
        } else {
          _$4(this).result = this.isMany ? Promise.all(promises).then(() => _resolutions) : Promise.all(promises).then(() => _resolutions[0]);
        }
      }

      return _$4(this).result;
    }

    set callbackResult(value) {
      _$4(this).result = value;
    }

    isSatisfied(resolution, greedy, composer) {
      return true;
    }

    resolve(resolution, strict, greedy, composer) {
      var resolved;
      if ($isNothing(resolution)) return false;

      if (!strict && Array.isArray(resolution)) {
        resolved = $flatten(resolution, true).reduce((s, r) => include.call(this, r, false, greedy, composer) || s, false);
      } else {
        resolved = include.call(this, resolution, strict, greedy, composer);
      }

      if (resolved) {
        _$4(this).result = undefined;
      }

      return resolved;
    }

    acceptPromise(promise) {
      return promise.catch(Undefined$1);
    }

    guardDispatch(handler, binding) {
      if (!this.inProgress(handler, binding)) {
        return function (self, h, b) {
          _$4(self).handler = handler;
          _$4(self).binding = binding;
          return function () {
            _$4(self).handler = h;
            _$4(self).binding = b;
          };
        }(this, _$4(this).handler, _$4(this).binding);
      }
    }

    inProgress(handler, binding) {
      return _$4(this).handler === handler && _$4(this).binding === binding || this.parent && this.parent.inProgress(handler, binding);
    }

    dispatch(handler, greedy, composer) {
      var resolved = false;

      if (_$4(this).metadata.isEmpty) {
        // check if handler implicitly satisfies key
        var implied = Binding.create(this.key);

        if (implied.match($classOf(handler), Variance.Contravariant)) {
          resolved = this.resolve(handler, false, greedy, composer);
          if (resolved && !greedy) return true;
        }
      }

      var resolutions = this.resolutions,
          promises = _$4(this).promises,
          count = resolutions.length + promises.length;

      resolved = provides.dispatch(handler, this, this, this.key, composer, this.isMany, (r, s, c) => this.resolve(r, s, greedy, c)) || resolved;
      return resolved || resolutions.length + promises.length > count;
    }

    toString() {
      return `Inquiry ${this.isMany ? "many " : ""}| ${this.key}`;
    }

  }) || _class$1);

  function include(resolution, strict, greedy, composer) {
    if ($isNothing(resolution)) return false;

    if ($isPromise(resolution)) {
      if (_$4(this).instant) return false;
      var _resolutions2 = this.resolutions,
          promise = this.acceptPromise(resolution.then(res => {
        if (Array.isArray(res)) {
          var satisfied = res.filter(r => r && this.isSatisfied(r, greedy, composer));

          _resolutions2.push(...satisfied);
        } else if (res && this.isSatisfied(res, greedy, composer)) {
          _resolutions2.push(res);
        }
      }));

      if (promise != null) {
        _$4(this).promises.push(promise);
      }
    } else if (!this.isSatisfied(resolution, greedy, composer)) {
      return false;
    } else if (strict) {
      this.resolutions.push(resolution);
    } else if (Array.isArray(resolution)) {
      var satisfied = res.filter(r => r && this.isSatisfied(r, greedy, composer));
      resolutions.push(...satisfied);
    } else {
      this.resolutions.push(resolution);
    }

    return true;
  }

  class BindingConstraint {
    /**
     * Requires the binding metadata to be present.
     * @method require
     * @param  {BindingMetadata} metadata  -  binding metadata
     */
    require(metadata) {
      throw new Error(`${this.constructor.name} did not implement BindingConstraint.require.`);
    }
    /**
     * Checks if the constraint satisfies the binding metadata.
     * @method matches
     * @param  {BindingMetadata} metadata  -  binding metadata
     * @returns {Boolean} true if the metadata is satified.
     */


    matches(metadata) {
      throw new Error(`${this.constructor.name} did not implement BindingConstraint.matches.`);
    }

  }

  var KeyResolving = StrictProtocol.extend({
    validate(typeInfo) {},

    resolve(typeInfo, handler, parent) {}

  });
  TypeInfo.implement({
    addConstraint(constraint) {
      if ($isNothing(constraint)) {
        throw new Error("The constraint argument is required.");
      }

      if (!(constraint instanceof BindingConstraint)) {
        throw new TypeError("The constraint argument is not a BindingConstraint.");
      }

      var constraints = this.constraints,
          require = b => b.require(constraint);

      this.constraints = $isNothing(constraints) ? require : $compose2(require, constraints);
    },

    merge(otherTypeInfo) {
      this.base(otherTypeInfo);
      var keyResolver = this.keyResolver,
          constraints = this.constraints,
          otherConstraints = otherTypeInfo.constraints;

      if ($isNothing(keyResolver)) {
        this.keyResolver = otherTypeInfo.keyResolver;
      }

      if (!$isNothing(otherConstraints)) {
        this.constraints = $isNothing(constraints) ? otherConstraints : $compose2(otherConstraints, constraints);
      }
    }

  });

  var _dec$2, _class$2;
  var KeyResolver = (_dec$2 = conformsTo(KeyResolving), _dec$2(_class$2 = class KeyResolver extends exports.Base {
    resolve(typeInfo, handler, parent) {
      var inquiry = this.createInquiry(typeInfo, parent);

      if (typeInfo.flags.hasFlag(TypeFlags.Lazy)) {
        return ((created, dep) => () => {
          if (!created) {
            created = true;
            dep = resolveKeyInfer.call(this, inquiry, typeInfo, handler);
          }

          return dep;
        })();
      }

      return resolveKeyInfer.call(this, inquiry, typeInfo, handler);
    }

    resolveKey(inquiry, typeInfo, handler) {
      return handler.resolve(inquiry, typeInfo.constraints);
    }

    resolveKeyAll(inquiry, typeInfo, handler) {
      return handler.resolveAll(inquiry, typeInfo.constraints);
    }

    createInquiry(typeInfo, parent) {
      var many = typeInfo.flags.hasFlag(TypeFlags.Array);
      return new Inquiry(typeInfo.type, many, parent);
    }

  }) || _class$2);

  function resolveKeyInfer(inquiry, typeInfo, handler) {
    if (inquiry.isMany) {
      return this.resolveKeyAll(inquiry, typeInfo, handler);
    } else {
      var optional = typeInfo.flags.hasFlag(TypeFlags.Optional),
          value = this.resolveKey(inquiry, typeInfo, handler);

      if ($isNothing(value)) {
        return optional ? $optional(value) : value;
      }

      if ($isPromise(value)) {
        return value.then(result => {
          if ($isNothing(result) && !optional) {
            throw new Error(`Unable to resolve key '${inquiry.key}'.`);
          }

          return result;
        });
      }

      return value;
    }
  }

  /**
   * Protocol for providing filters.
   * @class FilteringProvider
   * @extends Protocol
   */

  var FilteringProvider = Protocol.extend({
    /**
     * Reports if the filters are required.
     * @property {Boolean} required
     * @readOnly
     */
    get required() {},

    /**
     * Determines if any filters apply to the `callback`.
     * @method appliesTo
     * @returns {Boolean} true if one or more filters apply,
     * false if none apply, or undefined if unknown.
     */
    appliesTo(callback) {},

    /**
     * Gets the filters for the `callback`.
     * @method getFilters
     * @param  {Binding}   binding   -  handler binding
     * @param  {Any}       callback  -  callback
     * @param  {Handler}   composer  -  handler composer
     * @returns {Boolean} true if one or more filters apply.
     */
    getFilters(binding, callback, composer) {}

  });
  /**
   * Protocol for filtering callbacks.
   * @class Filtering
   * @extends Protocol
   */

  var Filtering = Protocol.extend({
    /**
     * Gets the filter order.
     * @property {Number} order
     * @readOnly
     */
    get order() {},

    /**
     * Executes the filter for the `callback`.
     * @method next
     * @param  {Object}    ...dependecies  -  dependencies
     * @param  {Object}    context         -  context information which include
     *    Next, Binding, FilteringProvider and Composer
     * @returns {Any} the result of the filter.
     */
    next(callback, next, context) {}

  });
  /**
   * Protocol for filter containment.
   * @class Filtered
   * @extends Protocol
   */

  var Filtered = Protocol.extend({
    /**
     * Returns the providers.
     * @property {FilteringProvider} ...filters
     * @readOnly
     */
    get filters() {},

    /**
     * Adds the `providers` to this object.
     * @method addFilters
     * @param  {FilteringProvider}  ...providers  -  providers
     */
    addFilters(providers) {},

    /**
     * Removes the `providers` from this object.
     * @method removeFilters
     * @param  {FilteringProvider}  ...providers  -  providers
     */
    removeFilters(providers) {},

    /**
     * Removes all the `providers` from this object.
     * @method removeAllFilters
     */
    removeAllFilters() {}

  });

  var _dec$3, _class$3;

  var _$5 = createKey();

  var FilteredScope = (_dec$3 = conformsTo(Filtered), _dec$3(_class$3 = class FilteredScope extends exports.Base {
    constructor(providers) {
      super();
      this.addFilters.apply(this, arguments);
    }

    get filters() {
      var filters = _$5(this).filters;

      return $isNothing(filters) ? emptyArray : [...filters];
    }

    addFilters(providers) {
      providers = getProviders.apply(this, arguments);

      if ($isNothing(providers) || providers.length === 0) {
        return;
      }

      var filters = _$5(this).filters;

      if ($isNothing(filters)) {
        _$5(this).filters = new Set(providers);
      } else {
        providers.forEach(p => filters.add(p));
      }
    }

    removeFilters(providers) {
      providers = getProviders.apply(this, arguments);

      if ($isNothing(providers) || providers.length === 0) {
        return;
      }

      var filters = _$5(this).filters;

      if ($isNothing(filters)) return;
      providers.forEach(p => filters.delete(p));
    }

    removeAllFilters() {
      var filters = _$5(this).filters;

      if (filters) {
        filters.clear();
      }
    }

  }) || _class$3);

  function getProviders(providers) {
    if ($isNothing(providers)) return;
    return Array.isArray(providers) ? providers : Array.from(arguments);
  }

  var _dec$4, _class$4;

  var _$6 = createKeyChain();

  var FilterInstanceProvider = (_dec$4 = conformsTo(FilteringProvider), _dec$4(_class$4 = class FilterInstanceProvider extends exports.Base {
    constructor(filters, required) {
      if ($isNothing(filters) || filters.length === 0) {
        throw new Error("At least one filter must be provided.");
      }

      super();
      _$6(this).required = required === true;
      _$6(this).filters = [...new Set(filters)];
    }

    get required() {
      return _$6(this).required;
    }

    getFilters(binding, callback, composer) {
      return _$6(this).filters;
    }

  }) || _class$4);

  var _$7 = createKey();

  class FilterSpec {
    constructor(filterType, {
      required,
      order
    } = {}) {
      if ($isNothing(filterType)) {
        throw new Error("FilterSpec requires a filterType.");
      }

      if (!$isNothing(order) && !$isNumber(order)) {
        throw new TypeError("The order must be a number.");
      }

      var _this = _$7(this);

      _this.filterType = filterType;
      _this.required = required === true;
      _this.order = order;
    }

    get filterType() {
      return _$7(this).filterType;
    }

    get required() {
      return _$7(this).required;
    }

    get order() {
      return _$7(this).order;
    }

  }

  var _dec$5, _class$5;

  var _$8 = createKey();

  var FilterSpecProvider = (_dec$5 = conformsTo(FilteringProvider), _dec$5(_class$5 = class FilterSpecProvider {
    constructor(filterSpec) {
      if ($isNothing(filterSpec)) {
        throw new Error("The filterSpec is required.");
      }

      _$8(this).filterSpec = filterSpec;
    }

    get filterSpec() {
      return _$8(this).filterSpec;
    }

    get filterType() {
      return this.filterSpec.filterType;
    }

    get required() {
      return this.filterSpec.required;
    }

    getFilters(binding, callback, composer) {
      var spec = _$8(this).filterSpec,
          filter = composer.resolve(spec.filterType);

      if ($isNothing(filter)) return emptyArray;

      if (!$isNothing(spec.order)) {
        filter.order = order;
      }

      return [filter];
    }

  }) || _class$5);

  var filterMetadataKey = Symbol("filter-metadata"),
      skipFilterMetadataKey = Symbol("skipFilter-metadata"),
      allowMultipleMetadataKey = Symbol("allowMultiple");
  function createFilterDecorator(createFilterProvider, addAll) {
    if (!$isFunction(createFilterProvider)) {
      throw new Error("The createFilterProvider argument must be a function.");
    }

    var decorator = Metadata.decorator(filterMetadataKey, (target, key, descriptor, args) => {
      var provider = createFilterProvider(target, key, descriptor, args);
      if ($isNothing(provider)) return;

      if ($isNothing(descriptor)) {
        var filters = decorator.getOrCreateOwn(target, "constructor", () => new FilteredScope());
        decorator.getOrCreateOwn(target.prototype, "constructor", () => filters);
        filters.addFilters(provider);
      } else {
        var _filters = decorator.getOrCreateOwn(target, key, () => new FilteredScope());

        _filters.addFilters(provider);
      }
    });

    if (addAll === true) {
      decorator.all = Metadata.decorator(filterMetadataKey, (target, key, descriptor, args) => {
        var provider = createFilterProvider(target, key, descriptor, args);
        if ($isNothing(provider)) return;

        if ($isNothing(descriptor)) {
          var filters = decorator.getOrCreateOwn(target, () => new FilteredScope());
          filters.addFilters(provider);
        } else {
          throw new SyntaxError("Filters with the all modifier can only be applied to classes.");
        }
      });
    }

    return decorator;
  }
  function createFilterSpecDecorator(filterSpec, addAll) {
    if (filterSpec instanceof FilterSpec) {
      return createFilterDecorator(_ => new FilterSpecProvider(filterSpec), addAll);
    }

    if ($isFunction(filterSpec)) {
      return createFilterDecorator((target, key, descriptor, args) => {
        var spec = filterSpec(args);

        if (!(spec instanceof FilterSpec)) {
          throw new TypeError("The filterSpec function did not return a FilterSpec.");
        }

        return new FilterSpecProvider(spec);
      }, addAll);
    }

    throw new TypeError("The filterSpec argument must be a FilterSpec or a function that return one.");
  }
  var filter = createExplicitFilterDecorator();
  filter.all = createExplicitFilterDecorator(true);

  function createExplicitFilterDecorator(addAll) {
    return createFilterDecorator((target, key, descriptor, [filterType, options]) => {
      if ($isNothing(filterType)) {
        throw new Error("@filter requires a filterType.");
      }

      var filterSpec = new FilterSpec(filterType, options);
      return new FilterSpecProvider(filterSpec);
    }, addAll);
  }

  var skipFilters = Metadata.decorator(skipFilterMetadataKey, (target, key, descriptor, args) => {
    if (args.length > 0) {
      throw new SyntaxError("@skipFilters expects no arguments.");
    }

    if ($isNothing(descriptor)) {
      skipFilters.getOrCreateOwn(target, "constructor", () => true);
      skipFilters.getOrCreateOwn(target.prototype, "constructor", () => true);
    } else {
      skipFilters.getOrCreateOwn(target, key, () => true);
    }
  });
  skipFilters.all = Metadata.decorator(skipFilterMetadataKey, (target, key, descriptor, args) => {
    if (args.length > 0) {
      throw new SyntaxError("@skipFilters.all expects no arguments.");
    }

    if ($isNothing(descriptor)) {
      skipFilters.getOrCreateOwn(target, () => true);
    } else {
      throw new SyntaxError("@skipFilters.all can only be applied to classes.");
    }
  });
  var allowMultiple = Metadata.decorator(allowMultipleMetadataKey, (target, key, descriptor, [allow]) => {
    if (!$isNothing(descriptor)) {
      throw new SyntaxError("@allowMultiple can only be applied to classes.");
    }

    if ($isNothing(allow)) {
      allow = false;
    } else if (!$isBoolean(allow)) {
      throw new TypeError("@allowMultiple accepts an optional boolean argument.");
    }

    allowMultiple.getOrCreateOwn(target, () => allow);
    allowMultiple.getOrCreateOwn(target, "constructor", () => allow);
    allowMultiple.getOrCreateOwn(target.prototype, "constructor", () => allow);
  });

  var _$9 = createKey();
  /**
   * Identifies a callback that could not be handled.
   * @class NotHandledError
   * @constructor
   * @param {Object}  callback  -  unhandled callback
   * @param {string}  message   -  message
   * @extends Error
   */


  class NotHandledError extends Error {
    constructor(callback, message) {
      super(message || `${callback} not handled.`);
      _$9(this).callback = callback;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }

    get callback() {
      return _$9(this).callback;
    }

  }
  /**
   * Identifies a rejected callback.  This usually occurs from aspect processing.
   * @class RejectedError
   * @constructor
   * @param {Object}  callback  -  rejected callback
   * @extends Error
   */

  class RejectedError extends Error {
    constructor(callback, message) {
      super(message || `${callback} rejected.`);
      _$9(this).callback = callback;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }

    get callback() {
      return _$9(this).callback;
    }

  }
  /**
   * Identifies a timeout error.
   * @class TimeoutError
   * @constructor
   * @param {Object}  callback  -  timed out callback
   * @param {string}  message   -  timeout message
   * @extends Error
   */

  class TimeoutError extends Error {
    constructor(callback, message) {
      super(message || `${callback} timeout.`);
      _$9(this).callback = callback;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }

    get callback() {
      return _$9(this).callback;
    }

  }

  var _$a = createKey(),
      defaultKeyResolver = new KeyResolver(),
      descriptorMetadataKey = Symbol("descriptor-metadata");

  class HandlerDescriptor extends FilteredScope {
    constructor(owner) {
      if ($isNothing(owner)) {
        throw new Error("The owner argument is required.");
      }

      super();
      _$a(this).owner = owner;
      _$a(this).bindings = new Map();
    }

    get owner() {
      return _$a(this).owner;
    }

    get policies() {
      return [..._$a(this).bindings.keys()];
    }

    get bindings() {
      return [..._$a(this).bindings.entries()];
    }

    getBindings(policy) {
      requireValidPolicy(policy);
      return _$a(this).bindings.get(policy);
    }

    addBinding(policy, constraint, handler, key, removed) {
      requireValidPolicy(policy);
      var binding = constraint instanceof Binding ? constraint : Binding.create(constraint, this.owner, handler, key, removed);
      return addBinding.call(this, policy, binding);
    }

    removeBindings(policy) {
      requireValidPolicy(policy);

      var owner = this.owner,
          bindings = _$a(this).bindings,
          policyBindings = bindings.get(policy);

      if (policyBindings == null) return;

      for (var binding of policyBindings) {
        if (binding.removed) {
          binding.removed(owner);
        }
      }

      bindings.delete(policy);
    }

    dispatch(policy, handler, callback, rawCallback, constraint, composer, greedy, results) {
      requireValidPolicy(policy);
      var variance = policy.variance;
      constraint = constraint || callback;

      if (constraint) {
        if ($eq.test(constraint)) {
          variance = Variance.Invariant;
        }

        constraint = $contents(constraint);

        if ($isObject(constraint)) {
          constraint = $classOf(constraint);
        }
      }

      if (results) {
        results = results.bind(callback);
      }

      var index = createIndex(constraint);
      var dispatched = false;

      for (var descriptor of this.getDescriptorChain(true)) {
        dispatched = dispatch.call(descriptor, policy, handler, callback, rawCallback, constraint, index, variance, composer, greedy, results) || dispatched;
        if (dispatched && !greedy) return true;
      }

      return dispatched;
    }

    *getDescriptorChain(includeSelf) {
      if (includeSelf) yield this;
      yield* HandlerDescriptor.getChain(Object.getPrototypeOf(this.owner));
    }
    /**
     * Metadata management methods.
     * The following methods are used to support the metadata
     * system when base2 classes are used.  The instance and
     * static object literals will be decorated first so it
     * is necessary to copy or merge their metadata on to
     * the correct classes or prototypes.
     */


    copyMetadata(target, source, sourceKey) {
      if (sourceKey) return;
      var targetDescriptor = HandlerDescriptor.get(target, true);

      for (var [policy, bindings] of this.bindings) {
        for (var binding of bindings) {
          // Base2 classes can have constructor decorators.
          if (binding.constraint == "#constructor") {
            var clazz = $classOf(target),
                classDescriptor = HandlerDescriptor.get(clazz, true),
                _constructor = Binding.create(clazz, target, binding.handler.bind(clazz), "constructor");

            addBinding.call(classDescriptor, policy, _constructor);
          } else {
            binding.owner = target;
            addBinding.call(targetDescriptor, policy, binding);
          }
        }
      }

      return targetDescriptor;
    }

    mergeMetadata(sourceDescriptor, target, source, sourceKey) {
      if ($classOf(sourceDescriptor) !== $classOf(this)) {
        throw new TypeError("mergeMetadata expects a HandlerDescriptor.");
      }

      if (sourceKey) return;

      for (var [policy, bindings] of sourceDescriptor.bindings) {
        for (var binding of bindings) {
          binding.owner = target;
          addBinding.call(this, policy, binding);
        }
      }
    }

    static get(owner, create) {
      if (create) {
        return Metadata.getOrCreateOwn(descriptorMetadataKey, owner, () => new this(owner));
      }

      return Metadata.getOwn(descriptorMetadataKey, owner);
    }

    static *getChain(target) {
      while (target && target !== exports.Base.prototype && target !== Object.prototype && target !== Abstract.prototype) {
        var descriptor = HandlerDescriptor.get(target);
        if (descriptor) yield descriptor;
        target = Object.getPrototypeOf(target);
      }
    }

    static remove(owner) {
      return Metadata.remove(descriptorMetadataKey, owner);
    }

  }

  function addBinding(policy, binding) {
    var owner = _$a(this).owner,
        bindings = _$a(this).bindings,
        index = createIndex(binding.constraint);

    var policyBindings = bindings.get(policy);

    if (policyBindings == null) {
      policyBindings = new IndexedList(policy.compareBinding.bind(policy));
      bindings.set(policy, policyBindings);
    }

    policyBindings.insert(binding, index);
    return function (notifyRemoved) {
      policyBindings.remove(binding);

      if (policyBindings.isEmpty) {
        bindings.delete(policy);
      }

      if ($isFunction(binding.removed) && notifyRemoved !== false) {
        binding.removed(owner);
      }
    };
  }

  function dispatch(policy, target, callback, rawCallback, constraint, index, variance, composer, all, results) {
    var _this = this;

    var dispatched = false;
    var bindings = this.getBindings(policy);
    if (bindings == null) return false;
    var invariant = variance === Variance.Invariant;

    if (!invariant || index) {
      var _loop = function (binding) {
        if (binding.match(constraint, variance)) {
          var guard;
          var guardDispatch = rawCallback.guardDispatch;

          if ($isFunction(guardDispatch)) {
            guard = guardDispatch.call(rawCallback, target, binding);
            if (!guard) return "continue";
          }

          try {
            var filters,
                result,
                completed = true;

            if (rawCallback.canFilter !== false) {
              filters = resolveFilters.call(_this, policy, target, callback, binding, composer);
              if ($isNothing(filters)) return "continue";
            }

            if ($isNothing(filters) || filters.length == 0) {
              var signature = binding.getMetadata(design),
                  args = resolveArgs.call(_this, callback, rawCallback, signature, composer);
              if ($isNothing(args)) return "continue";
              var context = {
                constraint,
                binding,
                rawCallback,
                composer,
                results
              },
                  handler = binding.handler;
              result = $isPromise(args) ? args.then(a => handler.call(target, ...a, context)) : handler.call(target, ...args, context);
            } else {
              result = filters.reduceRight((next, pipeline) => (comp, proceed) => {
                if (proceed) {
                  var _filter = pipeline.filter,
                      _signature = design.get(_filter, "next"),
                      _args = resolveArgs.call(_this, callback, rawCallback, _signature, comp);

                  if (!$isNothing(_args)) {
                    var provider = pipeline.provider,
                        _context = {
                      binding,
                      rawCallback,
                      provider,
                      composer: comp,
                      next: (c, p) => next(c != null ? c : comp, p != null ? p : true),
                      abort: () => next(null, false)
                    };
                    return $isPromise(_args) ? _args.then(a => _filter.next(...a, _context)) : _filter.next(..._args, _context);
                  }
                }

                completed = false;
              }, (comp, proceed) => {
                if (proceed) {
                  var _signature2 = binding.getMetadata(design),
                      _args2 = resolveArgs.call(_this, callback, rawCallback, _signature2, comp);

                  if ($isNothing(_args2)) {
                    completed = false;
                    return Promise.reject(new NotHandledError(callback, `'${binding.key}' is missing one or more dependencies.`));
                  }

                  var _context2 = {
                    constraint,
                    binding,
                    rawCallback,
                    composer: comp,
                    results
                  },
                      _handler = binding.handler;
                  return $isPromise(_args2) ? _args2.then(a => _handler.call(target, ...a, _context2)) : _handler.call(target, ..._args2, _context2);
                }

                completed = false;
              })(composer, true);
            }

            if (completed && policy.acceptResult(result)) {
              if (!results || results(result, false, composer) !== false) {
                if (!all) return {
                  v: true
                };
                dispatched = true;
              }
            }
          } finally {
            if ($isFunction(guard)) {
              guard.call(rawCallback);
            }
          }
        } else if (invariant) {
          return "break"; // stop matching if invariant not satisifed
        }
      };

      for (var binding of bindings.fromIndex(index)) {
        var _ret = _loop(binding);

        if (_ret === "continue") continue;
        if (_ret === "break") break;
        if (typeof _ret === "object") return _ret.v;
      }
    }

    return dispatched;
  }

  function resolveFilters(policy, target, callback, binding, composer) {
    var targetFilter = Filtering.isAdoptedBy(target) ? new FilterInstanceProvider([target], true) : null;
    return composer.$getOrderedFilters(binding, callback, [binding.getMetadata(filter), binding.getParentMetadata(filter), this, policy, targetFilter]);
  }

  function resolveArgs(callback, rawCallback, signature, composer) {
    if ($isNothing(signature)) {
      return [callback];
    }

    var {
      args
    } = signature;

    if ($isNothing(args) || args.length === 0) {
      return [callback];
    }

    var resolved = [],
        promises = [];

    var _loop2 = function (i) {
      var arg = args[i];

      if ($isNothing(arg)) {
        if (i === 0) {
          resolved[0] = callback;
        }

        return "continue";
      }

      if (i === 0 && $isNothing(arg.keyResolver)) {
        if (arg.validate(callback)) {
          resolved[0] = callback;
          return "continue";
        }

        if (arg.validate(rawCallback)) {
          resolved[0] = rawCallback;
          return "continue";
        }
      }

      var resolver = arg.keyResolver || defaultKeyResolver,
          validate = resolver.validate;

      if ($isFunction(validate)) {
        validate.call(resolver, arg);
      }

      var parent = rawCallback instanceof Inquiry ? rawCallback : null,
          dep = resolver.resolve(arg, composer, parent);
      if ($isNothing(dep)) return {
        v: null
      };

      if ($optional.test(dep)) {
        resolved[i] = $contents(dep);
      } else if ($isPromise(dep)) {
        promises.push(dep.then(result => resolved[i] = result));
      } else {
        resolved[i] = dep;
      }
    };

    for (var i = 0; i < args.length; ++i) {
      var _ret2 = _loop2(i);

      if (_ret2 === "continue") continue;
      if (typeof _ret2 === "object") return _ret2.v;
    }

    if (promises.length === 0) {
      return resolved;
    }

    if (promises.length === 1) {
      return promises[0].then(() => resolved);
    }

    return Promise.all(promises).then(() => resolved);
  }

  function requireValidPolicy(policy) {
    if ($isNothing(policy)) {
      throw new Error("The policy argument is required.");
    }
  }

  function createIndex(constraint) {
    if ($isNothing(constraint)) return;
    if ($isString$1(constraint)) return constraint;

    if ($isFunction(constraint)) {
      return assignID(constraint);
    }
  }

  var _$b = createKey();
  /**
   * Sentinel indicating callback not handled.
   */


  function $unhandled(result) {
    return result === $unhandled;
  }
  class CallbackPolicy extends FilteredScope {
    /**
    * Constructs a callback policy.
    * @method create
    * @param   {Variance}  variance -  policy variance
    * @param   {String}    name     -  policy name 
    */
    constructor(variance, name) {
      super();

      if (new.target === CallbackPolicy) {
        throw new Error("CallbackPolicy cannot be instantiated.  Use CovariantPolicy, ContravariantPolicy, or InvariantPolicy.");
      }

      _$b(this).variance = variance;
      _$b(this).name = name;
    }

    get variance() {
      return _$b(this).variance;
    }

    get name() {
      return _$b(this).name;
    }
    /**
     * Registers the handler for the specified constraint.
     * @method addHandler
     * @param   {Any}       owner       -  instance of class handler.
     * @param   {Any}       constraint  -  the constraint to handle.
     * @param   {Function}  handler     -  the handling function.
     * @param   {String}    [key]       -  optional handler key.
     * @param   {Function}  [removed]   -  optional function called on removal.
     * @return  {Function}  returns true if the result satisfies the variance.
     */


    addHandler(owner, constraint, handler, key, removed) {
      if ($isNothing(owner)) {
        throw new Error("The owner argument is required");
      } else if ($isNothing(handler)) {
        handler = constraint;
        constraint = $classOf($contents(constraint));
      }

      if ($isNothing(handler)) {
        throw new Error("The handler argument is required");
      }

      if (Array.isArray(constraint)) {
        if (constraint.length == 1) {
          constraint = constraint[0];
        } else {
          return constraint.reduce((result, c) => {
            var undefine = addHandler.call(this, owner, c, handler, key, removed);
            return notifyRemoved => {
              result(notifyRemoved);
              undefine(notifyRemoved);
            };
          }, Undefined$1);
        }
      }

      return addHandler.call(this, owner, constraint, handler, key, removed);
    }
    /**
     * Removes all handlers for the specified owner.
     * @method removeHandlers
     * @param   {Any} owner  -  handler owner.
     */


    removeHandlers(owner) {
      var descriptor = HandlerDescriptor.get(owner);

      if (descriptor) {
        descriptor.removeBindings(this);
      }
    }

    dispatch(handler, callback, rawCallback, constraint, composer, greedy, results) {
      var descriptor = HandlerDescriptor.get(handler, true);
      return descriptor.dispatch(this, handler, callback, rawCallback || callback, constraint, composer, greedy, results);
    }
    /**
     * Determines if the callback result is valid for the variance.
     * @method acceptResult
     * @param   {Any}    result  -  the callback result
     * @return  {Function}  returns true if the result satisfies the variance.
     */


    acceptResult(result) {
      throw new Error("CallbackPolicy.acceptResult not implemented.");
    }
    /**
     * Defines the relative ordering of bindings.
     * @method compareBinding
     * @param   {Binding}    binding       -  the first binding
     * @param   {Binding}    otherBinding  -  the other binding to compare with.
     * @return  {Function}  0, -1, 1 according to standard comparisons.
     */


    compareBinding(binding, otherBinding) {
      throw new Error("CallbackPolicy.compareBinding not implemented.");
    }
    /**
     * Creates a decorator for the implied policy.
     * @method createDecorator
     * @param  {String}  name       -  the name of the policy
     * @param  {Object}  [options]  -  true to allow property handlers
     */


    static createDecorator(name, options) {
      var policy = new this(name),
          members = (options == null ? void 0 : options.allowClasses) === true ? new WeakSet() : null;

      function decorator(...args) {
        return decorate(registerHandlers(name, policy, members, options), args);
      }

      decorator.policy = policy;

      decorator.addHandler = function (...args) {
        return policy.addHandler.apply(policy, args);
      };

      decorator.dispatch = function (...args) {
        return policy.dispatch.apply(policy, args);
      };

      if (!$isNothing(members)) {
        decorator.isDefined = function (target) {
          return members.has(target);
        };
      }

      return decorator;
    }

    static dispatch(handler, callback, greedy, composer) {
      if ($isFunction(callback.dispatch)) {
        return callback.dispatch(handler, greedy, composer);
      }

      return handles.dispatch(handler, callback, callback, null, composer, greedy);
    }

  }
  class CovariantPolicy extends CallbackPolicy {
    constructor(name) {
      super(Variance.Covariant, name);
    }

    acceptResult(result) {
      return result != null && result !== $unhandled;
    }

    compareBinding(binding, otherBinding) {
      validateComparer(binding, otherBinding);

      if (otherBinding.match(binding.constraint, Variance.Invariant)) {
        return 0;
      } else if (otherBinding.match(binding.constraint, Variance.Covariant)) {
        return -1;
      }

      return 1;
    }

  }
  class ContravariantPolicy extends CallbackPolicy {
    constructor(name) {
      super(Variance.Contravariant, name);
    }

    acceptResult(result) {
      return result !== $unhandled;
    }

    compareBinding(binding, otherBinding) {
      validateComparer(binding, otherBinding);

      if (otherBinding.match(binding.constraint, Variance.Invariant)) {
        return 0;
      } else if (otherBinding.match(binding.constraint, Variance.Contravariant)) {
        return -1;
      }

      return 1;
    }

  }
  class InvariantPolicy extends CallbackPolicy {
    constructor(name) {
      super(Variance.Invariant, name);
    }

    acceptResult(result) {
      return result != null && result !== $unhandled;
    }

    compareBinding(binding, otherBinding) {
      validateComparer(binding, otherBinding);
      return otherBinding.match(binding.constraint, Variance.Invariant) ? 0 : -1;
    }

  }

  function addHandler(owner, constraint, handler, key, removed) {
    if ($isNothing(owner)) {
      throw new Error("The owner argument is required.");
    } else if ($isNothing(handler)) {
      handler = constraint;
      constraint = $classOf($contents(constraint));
    }

    if ($isNothing(handler)) {
      throw new Error("The handler argument is required.");
    }

    if (removed && !$isFunction(removed)) {
      throw new TypeError("The removed argument is not a function.");
    }

    if (!$isFunction(handler)) {
      handler = $lift($contents(handler));
    }

    var descriptor = HandlerDescriptor.get(owner, true);
    return descriptor.addBinding(this, constraint, handler, key, removed);
  }

  function validateComparer(binding, otherBinding) {
    if ($isNothing(binding)) {
      throw new Error("The binding argument is required.");
    }

    if ($isNothing(otherBinding)) {
      throw new Error("The otherBinding argument is required.");
    }
  }
  /**
   * Registers methods and properties as handlers.
   * @method registerHandlers
   * @param  {String}         name          -  policy name
   * @param  {CallbackPolicy} policy        -  the policy
   * @param  {WeakSet}        members       -  the set of registered classes
   * @param  {Boolean}        allowClasses  -  true to allow on classes
   * @param  {Boolean}        allowGets     -  true to allow property handlers
   * @param  {Function}       filter        -  optional callback filter
   */


  function registerHandlers(name, policy, members, {
    allowClasses,
    allowGets,
    filter
  } = {}) {
    if ($isNothing(policy)) {
      throw new Error(`The policy for @${name} is required.`);
    }

    return (target, key, descriptor, constraints) => {
      // Base2 classes can have constructor decorators, but real classes
      // can't.  Therefore, we must allow decorators on classes too.
      if ($isNothing(descriptor)) {
        if (!allowClasses) {
          throw new SyntaxError(`@${name} is not allowed on classes.`);
        }

        if (constraints.length > 0) {
          throw new SyntaxError(`@${name} expects no arguments if applied to a class.`);
        }

        if ((members == null ? void 0 : members.has(target)) !== true) {
          policy.addHandler(target, target, instantiate, "constructor");
          members == null ? void 0 : members.add(target);
        }

        return;
      }

      if (key === "constructor") {
        if (!allowClasses) {
          throw new SyntaxError(`@${name} is not allowed on constructors.`);
        }

        if (constraints.length > 0) {
          throw new SyntaxError(`@${name} expects no arguments if applied to a constructor.`);
        }

        if ((members == null ? void 0 : members.has(target)) !== true) {
          policy.addHandler(target, "#constructor", instantiate, key);
          members == null ? void 0 : members.add(target);
        }

        return;
      }

      var {
        get,
        value
      } = descriptor;

      if (!$isFunction(value)) {
        if (allowGets) {
          if (!$isFunction(get)) {
            throw new SyntaxError(`@${name} can only be applied to methods and getters.`);
          }
        } else {
          throw new SyntaxError(`@${name} can only be applied to methods.`);
        }
      }

      if (constraints.length == 0) {
        constraints = null;
        var signature = design.get(target, key);

        if (signature) {
          if (policy.variance === Variance.Contravariant) {
            var _args$;

            var args = signature.args;
            constraints = args && args.length > 0 ? (_args$ = args[0]) == null ? void 0 : _args$.type : null;
          } else if (policy.variance === Variance.Covariant || policy.variance === Variance.Invariant) {
            var typeInfo = signature.returnType || signature.propertyType;

            if (typeInfo) {
              constraints = typeInfo.type;
            }
          }
        }
      }

      function lateBinding() {
        var result = this[key];

        if ($isFunction(result)) {
          return result.apply(this, arguments);
        }

        return allowGets ? result : $unhandled;
      }

      var handler = $isFunction(filter) ? function () {
        return filter.apply(this, [key, ...arguments]) === false ? $unhandled : lateBinding.apply(this, arguments);
      } : lateBinding;
      policy.addHandler(target, constraints, handler, key);
    };
  }

  function instantiate() {
    return Reflect.construct(this, arguments);
  }
  /**
   * Policy for handling callbacks contravariantly.
   * @property {Function} handles
   */


  var handles = ContravariantPolicy.createDecorator("handles");
  /**
   * Policy for providing instnces covariantly.
   * @property {Function} provides
   */

  var provides = CovariantPolicy.createDecorator("provides", {
    allowClasses: true,
    allowGets: true
  });
  /**
   * Policy for matching instances invariantly.
   * @property {Function} looksup
   */

  var looksup = InvariantPolicy.createDecorator("looksup", {
    allowClasses: true,
    allowGets: true
  });
  /**
   * Policy for creating instnces covariantly.
   * @property {Function} provides
   */

  var creates = CovariantPolicy.createDecorator("creates");

  var _dec$6, _class$6;

  var _$c = createKeyChain();

  var Trampoline = (_dec$6 = conformsTo(CallbackControl), _dec$6(_class$6 = class Trampoline extends exports.Base {
    constructor(callback) {
      super();

      if (callback) {
        _$c(this).callback = callback;
      }
    }

    get callback() {
      return _$c(this).callback;
    }

    get policy() {
      var callback = this.callback;
      return callback && callback.policy;
    }

    get callbackResult() {
      var callback = this.callback;
      return callback && callback.callbackResult;
    }

    set callbackResult(value) {
      var callback = this.callback;

      if (callback) {
        callback.callbackResult = value;
      }
    }

    guardDispatch(handler, binding) {
      var callback = this.callback;

      if (callback) {
        var guardDispatch = callback.guardDispatch;

        if ($isFunction(guardDispatch)) {
          return guardDispatch.call(callback, handler, binding);
        }
      }

      return Undefined$1;
    }

    dispatch(handler, greedy, composer) {
      var callback = this.callback;
      return callback ? CallbackPolicy.dispatch(handler, callback, greedy, composer) : handles.dispatch(handler, this, this, null, composer, greedy);
    }

  }) || _class$6);

  /**
   * Container for composition.
   * @class Composition
   * @constructor
   * @param   {Object}  callback  -  callback to compose
   * @extends Trampoline
   */

  class Composition extends Trampoline {
    get canBatch() {
      var callback = this.callback;
      return $isNothing(callback) || callback.canBatch !== false;
    }

    get canFilter() {
      var callback = this.callback;
      return $isNothing(callback) || callback.canFilter !== false;
    }

    get canInfer() {
      var callback = this.callback;
      return $isNothing(callback) || callback.canInfer !== false;
    }

    static isComposed(callback, type) {
      return callback instanceof this && callback.callback instanceof type;
    }

  }

  var unmanagedMetadataKey = Symbol("unmanaged-metadata");
  var unmanagedMetadata = Metadata.decorator(unmanagedMetadataKey, (target, key, descriptor, args) => {
    if (!$isNothing(descriptor)) {
      throw new SyntaxError("@unmanaged can only be applied to classes.");
    }

    unmanagedMetadata.getOrCreateOwn(target, () => true);
  });
  var unmanaged = unmanagedMetadata();

  unmanaged.isDefined = type => unmanagedMetadata.getOwn(type) === true;

  var _class$7;
  /**
   * Base class for handling arbitrary callbacks.
   * @class Handler
   * @constructor
   * @param  {Object}  [delegate]  -  delegate
   * @extends Base
   */

  class Handler extends exports.Base {
    /**
     * Handles the callback.
     * @method handle
     * @param   {Object}  callback        -  any callback
     * @param   {boolean} [greedy=false]  -  true if handle greedily
     * @param   {Handler} [composer]      -  composition handler
     * @returns {boolean} true if the callback was handled, false otherwise.
     */
    handle(callback, greedy, composer) {
      if ($isNothing(callback)) {
        return false;
      }

      if ($isNothing(composer)) {
        composer = compositionScope(this);
      }

      return !!this.handleCallback(callback, !!greedy, composer);
    }
    /**
     * Handles the callback with all arguments populated.
     * @method handleCallback
     * @param   {Object}   callback    -  any callback
     * @param   {boolean}  greedy      -  true if handle greedily
     * @param   {Handler}  [composer]  -  composition handler
     * @returns {boolean} true if the callback was handled, false otherwise.
     */


    handleCallback(callback, greedy, composer) {
      return CallbackPolicy.dispatch(this, callback, greedy, composer);
    }

    static for(object) {
      return object instanceof Handler ? object : new HandlerAdapter(object);
    }

  }
  var HandlerAdapter = unmanaged(_class$7 = class HandlerAdapter extends Handler {
    constructor(handler) {
      if ($isNothing(handler)) {
        throw new TypeError("No handler specified.");
      }

      super();
      Object.defineProperty(this, "handler", {
        configurable: false,
        value: handler
      });
    }

    handleCallback(callback, greedy, composer) {
      return CallbackPolicy.dispatch(this.handler, callback, greedy, composer);
    }

  }) || _class$7;
  var compositionScope = $decorator({
    handleCallback(callback, greedy, composer) {
      if (callback.constructor !== Composition) {
        callback = new Composition(callback);
      }

      return this.base(callback, greedy, composer);
    }

  });
  exports.$composer = undefined;
  Handler.implement({
    /**
     * Runs `block` with this Handler as the abmient **$composer**.
     * @method compose
     * @param  {Function}  block       -  block
     * @param  {Object}    [receiver]  -  reciever
     * @returns {Any} the return value of the block.
     * @for Handler
     */
    $compose(block, receiver) {
      if (!$isFunction(block)) {
        throw new TypeError(`Invalid block: ${block} is not a function.`);
      }

      var oldComposer = exports.$composer;

      try {
        exports.$composer = this;
        return block.call(receiver);
      } finally {
        exports.$composer = oldComposer;
      }
    }

  });

  var _dec$7, _class$8;

  var _$d = createKeyChain();
  /**
   * Callback representing a command with results.
   * @class Command
   * @constructor
   * @param   {Object}   callback  -  callback
   * @param   {boolean}  many      -  command cardinality
   * @extends Base
   */


  var Command = (_dec$7 = conformsTo(CallbackControl), _dec$7(_class$8 = class Command extends exports.Base {
    constructor(callback, many) {
      if ($isNothing(callback)) {
        throw new TypeError("The callback argument is required.");
      }

      super();

      var _this = _$d(this);

      _this.callback = callback;
      _this.many = !!many;
      _this.results = [];
      _this.promises = [];
    }

    get isMany() {
      return _$d(this).many;
    }

    get callback() {
      return _$d(this).callback;
    }

    get results() {
      return _$d(this).results;
    }

    get callbackPolicy() {
      return handles.policy;
    }

    get canBatch() {
      return this.callback.canBatch !== false;
    }

    get canFilter() {
      return this.callback.canFilter !== false;
    }

    get canInfer() {
      return this.callback.canInfer !== false;
    }

    get callbackResult() {
      var {
        result,
        results,
        promises
      } = _$d(this);

      if (result === undefined) {
        if (promises.length == 0) {
          _$d(this).result = result = this.isMany ? results : results[0];
        } else {
          _$d(this).result = result = this.isMany ? Promise.all(promises).then(() => results) : Promise.all(promises).then(() => results[0]);
        }
      }

      return result;
    }

    set callbackResult(value) {
      _$d(this).result = value;
    }

    guardDispatch(handler, binding) {
      var callback = this.callback;

      if (callback) {
        var guardDispatch = callback.guardDispatch;

        if ($isFunction(guardDispatch)) {
          return guardDispatch.call(callback, handler, binding);
        }
      }

      return Undefined$1;
    }

    respond(response) {
      if ($isNothing(response)) return;

      if ($isPromise(response)) {
        _$d(this).promises.push(response.then(res => {
          if (res != null) {
            _$d(this).results.push(res);
          }
        }));
      } else {
        _$d(this).results.push(response);
      }

      delete _$d(this).result;
    }

    dispatch(handler, greedy, composer) {
      var count = _$d(this).results.length;

      return handles.dispatch(handler, this.callback, this, null, composer, this.isMany, this.respond.bind(this)) || _$d(this).results.length > count;
    }

    toString() {
      return `Command ${this.isMany ? "many " : ""}| ${this.callback}`;
    }

  }) || _class$8);

  var _dec$8, _dec2, _dec3, _class$9, _class2;

  var _$e = createKey();

  class StashAction {
    constructor(key) {
      if ($isNothing(key)) {
        throw new Error("The key argument is required.");
      }

      _$e(this).key = key;
    }

    get canFilter() {
      return false;
    }

    get key() {
      return _$e(this).key;
    }

  }

  _defineProperty(StashAction, "Get", class extends StashAction {
    get value() {
      return _$e(this).value;
    }

    set value(value) {
      _$e(this).value = value;
    }

  });

  _defineProperty(StashAction, "Put", class extends StashAction {
    constructor(key, value) {
      super(key);
      _$e(this).value = value;
    }

    get value() {
      return _$e(this).value;
    }

  });

  _defineProperty(StashAction, "Drop", class extends StashAction {});

  var Stash = (_dec$8 = handles(StashAction.Get), _dec2 = handles(StashAction.Put), _dec3 = handles(StashAction.Drop), unmanaged(_class$9 = (_class2 = class Stash extends Handler {
    constructor(root = false) {
      super();
      _$e(this).root = root;
      _$e(this).data = new Map();
    }

    provide(inquiry) {
      var key = inquiry.key,
          {
        data
      } = _$e(this);

      if (data.has(key)) {
        inquiry.resolve(data.get(key), true);
      }
    }

    get(get) {
      var key = get.key,
          {
        root,
        data
      } = _$e(this);

      if (data.has(key)) {
        get.value = data.get(key);
      } else if (!root) {
        return $unhandled;
      }
    }

    put(put) {
      var {
        key,
        value
      } = put;

      if (value === undefined) {
        _$e(this).data.delete(key);
      } else {
        _$e(this).data.set(key, value);
      }
    }

    drop(drop) {
      _$e(this).data.delete(drop.key);
    }

  }, (_applyDecoratedDescriptor(_class2.prototype, "provide", [provides], Object.getOwnPropertyDescriptor(_class2.prototype, "provide"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "get", [_dec$8], Object.getOwnPropertyDescriptor(_class2.prototype, "get"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "put", [_dec2], Object.getOwnPropertyDescriptor(_class2.prototype, "put"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "drop", [_dec3], Object.getOwnPropertyDescriptor(_class2.prototype, "drop"), _class2.prototype)), _class2)) || _class$9);

  Handler.implement({
    $send(request) {
      if ($isNothing(request)) return;
      var command = new Command(request);

      if (!new Stash().$chain(this).handle(command, false)) {
        throw new NotHandledError(request);
      }

      return command.callbackResult;
    },

    $publish(notification) {
      if ($isNothing(notification)) return;
      var command = new Command(notification, true);

      if (!new Stash().$chain(this).handle(command, true)) {
        throw new NotHandledError(notification);
      }

      return command.callbackResult;
    }

  });

  Handler.implement({
    stashGet(key) {
      var get = new StashAction.Get(key);

      if (!this.handle(get)) {
        throw new NotHandledError(get);
      }

      return get.value;
    },

    stashPut(value, key) {
      var actualKey = key || $classOf(value);

      if ($isNothing(actualKey)) {
        throw new Error("The key could not be inferred.");
      }

      var put = new StashAction.Put(actualKey, value);

      if (!this.handle(put)) {
        throw new NotHandledError(put);
      }
    },

    stashDrop(key) {
      var drop = new StashAction.Drop(key);

      if (!this.handle(drop)) {
        throw new NotHandledError(drop);
      }
    },

    stashTryGet(key) {
      var get = new StashAction.Get(key);
      if (this.handle(get)) return get.value;
    },

    stashGetOrPut(key, value) {
      var data = this.stashTryGet(key);

      if ($isNothing(data)) {
        data = $isFunction(value) ? value() : value;

        if ($isPromise(data)) {
          return data.then(result => {
            this.stashPut(result, key);
            return result;
          });
        }

        this.stashPut(data, key);
      }

      return data;
    }

  });

  class Request extends exports.Base {
    getCacheKey() {
      return JSON.stringify(this);
    }

    toString() {
      return `${$classOf(this).name} ${JSON.stringify(this)}`;
    }

  }
  class RequestWrapper extends Request {
    constructor(request) {
      if (new.target === RequestWrapper) {
        throw new TypeError("RequestWrapper cannot be instantiated.");
      }

      super();

      _defineProperty(this, "request", void 0);

      this.request = request;
    }

    getCacheKey() {
      var request = this.request,
          requestKey = request == null ? void 0 : request.getCacheKey == null ? void 0 : request.getCacheKey();

      if (!$isNothing(requestKey)) {
        return JSON.stringify(this, (name, value) => name === "request" ? `${assignID($classOf(request))}#${requestKey}` : value);
      }
    }

  }

  class Message extends exports.Base {}
  class MessageWrapper extends exports.Base {
    constructor(message) {
      if (new.target === MessageWrapper) {
        throw new TypeError("MessageWrapper cannot be instantiated.");
      }

      super();

      _defineProperty(this, "message", void 0);

      this.message = message;
    }

    getCacheKey() {
      var message = this.message,
          messageKey = message == null ? void 0 : message.getCacheKey == null ? void 0 : message.getCacheKey();

      if (!$isNothing(messageKey)) {
        return JSON.stringify(this, (name, value) => name === "message" ? `${assignID($classOf(message))}#${messageKey}` : value);
      }
    }

  }

  var ResponseTypeResolver = Symbol("response-type");
  class ResponseWrapper extends exports.Base {
    constructor(response) {
      if (new.target === ResponseWrapper) {
        throw new TypeError("ResponseWrapper cannot be instantiated.");
      }

      super();

      _defineProperty(this, "response", void 0);

      this.response = response;
    }

    toString() {
      return `${$classOf(this).name} ${JSON.stringify(this)}`;
    }

  }
  function response(...args) {
    return decorate((target, key, descriptor, args) => {
      if ($isNothing(descriptor)) {
        var [responseType] = args;

        if ($isNothing(responseType)) {
          throw new Error("The responseType argument is required.");
        }

        if (!$isFunction(responseType)) {
          throw new Error("The responseType argument is not a class.");
        }

        function getter() {
          return responseType;
        }

        Object.defineProperty(target, ResponseTypeResolver, {
          configurable: false,
          enumerable: false,
          value: getter
        });
        Object.defineProperty(target.prototype, ResponseTypeResolver, {
          configurable: false,
          enumerable: false,
          value: getter
        });
      } else {
        var getter;
        var {
          get,
          value
        } = descriptor;

        if ($isFunction(get)) {
          getter = get;
          ignore(target, key, descriptor);
        } else if ($isFunction(value)) {
          getter = value;
        } else {
          throw new SyntaxError("@response can only be applied to classes, getters or methods.");
        }

        Object.defineProperty(target, ResponseTypeResolver, {
          configurable: false,
          enumerable: false,
          value: function () {
            var id = getter.call(this);

            if (!$isString(id)) {
              throw new Error(`@response getter '${key}' returned invalid identifier ${id}.`);
            }

            return id;
          }
        });
      }
    }, args);
  }

  response.get = function (target) {
    var _target$ResponseTypeR;

    return target == null ? void 0 : (_target$ResponseTypeR = target[ResponseTypeResolver]) == null ? void 0 : _target$ResponseTypeR.call(target);
  };

  var _dec$9, _class$a;

  var _$f = createKey();

  class StashOf {
    constructor(key, handler) {
      if ($isNothing(key)) {
        throw new Error("The key argument is required.");
      }

      if ($isNothing(handler)) {
        throw new Error("The handler argument is required.");
      }

      _$f(this).key = key;
      _$f(this).handler = handler;
    }

    get value() {
      var {
        key,
        handler
      } = _$f(this);

      return handler.stashTryGet(key);
    }

    set value(value) {
      var {
        key,
        handler
      } = _$f(this);

      handler.stashPut(value, key);
    }

    getOrPut(value) {
      var {
        key,
        handler
      } = _$f(this);

      if ($isFunction(value)) {
        var getter = () => value(handler);

        return handler.stashGetOrPut(key, getter);
      }

      return handler.stashGetOrPut(key, value);
    }

    drop() {
      var {
        key,
        handler
      } = _$f(this);

      handler.drop(key);
    }

  }
  var StashOfResolver = (_dec$9 = conformsTo(KeyResolving), _dec$9(_class$a = class StashOfResolver {
    constructor(key) {
      if ($isNothing(key)) {
        throw new Error("The key argument is required.");
      }

      _$f(this).key = key;
    }

    resolve(typeInfo, handler) {
      return new StashOf(_$f(this).key, handler);
    }

  }) || _class$a);
  var stashOf = createTypeInfoDecorator((key, typeInfo, [stashKey]) => {
    typeInfo.keyResolver = new StashOfResolver(stashKey);
  });

  var _$g = createKeyChain();

  class Resolving extends Inquiry {
    constructor(key, callback) {
      if ($isNothing(callback)) {
        throw new Error("The callback argument is required.");
      }

      if (callback instanceof Inquiry) {
        super(key, true, callback);
      } else {
        super(key, true);
      }

      _$g(this).callback = callback;
    }

    get callback() {
      return _$g(this).callback;
    }

    get succeeded() {
      return _$g(this).succeeded;
    }

    guardDispatch(handler, binding) {
      var outer = super.guardDispatch(handler, binding);

      if (outer) {
        var callback = _$g(this).callback,
            guardDispatch = callback.guardDispatch;

        if ($isFunction(guardDispatch)) {
          var inner = guardDispatch.call(callback, handler, binding);

          if (!inner) {
            if ($isFunction(outer)) {
              outer.call(this);
            }

            return inner;
          }

          if ($isFunction(inner)) {
            if ($isFunction(outer)) {
              return function () {
                inner.call(callback);
                outer.call(this);
              };
            }

            return inner;
          }
        }
      }

      return outer;
    }

    isSatisfied(resolution, greedy, composer) {
      if (_$g(this).succeeded && !greedy) return true;
      var callback = this.callback,
          handled = CallbackPolicy.dispatch(resolution, callback, greedy, composer);

      if (handled) {
        _$g(this).succeeded = true;
      }

      return handled;
    }

    toString() {
      return `Resolving | ${this.key} => ${this.callback}`;
    }

  }

  class InferenceHandler extends Handler {
    constructor(...types) {
      super();
      var owners = new Set(),
          inferDescriptor = HandlerDescriptor.get(this, true);

      for (var type of types.flat()) {
        addStaticBindings(type, inferDescriptor);
        addInstanceBindings(type, inferDescriptor, owners);
      }
    }

  }

  function addStaticBindings(type, inferDescriptor) {
    var typeDescriptor = HandlerDescriptor.get(type);

    if (!$isNothing(typeDescriptor)) {
      for (var [policy, bindings] of typeDescriptor.bindings) {
        for (var binding of bindings) {
          var typeBinding = pcopy(binding);
          typeBinding.handler = binding.handler.bind(type);
          inferDescriptor.addBinding(policy, typeBinding);
        }
      }
    }
  }

  function addInstanceBindings(type, inferDescriptor, owners) {
    var prototype = type.prototype;
    if ($isNothing(prototype) || owners.has(prototype)) return;

    function inferShim(...args) {
      return infer.call(this, type, ...args);
    }

    for (var descriptor of HandlerDescriptor.getChain(prototype)) {
      if (!owners.add(descriptor.owner)) break;

      for (var [policy, bindings] of descriptor.bindings) {
        for (var binding of bindings) {
          var instanceBinding = pcopy(binding);
          instanceBinding.handler = inferShim;
          instanceBinding.getMetadata = Undefined$1;
          instanceBinding.getParentMetadata = Undefined$1;
          instanceBinding.skipFilters = true;
          inferDescriptor.addBinding(policy, instanceBinding);
        }
      }
    }
  }

  function infer(type, callback, {
    rawCallback,
    composer,
    results
  }) {
    if (rawCallback.canInfer === false) {
      return $unhandled;
    }

    var resolving = new Resolving(type, rawCallback);

    if (!composer.handle(resolving, false, composer)) {
      return $unhandled;
    }

    if (results) {
      var result = resolving.callbackResult;

      if ($isPromise(result)) {
        results(result.then(() => {
          if (!resolving.succeeded) {
            throw new NotHandledError(callback);
          }
        }));
      }
    }
  }

  var _class$b;

  var _$h = createKeyChain();
  /**
   * Encapsulates zero or more
   * {{#crossLink "Handler"}}{{/crossLink}}.<br/>
   * See [Composite Pattern](http://en.wikipedia.org/wiki/Composite_pattern)
   * @class CompositeHandler
   * @constructor
   * @param  {Any}  [...handlers]  -  callback handlers
   * @extends Handler
   */


  var CompositeHandler = unmanaged(_class$b = class CompositeHandler extends Handler {
    constructor(...handlers) {
      super();
      _$h(this).handlers = [];
      this.addHandlers(handlers);
    }

    getHandlers() {
      return _$h(this).handlers.slice();
    }

    addHandlers(...handlers) {
      handlers = $flatten(handlers, true).filter(h => this.findHandler(h) == null).map(Handler.for);

      _$h(this).handlers.push(...handlers);

      return this;
    }

    insertHandlers(atIndex, ...handlers) {
      handlers = $flatten(handlers, true).filter(h => this.findHandler(h) == null).map(Handler.for);

      _$h(this).handlers.splice(atIndex, 0, ...handlers);

      return this;
    }

    removeHandlers(...handlers) {
      $flatten(handlers, true).forEach(handler => {
        var handlers = _$h(this).handlers,
            count = handlers.length;

        for (var idx = 0; idx < count; ++idx) {
          var testHandler = handlers[idx];

          if (testHandler === handler || testHandler instanceof HandlerAdapter && testHandler.handler === handler) {
            handlers.splice(idx, 1);
            return;
          }
        }
      });
      return this;
    }

    findHandler(handler) {
      for (var h of _$h(this).handlers) {
        if (h === handler) return h;

        if (h instanceof HandlerAdapter && h.handler === handler) {
          return h;
        }
      }
    }

    handleCallback(callback, greedy, composer) {
      var handled = super.handleCallback(callback, greedy, composer);
      if (handled && !greedy) return true;

      for (var handler of _$h(this).handlers) {
        if (handler.handle(callback, greedy, composer)) {
          if (!greedy) return true;
          handled = true;
        }
      }

      return handled;
    }

  }) || _class$b;

  var _dec$a, _class$c, _dec2$1, _class2$1;

  var _$i = createKey();

  var Lifestyle = (_dec$a = conformsTo(Filtering), _dec$a(_class$c = class Lifestyle {
    constructor() {
      if (new.target === Lifestyle) {
        throw new TypeError("Lifestyle cannot be instantiated.");
      }
    }

    get order() {
      return Number.MAX_SAFE_INTEGER - 1000;
    }

    next(callback, context) {
      var parent = callback.parent,
          isCompatible = this.isCompatibleWithParent;

      if ($isNothing(parent) || !$isFunction(isCompatible) || isCompatible.call(this, parent, context)) {
        var getInstance = this.getInstance;

        if ($isFunction(getInstance)) {
          try {
            var instance = getInstance.call(this, callback, context);
            if (!$isNothing(instance)) return instance;
          } catch (ex) {// fall through
          }
        } else {
          return context.next();
        }
      }

      return context.abort();
    }

  }) || _class$c);
  var LifestyleProvider = (_dec2$1 = conformsTo(FilteringProvider), _dec2$1(_class2$1 = class LifestyleProvider {
    constructor(lifestyle) {
      if ($isNothing(lifestyle)) {
        throw new Error("The lifestyle argument is required.");
      }

      if (!(lifestyle instanceof Lifestyle)) {
        throw new TypeError("The lifestyle argument is not a Lifestyle.");
      }

      _$i(this).lifestyle = [lifestyle];
    }

    get required() {
      return true;
    }

    appliesTo(callback) {
      return callback instanceof Inquiry;
    }

    getFilters(binding, callback, composer) {
      return _$i(this).lifestyle;
    }

  }) || _class2$1);

  var _$j = createKey();

  class SingletonLifestyle extends Lifestyle {
    getInstance(inquiry, {
      next
    }) {
      var instance = _$j(this).instance;

      if ($isNothing(instance)) {
        instance = _$j(this).instance = next();

        if ($isPromise(instance)) {
          _$j(this).instance = instance = instance.then(result => _$j(this).instance = result).catch(() => _$j(this).instance = null);
        }
      }

      return instance;
    }

  }
  class SingletonLifestyleProvider extends LifestyleProvider {
    constructor() {
      super(new SingletonLifestyle());
    }

  }
  var singleton = createFilterDecorator(() => new SingletonLifestyleProvider());

  var _dec$b, _dec2$2, _dec3$1, _class$d;
  /**
   * Protocol for handling and reporting errors.
   * @class Errors
   * @extends Protocol
   */

  var Errors = DuckTyping.extend({
    /**
     * Handles an error.
     * @method handlerError
     * @param   {Any}          error      - error (usually Error)
     * @param   {Any}          [context]  - scope of error
     * @returns {Promise} promise of handled error.
     */
    handleError(error, context) {},

    /**
     * Handles an exception.
     * @method handlerException
     * @param   {Exception}    excption   - exception
     * @param   {Any}          [context]  - scope of error
     * @returns {Promise} of handled error.
     */
    handleException(exception, context) {},

    /**
     * Reports an error.
     * @method reportError
     * @param   {Any}          error      - error (usually Error)
     * @param   {Any}          [context]  - scope of error
     * @returns {Promise} of reported error.
     */
    reportError(error, context) {},

    /**
     * Reports an excepion.
     * @method reportException
     * @param   {Exception}    exception  - exception
     * @param   {Any}          [context]  - scope of exception
     * @returns {Promise} of reported exception.
     */
    reportException(exception, context) {},

    /**
     * Clears any errors for the associated context.
     * @method clearErrors
     * @param   {Any}          [context]  - scope of errors
     */
    clearErrors(context) {}

  });
  /**
   * Error handler.
   * @class ErrorHandler
   * @extends Handler
   * @uses Errors
   */

  var ErrorHandler = (_dec$b = conformsTo(Errors), _dec2$2 = provides(), _dec3$1 = singleton(), _dec$b(_class$d = _dec2$2(_class$d = _dec3$1(_class$d = class ErrorHandler extends Handler {
    handleError(error, context) {
      var result = Errors(exports.$composer).reportError(error, context);
      return result === undefined ? Promise.reject(error) : Promise.resolve(result);
    }

    handleException(exception, context) {
      var result = Errors(exports.$composer).reportException(exception, context);
      return result === undefined ? Promise.reject(exception) : Promise.resolve(result);
    }

    reportError(error, context) {
      console.error(error);
      return Promise.resolve();
    }

    reportException(exception, context) {
      console.error(exception);
      return Promise.resolve();
    }

    clearErrors(context) {}

  }) || _class$d) || _class$d) || _class$d);
  Handler.implement({
    /**
     * Marks the handler for recovery.
     * @method $recover
     * @returns {HandlerFilter} recovery semantics.
     * @for Handler
     */
    $recover(context) {
      return this.$filter((callback, composer, proceed) => {
        try {
          var handled = proceed();

          if (!("callbackResult" in callback)) {
            return handled;
          }

          if (handled) {
            var result = callback.callbackResult;

            if ($isPromise(result)) {
              callback.callbackResult = result.catch(err => Errors(composer).handleError(err, context));
            }
          }

          return handled;
        } catch (ex) {
          Errors(composer).handleException(ex, context);
          return true;
        }
      });
    },

    /**
     * Creates a function to pass error promises to Errors feature.
     * @method $recoverError
     * @returns {Function} function to pass error promises to Errors feature. 
     * @for Handler
     */
    $recoverError(context) {
      return error => Errors(this).handleError(error, context);
    }

  });

  var mappingMetadataKey = Symbol("mapping-metadata");
  /**
   * Defines the contract for mapping strategies.
   */

  var Mapping = Protocol.extend({
    shouldIgnore(value, target, key) {},

    shouldUseEnumName(enumType, target, key) {},

    getPropertyName(target, key) {},

    getTypeIdProperty(target) {},

    resolveTypeWithId(typeId) {}

  });
  /**
   * Maintains mapping information for a class or property.
   * @method mapping
   * @param  {Object}  mapping  -  member mapping
   */

  var mapping = Metadata.decorator(mappingMetadataKey, (target, key, descriptor, [mapping]) => {
    if (!$isPlainObjet(mapping)) {
      throw new TypeError("@mapping requires a plain object.");
    }

    Metadata.define(mappingMetadataKey, mapping, target, key);
  });
  /**
   * Marks the property to be mapped from the root.
   * @method root
   */

  function root(target, key, descriptor) {
    validateProperty("root", key, descriptor);
    mapping.getOrCreateOwn(target, key, () => ({})).root = true;
  }
  /**
   * Marks the property to be ignored by the mapping.
   * @method ignore
   */

  function ignore$1(target, key, descriptor) {
    validateProperty("ignore", key, descriptor);
    mapping.getOrCreateOwn(target, key, () => ({})).ignore = true;
  }
  /**
   * Marks the property to use the alternate name.
   * @method property
   */

  function property(name) {
    if (!name) {
      throw new Error("@property requires a non-empty name.");
    }

    return (target, key, descriptor) => {
      validateProperty("property", key, descriptor);
      mapping.getOrCreateOwn(target, key, () => ({})).property = name;
    };
  }
  /**
   * Use the Enum name for the property value.
   * @method useEnumName
   */

  function useEnumName(target, key, descriptor) {
    validateProperty("useEnumName", key, descriptor);
    mapping.getOrCreateOwn(target, key, () => ({})).useEnumName = true;
  }

  function validateProperty(option, key, descriptor) {
    if ($isNothing(descriptor)) {
      throw new SyntaxError(`@${option} cannot be applied to classes.`);
    }

    var {
      value
    } = descriptor;

    if ($isFunction(value)) {
      throw new SyntaxError(`@${option} can only be applied to properties.`);
    }
  }

  var idToType = new Map(),
      typeToId = new WeakMap(),
      typeIdResolver = Symbol("type-id"),
      typeInfoMetadataKey = Symbol("type-info-metadata");
  var TypeIdHandling = Enum({
    None: 0,
    // Never
    Always: 1,
    // Always
    Auto: 2 // Include as needed

  });
  function typeId(...args) {
    return decorate((target, key, descriptor, args) => {
      if ($isNothing(descriptor)) {
        var [id] = args;

        if ($isNothing(id) || id === "") {
          id = target.name;

          if (id === "_class") {
            throw new Error("@typeId cannot be inferred from a base2 class.  Please specify it explicitly.");
          }
        } else if (!$isString$1(id)) {
          throw new SyntaxError("@typeId expects a string identifier.");
        } else {
          id = id.replace(/\s+/g, '');
        }

        idToType.set(id, target);
        typeToId.set(target, id);
      } else {
        var getter;
        var {
          get,
          value
        } = descriptor;

        if ($isFunction(get)) {
          // late binding
          getter = function () {
            return this[key];
          };

          ignore$1(target, key, descriptor);
        } else if ($isFunction(value)) {
          // late binding
          getter = function () {
            var _this$key;

            return (_this$key = this[key]) == null ? void 0 : _this$key.call(this);
          };
        } else {
          throw new SyntaxError("@typeId can only be applied to classes, getters or methods.");
        }

        Object.defineProperty(target, typeIdResolver, {
          configurable: false,
          enumerable: false,
          value: function () {
            var id = getter.call(this);

            if (!$isString$1(id)) {
              throw new Error(`@typeId getter '${key}' returned invalid identifier ${id}.`);
            }

            return id;
          }
        });
      }
    }, args);
  }

  typeId.getId = function (target) {
    if ($isNothing(target)) {
      throw new Error("The target is required.");
    }

    var resolver = target[typeIdResolver];

    if ($isFunction(resolver)) {
      return resolver.call(target);
    }

    var type = $isFunction(target) ? target : $classOf(target),
        id = typeToId.get(type);
    return $isFunction(id) ? id.call(target) : id;
  };

  typeId.getType = function (id) {
    if (!$isString$1(id)) {
      throw new Error(`Invalid type id '${id}'.`);
    }

    var stripped = id.replace(/\s+/g, ''),
        type = idToType.get(stripped);
    
    if (!$isNothing(type)) return type;
    idToType.delete(stripped);
  };
  /**
   * Maintains type information for a class.
   * @method typeInfo
   * @param  {String} typeIdProperty  -  member mapping
   */


  var typeInfo = Metadata.decorator(typeInfoMetadataKey, (target, key, descriptor, [typeIdProperty]) => {
    if (!$isNothing(descriptor)) {
      throw new SyntaxError("@typeInfo can only be applied to a class.");
    }

    if (!$isString$1(typeIdProperty)) {
      throw new Error(`The type id property '${typeIdProperty}' is not valid.`);
    }

    typeInfo.getOrCreateOwn(target, () => ({})).typeIdProperty = typeIdProperty;
  });

  var _class$e, _temp;
  var CacheAction = Enum({
    Refresh: 0,
    Invalidate: 1
  });
  var Cached = (_class$e = (_temp = class Cached extends RequestWrapper {
    constructor(request) {
      super(request);

      _defineProperty(this, "action", void 0);

      _defineProperty(this, "timeToLive", void 0);
    }

    get typeId() {
      var responseType = response.get(this.request);
      if ($isNothing(responseType)) return;
      var responseTypeId = typeId.getId(responseType);
      if ($isNothing(responseTypeId)) return;
      return `Miruken.Api.Cache.Cached\`1[[${responseTypeId}]], Miruken`;
    }

  }, _temp), (_applyDecoratedDescriptor(_class$e.prototype, "typeId", [typeId], Object.getOwnPropertyDescriptor(_class$e.prototype, "typeId"), _class$e.prototype)), _class$e);
  Request.implement({
    cached(timeToLive) {
      var cached = new Cached(this);
      cached.timeToLive = timeToLive;
      return cached;
    },

    invalidate() {
      var cached = new Cached(this);
      cached.action = CacheAction.Invalidate;
      return cached;
    },

    refresh() {
      var cached = new Cached(this);
      cached.action = CacheAction.Refresh;
      return cached;
    }

  });

  var _dec$c, _dec2$3, _dec3$2, _class$f, _class2$2;

  var ONE_DAY_MS = 86400000,
      _$k = createKey();

  var CachedHandler = (_dec$c = provides(), _dec2$3 = singleton(), _dec3$2 = handles(Cached), _dec$c(_class$f = _dec2$3(_class$f = (_class2$2 = class CachedHandler extends Handler {
    constructor() {
      super();
      _$k(this).cache = new Map();
    }

    cached(cached, {
      composer
    }) {
      var {
        request,
        action
      } = cached;
      if ($isNothing(request)) return;
      var cacheKey = createCacheKey(request);

      if ($isNothing(cacheKey)) {
        return composer.$send(request);
      }

      var cache = _$k(this).cache,
          entry = cache == null ? void 0 : cache.get(cacheKey);

      if (action === CacheAction.Refresh || action === CacheAction.Invalidate) {
        cache == null ? void 0 : cache.delete(cacheKey);

        if (action === CacheAction.Invalidate) {
          return entry == null ? void 0 : entry.response;
        }
      }

      if ($isNothing(entry) || action === CacheAction.Refresh) {
        return refreshResponse.call(this, cache, cacheKey, request, composer);
      }

      var timeToLive = cached.timeToLive || ONE_DAY_MS;

      if (Date.now() >= entry.lastUpdated + timeToLive) {
        return refreshResponse.call(this, cache, cacheKey, request, composer);
      }

      return entry.response;
    }

  }, (_applyDecoratedDescriptor(_class2$2.prototype, "cached", [_dec3$2], Object.getOwnPropertyDescriptor(_class2$2.prototype, "cached"), _class2$2.prototype)), _class2$2)) || _class$f) || _class$f);

  function refreshResponse(cache, cacheKey, request, composer) {
    var response = composer.$send(request);
    if ($isNothing(response)) return;
    var entry = {
      response: response,
      lastUpdated: Date.now()
    };

    if ($isPromise(response)) {
      response.then(result => entry.response = Promise.resolve(result), reason => {
        if (cache.get(cacheKey) === entry) {
          cache.delete(cacheKey);
        }
      });
    }

    cache.set(cacheKey, entry);
    return response;
  }

  function createCacheKey(request) {
    var cacheKey = request.getCacheKey == null ? void 0 : request.getCacheKey();

    if (!$isNothing(cacheKey)) {
      return `${assignID($classOf(request))}#${cacheKey}`;
    }
  }

  var _$l = createKey();

  var left = (Base, constraint, required) => class Left extends Base {
    constructor(value) {
      super();
      validate(value, constraint, required);
      _$l(this).value = value;
    }

    get value() {
      return _$l(this).value;
    }

    map(func) {
      return this;
    }

    apply(other) {
      return this;
    }

    flatMap(func) {
      return this;
    }

    mapLeft(func) {
      if ($isNothing(func)) {
        throw new Error("The func argument is required.");
      }

      if (!$isFunction(func)) {
        throw new Error("The func argument is not a function.");
      }

      return new Left(func(_$l(this).value));
    }

    fold(left, right) {
      if ($isNothing(left)) {
        throw new Error("The left argument is required.");
      }

      if (!$isFunction(left)) {
        throw new Error("The left argument is not a function.");
      }

      return left(_$l(this).value);
    }

  };
  var right = (Base, constraint, required) => class Right extends Base {
    constructor(value) {
      super();
      validate(value, constraint, required);
      _$l(this).value = value;
    }

    get value() {
      return _$l(this).value;
    }

    map(func) {
      return new Right(func(_$l(this).value));
    }

    apply(other) {
      var {
        value
      } = _$l(this);

      if (!$isFunction(value)) {
        throw new Error("Function containers can only call apply.");
      }

      return other.map(value);
    }

    flatMap(func) {
      if ($isNothing(func)) {
        throw new Error("The func argument is required.");
      }

      if (!$isFunction(func)) {
        throw new Error("The func argument is not a function.");
      }

      return func(_$l(this).value);
    }

    mapLeft(func) {
      return this;
    }

    fold(left, right) {
      if ($isNothing(right)) {
        throw new Error("The right argument is required.");
      }

      if (!$isFunction(right)) {
        throw new Error("The right argument is not a function.");
      }

      return right(_$l(this).value);
    }

  };
  class Either {
    constructor() {
      if (new.target === Either) {
        throw new Error("Use Either.left() or Either.right() to create instances.");
      }
    }

    static left(value) {
      return new Either.Left(value);
    }

    static right(value) {
      return new Either.Right(value);
    }

  }

  _defineProperty(Either, "Left", left(Either));

  _defineProperty(Either, "Right", right(Either));

  function validate(value, constraint, required) {
    if (!$isNothing(constraint)) {
      if (!$isFunction(constraint)) {
        throw new TypeError("The constraint must be a class.");
      }

      if ($isNothing(value)) {
        if (required) {
          throw new Error("The value argument is required.");
        }
      } else if (!(value instanceof constraint)) {
        throw new TypeError(`${value} is not a valid ${constraint.name} object.`);
      }
    }
  }

  class Try extends Either {
    constructor() {
      if (new.target === Try) {
        throw new Error("Use Try.failure() or Try.success() to create instances.");
      }

      super();
    }

    static failure(error) {
      return new Try.Failure(error);
    }

    static success(value) {
      return new Try.Success(value);
    }

  }

  _defineProperty(Try, "Failure", left(Try));

  _defineProperty(Try, "Success", right(Try));

  var _dec$d, _dec2$4, _class$g, _class2$3, _descriptor, _temp$1, _dec3$3, _class4, _temp2, _dec4, _class6, _dec5, _class7, _dec6, _class8;
  var ScheduledResult = (_dec$d = typeId("Miruken.Api.Schedule.ScheduledResult, Miruken"), _dec2$4 = design([Try]), _dec$d(_class$g = (_class2$3 = (_temp$1 = class ScheduledResult {
    constructor(responses) {
      _initializerDefineProperty(this, "responses", _descriptor, this);

      this.responses = responses || [];
    }

  }, _temp$1), (_descriptor = _applyDecoratedDescriptor(_class2$3.prototype, "responses", [_dec2$4], {
    configurable: true,
    enumerable: true,
    writable: true,
    initializer: null
  })), _class2$3)) || _class$g);
  var Scheduled = (_dec3$3 = response(ScheduledResult), _dec3$3(_class4 = (_temp2 = class Scheduled extends Request {
    constructor(requests) {
      super();

      _defineProperty(this, "requests", void 0);

      if (new.target === Scheduled) {
        throw new TypeError("Scheduled cannot be instantiated.");
      }

      this.requests = requests || [];
    }

  }, _temp2)) || _class4);
  var Concurrent = (_dec4 = typeId("Miruken.Api.Schedule.Concurrent, Miruken"), _dec4(_class6 = class Concurrent extends Scheduled {}) || _class6);
  var Sequential = (_dec5 = typeId("Miruken.Api.Schedule.Sequential, Miruken"), _dec5(_class7 = class Sequential extends Scheduled {}) || _class7);
  var Publish = (_dec6 = typeId("Miruken.Api.Schedule.Publish, Miruken"), _dec6(_class8 = class Publish extends MessageWrapper {}) || _class8);

  var _dec$e, _dec2$5, _dec3$4, _dec4$1, _dec5$1, _class$h, _class2$4;
  var Scheduler = (_dec$e = provides(), _dec2$5 = singleton(), _dec3$4 = handles(Concurrent), _dec4$1 = handles(Sequential), _dec5$1 = handles(Publish), _dec$e(_class$h = _dec2$5(_class$h = (_class2$4 = class Scheduler extends Handler {
    async concurrent(concurrent, {
      composer
    }) {
      var {
        requests
      } = concurrent;

      if ($isNothing(requests) || requests.length == 0) {
        return Promise.resolve(new ScheduledResult());
      }

      var responses = await Promise.all(requests.map(r => process.call(this, r, composer)));
      return new ScheduledResult(responses);
    }

    async sequential(sequential, {
      composer
    }) {
      var {
        requests
      } = sequential;

      if ($isNothing(requests)) {
        return Promise.resolve(new ScheduledResult());
      }

      var responses = [];

      for (var request of requests) {
        var response = await process.call(this, request, composer);
        responses.push(response);
        if (response instanceof Try.Failure) break;
      }

      return new ScheduledResult(responses);
    }

    publish(publish, {
      composer
    }) {
      return this.$publish(publish.message);
    }

  }, (_applyDecoratedDescriptor(_class2$4.prototype, "concurrent", [_dec3$4], Object.getOwnPropertyDescriptor(_class2$4.prototype, "concurrent"), _class2$4.prototype), _applyDecoratedDescriptor(_class2$4.prototype, "sequential", [_dec4$1], Object.getOwnPropertyDescriptor(_class2$4.prototype, "sequential"), _class2$4.prototype), _applyDecoratedDescriptor(_class2$4.prototype, "publish", [_dec5$1], Object.getOwnPropertyDescriptor(_class2$4.prototype, "publish"), _class2$4.prototype)), _class2$4)) || _class$h) || _class$h);

  function process(request, composer) {
    try {
      var result = request instanceof Publish ? composer.$publish(request.message) : composer.$send(request);

      if ($isPromise(result)) {
        return result.then(res => Try.success(res)).catch(reason => Try.failure(reason));
      }

      return Promise.resolve(Try.success(result));
    } catch (error) {
      return Promise.resolve(Try.failure(error));
    }
  }

  var _$m = createKey(),
      defaultDecorators = [singleton];

  var standardHandlers = [ErrorHandler, CachedHandler, Scheduler];
  class SourceBuilder extends exports.Base {
    constructor() {
      super();
      _$m(this).sources = [];
      this.types(standardHandlers);
    }

    getTypes() {
      var types = _$m(this).sources.flatMap(getTypes => getTypes());

      return [...new Set(types)];
    }

    modules(...modules) {
      var sources = _$m(this).sources;

      modules.flat().forEach(module => {
        if ($isSomething(module)) {
          sources.push(() => Object.keys(module).map(key => module[key]).filter(managedType));
        }
      });
      return this;
    }

    types(...types) {
      var managedTypes = types.flat().filter(requiredType);

      if (managedTypes.length > 0) {
        _$m(this).sources.push(() => managedTypes);
      }

      return this;
    }

  }
  class ProvideBuilder extends exports.Base {
    constructor(owner) {
      super();
      _$m(this).owner = owner;
    }

    implicitConstructors(...decorators) {
      _$m(this).owner.implicitConstructors = true;
      _$m(this).owner.implicitDecorators = decorators.flat().filter($isSomething);
    }

    explicitConstructors() {
      _$m(this).owner.implicitConstructors = false;
      delete _$m(this).owner.implicitDecorators;
    }

  }
  class DeriveTypesBuilder extends exports.Base {
    constructor(owner) {
      super();
      _$m(this).owner = owner;
    }

    deriveTypes(deriveTypes) {
      if ($isNothing(deriveTypes)) {
        throw new Error("The deriveTypes argument is required.");
      }

      if (!$isFunction(deriveTypes)) {
        throw new TypeError("The deriveTypes argument must be a function.");
      }

      _$m(this).owner.deriveTypes = deriveTypes;
    }

  }

  class TypeDetailsBuilder extends exports.Base {
    constructor(owner) {
      super();
      _$m(this).owner = owner;
    }

    implicitConstructors(...decorators) {
      new ProvideBuilder(_$m(this).owner).implicitConstructors(...decorators);
      return new DeriveTypesBuilder(_$m(this).owner);
    }

    explicitConstructors() {
      new ProvideBuilder(_$m(this).owner).explicitConstructors();
      return new DeriveTypesBuilder(_$m(this).owner);
    }

    deriveTypes(deriveTypes) {
      new DeriveTypesBuilder(_$m(this).owner).deriveTypes(deriveTypes);
      return new ProvideBuilder(_$m(this).owner);
    }

  }

  class SelectTypesBuilder extends exports.Base {
    get implicitConstructors() {
      return _$m(this).implicitConstructors;
    }

    get implicitDecorators() {
      return _$m(this).implicitDecorators;
    }

    acceptType(type) {
      var _$condition, _ref;

      return ((_$condition = (_ref = _$m(this)).condition) == null ? void 0 : _$condition.call(_ref, type)) === true;
    }

    deriveTypes(type) {
      var deriveTypes = _$m(this).deriveTypes;

      return $isNothing(deriveTypes) ? [type] : deriveTypes(type);
    }

    extendFrom(clazz, includeSelf) {
      if ($isNothing(clazz)) {
        throw new Error("The clazz argument is required.");
      }

      if (!$isFunction(clazz)) {
        throw new TypeError("The clazz argument is not a class.");
      }

      _$m(this).condition = type => type.prototype instanceof clazz || type === clazz && includeSelf;

      return new TypeDetailsBuilder(_$m(this));
    }

    conformTo(protocol) {
      if ($isNothing(protocol)) {
        throw new Error("The protocol argument is required.");
      }

      if (!$isProtocol(protocol)) {
        throw new TypeError("The protocol argument is not a Protocol.");
      }

      _$m(this).condition = type => protocol.isAdoptedBy(type);

      return new TypeDetailsBuilder(_$m(this));
    }

    satisfy(predicate) {
      if ($isNothing(predicate)) {
        throw new Error("The predicate argument is required.");
      }

      if (!$isFunction(predicate)) {
        throw new TypeError("The predicate argument must be a function.");
      }

      _$m(this).condition = predicate;
      return new TypeDetailsBuilder(_$m(this));
    }

  }
  class HandlerBuilder extends exports.Base {
    constructor() {
      super();

      var _this = _$m(this);

      _this.sources = new SourceBuilder();
      _this.selectors = [];
      _this.handlers = [];
      _this.implicitConstructors = true;
      this.takeTypes(that => that.satisfy(defaultTypes));
    }

    addTypes(from) {
      if ($isNothing(from)) {
        throw new Error("The from argument is required.");
      }

      if (!$isFunction(from)) {
        throw new Error("The from argument is not a function.");
      }

      from(_$m(this).sources);
      return this;
    }

    takeTypes(that) {
      if ($isNothing(that)) {
        throw new Error("The that argument is required.");
      }

      if (!$isFunction(that)) {
        throw new Error("The that argument is not a function.");
      }

      var selector = new SelectTypesBuilder();
      that(selector);

      _$m(this).selectors.push(selector);

      return this;
    }

    addHandlers(...handlers) {
      _$m(this).handlers.push(...handlers.flat().filter($isSomething));

      return this;
    }

    implicitConstructors(...decorators) {
      _$m(this).implicitConstructors = true;
      _$m(this).implicitDecorators = decorators.flat().filter($isSomething);
      return this;
    }

    explicitConstructors() {
      _$m(this).implicitConstructors = false;
      delete _$m(this).implicitDecorators;
      return this;
    }

    build() {
      var selectors = _$m(this).selectors,
          types = _$m(this).sources.getTypes().flatMap(type => {
        var match = selectors.find(selector => selector.acceptType(type));

        if ($isSomething(match)) {
          return match.deriveTypes(type).flatMap(t => {
            if (provides.isDefined(t)) return [t];

            var implicitConstructors = _$m(this).implicitConstructors;

            if ($isSomething(match.implicitConstructors)) {
              implicitConstructors = match.implicitConstructors;
            }

            if (implicitConstructors) {
              var signature = design.get(t, "constructor");

              if (t.length === 0 || $isSomething(signature)) {
                var decorators = match.implicitDecorators || _$m(this).implicitDecorators || defaultDecorators;
                return [t, createFactory(t, signature, decorators)];
              }
            }

            return [];
          });
        }

        return [];
      });

      return this.createHandler(types, _$m(this).handlers);
    }

    createHandler(selectedTypes, explicitHandlers) {
      return new CompositeHandler().addHandlers(explicitHandlers).addHandlers(new InferenceHandler(selectedTypes));
    }

  }

  function createFactory(type, signature, decorators) {
    var _dec, _class;

    var Factory = (_dec = provides(type), (_class = class Factory {
      static create(...args) {
        return Reflect.construct(type, args);
      }

    }, (_applyDecoratedDescriptor(_class, "create", [_dec], Object.getOwnPropertyDescriptor(_class, "create"), _class)), _class));

    if ($isSomething(signature)) {
      design.getOrCreateOwn(Factory, "create", () => signature);
    }

    Reflect.decorate(decorators, Factory, "create", Reflect.getOwnPropertyDescriptor(Factory, "create"));
    return Factory;
  }

  function defaultTypes(type) {
    var prototype = type.prototype;
    return prototype instanceof Handler || Filtering.isAdoptedBy(type) || $isSomething(HandlerDescriptor.getChain(type).next().value) || $isSomething(HandlerDescriptor.getChain(prototype).next().value);
  }

  function managedType(type) {
    if ($isNothing(type) || $isProtocol(type)) {
      return false;
    }

    return $isFunction(type) && !unmanaged.isDefined(type);
  }

  function requiredType(type) {
    if (!managedType(type)) {
      throw new TypeError(`Invalid type ${type} is not a class.`);
    }

    return true;
  }

  /**
   * Protocol for targets that manage disposal lifecycle.
   * @class Disposing
   * @extends Protocol
   */

  var Disposing = Protocol.extend({
    /**
     * Releases any resources managed by the receiver.
     * @method dispose
     */
    dispose() {}

  }, {
    dispose(instance) {
      if (Disposing.isAdoptedBy(instance)) {
        var dispose = instance.dispose;

        if (!$isNothing(dispose)) {
          dispose.call(instance);
        }
      }
    }

  });
  /**
   * Mixin for {{#crossLink "Disposing"}}{{/crossLink}} implementation.
   * @class DisposingMixin
   * @uses Disposing
   * @extends Module
   */

  var DisposingMixin = Module.extend({
    dispose(object) {
      var dispose = object._dispose;

      if ($isFunction(dispose)) {
        object.dispose = Undefined$1; // dispose once                

        return dispose.call(object);
      }
    }

  }, {
    coerce(target) {
      // Behave as class decorator
      if (arguments.length == 1 && $isFunction(target)) {
        Disposing.adoptBy(target);
        return target.implement(DisposingMixin);
      }
    }

  });
  var disposable = Base => {
    var _dec, _class;

    return _dec = conformsTo(Disposing), _dec(_class = class extends Base {
      dispose() {
        var dispose = this._dispose;

        if ($isFunction(dispose)) {
          this.dispose = Undefined$1; // dispose once                

          return dispose.call(this);
        }
      }

    }) || _class;
  };
  /**
   * Convenience function for disposing resources.
   * @method $using
   * @param    {Disposing}           disposing  - object to dispose
   * @param    {Function | Promise}  action     - block or Promise
   * @param    {Object}              [context]  - block context
   * @returns  {Any} result of executing the action in context.
   */

  function $using(disposing, action, context) {
    if (disposing && $isFunction(disposing.dispose)) {
      if (!$isPromise(action)) {
        var result;

        try {
          result = $isFunction(action) ? action.call(context, disposing) : action;

          if (!$isPromise(result)) {
            return result;
          }
        } finally {
          if ($isPromise(result)) {
            action = result;
          } else {
            var dresult = disposing.dispose();

            if (dresult !== undefined) {
              return dresult;
            }
          }
        }
      }

      return action.then(function (res) {
        var dres = disposing.dispose();
        return dres !== undefined ? dres : res;
      }, function (err) {
        var dres = disposing.dispose();
        return dres !== undefined ? dres : Promise.reject(err);
      });
    }
  }

  /**
   * TraversingAxis enum
   * @class TraversingAxis
   * @extends Enum
   */

  var TraversingAxis = Enum({
    /**
     * Traverse only current node.
     * @property {number} Self
     */
    Self: 1,

    /**
     * Traverse only current node root.
     * @property {number} Root
     */
    Root: 2,

    /**
     * Traverse current node children.
     * @property {number} Child
     */
    Child: 3,

    /**
     * Traverse current node siblings.
     * @property {number} Sibling
     */
    Sibling: 4,

    /**
     * Traverse current node ancestors.
     * @property {number} Ancestor
     */
    Ancestor: 5,

    /**
     * Traverse current node descendants.
     * @property {number} Descendant
     */
    Descendant: 6,

    /**
     * Traverse current node descendants in reverse.
     * @property {number} DescendantReverse
     */
    DescendantReverse: 7,

    /**
     * Traverse current node and children.
     * @property {number} SelfOrChild
     */
    SelfOrChild: 8,

    /**
     * Traverse current node and siblings.
     * @property {number} SelfOrSibling
     */
    SelfOrSibling: 9,

    /**
     * Traverse current node and ancestors.
     * @property {number} SelfOrAncestor
     */
    SelfOrAncestor: 10,

    /**
     * Traverse current node and descendents.
     * @property {number} SelfOrDescendant
     */
    SelfOrDescendant: 11,

    /**
     * Traverse current node and descendents in reverse.
     * @property {number} SelfOrDescendantReverse
     */
    SelfOrDescendantReverse: 12,

    /**
     * Traverse current node, ancestors and siblings.
     * @property {number} SelfSiblingOrAncestor 
     */
    SelfSiblingOrAncestor: 13
  });
  /**
   * Protocol for traversing an abitrary graph of objects.
   * @class Traversing
   * @extends Protocol
   */

  var Traversing = Protocol.extend({
    /**
     * Traverse a graph of objects.
     * @method traverse
     * @param {TraversingAxis}  axis       -  axis of traversal
     * @param {Function}        visitor    -  receives visited nodes
     * @param {Object}          [context]  -  visitor callback context
     */
    traverse(axis, visitor, context) {}

  });
  /**
   * Mixin for Traversing functionality.
   * @class TraversingMixin
   * @uses Traversing
   * @extends Module
   */

  var TraversingMixin = Module.extend({
    traverse(object, axis, visitor, context) {
      if ($isFunction(axis)) {
        context = visitor;
        visitor = axis;
        axis = TraversingAxis.Child;
      }

      if (!$isFunction(visitor)) return;

      switch (axis) {
        case TraversingAxis.Self:
          traverseSelf.call(object, visitor, context);
          break;

        case TraversingAxis.Root:
          traverseRoot.call(object, visitor, context);
          break;

        case TraversingAxis.Child:
          traverseChildren.call(object, visitor, false, context);
          break;

        case TraversingAxis.Sibling:
          traverseSelfSiblingOrAncestor.call(object, visitor, false, false, context);
          break;

        case TraversingAxis.SelfOrChild:
          traverseChildren.call(object, visitor, true, context);
          break;

        case TraversingAxis.SelfOrSibling:
          traverseSelfSiblingOrAncestor.call(object, visitor, true, false, context);
          break;

        case TraversingAxis.Ancestor:
          traverseAncestors.call(object, visitor, false, context);
          break;

        case TraversingAxis.SelfOrAncestor:
          traverseAncestors.call(object, visitor, true, context);
          break;

        case TraversingAxis.Descendant:
          traverseDescendants.call(object, visitor, false, context);
          break;

        case TraversingAxis.DescendantReverse:
          traverseDescendantsReverse.call(object, visitor, false, context);
          break;

        case TraversingAxis.SelfOrDescendant:
          traverseDescendants.call(object, visitor, true, context);
          break;

        case TraversingAxis.SelfOrDescendantReverse:
          traverseDescendantsReverse.call(object, visitor, true, context);
          break;

        case TraversingAxis.SelfSiblingOrAncestor:
          traverseSelfSiblingOrAncestor.call(object, visitor, true, true, context);
          break;

        default:
          throw new Error(`Unrecognized TraversingAxis ${axis}.`);
      }
    }

  });
  var traversable = Base => {
    var _dec, _class;

    return _dec = conformsTo(Traversing), _dec(_class = class extends Base {
      traverse(axis, visitor, context) {
        if ($isFunction(axis)) {
          context = visitor;
          visitor = axis;
          axis = TraversingAxis.Child;
        }

        if (!$isFunction(visitor)) return;

        switch (axis) {
          case TraversingAxis.Self:
            traverseSelf.call(this, visitor, context);
            break;

          case TraversingAxis.Root:
            traverseRoot.call(this, visitor, context);
            break;

          case TraversingAxis.Child:
            traverseChildren.call(this, visitor, false, context);
            break;

          case TraversingAxis.Sibling:
            traverseSelfSiblingOrAncestor.call(this, visitor, false, false, context);
            break;

          case TraversingAxis.SelfOrChild:
            traverseChildren.call(this, visitor, true, context);
            break;

          case TraversingAxis.SelfOrSibling:
            traverseSelfSiblingOrAncestor.call(this, visitor, true, false, context);
            break;

          case TraversingAxis.Ancestor:
            traverseAncestors.call(this, visitor, false, context);
            break;

          case TraversingAxis.SelfOrAncestor:
            traverseAncestors.call(this, visitor, true, context);
            break;

          case TraversingAxis.Descendant:
            traverseDescendants.call(this, visitor, false, context);
            break;

          case TraversingAxis.DescendantReverse:
            traverseDescendantsReverse.call(this, visitor, false, context);
            break;

          case TraversingAxis.SelfOrDescendant:
            traverseDescendants.call(this, visitor, true, context);
            break;

          case TraversingAxis.SelfOrDescendantReverse:
            traverseDescendantsReverse.call(this, visitor, true, context);
            break;

          case TraversingAxis.SelfSiblingOrAncestor:
            traverseSelfSiblingOrAncestor.call(this, visitor, true, true, context);
            break;

          default:
            throw new Error(`Unrecognized TraversingAxis ${axis}.`);
        }
      }

    }) || _class;
  };

  function checkCircularity(visited, node) {
    if (visited.indexOf(node) !== -1) {
      throw new Error(`Circularity detected for node ${node}`);
    }

    visited.push(node);
    return node;
  }

  function traverseSelf(visitor, context) {
    visitor.call(context, this);
  }

  function traverseRoot(visitor, context) {
    var parent,
        root = this,
        visited = [this];

    while (parent = root.parent) {
      checkCircularity(visited, parent);
      root = parent;
    }

    visitor.call(context, root);
  }

  function traverseChildren(visitor, withSelf, context) {
    if (withSelf && visitor.call(context, this)) {
      return;
    }

    for (var child of this.children) {
      if (visitor.call(context, child)) {
        return;
      }
    }
  }

  function traverseAncestors(visitor, withSelf, context) {
    var parent = this,
        visited = [this];

    if (withSelf && visitor.call(context, this)) {
      return;
    }

    while ((parent = parent.parent) && !visitor.call(context, parent)) {
      checkCircularity(visited, parent);
    }
  }

  function traverseDescendants(visitor, withSelf, context) {
    if (withSelf) {
      Traversal.levelOrder(this, visitor, context);
    } else {
      Traversal.levelOrder(this, node => !$equals(this, node) && visitor.call(context, node), context);
    }
  }

  function traverseDescendantsReverse(visitor, withSelf, context) {
    if (withSelf) {
      Traversal.reverseLevelOrder(this, visitor, context);
    } else {
      Traversal.reverseLevelOrder(this, node => !$equals(this, node) && visitor.call(context, node), context);
    }
  }

  function traverseSelfSiblingOrAncestor(visitor, withSelf, withAncestor, context) {
    if (withSelf && visitor.call(context, this)) {
      return;
    }

    var parent = this.parent;

    if (parent) {
      for (var sibling of parent.children) {
        if (!$equals(this, sibling) && visitor.call(context, sibling)) {
          return;
        }
      }

      if (withAncestor) {
        traverseAncestors.call(parent, visitor, true, context);
      }
    }
  }
  /**
   * Helper class for traversing a graph.
   * @static
   * @class Traversal
   * @extends Abstract
   */


  var Traversal = Abstract.extend({}, {
    /**
     * Performs a pre-order graph traversal.
     * @static
     * @method preOrder
     * @param  {Traversing}  node       -  node to traverse
     * @param  {Function}    visitor    -  receives visited nodes
     * @param  {Object}      [context]  -  visitor calling context
     */
    preOrder(node, visitor, context) {
      return preOrder(node, visitor, context);
    },

    /**
     * Performs a post-order graph traversal.
     * @static
     * @method postOrder
     * @param  {Traversing}  node       -  node to traverse
     * @param  {Function}    visitor    -  receives visited nodes
     * @param  {Object}      [context]  -  visitor calling context
     */
    postOrder(node, visitor, context) {
      return postOrder(node, visitor, context);
    },

    /**
     * Performs a level-order graph traversal.
     * @static
     * @method levelOrder
     * @param  {Traversing}  node       -  node to traverse
     * @param  {Function}    visitor    -  receives visited nodes
     * @param  {Object}      [context]  -  visitor calling context
     */
    levelOrder(node, visitor, context) {
      return levelOrder(node, visitor, context);
    },

    /**
     * Performs a reverse level-order graph traversal.
     * @static
     * @method levelOrder
     * @param  {Traversing}  node       -  node to traverse
     * @param  {Function}    visitor    -  receives visited nodes
     * @param  {Object}      [context]  -  visitor calling context
     */
    reverseLevelOrder(node, visitor, context) {
      return reverseLevelOrder(node, visitor, context);
    }

  });

  function preOrder(node, visitor, context, visited = []) {
    checkCircularity(visited, node);

    if (!node || !$isFunction(visitor) || visitor.call(context, node)) {
      return true;
    }

    var traverse = node.traverse;
    if ($isFunction(traverse)) traverse.call(node, child => preOrder(child, visitor, context, visited));
    return false;
  }

  function postOrder(node, visitor, context, visited = []) {
    checkCircularity(visited, node);

    if (!node || !$isFunction(visitor)) {
      return true;
    }

    var traverse = node.traverse;
    if ($isFunction(traverse)) traverse.call(node, child => postOrder(child, visitor, context, visited));
    return visitor.call(context, node);
  }

  function levelOrder(node, visitor, context, visited = []) {
    if (!node || !$isFunction(visitor)) {
      return;
    }

    var queue = [node];

    while (queue.length > 0) {
      var next = queue.shift();
      checkCircularity(visited, next);

      if (visitor.call(context, next)) {
        return;
      }

      var traverse = next.traverse;
      if ($isFunction(traverse)) traverse.call(next, child => {
        if (child) queue.push(child);
      });
    }
  }

  function reverseLevelOrder(node, visitor, context, visited = []) {
    if (!node || !$isFunction(visitor)) {
      return;
    }

    var queue = [node],
        stack = [];

    var _loop = function () {
      var next = queue.shift();
      checkCircularity(visited, next);
      stack.push(next);
      var level = [],
          traverse = next.traverse;
      if ($isFunction(traverse)) traverse.call(next, child => {
        if (child) level.unshift(child);
      });
      queue.push.apply(queue, level);
    };

    while (queue.length > 0) {
      _loop();
    }

    while (stack.length > 0) {
      if (visitor.call(context, stack.pop())) {
        return;
      }
    }
  }

  var _dec$f, _class$i;

  var _$n = createKeyChain();
  /**
   * Represents the state of a {{#crossLink "Context"}}{{/crossLink}}.
   * @class ContextState
   * @extends Enum
   */


  var ContextState = Enum({
    /**
     * Context is active.
     * @property {number} Active
     */
    Active: 1,

    /**
     * Context is in the process of ending.
     * @property {number} Ending
     */
    Ending: 2,

    /**
     * Context has ended.
     * @property {number} Ended
     */
    Ended: 3
  });
  /**
   * Protocol for observing the lifecycle of
   * {{#crossLink "Context"}}{{/crossLink}}.
   * @class ContextObserver
   * @extends Protocol
   */

  var ContextObserver = Protocol.extend({
    /**
     * Called when a context is in the process of ending.
     * @method contextEnding
     * @param  {Context}  context
     */
    contextEnding(context) {},

    /**
     * Called when a context has ended.
     * @method contextEnded
     * @param  {Context}  context
     */
    contextEnded(context) {},

    /**
     * Called when a child context is in the process of ending.
     * @method childContextEnding
     * @param  {Context}  childContext
     */
    childContextEnding(childContext) {},

    /**
     * Called when a child context has ended.
     * @method childContextEnded
     * @param  {Context}  childContext
     */
    childContextEnded(context) {}

  });
  /**
   * A Context represents the scope at a give point in time.<br/>
   * It has a beginning and an end and can handle callbacks as well as notify observers of lifecycle changes.<br/>
   * In addition, it maintains parent-child relationships and thus can participate in a hierarchy.
   * @class Context
   * @constructor
   * @param  {Context}  [parent]  -  parent context
   * @extends CompositeHandler
   * @uses Parenting
   * @uses Traversing
   * @uses Disposing
   */

  var Context$1 = (_dec$f = conformsTo(Parenting, Disposing), traversable(_class$i = _dec$f(_class$i = class Context extends CompositeHandler {
    constructor(parent) {
      super();

      var _this = _$n(this);

      _this.id = assignID(this);
      _this.parent = parent;
      _this.state = ContextState.Active;
      _this.children = [];
      _this.observers = [];
    }

    get id() {
      return _$n(this).id;
    }

    get state() {
      return _$n(this).state;
    }

    get parent() {
      return _$n(this).parent;
    }

    get children() {
      return _$n(this).children.slice();
    }

    get hasChildren() {
      return _$n(this).children.length > 0;
    }

    get root() {
      var root = this,
          parent;

      while (root && (parent = root.parent)) {
        root = parent;
      }

      return root;
    }

    newChild() {
      ensureActive.call(this);
      var parent = this,
          childContext = new ($classOf(this))(this).extend({
        end() {
          var index = _$n(parent).children.indexOf(childContext);

          if (index < 0) return;
          var notifier = makeNotifier.call(parent);
          notifier.childContextEnding(childContext);

          _$n(parent).children.splice(index, 1);

          this.base();
          notifier.childContextEnded(childContext);
        }

      });

      _$n(this).children.push(childContext);

      return childContext;
    }

    store(object) {
      if (!$isNothing(object)) {
        provides.addHandler(this, object);
      }

      return this;
    }

    handleCallback(callback, greedy, composer) {
      var handled = false,
          axis = _$n(this).axis;

      if (!axis) {
        handled = super.handleCallback(callback, greedy, composer);

        if (handled && !greedy) {
          return true;
        }

        if (this.parent) {
          handled = handled | this.parent.handle(callback, greedy, composer);
        }

        return !!handled;
      }

      delete _$n(this).axis;

      if (axis === TraversingAxis.Self) {
        return super.handleCallback(callback, greedy, composer);
      } else {
        this.traverse(axis, node => {
          handled = handled | ($equals(node, this) ? super.handleCallback(callback, greedy, composer) : node.handleAxis(TraversingAxis.Self, callback, greedy, composer));
          return handled && !greedy;
        }, this);
      }

      return !!handled;
    }

    handleAxis(axis, callback, greedy, composer) {
      if (!(axis instanceof TraversingAxis)) {
        throw new TypeError("Invalid axis type supplied.");
      }

      _$n(this).axis = axis;
      return this.handle(callback, greedy, composer);
    }

    observe(observer) {
      ensureActive.call(this);
      if ($isNothing(observer)) return;

      _$n(this).observers.push(observer);

      return () => {
        var {
          observers
        } = _$n(this);

        var index = observers.indexOf(observer);

        if (index >= 0) {
          observers.splice(index, 1);
        }
      };
    }

    unwindToRootContext() {
      var current = this;

      while (current) {
        var parent = current.parent;

        if (parent == null) {
          current.unwind();
          return current;
        }

        current = parent;
      }

      return this;
    }

    unwind() {
      for (var child of this.children) {
        child.end();
      }

      return this;
    }

    end() {
      var _this = _$n(this);

      if (_this.state == ContextState.Active) {
        var notifier = makeNotifier.call(this);
        _this.state = ContextState.Ending;
        notifier.contextEnding(this);
        this.unwind();
        _this.state = ContextState.Ended;
        notifier.contextEnded(this);
        delete _$n(this).observers;
      }
    }

    dispose() {
      this.end();
    }

  }) || _class$i) || _class$i);

  function ensureActive() {
    if (_$n(this).state != ContextState.Active) {
      throw new Error("The context has already ended.");
    }
  }

  function makeNotifier() {
    return new ContextObserver(_$n(this).observers.slice());
  }

  var axisBuilder = {
    axis(axis) {
      return this.$decorate({
        handleCallback(callback, greedy, composer) {
          if (!(callback instanceof Composition)) {
            _$n(this).axis = axis;
          }

          return this.base(callback, greedy, composer);
        },

        equals(other) {
          return this === other || $decorated(this) === $decorated(other);
        }

      });
    }

  };
  TraversingAxis.items.forEach(axis => {
    var key = "$" + axis.name.charAt(0).toLowerCase() + axis.name.slice(1);

    axisBuilder[key] = function () {
      return this.axis(axis);
    };
  });
  Context$1.implement(axisBuilder);

  class ContextBuilder extends HandlerBuilder {
    constructor(parent) {
      super();
      _(this).parent = parent;
    }

    createHandler(selectedTypes, explicitHandlers) {
      var parent = _(this).parent,
          context = $isNothing(parent) ? new Context$1() : parent.newChild();

      return context.addHandlers(explicitHandlers).addHandlers(new InferenceHandler(selectedTypes));
    }

  }

  /**
   * Mixin for {{#crossLink "Contextual"}}{{/crossLink}} helper support.
   * @class ContextualHelper
   */

  class ContextualHelper {
    /**
     * Resolves the receivers context.
     * @method resolveContext
     * @returns {Context} receiver if a context or the receiver context. 
     */
    static resolveContext(contextual) {
      return $isNothing(contextual) || contextual instanceof Context$1 ? contextual : contextual.context;
    }
    /**
     * Ensure the receiver is associated with a context.
     * @method requireContext
     * @throws {Error} an error if a context could not be resolved.
     */


    static requireContext(contextual) {
      var context = ContextualHelper.resolveContext(contextual);
      if (!(context instanceof Context$1)) throw new Error("The supplied object is not a Context or Contextual object.");
      return context;
    }
    /**
     * Clears and ends the receivers associated context.
     * @method clearContext
     */


    static clearContext(contextual) {
      var context = contextual.context;

      if (context) {
        try {
          context.end();
        } finally {
          contextual.context = null;
        }
      }
    }
    /**
     * Attaches the context to the receiver.
     * @method bindContext
     * @param  {Context}  context  -  context
     * @param  {boolean}  replace  -  true if replace existing context
     * @returns {Context} effective context.
     * @throws {Error} an error if the context could be attached.
     */


    static bindContext(contextual, context, replace) {
      if (contextual && (replace || !contextual.context)) {
        contextual.context = ContextualHelper.resolveContext(context);
      }

      return contextual;
    }
    /**
     * Attaches a child context of the receiver to the contextual child.
     * @method bindChildContext
     * @param  {Context}  child    -  contextual child
     * @param  {boolean}  replace  -  true if replace existing context
     * @returns {Context} effective child context.
     * @throws {Error} an error if the child context could be attached.
     */


    static bindChildContext(contextual, child, replace) {
      var childContext;

      if (child) {
        if (!replace) {
          childContext = child.context;

          if (childContext && childContext.state === ContextState.Active) {
            return childContext;
          }
        }

        var context = ContextualHelper.requireContext(contextual);

        while (context && context.state !== ContextState.Active) {
          context = context.parent;
        }

        if (context) {
          childContext = context.newChild();
          ContextualHelper.bindContext(child, childContext, true);
        }
      }

      return childContext;
    }

  }

  Context$1.implement({
    /**
     * Observes 'contextEnding' notification.
     * @method onEnding
     * @param   {Function}  observer  -  receives notification
     * @returns {Function}  unsubscribes from 'contextEnding' notification.
     * @for Context
     */
    onEnding(observer) {
      return this.observe({
        contextEnding: observer
      });
    },

    /**
     * Observes 'contextEnded' notification.
     * @method onEnded
     * @param   {Function}  observer  -  receives notification
     * @returns {Function}  unsubscribes from 'contextEnded' notification.
     * @for Context
     * @chainable
     */
    onEnded(observer) {
      return this.observe({
        contextEnded: observer
      });
    },

    /**
     * Observes 'childContextEnding' notification.
     * @method onChildEnding
     * @param   {Function}  observer  -  receives notification
     * @returns {Function}  unsubscribes from 'childContextEnding' notification.
     * @for Context
     * @chainable
     */
    onChildEnding(observer) {
      return this.observe({
        childContextEnding: observer
      });
    },

    /**
     * Observes 'childContextEnded' notification.
     * @method onChildEnded
     * @param   {Function}  observer  -  receives notification
     * @returns {Function}  unsubscribes from 'childContextEnded' notification.
     * @for Context
     * @chainable
     */
    onChildEnded(observer) {
      return this.observe({
        childContextEnded: observer
      });
    }

  });

  /**
   * Standard filter precedence.
   * @class Stage
   * @extends Enum
   */

  var Stage = Enum({
    /**
     * Normal filters
     * @property {number} Filter
     */
    Filter: 0,

    /**
     * Logging filters
     * @property {number} Logging
     */
    Logging: 10,

    /**
     * Authorization filters
     * @property {number} Authorization
     */
    Authorization: 30,

    /**
     * Validation filters
     * @property {number} Validation
     */
    Validation: 50
  });

  var _dec$g, _class$j, _dec2$6, _class2$5;

  var _$o = createKey();

  var ConstraintFilter = (_dec$g = conformsTo(Filtering), _dec$g(_class$j = class ConstraintFilter {
    get order() {
      return Stage.Filter;
    }

    next(callback, {
      provider,
      next,
      abort
    }) {
      if (!(provider instanceof ConstraintProvider)) {
        return abort();
      }

      var metadata = callback.metadata;
      return !(metadata == null || provider.constraint.matches(metadata)) ? abort() : next();
    }

  }) || _class$j);
  var constraintFilter = [new ConstraintFilter()];
  var ConstraintProvider = (_dec2$6 = conformsTo(FilteringProvider), _dec2$6(_class2$5 = class ConstraintProvider {
    constructor(constraint) {
      if ($isNothing(constraint)) {
        throw new Error("The constraint argument is required.");
      }

      if (!(constraint instanceof BindingConstraint)) {
        throw new TypeError("The constraint argument is not a BindingConstraint.");
      }

      _$o(this).constraint = constraint;
    }

    get required() {
      return true;
    }

    get constraint() {
      return _$o(this).constraint;
    }

    appliesTo(callback) {
      return callback.metadata instanceof BindingMetadata;
    }

    getFilters(binding, callback, composer) {
      return constraintFilter;
    }

  }) || _class2$5);

  function createConstraintDecorator(createConstraint) {
    if (!$isFunction(createConstraint)) {
      throw new Error("The createConstraint argument must be a function.");
    }

    return function (target, key, descriptorOrIndex) {
      if (arguments.length === 0) {
        // ConstraintBuilder
        return createConstraint();
      }

      if (isDescriptor(descriptorOrIndex))
        /* member */
        {
          createConstraintFilter(createConstraint, target, key, descriptorOrIndex, emptyArray);
        } else if (target != null && (key == null || typeof key == "string") && typeof descriptorOrIndex == "number")
        /* parameter */
        {
          createConstrainedArgument(createConstraint, target, key, descriptorOrIndex, emptyArray);
        } else {
        var args = [...arguments];
        return function (target, key, descriptorOrIndex) {
          if (arguments.length === 0) {
            // ConstraintBuilder
            return createConstraint(...args);
          }

          if (key == null && descriptorOrIndex == null ||
          /* class */
          isDescriptor(descriptorOrIndex))
            /* member */
            {
              createConstraintFilter(createConstraint, target, key, descriptorOrIndex, args);
            } else if (target != null && (key == null || typeof key == "string") && typeof descriptorOrIndex == "number")
            /* parameter */
            {
              createConstrainedArgument(createConstraint, target, key, descriptorOrIndex, args);
            } else {
            throw new SyntaxError("Constraints can be applied to classes, methods and arguments.");
          }
        };
      }
    };
  }

  function createConstraintFilter(createConstraint, target, key, descriptor, args) {
    var decorator = createFilterDecorator((target, key, descriptor) => {
      var constraint = createConstraint(...args);

      if (!(constraint instanceof BindingConstraint)) {
        throw new SyntaxError("The createConstraint function did not return a BindingConstraint.");
      }

      return new ConstraintProvider(constraint);
    });
    return descriptor == null
    /* class */
    ? decorator(args)(target, key, descriptor) : decorator(target, key, descriptor);
  }

  function createConstrainedArgument(createConstraint, target, key, parameterIndex, args) {
    createTypeInfoDecorator((key, typeInfo) => {
      var constraint = createConstraint(...args);

      if (!(constraint instanceof BindingConstraint)) {
        throw new SyntaxError("The createConstraint function did not return a BindingConstraint.");
      }

      typeInfo.addConstraint(constraint);
    })(target, key, parameterIndex);
  }

  var constraint = createConstraintDecorator(constraint => constraint);

  var _$p = createKey();

  class QualifierConstraint extends BindingConstraint {
    constructor(qualifier) {
      super();
      _$p(this).qualifier = qualifier || Symbol();
    }

    require(metadata) {
      if ($isNothing(metadata)) {
        throw new Error("The metadata argument is required.");
      }

      metadata.set(_$p(this).qualifier, null);
    }

    matches(metadata) {
      if ($isNothing(metadata)) {
        throw new Error("The metadata argument is required.");
      }

      return metadata.isEmpty || metadata.has(_$p(this).qualifier);
    }

  }
  function createQualifier(qualifier) {
    var constraint = new QualifierConstraint(qualifier); // Pass the constraint as an argument to help distinguish
    // class decorators without any arguments.

    return createConstraintDecorator((...args) => constraint)(constraint);
  }

  var ContextField = Symbol();
  var Contextual = Protocol.extend({
    get context() {},

    set context(value) {}

  });
  /**
   * Decorator/mixin to make classes contextual.<br/>
   * <pre>
   *    @contextual
   *    class Controller extends Base {
   *       action: function () {}
   *    }
   * </pre>
   * would give the Controller class contextual support.
   * @method contextual
   * @param {Function}  target  -  target to contextualize
   */

  var contextual = Base => {
    var _dec, _class;

    return _dec = conformsTo(Contextual), _dec(_class = class extends Base {
      /**
       * The context associated with the receiver.
       * @property {Context} context
       */
      get context() {
        return this[ContextField];
      }

      set context(context) {
        var field = this[ContextField];
        if (field === context) return;

        if (field) {
          field.removeHandlers(this);
        }

        if (context) {
          this[ContextField] = context;
          context.insertHandlers(0, this);
        } else {
          delete this[ContextField];
        }
      }
      /**
       * Determines if the receivers context is active.
       * @property {boolean} isActiveContext
       * @readOnly
       */


      get isActiveContext() {
        var field = this[ContextField];
        return field && field.state === ContextState.Active;
      }
      /**
       * Ends the callers context.
       * @method endCallingContext
       */


      endCallingContext() {
        var composer = exports.$composer;
        if ($isNothing(composer)) return;
        var context = composer.resolve(Context);

        if (context && context !== this.context) {
          context.End();
        }
      }
      /**
       * Ends the receivers context.
       * @method endContext
       */


      endContext() {
        var field = this[ContextField];
        if (field) field.end();
      }

    }) || _class;
  };

  var _$q = createKey();

  class ContextualLifestyle extends Lifestyle {
    constructor() {
      super();
      _$q(this).cache = new Map();
    }

    isCompatibleWithParent(parent, {
      provider
    }) {
      var parentBinding = parent.binding;
      if ($isNothing(parentBinding)) return true;
      var parentFilters = parentBinding.getMetadata(filter);
      if ($isNothing(parentFilters)) return true;
      var rooted = provider.rooted,
          lifestyles = parentFilters.filters.filter(isLifestyleProvider);

      for (var lifestyle of lifestyles) {
        if (!(lifestyle instanceof ContextualLifestyleProvider) || !rooted && lifestyle.rooted) {
          return false;
        }
      }
    }

    getInstance(inquiry, {
      provider,
      composer,
      next,
      abort
    }) {
      var context = $decorated(composer.resolve(Context$1), true);
      if ($isNothing(context)) return;

      if (provider.rooted) {
        context = context.root;
      }

      var cache = _$q(this).cache;

      if (cache.has(context)) {
        return cache.get(context);
      }

      var instance = next();

      if ($isPromise(instance)) {
        instance = instance.then(result => {
          result = bindContext(result, context, cache);
          cache.set(context, result);
          return result;
        });
      } else {
        instance = bindContext(instance, context, cache);
      }

      cache.set(context, instance);
      return instance;
    }

  }

  function isLifestyleProvider(filter) {
    return filter instanceof LifestyleProvider;
  }

  function bindContext(instance, context, cache) {
    if (Contextual.isAdoptedBy(instance)) {
      if (!$isNothing(instance.context)) {
        throw new Error("The instance has a Context already assigned.");
      }

      var managed = pcopy(instance),
          contextp = getPropertyDescriptors(managed, "context"),
          {
        get = getContext,
        set = setContext
      } = contextp || {};
      set.call(managed, context);
      Object.defineProperty(managed, "context", {
        get() {
          return get.call(managed);
        },

        set(value) {
          if (value != null) {
            if (get.call(managed) == null) {
              throw new Error("The managed contextual instance has been evicted.");
            }

            if (value !== context) {
              throw new Error("The managed contextual instance cannot change context.");
            }
          } else if (cache.get(context) === managed) {
            cache.delete(context);
            set.call(managed, null);
            Disposing.dispose(managed);
          }
        }

      });
      context.observe({
        contextEnded(ctx) {
          managed.context = null;
        }

      });
      return managed;
    }

    context.observe({
      contextEnded(ctx) {
        cache.delete(ctx);
        Disposing.dispose(instance);
      }

    });
    return instance;
  }

  var ContextField$1 = Symbol();

  function getContext() {
    return this[ContextField$1];
  }

  function setContext(context) {
    var field = this[ContextField$1];
    if (field === context) return;

    if (field) {
      field.removeHandlers(this);
    }

    if (context) {
      this[ContextField$1] = context;
      context.insertHandlers(0, this);
    } else {
      delete this[ContextField$1];
    }
  }

  class ContextualLifestyleProvider extends LifestyleProvider {
    constructor(rooted) {
      super(new ContextualLifestyle());
      _$q(this).rooted = rooted;
    }

    get rooted() {
      return _$q(this).rooted;
    }

  }
  var scopedQualifier = new QualifierConstraint();
  var scopedProvider = new ConstraintProvider(scopedQualifier),
      provideContextual = [new ContextualLifestyleProvider(false), scopedProvider],
      provideRootedContextual = [new ContextualLifestyleProvider(true), scopedProvider];
  var scoped = createFilterDecorator((target, key, descriptor, [rooted]) => rooted === true ? provideRootedContextual : provideContextual);
  var scopedRooted = createFilterDecorator((target, key, descriptor) => provideRootedContextual);

  var _dec$h, _class$k;

  var _$r = createKeyChain();
  /**
   * Protocol to participate in batched operations.
   * @class Batching
   * @extends Protocol
   */


  var Batching = Protocol.extend({
    /**
     * Completes the batching operation.
     * @method complete
     * @param   {Handler}  composer  - composition handler
     * @returns {Any} the batching result.
     */
    complete(composer) {}

  });
  /**
   * Coordinates batching operations through the protocol
   * {{#crossLink "Batching"}}{{/crossLink}}.
   * @class BatchingComplete
   * @uses Batching
   */

  var BatchingComplete = Protocol.extend({
    /**
     * Completes the batching operation.
     * @method complete
     * @param   {Handler}  composer  - composition handler
     * @returns {Array|Promise(Array)} an array or promise of array.
     */
    complete(composer) {}

  });
  var Batch = (_dec$h = conformsTo(BatchingComplete), _dec$h(_class$k = class Batch extends CompositeHandler {
    constructor(...tags) {
      super();
      _$r(this).tags = $flatten(tags, true);
    }

    shouldBatch(tag) {
      var tags = _$r(this).tags;

      return tag && (tags.length == 0 || tags.indexOf(tag) >= 0);
    }

    complete(composer) {
      var results = this.getHandlers().reduce((res, handler) => {
        var result = Batching(handler).complete(composer);
        return result ? [...res, result] : res;
      }, []);
      return results.some($isPromise) ? Promise.all(results) : results;
    }

  }) || _class$k);
  class NoBatch extends Trampoline {
    get canBatch() {
      return false;
    }

  }

  Handler.implement({
    /**
     * Establishes broadcast invocation semantics.
     * @method $broadcast
     * @returns {Handler} broadcast semantics.
     * @for Handler
     */
    $broadcast() {
      var composer = this;
      var context = ContextualHelper.resolveContext(composer);

      if (context) {
        composer = context.$selfOrDescendant();
      }

      return composer.$notify();
    },

    $broadcastFromRoot() {
      var composer = this;
      var context = ContextualHelper.resolveContext(composer);

      if (context) {
        composer = context.root.$selfOrDescendant();
      }

      return composer.$notify();
    }

  });

  var _$s = createKeyChain();
  /**
   * CallbackOptions flags enum
   * @class CallbackOptions
   * @extends Flags
   */


  var CallbackOptions = Flags({
    /**
     * @property {number} None
     */
    None: 0,

    /**
     * Requires no protocol conformance.
     * @property {number} Duck
     */
    Duck: 1 << 0,

    /**
     * Requires callback to match exact protocol.
     * @property {number} Strict
     */
    Strict: 1 << 1,

    /**
     * Delivers callback to all handlers, requiring at least one to handle it.
     * @property {number} Broadcast
     */
    Greedy: 1 << 2,

    /**
     * Marks callback as optional.
     * @property {number} BestEffort
     */
    BestEffort: 1 << 3,

    /**
     * Delivers callback to all handlers.
     * @property {number} Notify
     */
    Notify: 1 << 2 | 1 << 3
  });
  /**
   * Captures callback semantics.
   * @class CallbackSemantics
   * @constructor
   * @param  {CallbackOptions}  options  -  callback options.
   * @extends Composition
   */

  class CallbackSemantics extends Composition {
    constructor(options) {
      super();

      var _this = _$s(this);

      _this.options = CallbackOptions.None.addFlag(options);
      _this.specified = _this.options;
    }

    get canBatch() {
      return false;
    }

    get canFilter() {
      return false;
    }

    get canInfer() {
      return false;
    }

    hasOption(options) {
      return _$s(this).options.hasFlag(options);
    }

    setOption(options, enabled) {
      var _this = _$s(this);

      _this.options = enabled ? _this.options.addFlag(options) : _this.options.removeFlag(options);
      _this.specified = _this.specified.addFlag(options);
    }

    isSpecified(options) {
      return _$s(this).specified.hasFlag(options);
    }

    mergeInto(semantics) {
      var items = CallbackOptions.items;

      for (var i = 0; i < items.length; ++i) {
        var option = +items[i];

        if (this.isSpecified(option) && !semantics.isSpecified(option)) {
          semantics.setOption(option, this.hasOption(option));
        }
      }
    }

  }
  Handler.implement({
    /**
     * Establishes duck callback semantics.
     * @method $duck
     * @returns {Handler} duck semantics.
     * @for Handler
     */
    $duck() {
      return this.$callOptions(CallbackOptions.Duck);
    },

    /**
     * Establishes strict callback semantics.
     * @method $strict
     * @returns {Handler} strict semantics.
     * @for Handler
     */
    $strict() {
      return this.$callOptions(CallbackOptions.Strict);
    },

    /**
     * Establishes greedy callback semantics.
     * @method $greedy
     * @returns {Handler} greedy semanics.
     * @for Handler
     */
    $greedy() {
      return this.$callOptions(CallbackOptions.Greedy);
    },

    /**
     * Establishes best-effort callback semantics.
     * @method $bestEffort
     * @returns {Handler} best-effort semanics.
     * @for Handler
     */
    $bestEffort() {
      return this.$callOptions(CallbackOptions.BestEffort);
    },

    /**
     * Establishes notification callback semantics.
     * @method $notify
     * @returns {CallbackOptionsHandler} notification semanics.
     * @for Handler
     */
    $notify() {
      return this.$callOptions(CallbackOptions.Notify);
    },

    /**
     * Establishes callback semantics.
     * @method $callOptions
     * @param  {CallbackOptions}  options  -  callback semantics
     * @returns {Handler} custom callback semanics.
     * @for Handler
     */
    $callOptions(options) {
      var semantics = new CallbackSemantics(options);
      return this.$decorate({
        handleCallback(callback, greedy, composer) {
          if (Composition.isComposed(callback, CallbackSemantics)) {
            return false;
          }

          if (callback instanceof CallbackSemantics) {
            semantics.mergeInto(callback);

            if (greedy) {
              this.base(callback, greedy, composer);
            }

            return true;
          } else if (callback instanceof Composition) {
            return this.base(callback, greedy, composer);
          }

          if (semantics.isSpecified(CallbackOptions.Greedy)) {
            greedy = semantics.hasOption(CallbackOptions.Greedy);
          }

          if (semantics.isSpecified(CallbackOptions.BestEffort) && semantics.hasOption(CallbackOptions.BestEffort)) {
            try {
              this.base(callback, greedy, composer);
              return true;
            } catch (exception) {
              if (exception instanceof NotHandledError || exception instanceof RejectedError) {
                return true;
              }

              throw exception;
            }
          }

          return this.base(callback, greedy, composer);
        }

      });
    }

  });

  var _class$l;
  /**
   * Represents a two-way
   * {{#crossLink "Handler"}}{{/crossLink}} path.
   * @class CascadeHandler
   * @constructor
   * @param  {Handler}  handler           -  primary handler
   * @param  {Handler}  cascadeToHandler  -  secondary handler
   * @extends Handler
   */

  var CascadeHandler = unmanaged(_class$l = class CascadeHandler extends Handler {
    constructor(handler, cascadeToHandler) {
      if ($isNothing(handler)) {
        throw new TypeError("No handler specified.");
      } else if ($isNothing(cascadeToHandler)) {
        throw new TypeError("No cascadeToHandler specified.");
      }

      super();
      Object.defineProperties(this, {
        handler: {
          value: Handler.for(handler),
          writable: false
        },
        cascadeToHandler: {
          value: Handler.for(cascadeToHandler),
          writable: false
        }
      });
    }

    handleCallback(callback, greedy, composer) {
      var handled = super.handleCallback(callback, greedy, composer);
      return !!(greedy ? handled | (this.handler.handle(callback, true, composer) | this.cascadeToHandler.handle(callback, true, composer)) : handled || this.handler.handle(callback, false, composer) || this.cascadeToHandler.handle(callback, false, composer));
    }

  }) || _class$l;

  var _dec$i, _class$m;

  var _$t = createKeyChain();
  /**
   * Callback representing the covariant creation of a type.
   * @class Creation
   * @constructor
   * @param   {Object}   callback  -  callback
   * @param   {boolean}  many      -  creation cardinality
   * @extends Base
   */


  var Creation = (_dec$i = conformsTo(CallbackControl), _dec$i(_class$m = class Creation extends exports.Base {
    constructor(type, many) {
      if ($isNothing(type)) {
        throw new TypeError("The type argument is required.");
      }

      super();

      var _this = _$t(this);

      _this.type = type;
      _this.many = !!many;
      _this.instances = [];
      _this.promises = [];
    }

    get isMany() {
      return _$t(this).many;
    }

    get type() {
      return _$t(this).type;
    }

    get instances() {
      return _$t(this).instances;
    }

    get callbackPolicy() {
      return creates.policy;
    }

    get callbackResult() {
      var {
        result,
        instances,
        promises
      } = _$t(this);

      if (result === undefined) {
        if (promises.length == 0) {
          _$t(this).result = result = this.isMany ? instances : instances[0];
        } else {
          _$t(this).result = result = this.isMany ? Promise.all(promises).then(() => instances) : Promise.all(promises).then(() => instances[0]);
        }
      }

      return result;
    }

    set callbackResult(value) {
      _$t(this).result = value;
    }

    addInstance(instance) {
      if ($isNothing(instance)) return;

      if ($isPromise(instance)) {
        _$t(this).promises.push(instance.then(res => {
          if (res != null) {
            _$t(this).instances.push(res);
          }
        }));
      } else {
        _$t(this).instances.push(instance);
      }

      delete _$t(this).result;
    }

    dispatch(handler, greedy, composer) {
      var count = _$t(this).instances.length;

      return creates.dispatch(handler, this, this, this.type, composer, this.isMany, this.addInstance.bind(this)) || _$t(this).instances.length > count;
    }

    toString() {
      return `Creation ${this.isMany ? "many " : ""}| ${this.type}`;
    }

  }) || _class$m);

  var HandleResult = Enum(HandleResult => ({
    Handled: HandleResult(true, false),
    HandledAndStop: HandleResult(true, true),
    NotHandled: HandleResult(false, false),
    NotHandledAndStop: HandleResult(false, true)
  }), {
    constructor(handled, stop) {
      this.extend({
        get handled() {
          return handled;
        },

        get stop() {
          return stop;
        }

      });
    },

    next(condition, block) {
      var stop = this.stop;

      if (block == null) {
        block = condition;
      } else {
        stop = stop || !condition;
      }

      return stop || !$isFunction(block) ? this : mapResult(block, this);
    },

    success(block) {
      if (this.handled && $isFunction(block)) {
        return block.call(this);
      }
    },

    failure(block) {
      if (!this.handled && $isFunction(block)) {
        return block.call(this);
      }
    },

    otherwise(condition, block) {
      if ($isFunction(block)) {
        return (this.handled || this.stop) && !condition ? this : mapResult(block, this);
      } else if ($isFunction(condition)) {
        return this.handled || this.stop ? this : mapResult(condition, this);
      } else if (condition || this.handled) {
        return this.stop ? HandleResult.HandledAndStop : HandleResult.Handled;
      } else {
        return this.stop ? HandleResult.NotHandledAndStop : HandleResult.NotHandled;
      }
    },

    or(other) {
      if (!(other instanceof HandleResult)) {
        return this;
      } else if (this.handled || other.handled) {
        return this.stop || other.stop ? HandleResult.HandledAndStop : HandleResult.Handled;
      } else {
        return this.stop || other.stop ? HandleResult.NotHandledAndStop : HandleResult.NotHandled;
      }
    },

    and(other) {
      if (!(other instanceof HandleResult)) {
        return this;
      } else if (this.handled && other.handled) {
        return this.stop || other.stop ? HandleResult.HandledAndStop : HandleResult.Handled;
      } else {
        return this.stop || other.stop ? HandleResult.NotHandledAndStop : HandleResult.NotHandled;
      }
    },

    toString() {
      return `HandleResult | ${this.handled ? "handled" : "not handled"} ${this.stop ? " and stop" : ""}`;
    }

  });

  function mapResult(block, handleResult) {
    var result = block.call(handleResult);
    return result instanceof HandleResult ? result : result ? HandleResult.Handled : HandleResult.NotHandled;
  }

  var _dec$j, _class$n;

  var _$u = createKeyChain(),
      defaultKeyResolver$1 = new KeyResolver(),
      globalFilters = new FilteredScope();
  /**
   * Invokes a method on a target.
   * @class HandleMethod
   * @constructor
   * @param  {number}              methodType  -  get, set or invoke
   * @param  {Protocol}            protocol    -  initiating protocol
   * @param  {string}              methodName  -  method name
   * @param  {Any}                 args        -  method or property arguments
   * @param  {InvocationSemanics}  semantics   -  invocation semantics
   * @extends Base
   */


  var HandleMethod = (_dec$j = conformsTo(CallbackControl), _dec$j(_class$n = class HandleMethod extends exports.Base {
    constructor(methodType, protocol, methodName, args, semantics) {
      if ($isNothing(methodName)) {
        throw new Error("The methodName argument is required");
      }

      if (protocol && !$isProtocol(protocol)) {
        throw new TypeError("Invalid protocol supplied.");
      }

      super();

      var _this = _$u(this);

      _this.methodType = methodType;
      _this.protocol = protocol;
      _this.methodName = methodName;
      _this.args = args;
      _this.semantics = semantics || new CallbackSemantics();
    }

    get methodType() {
      return _$u(this).methodType;
    }

    get protocol() {
      return _$u(this).protocol;
    }

    get semantics() {
      return _$u(this).semantics;
    }

    get methodName() {
      return _$u(this).methodName;
    }

    get args() {
      return _$u(this).args;
    }

    set args(value) {
      _$u(this).args = value;
    }

    get returnValue() {
      return _$u(this).returnValue;
    }

    set returnValue(value) {
      _$u(this).returnValue = value;
    }

    get exception() {
      return _$u(this).exception;
    }

    set exception(exception) {
      _$u(this).exception = exception;
    }

    get callbackResult() {
      return _$u(this).returnValue;
    }

    set callbackResult(value) {
      _$u(this).returnValue = value;
    }

    inferCallback() {
      return new HandleMethodInference(this);
    }
    /**
     * Attempts to invoke the method on the target.<br/>
     * During invocation, the receiver will have access to the ambient **$composer** property
     * representing the initiating {{#crossLink "Handler"}}{{/crossLink}}.
     * @method invokeOn
     * @param   {Object}   target    -  method receiver
     * @param   {Handler}  composer  -  composition handler
     * @returns {boolean} true if the method was accepted.
     */


    invokeOn(target, composer) {
      if (!this.isAcceptableTarget(target)) return false;
      var method;
      var {
        methodName,
        methodType,
        args
      } = this;

      if (methodType === MethodType.Invoke) {
        method = target[methodName];
        if (!$isFunction(method)) return false;
      }

      var filters, binding;

      if (!$isNothing(composer)) {
        var owner = HandlerDescriptor.get(target, true);
        binding = Binding.create(HandleMethod, target, null, methodName);
        filters = composer.$getOrderedFilters(binding, this, [binding.getMetadata(filter), owner, HandleMethod.globalFilters]);
        if ($isNothing(filters)) return false;
      }

      var action,
          completed = true;

      try {
        switch (methodType) {
          case MethodType.Get:
            action = composer != null ? () => composer.$compose(() => target[methodName]) : () => target[methodName];
            break;

          case MethodType.Set:
            action = composer != null ? () => composer.$compose(() => target[methodName] = args) : () => target[methodName] = args;
            break;

          case MethodType.Invoke:
            action = composer != null ? () => composer.$compose(() => method.apply(target, args)) : () => method.apply(target, args);
            break;
        }

        var result = $isNothing(filters) || filters.length == 0 ? action() : filters.reduceRight((next, pipeline) => (comp, proceed) => {
          if (proceed) {
            var _filter = pipeline.filter,
                signature = design.get(_filter, "next"),
                _args = resolveArgs$1.call(this, signature, comp);

            if (!$isNothing(_args)) {
              var provider = pipeline.provider,
                  context = {
                binding,
                rawCallback: this,
                provider,
                composer: comp,
                next: (c, p) => next(c != null ? c : comp, p != null ? p : true),
                abort: () => next(null, false)
              };
              return $isPromise(_args) ? _args.then(a => _filter.next(...a, context)) : _filter.next(..._args, context);
            }
          }

          completed = false;
        }, (comp, proceed) => {
          if (proceed) return action();
          completed = false;
        })(composer, true);

        if (!completed || result === $unhandled) {
          return false;
        }

        _$u(this).returnValue = result;
        return true;
      } catch (exception) {
        _$u(this).exception = exception;
        throw exception;
      }
    }

    isAcceptableTarget(target) {
      if ($isNothing(target)) return false;
      if ($isNothing(this.protocol)) return true;
      return this.semantics.hasOption(CallbackOptions.Strict) ? this.protocol.isToplevel(target) : this.semantics.hasOption(CallbackOptions.Duck) || this.protocol.isAdoptedBy(target);
    }

    notHandledError() {
      var qualifier = "";

      switch (this.methodType) {
        case MethodType.Get:
          qualifier = " (get)";
          break;

        case MethodType.Set:
          qualifier = " (set)";
          break;
      }

      return new TypeError(`Protocol ${this.protocol.name}:${this.methodName}${qualifier} could not be handled.`);
    }

    dispatch(handler, greedy, composer) {
      return this.invokeOn(handler, composer);
    }

    toString() {
      return `HandleMethod | ${this.methodName}`;
    }

    static get globalFilters() {
      return globalFilters;
    }

  }) || _class$n);

  class HandleMethodInference extends Trampoline {
    constructor(handleMethod) {
      super(handleMethod);
      _$u(this).resolving = new Resolving(handleMethod.protocol, handleMethod);
    }

    get callbackResult() {
      var result = _$u(this).resolving.callbackResult;

      if ($isPromise(result)) {
        return result.then(() => {
          if (_$u(this).resolving.succeeded) {
            return this.callback.callbackResult;
          }

          throw new NotHandledError(this.callback);
        });
      }

      return this.callback.callbackResult;
    }

    set callbackResult(value) {
      super.callbackResult = value;
    }

    dispatch(handler, greedy, composer) {
      return super.dispatch(handler, greedy, composer) || _$u(this).resolving.dispatch(handler, greedy, composer);
    }

  }

  function resolveArgs$1(signature, composer) {
    var _this2 = this;

    if ($isNothing(signature)) {
      return [this];
    }

    var {
      args
    } = signature;

    if ($isNothing(args) || args.length === 0) {
      return [this];
    }

    var resolved = [],
        promises = [];

    var _loop = function (i) {
      var arg = args[i];

      if ($isNothing(arg)) {
        if (i === 0) {
          resolved[0] = _this2;
        }

        return "continue";
      }

      if (i === 0 && $isNothing(arg.keyResolver)) {
        if (arg.validate(_this2)) {
          resolved[0] = _this2;
          return "continue";
        }
      }

      var resolver = arg.keyResolver || defaultKeyResolver$1,
          validate = resolver.validate;

      if ($isFunction(validate)) {
        validate.call(resolver, arg);
      }

      var dep = resolver.resolve(arg, composer);
      if ($isNothing(dep)) return {
        v: null
      };

      if ($optional.test(dep)) {
        resolved[i] = $contents(dep);
      } else if ($isPromise(dep)) {
        promises.push(dep.then(result => resolved[i] = result));
      } else {
        resolved[i] = dep;
      }
    };

    for (var i = 0; i < args.length; ++i) {
      var _ret = _loop(i);

      if (_ret === "continue") continue;
      if (typeof _ret === "object") return _ret.v;
    }

    if (promises.length === 0) {
      return resolved;
    }

    if (promises.length === 1) {
      return promises[0].then(() => resolved);
    }

    return Promise.all(promises).then(() => resolved);
  }

  Handler.implement({
    /**
     * Prepares the Handler for batching.
     * @method $batch
     * @param   {Any}  [...tags]  -  tags to batch
     * @returns {Handler}  batching callback handler.
     * @for Handler
     */
    $batch(...args) {
      var _dec, _obj;

      args = $flatten(args);

      if (args.length === 0) {
        throw new Error("Missing $batch block function.");
      }

      var block = args.pop();

      if (!$isFunction(block)) {
        throw new TypeError("The $batch block must be a function.");
      }

      var _batch = new Batch(...args),
          _complete = false;

      var batcher = this.$decorate((_dec = provides(Batching), (_obj = {
        getBatcher(inquiry) {
          if (!$isNothing(_batch)) {
            var _batcher = _batch.resolve(inquiry.key);

            if ($isNothing(_batcher)) {
              _batcher = Reflect.construct(inquiry.key, []);

              _batch.addHandlers(_batcher);
            }

            return _batcher;
          }
        },

        handleCallback(callback, greedy, composer) {
          if (_batch && callback.canBatch !== false) {
            var b = _batch;

            if (_complete && !(callback instanceof Composition)) {
              _batch = null;
            }

            if (b.handle(callback, greedy, composer)) {
              return true;
            }
          }

          return this.base(callback, greedy, composer);
        }

      }, (_applyDecoratedDescriptor(_obj, "getBatcher", [_dec], Object.getOwnPropertyDescriptor(_obj, "getBatcher"), _obj)), _obj)));
      var promise = block(batcher);
      _complete = true;
      var results = BatchingComplete(batcher).complete(batcher);

      if ($isPromise(promise)) {
        return $isPromise(results) ? results.then(res => promise.then(() => res)) : promise.then(() => results);
      }

      return results;
    },

    $noBatch() {
      return this.$decorate({
        handleCallback(callback, greedy, composer) {
          var _inquiry;

          var inquiry;

          if (callback instanceof Inquiry) {
            inquiry = callback;
          } else if (Composition.isComposed(callback, Inquiry)) {
            inquiry = callback.callback;
          }

          return ((_inquiry = inquiry) == null ? void 0 : _inquiry.key) !== Batch && this.base(new NoBatch(callback), greedy, composer);
        }

      });
    },

    $getBatch(tag) {
      var batch = this.resolve(Batch);

      if (!$isNothing(batch) && ($isNothing(tag) || batch.shouldBatch(tag))) {
        return batch;
      }
    },

    $getBatcher(batcherType, tag) {
      if (!Batching.isAdoptedBy(batcherType)) {
        throw new TypeError(`Batcher ${batcherType.name} does not conform to Batching protocol.`);
      }

      var batch = this.resolve(Batch);
      if ($isNothing(batch)) return;
      var batcher = batch.resolve(batcherType);

      if ($isNothing(batcher)) {
        batcher = Reflect.construct(batcherType, []);
        batch.addHandlers(batcher);
      }

      return batcher;
    }

  });

  var _dec$k, _class$o;

  var _$v = createKey();

  class Options extends exports.Base {
    get canBatch() {
      return false;
    }

    get canFilter() {
      return false;
    }

    get canInfer() {
      return false;
    }
    /**
     * Merges this options data into `options`.
     * @method mergeInto
     * @param   {Options}  options  -  options to receive data
     * @returns {boolean} true if options could be merged into.
     */


    mergeInto(options) {
      if (!(options instanceof this.constructor)) {
        return false;
      }

      var descriptors = getPropertyDescriptors(this),
          keys = Reflect.ownKeys(descriptors);
      keys.forEach(key => {
        if (Reflect.has(Options.prototype, key)) return;
        var keyValue = this[key],
            descriptor = descriptors[key];

        if (keyValue !== undefined) {
          var optionsValue = options[key];

          if (optionsValue === undefined || !options.hasOwnProperty(key)) {
            options[key] = copyOptionsValue(keyValue);
          } else if (!$isNothing(keyValue)) {
            this.mergeKeyInto(options, key, keyValue, optionsValue);
          }
        }
      });
      return true;
    }

    mergeKeyInto(options, key, keyValue, optionsValue) {
      if (Array.isArray(keyValue)) {
        options[key] = options[key].concat(copyOptionsValue(keyValue));
        return;
      }

      var mergeInto = keyValue.mergeInto;

      if ($isFunction(mergeInto)) {
        mergeInto.call(keyValue, optionsValue);
      }
    }

    copy() {
      var options = Reflect.construct(this.constructor, emptyArray);
      this.mergeInto(options);
      return options;
    }

  }

  function copyOptionsValue(optionsValue) {
    if ($isNothing(optionsValue)) {
      return optionsValue;
    }

    if (Array.isArray(optionsValue)) {
      return optionsValue.map(copyOptionsValue);
    }

    if ($isFunction(optionsValue.copy)) {
      return optionsValue.copy();
    }

    return optionsValue;
  }

  var OptionsResolver = (_dec$k = conformsTo(KeyResolving), _dec$k(_class$o = class OptionsResolver {
    constructor(optionsType) {
      _$v(this).optionsType = optionsType;
    }

    validate(typeInfo) {
      var optionsType = _$v(this).optionsType || typeInfo.type;

      if ($isNothing(optionsType)) {
        throw new TypeError("Unable to determine @options argument type.");
      }

      if (!(optionsType.prototype instanceof Options)) {
        throw new TypeError(`@options requires an Options argument, but found '${optionsType.name}'.`);
      }
    }

    resolve(typeInfo, handler) {
      var optionsType = _$v(this).optionsType || typeInfo.type,
          options = handler.$getOptions(optionsType);
      return $isNothing(options) ? $optional(options) : options;
    }

  }) || _class$o);
  var options = createTypeInfoDecorator((key, typeInfo, [optionsType]) => {
    typeInfo.keyResolver = new OptionsResolver(optionsType);
  });

  /**
   * Register the options to be applied by a Handler.
   * @method registerOptions
   * @static
   * @param   {Function}        optionsType  -  type of options
   * @param   {string|symbol}   optionsKey   -  options key  
   * @returns {boolean} true if successful, false otherwise.
   * @for Handler
   */

  Handler.registerOptions = function (optionsType, optionsKey) {
    validateOptionsType(optionsType);

    if ($isNothing(optionsKey)) {
      throw new TypeError("The Options key is required.");
    }

    var actualKey = optionsKey.startsWith("$") ? optionsKey : `$${optionsKey}`;

    if (Handler.prototype.hasOwnProperty(actualKey)) {
      throw new Error(`Options key '${optionsKey}' is already defined.`);
    }

    Handler.implement({
      [actualKey](options) {
        if ($isNothing(options)) return this;

        if (!(options instanceof optionsType)) {
          options = Reflect.construct(optionsType, emptyArray).extend(options);
        }

        return this.$withOptions(options);
      }

    });
    return true;
  };

  Handler.implement({
    $withOptions(options) {
      if ($isNothing(options)) return this;
      var optionsType = $classOf(options);
      validateOptionsType(optionsType);
      return this.$decorate({
        handleCallback(callback, greedy, composer) {
          var fillOpttions = callback;

          if (callback instanceof Composition) {
            fillOpttions = callback.callback;
          }

          if (fillOpttions instanceof optionsType) {
            options.mergeInto(fillOpttions);

            if (greedy) {
              this.base(callback, greedy, composer);
            }

            return true;
          }

          return this.base(callback, greedy, composer);
        }

      });
      /* Alternatives
      -- Explicit decoration for Babel Symbol bug
      const method  = Symbol(),
            handler = { [method] (receiver) { 
                options.mergeInto(receiver);
            } };
      Object.defineProperty(handler, method,
          Reflect.decorate([handles(optionsType)], handler, method,
              Object.getOwnPropertyDescriptor(handler, method)));
      return this.$decorate(handler);
       -- Babel decorator bug for Symbol defined methods
      return this.$decorate({
          @handles(optionsType)
          [Symbol()](receiver) {
              options.mergeInto(receiver);         
          }
      });
      */
    },

    $getOptions(optionsType) {
      validateOptionsType(optionsType);
      var options = new optionsType();
      return this.handle(options, true) ? options : null;
    }

  });
  function handlesOptions(optionsKey) {
    if ($isFunction(optionsKey)) {
      throw new SyntaxError("@handlesOptions requires an options key argument");
    }

    return (target, key, descriptor) => {
      if ($isNothing(descriptor)) {
        Handler.registerOptions(target, optionsKey);
      } else {
        throw new SyntaxError("@handlesOptions can only be applied to classes.");
      }
    };
  }

  function validateOptionsType(optionsType) {
    if ($isNothing(optionsType)) {
      throw new Error("The options type is required.");
    }

    if (!$isFunction(optionsType) || !(optionsType.prototype instanceof Options)) {
      throw new TypeError(`The options type '${optionsType}' does not extend Options.`);
    }
  }

  var _dec$l, _class$p;

  var _$w = createKeyChain();
  /**
   * Callback representing the invariant lookup of a key.
   * @class Lookup
   * @constructor
   * @param   {Any}      key   -  lookup key
   * @param   {boolean}  many  -  lookup cardinality
   * @extends Base
   */


  var Lookup = (_dec$l = conformsTo(CallbackControl), _dec$l(_class$p = class Lookup extends exports.Base {
    constructor(key, many) {
      if ($isNothing(key)) {
        throw new Error("The key argument is required.");
      }

      super();

      var _this = _$w(this);

      _this.key = key;
      _this.many = !!many;
      _this.results = [];
      _this.promises = [];
      _this.instant = $instant.test(key);
    }

    get key() {
      return _$w(this).key;
    }

    get isMany() {
      return _$w(this).many;
    }

    get results() {
      return _$w(this).results;
    }

    get callbackPolicy() {
      return lookups.policy;
    }

    get callbackResult() {
      if (_$w(this).result === undefined) {
        var results = this.results,
            promises = _$w(this).promises;

        if (promises.length == 0) {
          _$w(this).result = this.isMany ? results : results[0];
        } else {
          _$w(this).result = this.isMany ? Promise.all(promises).then(() => results) : Promise.all(promises).then(() => results[0]);
        }
      }

      return _$w(this).result;
    }

    set callbackResult(value) {
      _$w(this).result = value;
    }

    addResult(result, composer) {
      var found;
      if ($isNothing(result)) return false;

      if (Array.isArray(result)) {
        found = $flatten(result, true).reduce((s, r) => include$1.call(this, r, composer) || s, false);
      } else {
        found = include$1.call(this, result, composer);
      }

      if (found) {
        delete _$w(this).result;
      }

      return found;
    }

    dispatch(handler, greedy, composer) {
      var results = this.results,
          promises = _$w(this).promises,
          count = results.length + promises.length,
          found = looksup.dispatch(handler, this, this, this.key, composer, this.isMany, this.addResult.bind(this));

      return found || results.length + promises.length > count;
    }

    toString() {
      return `Lookup ${this.isMany ? "many " : ""}| ${this.key}`;
    }

  }) || _class$p);

  function include$1(result, composer) {
    if ($isNothing(result)) return false;

    if ($isPromise(result)) {
      if (_$w(this).instant) return false;
      var results = this.results;

      _$w(this).promises.push(result.then(res => {
        if (Array.isArray(res)) {
          results.push(...res.filter(r => r != null));
        } else if (res != null) {
          results.push(res);
        }
      }).catch(Undefined$1));
    } else {
      _$w(this).results.push(result);
    }

    return true;
  }

  var _$x = createKey();

  class NamedConstraint extends BindingConstraint {
    constructor(name) {
      super();

      if (!name) {
        throw new Error("The name cannot be empty.");
      }

      _$x(this).name = name;
    }

    get name() {
      return _$x(this).name;
    }

    require(metadata) {
      if ($isNothing(metadata)) {
        throw new Error("The metadata argument is required.");
      }

      metadata.name = _$x(this).name;
    }

    matches(metadata) {
      if ($isNothing(metadata)) {
        throw new Error("The metadata argument is required.");
      }

      var name = metadata.name;
      return $isNothing(name) || this.name == name;
    }

  }
  var named = createConstraintDecorator(name => new NamedConstraint(name));

  var _$y = createKey();

  class ConstraintBuilder {
    constructor(metadata) {
      if ($isNothing(metadata)) {
        metadata = new BindingMetadata();
      } else if (!(metadata instanceof BindingMetadata)) {
        if (metadata.metadata instanceof BindingMetadata) {
          metadata = metadata.metadata;
        }
      }

      if ($isNothing(metadata)) {
        throw new TypeError("The metadata argument must be a BindingMetadata or BindingSource.");
      }

      _$y(this).metadata = metadata;
    }

    named(name) {
      return this.require(new NamedConstraint(name));
    }

    require(...args) {
      var metadata = _$y(this).metadata;

      if (args.length === 2 && $isString$1(args[0])) {
        metadata.set(args[0], args[1]);
        return this;
      }

      if (args.length === 1) {
        var arg = args[0];

        if (arg instanceof BindingMetadata) {
          if (!$isNothing(arg.name)) {
            metadata.name = arg.name;
          }

          arg.mergeInto(metadata);
          return this;
        }

        if (arg instanceof BindingConstraint) {
          arg.require(metadata);

          return this;
        }

        if ($isFunction(arg)) {
          var constranint = arg();

          if (constranint instanceof BindingConstraint) {
            constranint.require(metadata);

            return this;
          }
        }
      }

      throw new Error("require expects a key/value, BindingMetadata, BindingConstraint or constraint decorator.");
    }

    build() {
      return _$y(this).metadata;
    }

  }

  var defaultKeyResolver$2 = new KeyResolver();
  Handler.implement({
    /**
     * Handles the callback.
     * @method $command
     * @param   {Object}  callback  -  callback
     * @returns {Any} optional result
     * @for Handler
     */
    $command(callback) {
      var command = new Command(callback);

      if (!this.handle(command, false)) {
        throw new NotHandledError(callback);
      }

      return command.callbackResult;
    },

    /**
     * Handles the callback greedily.
     * @method $commandAll
     * @param   {Object}  callback  -  callback
     * @returns {Any} optional results.
     * @for Handler
     */
    $commandAll(callback) {
      var command = new Command(callback, true);

      if (!this.handle(command, true)) {
        throw new NotHandledError(callback);
      }

      return command.callbackResult;
    },

    /**
     * Resolves the key.
     * @method resolve
     * @param   {Any}       key            -  key
     * @param   {Function}  [constraints]  -  optional constraints
     * @returns {Any}  resolved key.  Could be a promise.
     * @for Handler
     * @async
     */
    resolve(key, constraints) {
      var inquiry;

      if (key instanceof Inquiry) {
        if (key.isMany) {
          throw new Error("Requested Inquiry expects multiple results.");
        }

        inquiry = key;
      } else {
        inquiry = new Inquiry(key);
      }

      constraints == null ? void 0 : constraints(new ConstraintBuilder(inquiry));

      if (this.handle(inquiry, false)) {
        return inquiry.callbackResult;
      }
    },

    /**
     * Resolves the key greedily.
     * @method resolveAll
     * @param   {Any}       key            -  key
     * @param   {Function}  [constraints]  -  optional constraints
     * @returns {Array} resolved key.  Could be a promise.
     * @for Handler
     * @async
     */
    resolveAll(key, constraints) {
      var inquiry;

      if (key instanceof Inquiry) {
        if (!key.isMany) {
          throw new Error("Requested Inquiry expects a single result.");
        }

        inquiry = key;
      } else {
        inquiry = new Inquiry(key, true);
      }

      constraints == null ? void 0 : constraints(new ConstraintBuilder(inquiry));
      return this.handle(inquiry, true) ? inquiry.callbackResult : [];
    },

    /**
     * Looks up the key.
     * @method $lookup
     * @param   {Any}  key  -  key
     * @returns {Any}  value of key.
     * @for Handler
     */
    $lookup(key) {
      var lookup;

      if (key instanceof Lookup) {
        if (key.isMany) {
          throw new Error("Requested Lookup expects multiple results.");
        }

        lookup = key;
      } else {
        lookup = new Lookup(key);
      }

      if (this.handle(lookup, false)) {
        return lookup.callbackResult;
      }
    },

    /**
     * Looks up the key greedily.
     * @method $lookupAll
     * @param   {Any}  key  -  key
     * @returns {Array}  value(s) of key.
     * @for Handler
     */
    $lookupAll(key) {
      var lookup;

      if (key instanceof Lookup) {
        if (!key.isMany) {
          throw new Error("Requested Lookup expects a single result.");
        }

        lookup = key;
      } else {
        lookup = new Lookup(key, true);
      }

      return this.handle(lookup, true) ? lookup.callbackResult : [];
    },

    /**
     * Creates an instance of the `type`.
     * @method $create
     * @param   {Function}  type  -  type
     * @returns {Any} instance of the type.
     * @for Handler
     */
    $create(type) {
      var creation = new Creation(type);

      if (!this.handle(creation, false)) {
        throw new NotHandledError(creation);
      }

      return creation.callbackResult;
    },

    /**
     * Creates instances of the `type`.
     * @method $createAll
     * @param   {Function}  type  -  type
     * @returns {Any} instances of the type.
     * @for Handler
     */
    $createAll(type) {
      var creation = new Creation(type, true);

      if (!this.handle(creation, true)) {
        throw new NotHandledError(creation);
      }

      return creation.callbackResult;
    },

    /**
     * Decorates the handler.
     * @method $decorate
     * @param   {Object}  decorations  -  decorations
     * @returns {Handler} decorated callback handler.
     * @for Handler
     */
    $decorate(decorations) {
      return $decorate(this, decorations);
    },

    /**
     * Decorates the handler for filtering callbacks.
     * @method $filter
     * @param   {Function}  filter     -  filter
     * @param   {boolean}   reentrant  -  true if reentrant, false otherwise
     * @returns {Handler} filtered callback handler.
     * @for Handler
     */
    $filter(filter, reentrant) {
      if (!$isFunction(filter)) {
        throw new TypeError(`Invalid filter: ${filter} is not a function.`);
      }

      return this.$decorate({
        handleCallback(callback, greedy, composer) {
          if (!reentrant && callback instanceof Composition) {
            return this.base(callback, greedy, composer);
          }

          var base = this.base;
          return filter(callback, composer, () => base.call(this, callback, greedy, composer));
        }

      });
    },

    /**
     * Accepts a callback explicitly.
     * @method $accepts
     * @param   {Any}       constraint  -  callback constraint
     * @param   {Function}  handler     -  callback handler
     * @returns {Handler} callback handler.
     * @for Handler
     */
    $accepts(constraint, handler) {
      handles.addHandler(this, constraint, handler);
      return this;
    },

    /**
     * Providesa callback explicitly.
     * @method $provides
     * @param  {Any}       constraint  -  callback constraint
     * @param  {Function}  provider    -  callback provider
     * @returns {Handler} callback provider.
     * @for Handler
     */
    $provides(constraint, provider) {
      provides.addHandler(this, constraint, provider);
      return this;
    },

    /**
     * Decorates the handler for applying aspects to callbacks.
     * @method $aspect
     * @param   {Function}  before     -  before action.  Return false to reject
     * @param   {Function}  action     -  after action
     * @param   {boolean}   reentrant  -  true if reentrant, false otherwise
     * @returns {Handler}  callback handler aspect.
     * @throws  {RejectedError} An error if before returns an unaccepted promise.
     * @for Handler
     */
    $aspect(before, after, reentrant) {
      return this.$filter((callback, composer, proceed) => {
        if ($isFunction(before)) {
          var test = before(callback, composer);

          if ($isPromise(test)) {
            var hasResult = ("callbackResult" in callback),
                accept = test.then(accepted => {
              if (accepted !== false) {
                aspectProceed(callback, composer, proceed, after, accepted);
                return hasResult ? callback.callbackResult : true;
              }

              return Promise.reject(new RejectedError(callback));
            });

            if (hasResult) {
              callback.callbackResult = accept;
            }

            return true;
          } else if (test === false) {
            throw new RejectedError(callback);
          }
        }

        return aspectProceed(callback, composer, proceed, after);
      }, reentrant);
    },

    $resolveArgs(args) {
      var _this = this;

      if ($isNothing(args) || args.length === 0) {
        return [];
      }

      var resolved = [],
          promises = [];

      var _loop = function (i) {
        var arg = args[i];
        if ($isNothing(arg)) return "continue";
        var resolver = arg.keyResolver || defaultKeyResolver$2,
            validate = resolver.validate;

        if ($isFunction(validate)) {
          validate.call(resolver, arg);
        }

        var dep = resolver.resolve(arg, _this);
        if ($isNothing(dep)) return {
          v: null
        };

        if ($optional.test(dep)) {
          resolved[i] = $contents(dep);
        } else if ($isPromise(dep)) {
          promises.push(dep.then(result => resolved[i] = result));
        } else {
          resolved[i] = dep;
        }
      };

      for (var i = 0; i < args.length; ++i) {
        var _ret = _loop(i);

        if (_ret === "continue") continue;
        if (typeof _ret === "object") return _ret.v;
      }

      if (promises.length === 0) {
        return resolved;
      }

      if (promises.length === 1) {
        return promises[0].then(() => resolved);
      }

      return Promise.all(promises).then(() => resolved);
    },

    /**
     * Decorates the handler to provide one or more values.
     * @method $with
     * @param   {Array}  ...values  -  values to provide
     * @returns {Handler}  decorated callback handler.
     * @for Handler
     */
    $with(...values) {
      values = $flatten(values, true);

      if (values.length > 0) {
        var provider = this.$decorate();
        values.forEach(value => provides.addHandler(provider, value));
        return provider;
      }

      return this;
    },

    $withKeyValues(keyValues) {
      if ($isPlainObject(keyValues)) {
        var provider = this.$decorate();

        for (var key in keyValues) {
          provides.addHandler(provider, key, keyValues[key]);
        }

        return provider;
      }

      if (keyValues instanceof Map) {
        var _provider = this.$decorate();

        for (var [_key, value] of keyValues) {
          provides.addHandler(_provider, _key, value);
        }

        return _provider;
      }

      throw new TypeError("The keyValues must be an object literal or Map.");
    },

    $withBindings(target, keyValues) {
      if ($isNothing(target)) {
        throw new Error("The scope argument is required.");
      }

      if ($isPlainObject(keyValues)) {
        function getValue(inquiry, context) {
          var _inquiry$parent, _inquiry$parent$bindi;

          if (((_inquiry$parent = inquiry.parent) == null ? void 0 : (_inquiry$parent$bindi = _inquiry$parent.binding) == null ? void 0 : _inquiry$parent$bindi.constraint) === target) {
            var value = keyValues[inquiry.key];
            return $isFunction(value) ? value(inquiry, context) : value;
          }
        }

        var provider = this.$decorate();

        for (var key in keyValues) {
          provides.addHandler(provider, key, getValue);
        }

        return provider;
      }

      if (keyValues instanceof Map) {
        function getValue(inquiry) {
          var _inquiry$parent2, _inquiry$parent2$bind;

          if (((_inquiry$parent2 = inquiry.parent) == null ? void 0 : (_inquiry$parent2$bind = _inquiry$parent2.binding) == null ? void 0 : _inquiry$parent2$bind.constraint) === target) {
            var value = keyValues.get(inquiry.key);
            return $isFunction(value) ? value(inquiry, context) : value;
          }
        }

        var _provider2 = this.$decorate();

        for (var [_key2, value] of keyValues.keys) {
          provides.addHandler(_provider2, _key2, getValue);
        }

        return _provider2;
      }

      throw new TypeError("The keyValues must be an object literal or Map.");
    },

    /**
     * Builds a handler chain.
     * @method next
     * @param   {Any}  [...handlers]  -  handler chain members
     * @returns {Handler}  chaining callback handler.
     * @for Handler
     */
    $chain(...handlers) {
      switch (handlers.length) {
        case 0:
          return this;

        case 1:
          return new CascadeHandler(this, handlers[0]);

        default:
          return new CompositeHandler(this, ...handlers);
      }
    },

    /**
     * Prevents continuous or concurrent handling on a target.
     * @method $guard
     * @param   {Object}  target              -  target to guard
     * @param   {string}  [property='guard']  -  property for guard state
     * @returns {Handler}  guarding callback handler.
     * @for Handler
     */
    $guard(target, property) {
      if (target) {
        var guarded = false;
        property = property || "guarded";
        var propExists = (property in target);
        return this.$aspect(() => {
          if (guarded = target[property]) {
            return false;
          }

          target[property] = true;
          return true;
        }, () => {
          if (!guarded) {
            target[property] = undefined;

            if (!propExists) {
              delete target[property];
            }
          }
        });
      }

      return this;
    },

    /**
     * Tracks the activity counts associated with a target. 
     * @method $activity
     * @param   {Object}  target                 -  target to track
     * @param   {Object}  [ms=50]                -  delay to wait before tracking
     * @param   {string}  [property='activity']  -  property for activity state
     * @returns {Handler}  activity callback handler.
     * @for Handler
     */
    $activity(target, ms, property) {
      property = property || "$$activity";
      var propExists = (property in target);
      return this.$aspect(() => {
        var state = {
          enabled: false
        };
        setTimeout(() => {
          if ("enabled" in state) {
            state.enabled = true;
            var activity = target[property] || 0;
            target[property] = ++activity;
          }
        }, !$isNothing(ms) ? ms : 50);
        return state;
      }, (_, composer, state) => {
        if (state.enabled) {
          var activity = target[property];

          if (!activity || activity === 1) {
            target[property] = undefined;

            if (!propExists) {
              delete target[property];
            }
          } else {
            target[property] = --activity;
          }
        }

        delete state.enabled;
      });
    },

    /**
     * Ensures all return values are promises..
     * @method $promises
     * @returns {Handler}  promising callback handler.
     * @for Handler
     */
    $promise() {
      return this.$filter((callback, composer, proceed) => {
        if (!("callbackResult" in callback)) {
          return proceed();
        }

        try {
          var handled = proceed();

          if (handled) {
            var result = callback.callbackResult;
            callback.callbackResult = $isPromise(result) ? result : Promise.resolve(result);
          }

          return handled;
        } catch (ex) {
          callback.callbackResult = Promise.reject(ex);
          return true;
        }
      });
    },

    /**
     * Configures the receiver to set timeouts on all promises.
     * @method $timeout
     * @param   {number}            ms       -  duration before promise times out
     * @param   {Function | Error}  [error]  -  error instance or custom error class
     * @returns {Handler}  timeout callback handler.
     * @for Handler
     */
    $timeout(ms, error) {
      return this.$filter((callback, composer, proceed) => {
        var handled = proceed();

        if (!("callbackResult" in callback)) {
          return handled;
        }

        if (handled) {
          var result = callback.callbackResult;

          if ($isPromise(result)) {
            callback.callbackResult = new Promise(function (resolve, reject) {
              var timeout;
              result.then(res => {
                if (timeout) {
                  clearTimeout(timeout);
                }

                resolve(res);
              }, err => {
                if (timeout) {
                  clearTimeout(timeout);
                }

                reject(err);
              });
              timeout = setTimeout(function () {
                if (!error) {
                  error = new TimeoutError(callback);
                } else if ($isFunction(error)) {
                  error = Reflect.construct(error, [callback]);
                }

                if ($isFunction(result.reject)) {
                  result.reject(error); // TODO: cancel
                }

                reject(error);
              }, ms);
            });
          }
        }

        return handled;
      });
    }

  });
  /**
   * Shortcut for handling a callback.
   * @method
   * @static
   * @param   {Any}       constraint  -  callback constraint
   * @param   {Function}  handler     -  callback handler
   * @returns {Handler} callback handler.
   * @for Handler
   */

  Handler.$accepting = function (constraint, handler) {
    var accepting = new Handler();
    handles.addHandler(accepting, constraint, handler);
    return accepting;
  };
  /**
   * Shortcut for providing a callback.
   * @method
   * @static
   * @param  {Any}       constraint  -  callback constraint
   * @param  {Function}  provider    -  callback provider
   * @returns {Handler} callback provider.
   * @for Handler
   */


  Handler.$providing = function (constraint, provider) {
    var providing = new Handler();
    provides.addHandler(providing, constraint, provider);
    return providing;
  };

  function aspectProceed(callback, composer, proceed, after, state) {
    var promise;

    try {
      var handled = proceed();

      if (handled) {
        var result = callback.callbackResult;

        if ($isPromise(result)) {
          promise = result; // Use 'fulfilled' or 'rejected' handlers instead of 'finally' to ensure
          // aspect boundary is consistent with synchronous invocations and avoid
          // reentrancy issues.

          if ($isFunction(after)) {
            promise.then(result => after(callback, composer, state)).catch(error => after(callback, composer, state));
          }
        }
      }

      return handled;
    } finally {
      if (!promise && $isFunction(after)) {
        after(callback, composer, state);
      }
    }
  }

  var _$z = createKeyChain();
  /**
   * Delegates properties and methods to a callback handler using 
   * {{#crossLink "HandleMethod"}}{{/crossLink}}.
   * @class HandleMethodDelegate
   * @constructor
   * @param   {Handler}  handler  -  forwarding handler 
   * @extends Delegate
   */


  class HandleMethodDelegate extends Delegate {
    constructor(handler) {
      super();
      _$z(this).handler = handler;
    }

    get handler() {
      return _$z(this).handler;
    }

    get(protocol, propertyName) {
      return delegate$1(this, MethodType.Get, protocol, propertyName, null);
    }

    set(protocol, propertyName, propertyValue) {
      return delegate$1(this, MethodType.Set, protocol, propertyName, propertyValue);
    }

    invoke(protocol, methodName, args) {
      return delegate$1(this, MethodType.Invoke, protocol, methodName, args);
    }

  }

  function delegate$1(delegate, methodType, protocol, methodName, args) {
    var handler = delegate.handler,
        options = CallbackOptions.None,
        semantics = new CallbackSemantics();
    handler.handle(semantics, true);
    if (!semantics.isSpecified(CallbackOptions.Duck) && DuckTyping.isAdoptedBy(protocol)) options |= CallbackOptions.Duck;
    if (!semantics.isSpecified(CallbackOptions.Strict) && StrictProtocol.isAdoptedBy(protocol)) options |= CallbackOptions.Strict;

    if (options != CallbackOptions.None) {
      semantics.setOption(options, true);
      handler = handler.$callOptions(options);
    }

    var handleMethod = new HandleMethod(methodType, protocol, methodName, args, semantics),
        inference = handleMethod.inferCallback();

    if (!handler.handle(inference)) {
      throw handleMethod.notHandledError();
    }

    var result = inference.callbackResult;

    if ($isPromise(result)) {
      return result.catch(error => {
        if (error instanceof NotHandledError) {
          if (!(semantics.isSpecified(CallbackOptions.BestEffort) && semantics.hasOption(CallbackOptions.BestEffort))) {
            throw handleMethod.notHandledError();
          }
        } else {
          throw error;
        }
      });
    }

    return result;
  }

  Handler.implement({
    /**
     * Converts the callback handler to a {{#crossLink "Delegate"}}{{/crossLink}}.
     * @method toDelegate
     * @returns {HandleMethodDelegate}  delegate for this callback handler.
     */
    toDelegate() {
      return new HandleMethodDelegate(this);
    },

    /**
     * Creates a proxy for this Handler over the `protocol`.
     * @method proxy
     * @param   {Protocol}  protocol  -  the protocol to proxy.
     * @returns {Protocol}  an instance of the protocol bound to this handler.
     */
    proxy(protocol) {
      if (!Protocol.isProtocol(protocol)) {
        throw new TypeError("The protocol is not valid.");
      }

      return new protocol(new HandleMethodDelegate(this));
    }

  });

  var _dec$m, _class$q, _dec2$7, _class2$6;

  var _$A = createKey();

  var Initializer = (_dec$m = conformsTo(Filtering), _dec$m(_class$q = class Initializer {
    constructor(initializer) {
      if (!$isFunction(initializer)) {
        throw new Error("The initializer must be a function.");
      }

      _$A(this).initializer = initializer;
    }

    get order() {
      return Number.MAX_SAFE_INTEGER - 100;
    }

    next(callback, {
      next
    }) {
      var instance = next();
      return $isPromise(instance) ? instance.then(result => _initialize.call(this, result)) : _initialize.call(this, instance);
    }

  }) || _class$q);

  function _initialize(instance) {
    var initializer = _$A(this).initializer,
        promise = initializer.call(instance);

    return $isPromise(promise) ? promise.then(() => instance) : instance;
  }

  var InitializerProvider = (_dec2$7 = conformsTo(FilteringProvider), _dec2$7(_class2$6 = class InitializerProvider {
    constructor(initializer) {
      _$A(this).initializer = [new Initializer(initializer)];
    }

    get required() {
      return true;
    }

    appliesTo(callback) {
      return callback instanceof Inquiry || callback instanceof Creation;
    }

    getFilters(binding, callback, composer) {
      return _$A(this).initializer;
    }

  }) || _class2$6);
  function initialize(target, key, descriptor) {
    if (!isDescriptor(descriptor)) {
      throw new SyntaxError("@initialize cannot be applied to classes.");
    }

    var {
      value
    } = descriptor;

    if (!$isFunction(value)) {
      throw new SyntaxError("@initialize can only be applied to methods.");
    }

    descriptor.value = cannotCallInitializer;
    var constructor = target.constructor,
        filters = filter.getOrCreateOwn(target, "constructor", () => new FilteredScope());

    if ((constructor == null ? void 0 : constructor.prototype) === target) {
      filter.getOrCreateOwn(constructor, "constructor", () => filters);
    }

    filters.addFilters(new InitializerProvider(value));
    return descriptor;
  }

  function cannotCallInitializer() {
    throw new Error("An @initialize method cannot be called directly.");
  }

  var _$B = createKey();

  class InjectResolver extends KeyResolver {
    constructor(key) {
      if ($isNothing(key)) {
        throw new Error("The key argument is required.");
      }

      super();
      _$B(this).key = key;
    }

    get key() {
      return _$B(this).key;
    }

    createInquiry(typeInfo, parent) {
      var many = typeInfo.flags.hasFlag(TypeFlags.Array);
      return new Inquiry(this.key, many, parent);
    }

  }
  var inject = createTypeInfoDecorator((key, typeInfo, [actualKey]) => {
    typeInfo.keyResolver = new InjectResolver(actualKey || key);
  });

  var _dec$n, _class$r;
  var $proxy = $createQualifier();
  var ProxyResolver = (_dec$n = conformsTo(KeyResolving), _dec$n(_class$r = class ProxyResolver {
    validate(typeInfo) {
      if ($isNothing(typeInfo.type)) {
        throw new TypeError("Unable to determine @proxy argument type.");
      }

      if (!typeInfo.flags.hasFlag(TypeFlags.Protocol)) {
        throw new TypeError("@proxy requires a Protocol argument.");
      }

      if (typeInfo.flags.hasFlag(TypeFlags.Array)) {
        throw new TypeError("@proxy arguments cannot be collections.");
      }
    }

    resolve(typeInfo, handler) {
      return handler.proxy(typeInfo.type);
    }

  }) || _class$r);
  var proxyResolver = new ProxyResolver();
  TypeInfo.registerQualifier($proxy, ti => ti.keyResolver = proxyResolver);
  var proxy = createTypeInfoDecorator((key, typeInfo, [type]) => {
    var protocol = TypeInfo.parse(type);
    protocol.keyResolver = proxyResolver;
    typeInfo.merge(protocol);
  });

  /**
   * Applies copy semantics on properties and return values.
   * @method copy
   */

  function copy(target, key, descriptor) {
    if (!isDescriptor(descriptor)) {
      throw new SyntaxError("@copy can only be applied to methods or properties.");
    }

    var {
      get,
      set,
      value,
      initializer
    } = descriptor;

    if ($isFunction(value)) {
      descriptor.value = function () {
        return _copyOf(value.apply(this, arguments));
      };
    }

    if ($isFunction(initializer)) {
      descriptor.initializer = function () {
        return _copyOf(initializer.apply(this));
      };
    }

    if ($isFunction(get)) {
      descriptor.get = function () {
        return _copyOf(get.apply(this));
      };
    }

    if ($isFunction(set)) {
      descriptor.set = function (value) {
        return set.call(this, _copyOf(value));
      };
    }
  }

  function _copyOf(value) {
    var _value;

    if ($isFunction((_value = value) == null ? void 0 : _value.copy)) {
      value = value.copy();
    }

    return value;
  }

  /**
   * Throttles `fn` over a time period.
   * @method $debounce
   * @param    {Function} fn                  -  function to throttle
   * @param    {int}      wait                -  time (ms) to throttle func
   * @param    {boolean}  immediate           -  if true, trigger func early
   * @param    {Any}      defaultReturnValue  -  value to return when throttled
   * @returns  {Function} throttled function
   */

  function $debounce(fn, wait, immediate, defaultReturnValue) {
    var timeout;
    return function () {
      var context = this,
          args = arguments;

      var later = function () {
        timeout = null;

        if (!immediate) {
          return fn.apply(context, args);
        }
      };

      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) {
        return fn.apply(context, args);
      }

      return defaultReturnValue;
    };
  }
  /**
   * Applies debouncing on functions.
   * @method debounce
   */

  function debounce(...args) {
    return decorate(_debounce, args);
  }

  function _debounce(target, key, descriptor, [wait, immediate, defaultReturnValue]) {
    var {
      set,
      value
    } = descriptor || {};

    if ($isFunction(value)) {
      descriptor.value = $debounce(value, wait, immediate, defaultReturnValue);
    } else if ($isFunction(set)) {
      descriptor.set = $debounce(set, wait, immediate, defaultReturnValue);
    } else {
      throw new SyntaxError("@debounce can only be applied to methods and property setters.");
    }
  }

  if (Promise.prototype.finally === undefined) Promise.prototype.finally = function (callback) {
    var p = this.constructor;
    return this.then(value => p.resolve(callback()).then(() => value), reason => p.resolve(callback()).then(() => {
      throw reason;
    }));
  };
  if (Promise.delay === undefined) Promise.delay = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  var formatMetadataKey = Symbol("map-format");
  /**
   * Policy for mapping a value to a format.
   * @property {Function} mapsFrom
   */

  var mapsFrom = ContravariantPolicy.createDecorator("mapsFrom", {
    filter: filterFormat
  });
  /**
   * Policy for mapping from a formatted value.
   * @property {Function} mapsTo
   */

  var mapsTo = ContravariantPolicy.createDecorator("mapsTo", {
    filter: filterFormat
  });
  /**
   * Mapping formats supported.
   * @method formats
   * @param {Array}  ...supported  -  supported formats 
   */

  var formats = Metadata.decorator(formatMetadataKey, (target, key, descriptor, supported) => {
    supported = supported.flat();
    if (supported.length === 0) return;
    var metadata = $isNothing(descriptor) ? formats.getOrCreateOwn(target.prototype, () => new Set()) : formats.getOrCreateOwn(target, key, () => new Set());
    supported.forEach(format => metadata.add(format));
  });

  function filterFormat(key, mapCallback) {
    var prototype = Object.getPrototypeOf(this);
    var supported = formats.get(prototype, key);

    if ($isNothing(supported) || supported.size === 0) {
      supported = formats.get(prototype);
    }

    return !supported || supported.size === 0 || [...supported].some(f => {
      var format = mapCallback.format;

      if (f instanceof RegExp) {
        return $isString$1(format) && f.test(format);
      }

      return $equals(format, f);
    });
  }

  var _dec$o, _class$s, _temp$2;
  var MapOptions = (_dec$o = handlesOptions("mapOptions"), _dec$o(_class$s = (_temp$2 = class MapOptions extends Options {
    constructor(...args) {
      super(...args);

      _defineProperty(this, "type", void 0);

      _defineProperty(this, "fields", void 0);

      _defineProperty(this, "typeIdHandling", void 0);

      _defineProperty(this, "strategy", void 0);
    }

    mergeKeyInto(options, key, keyValue, optionsValue) {
      if (key === "strategy") {
        var target = pcopy(optionsValue),
            merged = Reflect.ownKeys(Mapping.prototype).reduce((result, method) => method !== "constructor" && chain(method, target, keyValue) || result, false);

        if (merged) {
          options[key] = target;
        }
      }

      return super.mergeKeyInto(options, key, keyValue, optionsValue);
    }

  }, _temp$2)) || _class$s);

  function chain(methodName, initial, merge) {
    var method1 = initial[methodName],
        method2 = merge[methodName];

    if ($isFunction(method1)) {
      if ($isFunction(method2)) {
        initial[methodName] = function (...args) {
          var result = method1.apply(this, args);
          return $isNothing(result) ? method2.apply(this, args) : result;
        };

        return true;
      }
    } else if ($isFunction(method2)) {
      initial[methodName] = method2;
      return true;
    }

    return false;
  }

  var surrogateMetadataKey = Symbol("surrogate-metadata");
  /**
   * Maintains surrogate type information.
   * @method surrogate
   * @param  {Function}  actual  -  actual type
   */

  var surrogate = Metadata.decorator(surrogateMetadataKey, (target, key, descriptor, [actual]) => {
    if (!$isNothing(descriptor)) {
      throw new SyntaxError("@surrogate can only be applied to classes.");
    }

    if (!$isFunction(actual)) {
      throw new TypeError("@surrogate requires the actual type.");
    }

    if (surrogate.getOrCreateOwn(target, () => actual) != actual) {
      throw new Error(`The surrogate for ${target.name} is already assigned ${actual.name}.`);
    }

    if (surrogate.getOrCreateOwn(actual, () => target) != target) {
      throw new Error(`The surrogate for ${actual.name} is already assigned ${target.name}.`);
    }
  });

  var _class$t, _class2$7, _temp$3, _temp2$1, _temp3, _temp4;
  /**
   * Abstract mapping.
   * @class Abstract mapping
   * @extends Handler
   */

  var AbstractMapping = unmanaged(_class$t = (_class2$7 = (_temp4 = (_temp3 = (_temp2$1 = (_temp$3 = class AbstractMapping extends Handler {
    mapsFrom(mapsFrom, options) {
      return $unhandled;
    }

    mapsTo(mapsTo, options) {}

    canSetProperty(descriptor) {
      return !$isFunction(descriptor.value);
    }

    isPrimitiveValue(value) {
      switch (typeOf(value)) {
        case "null":
        case "number":
        case "string":
        case "boolean":
          return true;
      }

      return false;
    }

    mapSurrogate(object, composer) {
      if ($isObject(object)) {
        var surrogateType = surrogate.get($classOf(object));

        if (!$isNothing(surrogateType)) {
          return composer.$bestEffort().$mapFrom(object, surrogateType);
        }
      }
    }

  }, _temp$3), options(MapOptions)(_temp$3.prototype, "mapsFrom", 1), _temp2$1), _temp3), options(MapOptions)(_temp3.prototype, "mapsTo", 1), _temp4), (_applyDecoratedDescriptor(_class2$7.prototype, "mapsFrom", [mapsFrom], Object.getOwnPropertyDescriptor(_class2$7.prototype, "mapsFrom"), _class2$7.prototype), _applyDecoratedDescriptor(_class2$7.prototype, "mapsTo", [mapsTo], Object.getOwnPropertyDescriptor(_class2$7.prototype, "mapsTo"), _class2$7.prototype)), _class2$7)) || _class$t;

  class AnyObject {
    constructor() {
      throw new TypeError("AnyObject cannot be instantiated.");
    }

  }

  var _dec$p, _dec2$8, _dec3$5, _dec4$2, _dec5$2, _dec6$1, _dec7, _dec8, _dec9, _dec10, _dec11, _class$u, _class2$8, _temp$4, _temp2$2, _temp3$1, _temp4$1;
  var JsonFormat = Symbol("json"),
      DefaultTypeIdProperty = "$type";
  /**
   * Handler for mapping to or from json values.
   * @class JsonMapping
   * @extends AbstractMapping
   */

  var JsonMapping = (_dec$p = provides(), _dec2$8 = singleton(), _dec3$5 = formats(JsonFormat, /application[/]json/), _dec4$2 = mapsFrom(Date), _dec5$2 = mapsFrom(RegExp), _dec6$1 = mapsFrom(Either), _dec7 = mapsFrom(Array), _dec8 = mapsTo(Date), _dec9 = mapsTo(RegExp), _dec10 = mapsTo(Either), _dec11 = mapsTo(Array), _dec$p(_class$u = _dec2$8(_class$u = _dec3$5(_class$u = (_class2$8 = (_temp4$1 = (_temp3$1 = (_temp2$2 = (_temp$4 = class JsonMapping extends AbstractMapping {
    mapFromDate({
      object
    }) {
      return object.toJSON();
    }

    mapFromRegExp({
      object
    }) {
      return object.toString();
    }

    mapFromEither(mapFrom, options, {
      composer
    }) {
      var {
        object,
        format,
        seen
      } = mapFrom,
          {
        strategy
      } = options || {};

      function mapValue(value) {
        return $isNothing(value) ? null : composer.$mapFrom(value, format, [...seen, object]);
      }

      var isLeftProperty = getProperty(object, "isLeft", null, strategy),
          valueProperty = getProperty(object, "value", null, strategy);
      return object.fold(left => ({
        [isLeftProperty]: true,
        [valueProperty]: mapValue(left)
      }), right => ({
        [isLeftProperty]: false,
        [valueProperty]: mapValue(right)
      }));
    }

    mapFromArray(mapFrom, {
      composer
    }) {
      var {
        object,
        format,
        seen
      } = mapFrom,
          seenArray = [...seen, object];
      return object.map(elem => composer.$mapFrom(elem, format, seenArray));
    }

    mapsFrom(mapFrom, options, {
      composer
    }) {
      var {
        object
      } = mapFrom;
      if (!canMapJson(object)) return;

      if (this.isPrimitiveValue(object)) {
        var _object;

        return (_object = object) == null ? void 0 : _object.valueOf();
      }

      if ($isFunction(object.toJSON)) {
        return object.toJSON();
      }

      object = this.mapSurrogate(object, composer) || object;
      var {
        format,
        seen
      } = mapFrom,
          {
        fields,
        strategy,
        type,
        typeIdHandling
      } = options || {},
          allFields = $isNothing(fields) || fields === true;

      if (!(allFields || $isPlainObject(fields))) {
        throw new Error(`Invalid map fields specifier ${fields}.`);
      }

      var json = {},
          isPlain = $isPlainObject(object);

      if (!isPlain && shouldEmitTypeId(object, type, typeIdHandling)) {
        var id = typeId.getId(object);

        if (!$isNothing(id)) {
          var _typeInfo$get;

          var _type = $classOf(object),
              typeIdProp = ((_typeInfo$get = typeInfo.get(_type)) == null ? void 0 : _typeInfo$get.typeIdProperty) || (strategy == null ? void 0 : strategy.getTypeIdProperty == null ? void 0 : strategy.getTypeIdProperty(_type)) || DefaultTypeIdProperty;

          json[typeIdProp] = id;
        }
      }

      var descriptors = getPropertyDescriptors(object),
          seenObject = [...seen, object];
      Reflect.ownKeys(descriptors).forEach(key => {
        if (allFields || key in fields) {
          var _design$get, _design$get$propertyT;

          var map = !isPlain ? mapping.get(object, key) : null,
              property = getProperty(object, key, map, strategy),
              keyValue = object[key];
          if (!canMapJson(keyValue)) return;
          if (map != null && map.ignore) return;

          if (this.isPrimitiveValue(keyValue)) {
            json[property] = keyValue == null ? void 0 : keyValue.valueOf();
            return;
          }

          var keyFields;

          if (!allFields) {
            keyFields = fields[key];
            if (keyFields === false) return;

            if (!$isPlainObject(keyFields)) {
              keyFields = undefined;
            }
          }

          var keyJson = composer.$mapOptions({
            fields: keyFields,
            type: typeIdHandling === TypeIdHandling.Auto ? (_design$get = design.get(object, key)) == null ? void 0 : (_design$get$propertyT = _design$get.propertyType) == null ? void 0 : _design$get$propertyT.type : null
          }).$mapFrom(keyValue, format, seenObject);

          if (map != null && map.root) {
            Object.assign(json, keyJson);
          } else {
            json[property] = keyJson;
          }
        }
      });
      return json;
    }

    mapToDate({
      value
    }) {
      return instanceOf(value, Date) ? value : Date.parse(value);
    }

    mapToRegExp({
      value
    }) {
      var fragments = value.match(/\/(.*?)\/([gimy])?$/);
      return new RegExp(fragments[1], fragments[2] || "");
    }

    mapToEither(mapTo, options, {
      composer
    }) {
      var {
        classOrInstance,
        seen
      } = mapTo;

      if (!$isFunction(classOrInstance)) {
        throw new Error("Either is immutable and cannot be mapped onto.");
      }

      var {
        value,
        format
      } = mapTo,
          {
        strategy
      } = options || {},
          isLeftProperty = getProperty(Either, "isLeft", null, strategy),
          valueProperty = getProperty(Either, "value", null, strategy),
          eitherValue = value[valueProperty];
      var eitherObject = $isNothing(eitherValue) ? null : composer.$mapTo(eitherValue, format, null, [...seen, value]);
      return value[isLeftProperty] === true ? Either.left(eitherObject) : Either.right(eitherObject);
    }

    mapToArray(mapTo, {
      composer
    }) {
      var {
        value,
        format,
        seen
      } = mapTo,
          seenArray = [...seen, value];
      var type = mapTo.classOrInstance;
      type = Array.isArray(type) ? type[0] : undefined;
      return value.map(elem => composer.$mapTo(elem, format, type, seenArray));
    }

    mapsTo(mapTo, options, {
      composer
    }) {
      var {
        value
      } = mapTo;
      if (!canMapJson(value)) return;
      var {
        format,
        classOrInstance,
        seen
      } = mapTo,
          strategy = options == null ? void 0 : options.strategy;

      if (this.isPrimitiveValue(value)) {
        if (classOrInstance instanceof Enum) {
          throw new Error("Enum is immutable and cannot be mapped onto.");
        }

        if ((classOrInstance == null ? void 0 : classOrInstance.prototype) instanceof Enum) {
          return strategy != null && strategy.shouldUseEnumName(classOrInstance) ? classOrInstance.fromName(value) : classOrInstance.fromValue(value);
        }

        return value;
      }

      var object = getOrCreateObject(value, classOrInstance, strategy),
          type = $classOf(object),
          seenValue = [...seen, value],
          descriptors = type === Object ? getPropertyDescriptors(value) : getPropertyDescriptors(object);
      Reflect.ownKeys(descriptors).forEach(key => {
        var descriptor = descriptors[key];

        if (this.canSetProperty(descriptor)) {
          var map = type !== Object ? mapping.get(object, key) : null,
              property = getProperty(type, key, map, strategy);

          if (map != null && map.root) {
            mapKey.call(this, object, key, value, format, map, strategy, seen, composer);
          } else if (!(map != null && map.ignore)) {
            var keyValue = value[property];

            if (keyValue !== undefined) {
              mapKey.call(this, object, key, keyValue, format, map, strategy, seenValue, composer);
            }
          }
        }
      });
      return this.mapSurrogate(object, composer) || object;
    }

  }, _temp$4), options(MapOptions)(_temp$4.prototype, "mapFromEither", 1), _temp2$2), _temp3$1), options(MapOptions)(_temp3$1.prototype, "mapToEither", 1), _temp4$1), (_applyDecoratedDescriptor(_class2$8.prototype, "mapFromDate", [_dec4$2], Object.getOwnPropertyDescriptor(_class2$8.prototype, "mapFromDate"), _class2$8.prototype), _applyDecoratedDescriptor(_class2$8.prototype, "mapFromRegExp", [_dec5$2], Object.getOwnPropertyDescriptor(_class2$8.prototype, "mapFromRegExp"), _class2$8.prototype), _applyDecoratedDescriptor(_class2$8.prototype, "mapFromEither", [_dec6$1], Object.getOwnPropertyDescriptor(_class2$8.prototype, "mapFromEither"), _class2$8.prototype), _applyDecoratedDescriptor(_class2$8.prototype, "mapFromArray", [_dec7], Object.getOwnPropertyDescriptor(_class2$8.prototype, "mapFromArray"), _class2$8.prototype), _applyDecoratedDescriptor(_class2$8.prototype, "mapToDate", [_dec8], Object.getOwnPropertyDescriptor(_class2$8.prototype, "mapToDate"), _class2$8.prototype), _applyDecoratedDescriptor(_class2$8.prototype, "mapToRegExp", [_dec9], Object.getOwnPropertyDescriptor(_class2$8.prototype, "mapToRegExp"), _class2$8.prototype), _applyDecoratedDescriptor(_class2$8.prototype, "mapToEither", [_dec10], Object.getOwnPropertyDescriptor(_class2$8.prototype, "mapToEither"), _class2$8.prototype), _applyDecoratedDescriptor(_class2$8.prototype, "mapToArray", [_dec11], Object.getOwnPropertyDescriptor(_class2$8.prototype, "mapToArray"), _class2$8.prototype)), _class2$8)) || _class$u) || _class$u) || _class$u);

  function canMapJson(value) {
    return value !== undefined && !$isFunction(value) && !$isSymbol(value);
  }

  function getProperty(target, key, map, strategy, reading) {
    return (map == null ? void 0 : map.property) || (strategy == null ? void 0 : strategy.getPropertyName(target, key, reading)) || key;
  }

  function shouldEmitTypeId(object, type, typeIdHandling) {
    return typeIdHandling === TypeIdHandling.Always || typeIdHandling === TypeIdHandling.Auto && $classOf(object) !== type;
  }

  function getOrCreateObject(value, classOrInstance, strategy) {
    var isClass = $isFunction(classOrInstance),
        type = isClass ? classOrInstance : $classOf(classOrInstance),
        typeIdProperty = typeInfo.get(type) || (strategy == null ? void 0 : strategy.getTypeIdProperty == null ? void 0 : strategy.getTypeIdProperty(type)) || DefaultTypeIdProperty,
        id = value[typeIdProperty];

    if ($isNothing(id)) {
      return $isNothing(type) || type === AnyObject ? {} : isClass ? Reflect.construct(type, emptyArray) : classOrInstance;
    }

    var desiredType = (strategy == null ? void 0 : strategy.resolveTypeWithId == null ? void 0 : strategy.resolveTypeWithId(id)) || typeId.getType(id) || type;

    if ($isNothing(desiredType) || desiredType === AnyObject) {
      throw new TypeError(`The type with id '${id}' could not be resolved and no fallback type was provided.`);
    }

    if (isClass) {
      return Reflect.construct(desiredType, emptyArray);
    }

    if (!(classOrInstance instanceof desiredType)) {
      throw new TypeError(`Expected instance of type '${desiredType.name}', but received '${type.name}'.`);
    }

    return classOrInstance;
  }

  function mapKey(target, key, value, format, map, strategy, seen, composer) {
    var _design$get2, _design$get2$property;

    var type = (_design$get2 = design.get(target, key)) == null ? void 0 : (_design$get2$property = _design$get2.propertyType) == null ? void 0 : _design$get2$property.type;

    if ($isNothing(type)) {
      if (this.isPrimitiveValue(value)) {
        target[key] = value == null ? void 0 : value.valueOf();
        return;
      }
    } else if (type.prototype instanceof Enum) {
      var useEnumName = map == null ? void 0 : map.useEnumName;

      if ($isNothing(useEnumName)) {
        useEnumName = strategy == null ? void 0 : strategy.shouldUseEnumName(type);
      }

      target[key] = useEnumName ? type.fromName(value) : type.fromValue(value);
      return;
    }

    target[key] = composer.$mapTo(value, format, type, seen);
  }

  var _dec$q, _class$v;

  var _$C = createKeyChain();
  /**
   * Base callback for mapping.
   * @class MapCallback
   * @constructor
   * @param   {Any}   format  -  format specifier
   * @param   {Array} seen    -  array of seen objects
   * @extends Base
   */


  var MapCallback = (_dec$q = conformsTo(CallbackControl), _dec$q(_class$v = class MapCallback extends exports.Base {
    constructor(format, seen) {
      if (new.target === MapCallback) {
        throw new Error("MapCallback is abstract and cannot be instantiated.");
      }

      super();

      var _this = _$C(this);

      _this.format = format;
      _this.results = [];
      _this.promises = [];
      _this.seen = seen || [];
    }

    get format() {
      return _$C(this).format;
    }

    get seen() {
      return _$C(this).seen;
    }

    get callbackResult() {
      if (_$C(this).result === undefined) {
        var {
          results,
          promises
        } = _$C(this);

        _$C(this).result = promises.length == 0 ? results[0] : Promise.all(promises).then(() => results[0]);
      }

      return _$C(this).result;
    }

    set callbackResult(value) {
      _$C(this).result = value;
    }

    addResult(result) {
      if ($isNothing(result)) return;

      if ($isPromise(result)) {
        _$C(this).promises.push(result.then(res => {
          if (res != null) {
            _$C(this).results.push(res);
          }
        }));
      } else {
        _$C(this).results.push(result);
      }

      _$C(this).result = undefined;
    }

  }) || _class$v);
  /**
   * Callback to map an `object` to `format`.
   * @class MapFrom
   * @constructor
   * @param   {Object}  object  -  object to map
   * @param   {Any}     format  -  format specifier
   * @param   {Array}   seen    -  array of seen objects
   * @extends MapCallback
   */

  class MapFrom extends MapCallback {
    constructor(object, format, seen) {
      if ($isNothing(object)) {
        throw new TypeError("Missing object to map.");
      }

      if (checkCircularity$1(object, seen)) {
        throw new Error(`Circularity detected: MapFrom ${object} in progress.`);
      }

      super(format, seen);
      _$C(this).object = object;
    }

    get object() {
      return _$C(this).object;
    }

    get callbackPolicy() {
      return mapsFrom.policy;
    }

    dispatch(handler, greedy, composer) {
      var object = this.object,
          source = $classOf(object);
      if ($isNothing(source)) return false;

      var results = _$C(this).results,
          count = results.length;

      return mapsFrom.dispatch(handler, this, this, source, composer, false, this.addResult.bind(this)) || results.length > count;
    }

    toString() {
      return `MapFrom | ${this.object} to ${String(this.format)}`;
    }

  }
  /**
   * Callback to map a formatted `value` into an object.
   * @class MapTo
   * @constructor
   * @param   {Any}              value            -  formatted value
   * @param   {Any}              format           -  format specifier
   * @param   {Function|Object}  classOrInstance  -  instance or class to unmap
   * @param   {Array}            seen             -  array of seen objects
   * @extends MapCallback
   */

  class MapTo extends MapCallback {
    constructor(value, format, classOrInstance, seen) {
      if ($isNothing(value)) {
        throw new TypeError("Missing value to map.");
      }

      if (checkCircularity$1(value, seen)) {
        throw new Error(`Circularity detected: MapTo ${value} in progress.`);
      }

      super(format, seen);

      if ($isNothing(classOrInstance) && !$isString$1(value)) {
        classOrInstance = $classOf(value);

        if (classOrInstance === Object) {
          classOrInstance = AnyObject;
        }
      }

      var _this = _$C(this);

      _this.value = value;
      _this.classOrInstance = classOrInstance;
    }

    get value() {
      return _$C(this).value;
    }

    get classOrInstance() {
      return _$C(this).classOrInstance;
    }

    get callbackPolicy() {
      return mapsTo.policy;
    }

    dispatch(handler, greedy, composer) {
      var results = _$C(this).results,
          count = results.length,
          source = this.classOrInstance || this.value;

      return mapsTo.dispatch(handler, this, this, source, composer, false, this.addResult.bind(this)) || results.length > count;
    }

    toString() {
      return `MapTo | ${String(this.format)} ${this.value}`;
    }

  }

  function checkCircularity$1(object, seen) {
    return $isObject(object) && (seen == null ? void 0 : seen.includes(object));
  }

  Handler.implement({
    /**
     * Maps the `object` to a value in `format`.
     * @method $mapFrom
     * @param   {Object}  object  -  object to map
     * @param   {Any}     format  -  format specifier
     * @param   {Array}   seen    -  array of seen objects
     * @returns {Any}  mapped value.
     * @for Handler
     */
    $mapFrom(object, format, seen) {
      if ($isNothing(object)) {
        throw new TypeError("The object argument is required.");
      }

      var mapFrom = new MapFrom(object, format, seen);

      if (!this.handle(mapFrom)) {
        throw new NotHandledError(mapFrom);
      }

      return mapFrom.callbackResult;
    },

    /**
     * Maps the formatted `value` in `format` to `classOrInstance`.
     * @method $mapTo 
     * @param   {Any}              value            -  formatted value
     * @param   {Any}              format           -  format specifier
     * @param   {Function|Object}  classOrInstance  -  instance or class to unmap
     * @param   {Array}            seen             -  array of seen objects
     * @return  {Object}  unmapped instance.
     * @for Handler
     */
    $mapTo(value, format, classOrInstance, seen) {
      if ($isNothing(value)) {
        throw new TypeError("The object argument is required.");
      }

      if (Array.isArray(classOrInstance)) {
        var type = classOrInstance[0];

        if (type && !$isFunction(type) && !Array.isArray(type)) {
          throw new TypeError("Cannot infer array type.");
        }
      } else if (Array.isArray(value) && $isFunction(classOrInstance)) {
        classOrInstance = [classOrInstance];
      }

      var mapTo = new MapTo(value, format, classOrInstance, seen);

      if (!this.handle(mapTo)) {
        throw new NotHandledError(mapTo);
      }

      return mapTo.callbackResult;
    }

  });

  var _class$w, _temp$5;
  var Routed = (_class$w = (_temp$5 = class Routed extends MessageWrapper {
    constructor(...args) {
      super(...args);

      _defineProperty(this, "route", void 0);

      _defineProperty(this, "tag", void 0);
    }

    get typeId() {
      var responseType = response.get(this.message);

      if ($isNothing(responseType)) {
        return `Miruken.Api.Route.Routed, Miruken`;
      }

      var responseTypeId = typeId.getId(responseType);
      if ($isNothing(responseTypeId)) return;
      return `Miruken.Api.Route.Routed\`1[[${responseTypeId}]], Miruken`;
    }

  }, _temp$5), (_applyDecoratedDescriptor(_class$w.prototype, "typeId", [typeId], Object.getOwnPropertyDescriptor(_class$w.prototype, "typeId"), _class$w.prototype)), _class$w);
  class BatchRouted {
    constructor(routed, rawCallback) {
      _defineProperty(this, "routed", void 0);

      _defineProperty(this, "rawCallback", void 0);

      this.routed = routed;
      this.rawCallback = rawCallback;
    }

  }
  Request.implement({
    routeTo(route, tag) {
      var routed = new Routed(this);
      routed.route = route;
      routed.tag = tag;
      return routed;
    }

  });
  Message.implement({
    routeTo(route, tag) {
      var routed = new Routed(this);
      routed.route = route;
      routed.tag = tag;
      return routed;
    }

  });

  var _dec$r, _dec2$9, _dec3$6, _class$x, _class2$9;

  var _$D = createKey();

  var BatchRouter = (_dec$r = conformsTo(Batching), _dec2$9 = handles(BatchRouted), _dec3$6 = handles(Routed), unmanaged(_class$x = _dec$r(_class$x = (_class2$9 = class BatchRouter extends Handler {
    constructor() {
      super();
      _$D(this).groups = new Map();
    }

    routeBatch(batched, {
      rawCallback
    }) {
      return this.route(batched.routed, {
        rawCallback: batched.rawCallback || rawCallback
      });
    }

    route(routed, {
      rawCallback
    }) {
      if (!rawCallback instanceof Command) {
        return $unhandled;
      }

      var {
        groups
      } = _$D(this),
          {
        route,
        message
      } = routed;

      var group = groups.get(route);

      if ($isNothing(group)) {
        group = [];
        groups.set(route, group);
      }

      var pending = rawCallback.isMany ? new Publish(message) : message,
          request = new Pending(pending);
      group.push(request);
      return request.promise;
    }

    complete(composer) {
      var groups = [..._$D(this).groups.entries()],
          complete = Promise.all(groups.map(([uri, requests]) => {
        var messages = requests.map(r => r.message);
        return Promise.resolve(composer.$send(new Concurrent(messages).routeTo(uri))).then(result => {
          var responses = result.responses; // Cancel when available on Promise
          // for (let i = responses.length; i < requests.length; ++i) {
          //    requests[i].promise.cancel();
          //}

          return {
            uri,
            responses: responses.map((response, i) => response.fold(failure => {
              requests[i].reject(failure);
              return failure;
            }, success => {
              requests[i].resolve(success);
              return success;
            }))
          };
        }).catch(reason => {
          // Cancel requests when available on Promise
          //requests.forEach(r => r.Promise.cancel());
          return Promise.reject(reason);
        });
      }));

      _$D(this).groups.clear();

      return complete;
    }

  }, (_applyDecoratedDescriptor(_class2$9.prototype, "routeBatch", [_dec2$9], Object.getOwnPropertyDescriptor(_class2$9.prototype, "routeBatch"), _class2$9.prototype), _applyDecoratedDescriptor(_class2$9.prototype, "route", [_dec3$6], Object.getOwnPropertyDescriptor(_class2$9.prototype, "route"), _class2$9.prototype)), _class2$9)) || _class$x) || _class$x);

  class Pending {
    constructor(message) {
      _defineProperty(this, "message", void 0);

      _defineProperty(this, "promise", void 0);

      _defineProperty(this, "resolve", void 0);

      _defineProperty(this, "reject", void 0);

      this.message = message;
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }

  }

  var _dec$s, _class$y, _class2$a;
  var PassThroughRouter = (_dec$s = handles(Routed), unmanaged(_class$y = (_class2$a = class PassThroughRouter extends Handler {
    route(routed, {
      composer
    }) {
      return routed.route === PassThroughRouter.scheme ? composer.$send(routed.message) : $unhandled;
    }

    static get scheme() {
      return "pass-through";
    }

  }, (_applyDecoratedDescriptor(_class2$a.prototype, "route", [skipFilters, _dec$s], Object.getOwnPropertyDescriptor(_class2$a.prototype, "route"), _class2$a.prototype)), _class2$a)) || _class$y);

  var _dec$t, _class$z, _dec2$a, _class2$b;

  var _$E = createKey();

  var RoutesFilter = (_dec$t = conformsTo(Filtering), _dec$t(_class$z = class RoutesFilter {
    constructor(schemes) {
      _$E(this).schemes = schemes;
    }

    get order() {
      return Stage.Logging - 1;
    }

    next(routed, {
      composer,
      rawCallback,
      next
    }) {
      var matches = _$E(this).schemes.includes(getScheme(routed));

      if (matches) {
        var batcher = composer.$getBatcher(BatchRouter);

        if (!$isNothing(batcher)) {
          return composer.$enableFilters().$command(new BatchRouted(routed, rawCallback));
        }
      }

      return next(composer.$enableFilters(), matches);
    }

  }) || _class$z);
  var RoutesProvider = (_dec2$a = conformsTo(FilteringProvider), _dec2$a(_class2$b = class RoutesProvider {
    constructor(schemes) {
      if ($isNothing(schemes) || schemes.length === 0) {
        throw new Error("The schemes argument cannot be empty.");
      }

      _$E(this).filters = [new RoutesFilter(schemes)];
    }

    get required() {
      return true;
    }

    getFilters(binding, callback, composer) {
      return _$E(this).filters;
    }

  }) || _class2$b);
  var routes = createFilterDecorator((target, key, descriptor, schemes) => new RoutesProvider($flatten(schemes, true)), true);

  function getScheme(routed) {
    var {
      route
    } = routed;

    try {
      var uri = new URL(route);
      return uri.protocol.slice(0, -1);
    } catch {
      return route;
    }
  }

  Handler.implement({
    concurrent(...requests) {
      var reqs = $flatten(requests, true);
      return $isNothing(reqs) || reqs.length === 0 ? new ScheduledResult() : this.$send(new Concurrent(reqs));
    },

    sequential(...requests) {
      var reqs = $flatten(requests, true);
      return $isNothing(reqs) || reqs.length === 0 ? new ScheduledResult() : this.$send(new Sequential(reqs));
    }

  });

  var _$F = createKey();

  class MetadataKeyConstraint extends BindingConstraint {
    constructor(key, value) {
      super();

      if ($isNothing(key)) {
        throw new Error("The key argument is required.");
      }

      _$F(this).key = value;
      _$F(this).value = value;
    }

    require(metadata) {
      if ($isNothing(metadata)) {
        throw new Error("The metadata argument is required.");
      }

      var {
        key,
        value
      } = _$F(this);

      metadata.set(key, value);
    }

    matches(metadata) {
      if ($isNothing(metadata)) {
        throw new Error("The metadata argument is required.");
      }

      var {
        key,
        value
      } = _$F(this);

      return metadata.has(key) && metadata.get(key) === value;
    }

  }
  class MetadataConstraint extends BindingConstraint {
    constructor(metadata) {
      super();

      if ($isNothing(metadata)) {
        throw new Error("The metadata argument is required.");
      }

      _$F(this).metadata = metadata;
    }

    require(metadata) {
      if ($isNothing(metadata)) {
        throw new Error("The metadata argument is required.");
      }

      for (var [key, value] of _$F(this).metadata) {
        metadata.set(key, value);
      }
    }

    matches(metadata) {
      if ($isNothing(metadata)) {
        throw new Error("The metadata argument is required.");
      }

      for (var [key, value] of _$F(this).metadata) {
        if (!(metadata.has(key) && metadata.get(key) === value)) {
          return false;
        }
      }

      return true;
    }

  }
  var metadata = createConstraintDecorator((...args) => {
    if (args.length === 2 && $isString$1(args[0])) {
      return new MetadataKeyConstraint(args[0], args[1]);
    }

    return new MetadataConstraint(...args);
  });

  var _dec$u, _class$A, _temp$6;
  /**
   * Options for controlling filters.
   * @class FilterOptions
   * @extends Options
   */

  var FilterOptions = (_dec$u = handlesOptions("filterOptions"), _dec$u(_class$A = (_temp$6 = class FilterOptions extends Options {
    constructor(...args) {
      super(...args);

      _defineProperty(this, "providers", void 0);

      _defineProperty(this, "skipFilters", void 0);
    }

  }, _temp$6)) || _class$A);

  Handler.implement({
    $skipFilters(skip = true) {
      return this.$filterOptions({
        skipFilters: skip
      });
    },

    $enableFilters(enable = true) {
      return this.$filterOptions({
        skipFilters: !enable
      });
    },

    $withFilters(filters) {
      return filters ? this.$filterOptions({
        providers: [new FilterInstanceProvider(filters.flat())]
      }) : this;
    },

    $withFilterProviders(providers) {
      return providers ? this.$filterOptions({
        providers: providers.flat()
      }) : this;
    },

    $getOrderedFilters(binding, callback, providers) {
      var options = this.$getOptions(FilterOptions),
          extraProviders = options && options.providers;
      var handler,
          allProviders = providers.flatMap(p => {
        if ($isNothing(p)) return emptyArray;
        if (Array.isArray(p)) return p;
        return p.filters || [p];
      }).filter(p => {
        var appliesTo = p.appliesTo;
        return !$isFunction(appliesTo) || appliesTo.call(p, callback) !== false;
      }).concat(extraProviders || emptyArray);

      switch (options && options.skipFilters) {
        case true:
          allProviders = allProviders.filter(p => p.required);
          handler = this;
          break;

        case null:
        case undefined:
          if (binding.skipFilters || binding.getMetadata(skipFilters) || binding.getParentMetadata(skipFilters)) {
            allProviders = allProviders.filter(p => p.required);
          }

          handler = this.$skipFilters();
          break;

        case false:
          handler = this.$skipFilters();
          break;
      }

      var ordered = [],
          once = new Set();

      for (var provider of allProviders) {
        var found = false;
        var filters = provider.getFilters(binding, callback, handler);
        if (filters == null) return;

        for (var filter of filters) {
          if (filter == null) return;
          found = true;
          var filterType = $classOf(filter),
              multipleAllowed = allowMultiple.get(filterType);

          if (!($isNothing(multipleAllowed) || multipleAllowed)) {
            if (once.has(filterType)) continue;
            once.add(filterType);
          }

          ordered.push({
            filter,
            provider
          });
        }

        if (!found) return;
      }

      return ordered.sort((a, b) => {
        if (a.filter === b.filter) return 0;
        if (a.filter.order === b.filter.order || b.filter.order == null) return -1;
        if (a.filter.order == null) return 1;
        return a.filter.order - b.filter.order;
      });
    }

  });

  var hyphenNaming = Base => {
    var _dec, _class;

    return _dec = conformsTo(Mapping), _dec(_class = class extends Base {
      getPropertyName(target, key) {
        if (!$isNothing(key)) {
          return key.split(/(?=[A-Z])/).join('-').toLowerCase();
        }
      }

    }) || _class;
  };

  var underscoreNaming = Base => {
    var _dec, _class;

    return _dec = conformsTo(Mapping), _dec(_class = class extends Base {
      getPropertyName(target, key) {
        if (!$isNothing(key)) {
          return key.split(/(?=[A-Z])/).join('_').toLowerCase();
        }
      }

    }) || _class;
  };

  function useEnumNames(...enumTypes) {
    enumTypes = validateEnumTypes(enumTypes);
    return Base => {
      var _dec, _class;

      return _dec = conformsTo(Mapping), _dec(_class = class extends Base {
        shouldUseEnumName(enumType, target, key) {
          if ($isNothing(enumTypes) || enumTypes.length === 0 || enumTypes.includes(enumType)) {
            return true;
          }

          var chain = Base.prototype.shouldUseEnumName;

          if ($isFunction(chain)) {
            return chain.call(this, enumType, target, key);
          }
        }

      }) || _class;
    };
  }

  function validateEnumTypes(enumTypes) {
    return enumTypes.flat().filter(enumType => {
      if ($isNothing(enumType)) return false;

      if (!(enumType.prototype instanceof Enum)) {
        throw new TypeError(`${String(enumType)} is not an Enum type.`);
      }

      return true;
    });
  }

  exports.$all = $all;
  exports.$child = $child;
  exports.$classOf = $classOf;
  exports.$compose = $compose;
  exports.$compose2 = $compose2;
  exports.$contents = $contents;
  exports.$createQualifier = $createQualifier;
  exports.$debounce = $debounce;
  exports.$decorate = $decorate;
  exports.$decorated = $decorated;
  exports.$decorator = $decorator;
  exports.$eq = $eq;
  exports.$equals = $equals;
  exports.$eval = $eval;
  exports.$flatten = $flatten;
  exports.$instant = $instant;
  exports.$isBoolean = $isBoolean;
  exports.$isFunction = $isFunction;
  exports.$isIterable = $isIterable;
  exports.$isNothing = $isNothing;
  exports.$isNumber = $isNumber;
  exports.$isObject = $isObject;
  exports.$isPlainObject = $isPlainObject;
  exports.$isPromise = $isPromise;
  exports.$isProtocol = $isProtocol;
  exports.$isSomething = $isSomething;
  exports.$isString = $isString$1;
  exports.$isSymbol = $isSymbol;
  exports.$lazy = $lazy;
  exports.$lift = $lift;
  exports.$optional = $optional;
  exports.$pipe = $pipe;
  exports.$promise = $promise;
  exports.$protocols = $protocols;
  exports.$proxy = $proxy;
  exports.$unhandled = $unhandled;
  exports.$use = $use;
  exports.$using = $using;
  exports.Abstract = Abstract;
  exports.AbstractMapping = AbstractMapping;
  exports.AnyObject = AnyObject;
  exports.ArrayDelegate = ArrayDelegate;
  exports.ArrayManager = ArrayManager;
  exports.Batch = Batch;
  exports.BatchRouted = BatchRouted;
  exports.BatchRouter = BatchRouter;
  exports.Batching = Batching;
  exports.BatchingComplete = BatchingComplete;
  exports.Binding = Binding;
  exports.BindingConstraint = BindingConstraint;
  exports.BindingMetadata = BindingMetadata;
  exports.BindingScope = BindingScope;
  exports.CacheAction = CacheAction;
  exports.Cached = Cached;
  exports.CachedHandler = CachedHandler;
  exports.CallbackControl = CallbackControl;
  exports.CallbackOptions = CallbackOptions;
  exports.CallbackPolicy = CallbackPolicy;
  exports.CallbackSemantics = CallbackSemantics;
  exports.CascadeHandler = CascadeHandler;
  exports.Command = Command;
  exports.CompositeHandler = CompositeHandler;
  exports.Composition = Composition;
  exports.Concurrent = Concurrent;
  exports.ConstraintBuilder = ConstraintBuilder;
  exports.ConstraintFilter = ConstraintFilter;
  exports.ConstraintProvider = ConstraintProvider;
  exports.Context = Context$1;
  exports.ContextBuilder = ContextBuilder;
  exports.ContextObserver = ContextObserver;
  exports.ContextState = ContextState;
  exports.Contextual = Contextual;
  exports.ContextualHelper = ContextualHelper;
  exports.ContextualLifestyle = ContextualLifestyle;
  exports.ContextualLifestyleProvider = ContextualLifestyleProvider;
  exports.ContravariantPolicy = ContravariantPolicy;
  exports.CovariantPolicy = CovariantPolicy;
  exports.Creation = Creation;
  exports.DefaultTypeIdProperty = DefaultTypeIdProperty;
  exports.Delegate = Delegate;
  exports.DeriveTypesBuilder = DeriveTypesBuilder;
  exports.Disposing = Disposing;
  exports.DisposingMixin = DisposingMixin;
  exports.DuckTyping = DuckTyping;
  exports.Either = Either;
  exports.Enum = Enum;
  exports.ErrorHandler = ErrorHandler;
  exports.Errors = Errors;
  exports.False = False;
  exports.FilterInstanceProvider = FilterInstanceProvider;
  exports.FilterOptions = FilterOptions;
  exports.FilterSpec = FilterSpec;
  exports.FilterSpecProvider = FilterSpecProvider;
  exports.Filtered = Filtered;
  exports.FilteredScope = FilteredScope;
  exports.Filtering = Filtering;
  exports.FilteringProvider = FilteringProvider;
  exports.Flags = Flags;
  exports.HandleMethod = HandleMethod;
  exports.HandleMethodDelegate = HandleMethodDelegate;
  exports.HandleResult = HandleResult;
  exports.Handler = Handler;
  exports.HandlerAdapter = HandlerAdapter;
  exports.HandlerBuilder = HandlerBuilder;
  exports.HandlerDescriptor = HandlerDescriptor;
  exports.IndexedList = IndexedList;
  exports.InferenceHandler = InferenceHandler;
  exports.Initializer = Initializer;
  exports.InitializerProvider = InitializerProvider;
  exports.Initializing = Initializing;
  exports.InjectResolver = InjectResolver;
  exports.Inquiry = Inquiry;
  exports.InvariantPolicy = InvariantPolicy;
  exports.JsonFormat = JsonFormat;
  exports.JsonMapping = JsonMapping;
  exports.KeyResolver = KeyResolver;
  exports.KeyResolving = KeyResolving;
  exports.Lifestyle = Lifestyle;
  exports.LifestyleProvider = LifestyleProvider;
  exports.Lookup = Lookup;
  exports.MapCallback = MapCallback;
  exports.MapFrom = MapFrom;
  exports.MapOptions = MapOptions;
  exports.MapTo = MapTo;
  exports.Mapping = Mapping;
  exports.Message = Message;
  exports.MessageWrapper = MessageWrapper;
  exports.Metadata = Metadata;
  exports.MetadataConstraint = MetadataConstraint;
  exports.MetadataKeyConstraint = MetadataKeyConstraint;
  exports.MethodType = MethodType;
  exports.Module = Module;
  exports.NamedConstraint = NamedConstraint;
  exports.NoBatch = NoBatch;
  exports.NotHandledError = NotHandledError;
  exports.Null = Null;
  exports.ObjectDelegate = ObjectDelegate;
  exports.Options = Options;
  exports.OptionsResolver = OptionsResolver;
  exports.Package = Package;
  exports.Parenting = Parenting;
  exports.PassThroughRouter = PassThroughRouter;
  exports.Protocol = Protocol;
  exports.ProvideBuilder = ProvideBuilder;
  exports.ProxyResolver = ProxyResolver;
  exports.Publish = Publish;
  exports.QualifierConstraint = QualifierConstraint;
  exports.RejectedError = RejectedError;
  exports.Request = Request;
  exports.RequestWrapper = RequestWrapper;
  exports.Resolving = Resolving;
  exports.ResponseWrapper = ResponseWrapper;
  exports.Routed = Routed;
  exports.RoutesProvider = RoutesProvider;
  exports.Scheduled = Scheduled;
  exports.ScheduledResult = ScheduledResult;
  exports.Scheduler = Scheduler;
  exports.SelectTypesBuilder = SelectTypesBuilder;
  exports.Sequential = Sequential;
  exports.SingletonLifestyle = SingletonLifestyle;
  exports.SingletonLifestyleProvider = SingletonLifestyleProvider;
  exports.SourceBuilder = SourceBuilder;
  exports.Stage = Stage;
  exports.Starting = Starting;
  exports.Startup = Startup;
  exports.Stash = Stash;
  exports.StashAction = StashAction;
  exports.StashOf = StashOf;
  exports.StashOfResolver = StashOfResolver;
  exports.StrictProtocol = StrictProtocol;
  exports.TimeoutError = TimeoutError;
  exports.Trampoline = Trampoline;
  exports.Traversal = Traversal;
  exports.Traversing = Traversing;
  exports.TraversingAxis = TraversingAxis;
  exports.TraversingMixin = TraversingMixin;
  exports.True = True;
  exports.Try = Try;
  exports.TypeFlags = TypeFlags;
  exports.TypeIdHandling = TypeIdHandling;
  exports.TypeInfo = TypeInfo;
  exports.Undefined = Undefined$1;
  exports.Variance = Variance;
  exports.all = all;
  exports.allowMultiple = allowMultiple;
  exports.assignID = assignID;
  exports.bind = bind;
  exports.conformsTo = conformsTo;
  exports.constraint = constraint;
  exports.contextual = contextual;
  exports.copy = copy;
  exports.createConstraintDecorator = createConstraintDecorator;
  exports.createFilterDecorator = createFilterDecorator;
  exports.createFilterSpecDecorator = createFilterSpecDecorator;
  exports.createKey = createKey;
  exports.createKeyChain = createKeyChain;
  exports.createQualifier = createQualifier;
  exports.createTypeInfoDecorator = createTypeInfoDecorator;
  exports.creates = creates;
  exports.csv = csv;
  exports.debounce = debounce;
  exports.decorate = decorate;
  exports.delegate = delegate;
  exports.design = design;
  exports.disposable = disposable;
  exports.emptyArray = emptyArray;
  exports.exact = exact;
  exports.extend = extend;
  exports.filter = filter;
  exports.format = format;
  exports.formats = formats;
  exports.getPropertyDescriptors = getPropertyDescriptors;
  exports.handles = handles;
  exports.handlesOptions = handlesOptions;
  exports.hyphenNaming = hyphenNaming;
  exports.ignore = ignore$1;
  exports.initialize = initialize;
  exports.inject = inject;
  exports.instanceOf = instanceOf;
  exports.isDescriptor = isDescriptor;
  exports.lazy = lazy;
  exports.left = left;
  exports.looksup = looksup;
  exports.mapping = mapping;
  exports.mapsFrom = mapsFrom;
  exports.mapsTo = mapsTo;
  exports.metadata = metadata;
  exports.mixin = mixin;
  exports.named = named;
  exports.optional = optional;
  exports.options = options;
  exports.partial = partial;
  exports.pcopy = pcopy;
  exports.property = property;
  exports.protocol = protocol;
  exports.provides = provides;
  exports.proxy = proxy;
  exports.response = response;
  exports.returns = returns;
  exports.right = right;
  exports.root = root;
  exports.routes = routes;
  exports.scoped = scoped;
  exports.scopedQualifier = scopedQualifier;
  exports.scopedRooted = scopedRooted;
  exports.singleton = singleton;
  exports.skipFilters = skipFilters;
  exports.stashOf = stashOf;
  exports.surrogate = surrogate;
  exports.traversable = traversable;
  exports.type = type;
  exports.typeId = typeId;
  exports.typeInfo = typeInfo;
  exports.typeOf = typeOf;
  exports.underscoreNaming = underscoreNaming;
  exports.unmanaged = unmanaged;
  exports.useEnumName = useEnumName;
  exports.useEnumNames = useEnumNames;

  Object.defineProperty(exports, '__esModule', { value: true });

});

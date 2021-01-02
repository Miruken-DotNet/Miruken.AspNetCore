define(['exports', '@miruken/core', '@microsoft/signalr', '@miruken/validate'], function (exports, core, signalR, validate) { 'use strict';

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

  var _dec, _dec2, _class, _temp, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _class3, _class4;
  var ErrorData = (_dec = core.surrogate(Error), _dec2 = core.typeId("Miruken.Http.ExceptionData, Miruken.Http"), _dec(_class = _dec2(_class = (_temp = class ErrorData {
    constructor(message) {
      _defineProperty(this, "exceptionType", void 0);

      _defineProperty(this, "message", void 0);

      _defineProperty(this, "source", void 0);

      this.message = message;
    }

  }, _temp)) || _class) || _class);
  var ErrorMapping = (_dec3 = core.provides(), _dec4 = core.singleton(), _dec5 = core.formats(Error), _dec6 = core.mapsFrom(ErrorData), _dec7 = core.formats(ErrorData), _dec8 = core.mapsFrom(Error), _dec3(_class3 = _dec4(_class3 = (_class4 = class ErrorMapping extends core.Handler {
    mapToError({
      object
    }) {
      var message = (object == null ? void 0 : object.message) || "Unknown Error",
          error = new Error(message);
      error.name = object == null ? void 0 : object.source;
      return error;
    }

    mapToErrorData({
      object
    }) {
      var message = (object == null ? void 0 : object.message) || "Unknown Error",
          errorData = new ErrorData(message);
      errorData.source = object == null ? void 0 : object.name;
      return errorData;
    }

  }, (_applyDecoratedDescriptor(_class4.prototype, "mapToError", [_dec5, _dec6], Object.getOwnPropertyDescriptor(_class4.prototype, "mapToError"), _class4.prototype), _applyDecoratedDescriptor(_class4.prototype, "mapToErrorData", [_dec7, _dec8], Object.getOwnPropertyDescriptor(_class4.prototype, "mapToErrorData"), _class4.prototype)), _class4)) || _class3) || _class3);

  class ResourceWrapper extends core.Request {
    constructor(resource) {
      if (new.target === ResourceWrapper) {
        throw new TypeError("ResourceWrapper cannot be instantiated.");
      }

      super();

      _defineProperty(this, "resource", void 0);

      this.resource = resource;
    }

  }
  class ResourceRequest extends ResourceWrapper {
    constructor(...args) {
      super(...args);

      _defineProperty(this, "baseAddress", void 0);

      _defineProperty(this, "resourceUri", void 0);

      _defineProperty(this, "responseType", void 0);

      _defineProperty(this, "contentType", void 0);

      _defineProperty(this, "headers", void 0);
    }

    getCacheKey() {
      var resource = this.resource,
          resourceKey = resource == null ? void 0 : resource.getCacheKey == null ? void 0 : resource.getCacheKey();

      if (!$isNothing(resourceKey)) {
        return JSON.stringify(this, (name, value) => name === "request" ? `${core.assignID(core.$classOf(resource))}#${resourceKey}` : value);
      }
    }

  }
  class ResourceResponse extends ResourceWrapper {
    constructor(...args) {
      super(...args);

      _defineProperty(this, "resourceUri", void 0);

      _defineProperty(this, "headers", void 0);
    }

  }
  class GetRequest extends ResourceRequest {}
  class GetResponse extends ResourceResponse {}
  class PutRequest extends ResourceRequest {}
  class PutResponse extends ResourceResponse {}
  class PostRequest extends ResourceRequest {}
  class PostResponse extends ResourceResponse {}
  class PatchRequest extends ResourceRequest {}
  class PatchResponse extends ResourceResponse {}
  class DeleteRequest extends ResourceRequest {}
  class DeleteResponse extends ResourceResponse {}
  class HeadRequest extends ResourceRequest {}
  class HeadResponse extends ResourceResponse {}

  var _dec$1, _class$1, _temp$1;
  var HttpOptions = (_dec$1 = core.handlesOptions("httpOptions"), _dec$1(_class$1 = (_temp$1 = class HttpOptions extends core.Options {
    constructor(...args) {
      super(...args);

      _defineProperty(this, "baseUrl", void 0);

      _defineProperty(this, "timeout", void 0);

      _defineProperty(this, "headers", void 0);

      _defineProperty(this, "pipeline", void 0);

      _defineProperty(this, "withCredentials", void 0);
    }

  }, _temp$1)) || _class$1);

  var {
    toString
  } = Object.prototype;
  class TypeHelper {
    static isFormData(value) {
      return this.hasFormData && value instanceof FormData;
    }

    static isURLSearchParams(value) {
      return this.hasURLSearchParams && value instanceof URLSearchParams;
    }

    static isArrayBuffer(value) {
      return this.hasArrayBuffer && (value instanceof ArrayBuffer || toString.call(value) === '[object ArrayBuffer]');
    }

    static isBlob(value) {
      return this.hasBlob && (value instanceof Blob || toString.call(value) === '[object Blob]');
    }

  }

  _defineProperty(TypeHelper, "hasFormData", typeof FormData === "function");

  _defineProperty(TypeHelper, "hasURLSearchParams", typeof URLSearchParams === "function");

  _defineProperty(TypeHelper, "hasArrayBuffer", typeof ArrayBuffer === "function");

  _defineProperty(TypeHelper, "hasBlob", typeof Blob === "function");

  var DEFAULT_CONTENT_TYPE = "application/x-www-form-urlencoded";
  function normalizeHttpRequest(request, composer, next) {
    var {
      headers = {},
      resource
    } = request;

    if (core.$isNothing(headers["Accept"])) {
      headers["Accept"] = "application/json, text/plain, */*";
    }

    if (core.$isNothing(resource)) {
      delete headers["Content-Type"];
    } else if (core.$isNothing(resource.contentType)) {
      request.contentType = headers["Content-Type"];
    }

    if (!core.$isNothing(resource) && core.$isNothing(resource.contentType)) {
      request.contentType = inferContentType(resource);
    }

    request.headers = headers;
    return next();
  }

  function inferContentType(resource) {
    if (TypeHelper.isFormData(resource) || TypeHelper.isArrayBuffer(resource) || TypeHelper.isBlob(resource)) {
      return DEFAULT_CONTENT_TYPE;
    }

    if (TypeHelper.isURLSearchParams(resource)) {
      return "application/x-www-form-urlencoded;charset=utf-8";
    }

    if (core.$isObject(resource)) {
      return "application/json;charset=utf-8";
    }

    return DEFAULT_CONTENT_TYPE;
  }

  var _dec$2, _dec2$1, _dec3$1, _dec4$1, _dec5$1, _dec6$1, _class$2, _temp$2, _temp2, _temp3, _temp4, _temp5, _temp6, _temp7, _temp8, _temp9, _temp10, _temp11, _temp12;
  var DEFAULT_PIPELINE = [normalizeHttpRequest];
  var HttpHandler = (_dec$2 = core.handles(GetRequest), _dec2$1 = core.handles(PutRequest), _dec3$1 = core.handles(PostRequest), _dec4$1 = core.handles(PatchRequest), _dec5$1 = core.handles(DeleteRequest), _dec6$1 = core.handles(HeadRequest), (_class$2 = (_temp12 = (_temp11 = (_temp10 = (_temp9 = (_temp8 = (_temp7 = (_temp6 = (_temp5 = (_temp4 = (_temp3 = (_temp2 = (_temp$2 = class HttpHandler extends core.Handler {
    constructor() {
      if (new.target === HttpHandler) {
        throw new Error("HttpHandler cannot be instantiated.");
      }

      super();
    }

    get(get, options, {
      composer
    }) {
      return send(this, "GET", get, new GetResponse(), options, composer);
    }

    put(put, options, {
      composer
    }) {
      return send(this, "PUT", put, new PutResponse(), options, composer);
    }

    post(post, options, {
      composer
    }) {
      return send(this, "POST", post, new PostResponse(), options, composer);
    }

    patch(patch, options, {
      composer
    }) {
      return send(this, "PATCH", patch, new PatchResponse(), options, composer);
    }

    delete(remove, options, {
      composer
    }) {
      return send(this, "DELETE", remove, new DeleteResponse(), options, composer);
    }

    delete(head, options, {
      composer
    }) {
      return send(this, "HEAD", head, new HeadResponse(), options, composer);
    }

    sendRequest(verb, url, request, payload, response, options, composer) {
      throw new Error(`${core.$classOf(this).name} must override sendRequest().`);
    }

    createUrl(request, options, composer) {
      var {
        baseAddress,
        resourceUri
      } = request;
      return resourceUri instanceof URL ? resourceUri : new URL(resourceUri, baseAddress || (options == null ? void 0 : options.baseUrl));
    }

  }, _temp$2), core.options(HttpOptions)(_temp$2.prototype, "get", 1), _temp2), _temp3), core.options(HttpOptions)(_temp3.prototype, "put", 1), _temp4), _temp5), core.options(HttpOptions)(_temp5.prototype, "post", 1), _temp6), _temp7), core.options(HttpOptions)(_temp7.prototype, "patch", 1), _temp8), _temp9), core.options(HttpOptions)(_temp9.prototype, "delete", 1), _temp10), _temp11), core.options(HttpOptions)(_temp11.prototype, "delete", 1), _temp12), (_applyDecoratedDescriptor(_class$2.prototype, "get", [_dec$2], Object.getOwnPropertyDescriptor(_class$2.prototype, "get"), _class$2.prototype), _applyDecoratedDescriptor(_class$2.prototype, "put", [_dec2$1], Object.getOwnPropertyDescriptor(_class$2.prototype, "put"), _class$2.prototype), _applyDecoratedDescriptor(_class$2.prototype, "post", [_dec3$1], Object.getOwnPropertyDescriptor(_class$2.prototype, "post"), _class$2.prototype), _applyDecoratedDescriptor(_class$2.prototype, "patch", [_dec4$1], Object.getOwnPropertyDescriptor(_class$2.prototype, "patch"), _class$2.prototype), _applyDecoratedDescriptor(_class$2.prototype, "delete", [_dec5$1], Object.getOwnPropertyDescriptor(_class$2.prototype, "delete"), _class$2.prototype), _applyDecoratedDescriptor(_class$2.prototype, "delete", [_dec6$1], Object.getOwnPropertyDescriptor(_class$2.prototype, "delete"), _class$2.prototype)), _class$2));

  function send(o, verb, request, response, options, composer) {
    var _options$pipeline;

    var pipeline = (options == null ? void 0 : (_options$pipeline = options.pipeline) == null ? void 0 : _options$pipeline.concat(DEFAULT_PIPELINE)) || DEFAULT_PIPELINE;

    try {
      return pipeline.reduceRight((next, pipe) => c => pipe(request, c, cc => next(cc || c)), c => {
        var url = o.createUrl(request, options, c);
        return o.sendRequest(verb, url, request, response, options, c);
      })(composer);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  core.Handler.implement({
    $httpGet(uri, configure) {
      var get = new GetRequest();
      configureRequest(uri, get, null, configure);
      return this.$send(get);
    },

    $httpPut(uri, resource, configure) {
      var put = new PutRequest();
      configureRequest(uri, put, resource, configure);
      return this.$send(put);
    },

    $httpPost(uri, resource, configure) {
      var post = new PostRequest();
      configureRequest(uri, post, resource, configure);
      return this.$send(post);
    },

    $httpPatch(uri, resource, configure) {
      var patch = new PatchRequest();
      configureRequest(uri, patch, resource, configure);
      return this.$send(patch);
    },

    $httpDelete(uri, configure) {
      var remove = new DeleteRequest();
      configureRequest(uri, remove, resource, configure);
      return this.$send(remove);
    }

  });

  function configureRequest(uri, request, resource, configure) {
    request.resourceUri = uri;
    request.resource = resource;

    if (core.$isFunction(configure)) {
      configure(request);
    } else {
      Object.assign(request, configure);
    }
  }

  core.Handler.implement({
    $httpBasic(username, password) {
      return this.$httpPipeline([(request, composer, next) => {
        if (core.$isFunction(username)) {
          var credential = username();

          if (core.$isPromise(credential)) {
            return credential.then(result => {
              basic(result == null ? void 0 : result.username, result == null ? void 0 : result.password, request);
              return next();
            });
          }

          username = credential == null ? void 0 : credential.username;
          password = credential == null ? void 0 : credential.password;
        }

        basic(username, password, request);
        return next();
      }]);
    },

    $httpToken(token, scheme) {
      return this.$httpPipeline([(request, composer, next) => {
        if (core.$isFunction(token)) {
          var credential = token();

          if (core.$isPromise(credential)) {
            return credential.then(result => {
              token(result == null ? void 0 : result.token, result == null ? void 0 : result.scheme, request);
              return next();
            });
          }

          token = credential == null ? void 0 : credential.token;
          scheme = credential == null ? void 0 : credential.scheme;
        }

        token(token, scheme, request);
        return next();
      }]);
    }

  });

  function basic(username, password, request) {
    var {
      headers = {}
    } = request;
    username = username || "";
    password = password ? unescape(encodeURIComponent(password)) : "";
    headers["Authorization"] = "Basic " + btoa(username + ":" + password);
    request.headers = headers;
  }

  class HttpError extends Error {
    constructor(statusCode, message, inner) {
      if (!core.$isNumber(statusCode)) {
        throw new TypeError("The statusCode must be a number.");
      }

      super(message || (inner == null ? void 0 : inner.message));

      _defineProperty(this, "statusCode", void 0);

      _defineProperty(this, "content", void 0);

      _defineProperty(this, "inner", void 0);

      this.statusCode = statusCode;
      this.inner = inner;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }

  }

  var _ = core.createKey();

  class UnknownPayloadError extends Error {
    constructor(payload) {
      var _payload$constructor;

      super(`Unable to map the error payload '${payload == null ? void 0 : (_payload$constructor = payload.constructor) == null ? void 0 : _payload$constructor.name}'.`);
      _(this).payload = payload;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }

    get payload() {
      return _(this).payload;
    }

  }

  var _dec$3, _dec2$2, _dec3$2, _dec4$2, _class$3, _class2;
  var HttpRouter = (_dec$3 = core.provides(), _dec2$2 = core.singleton(), _dec3$2 = core.handles(core.Routed), _dec4$2 = core.routes("http", "https"), _dec$3(_class$3 = _dec2$2(_class$3 = (_class2 = class HttpRouter {
    route(routed, {
      rawCallback,
      composer
    }) {
      var {
        message
      } = routed,
          uri = (rawCallback == null ? void 0 : rawCallback.isMany) === true ? "publish" : "process";
      return composer.$enableFilters().$mapOptions({
        typeIdHandling: core.TypeIdHandling.Auto
      }).$httpPost(uri, {
        payload: message
      }, {
        baseAddress: routed.route,
        contentType: "application/json"
      }).then(response => {
        var _response$resource;

        return (_response$resource = response.resource) == null ? void 0 : _response$resource.payload;
      }).catch(error => {
        if (error instanceof HttpError) {
          var _error$content;

          var payload = (_error$content = error.content) == null ? void 0 : _error$content.payload;

          if (!core.$isNothing(payload)) {
            if (payload instanceof Error) throw payload;
            throw new UnknownPayloadError(payload);
          }
        }

        throw error;
      });
    }

  }, (_applyDecoratedDescriptor(_class2.prototype, "route", [_dec3$2, _dec4$2], Object.getOwnPropertyDescriptor(_class2.prototype, "route"), _class2.prototype)), _class2)) || _class$3) || _class$3);

  class HubConnectionInfo {
    constructor(id, url) {
      _defineProperty(this, "id", void 0);

      _defineProperty(this, "url", void 0);

      this.id = id;
      this.url = url;
    }

  }
  class HubConnect {
    constructor(url) {
      _defineProperty(this, "url", void 0);

      this.url = url;
    }

  }
  class HubDisconnect {
    constructor(url) {
      _defineProperty(this, "url", void 0);

      this.url = url;
    }

  }
  class HubEvent {
    constructor(connectionInfo) {
      _defineProperty(this, "connectionInfo", void 0);

      if (new.target === HubEvent) {
        throw new TypeError("HubEvent cannot be instantiated.");
      }

      this.connectionInfo = connectionInfo;
    }

  }
  class HubReconnecting extends HubEvent {
    constructor(connectionInfo, error) {
      super(connectionInfo);

      _defineProperty(this, "error", void 0);

      this.error = error;
    }

  }
  class HubReconnected extends HubEvent {
    constructor(connectionInfo, newConnectionId) {
      super(connectionInfo);

      _defineProperty(this, "newConnectionId", void 0);

      this.newConnectionId = newConnectionId;
    }

  }
  class HubClosed extends HubEvent {
    constructor(connectionInfo, error) {
      super(connectionInfo);

      _defineProperty(this, "error", void 0);

      this.error = error;
    }

  }

  core.Handler.implement({
    $hubConnect(url) {
      return this.$send(new HubConnect(url));
    },

    $hubDisconnect(url) {
      return this.$send(new HubDisconnect(url));
    }

  });

  var _dec$4, _class$4, _temp$3;
  var HubOptions = (_dec$4 = core.handlesOptions("hubOptions"), _dec$4(_class$4 = (_temp$3 = class HubOptions extends core.Options {
    constructor(...args) {
      super(...args);

      _defineProperty(this, "baseUrl", void 0);

      _defineProperty(this, "protocol", void 0);

      _defineProperty(this, "transports", void 0);

      _defineProperty(this, "automaticReconnect", void 0);

      _defineProperty(this, "serverTimeoutInMilliseconds", void 0);

      _defineProperty(this, "keepAliveIntervalInMilliseconds", void 0);
    }

  }, _temp$3)) || _class$4);

  var _dec$5, _dec2$3, _dec3$3, _dec4$3, _dec5$2, _dec6$2, _class$5, _class2$1, _temp$4, _temp2$1, _temp3$1, _temp4$1, _temp5$1, _temp6$1, _temp7$1, _temp8$1, _temp9$1, _temp10$1, _temp11$1, _temp12$1;

  var _$1 = core.createKey();

  var HubRouter = (_dec$5 = core.provides(), _dec2$3 = core.singleton(), _dec3$3 = core.routes("hub"), _dec4$3 = core.handles(core.Routed), _dec5$2 = core.handles(HubConnect), _dec6$2 = core.handles(HubDisconnect), _dec$5(_class$5 = _dec2$3(_class$5 = (_class2$1 = (_temp12$1 = (_temp11$1 = (_temp10$1 = (_temp9$1 = (_temp8$1 = (_temp7$1 = (_temp6$1 = (_temp5$1 = (_temp4$1 = (_temp3$1 = (_temp2$1 = (_temp$4 = class HubRouter {
    constructor() {
      _$1(this).connections = new Map();
    }

    async route(routed, hubOptions, httpOptions, {
      rawCallback,
      composer
    }) {
      var hub = routed.route.substring(4),
          url = getHubEndpoint(hub, hubOptions, httpOptions);
      var mapper = composer.$enableFilters().$mapOptions({
        typeIdHandling: core.TypeIdHandling.Auto
      });
      var {
        message
      } = routed,
          content = mapper.$mapFrom({
        payload: message
      }, core.JsonFormat);
      var connection = await getConnection.call(this, url, hubOptions, httpOptions, composer);

      if (rawCallback != null && rawCallback.isMany) {
        await connection.send("Publish", content);
      } else {
        var result = await connection.invoke("Process", content),
            response = mapper.$mapTo(result, core.JsonFormat, core.Try);
        return response == null ? void 0 : response.fold(failure => {
          var {
            payload
          } = failure;

          if (payload instanceof Error) {
            throw payload;
          }

          throw new UnknownPayloadError(payload);
        }, success => success.payload);
      }
    }

    async connect(connect, hubOptions, httpOptions, {
      composer
    }) {
      var url = getHubEndpoint(connect.url, hubOptions, httpOptions);
      var connection = await getConnection.call(this, url, hubOptions, httpOptions, composer, connect);
      return getConnectionInfo(connection, url);
    }

    async disconnect(disconnect, hubOptions, httpOptions) {
      var url = getHubEndpoint(disconnect.url, hubOptions, httpOptions);
      await disconnectHub.call(this, url);
    }

  }, _temp$4), core.options(HubOptions)(_temp$4.prototype, "route", 1), _temp2$1), _temp3$1), core.options(HttpOptions)(_temp3$1.prototype, "route", 2), _temp4$1), _temp5$1), core.options(HubOptions)(_temp5$1.prototype, "connect", 1), _temp6$1), _temp7$1), core.options(HttpOptions)(_temp7$1.prototype, "connect", 2), _temp8$1), _temp9$1), core.options(HubOptions)(_temp9$1.prototype, "disconnect", 1), _temp10$1), _temp11$1), core.options(HttpOptions)(_temp11$1.prototype, "disconnect", 2), _temp12$1), (_applyDecoratedDescriptor(_class2$1.prototype, "route", [_dec3$3, _dec4$3], Object.getOwnPropertyDescriptor(_class2$1.prototype, "route"), _class2$1.prototype), _applyDecoratedDescriptor(_class2$1.prototype, "connect", [_dec5$2], Object.getOwnPropertyDescriptor(_class2$1.prototype, "connect"), _class2$1.prototype), _applyDecoratedDescriptor(_class2$1.prototype, "disconnect", [_dec6$2], Object.getOwnPropertyDescriptor(_class2$1.prototype, "disconnect"), _class2$1.prototype)), _class2$1)) || _class$5) || _class$5);

  function getHubEndpoint(url, hubOptions, httpOptions) {
    var baseUrl = (hubOptions == null ? void 0 : hubOptions.baseUrl) || (httpOptions == null ? void 0 : httpOptions.baseUrl);

    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url; // relative url ???
    }
  }

  function getConnectionInfo(connection, url) {
    return new HubConnectionInfo(connection.connectionId, url);
  }

  async function getConnection(url, hubOptions, httpOptions, composer, connect) {
    var connections = _$1(this).connections;

    var connection = connections.get(url);

    if (!core.$isNothing(connection) && connection.state != signalR.HubConnectionState.Disconnected) {
      if (!core.$isNothing(connect)) {
        throw new Error(`A connection to the Hub @ ${url} already exists.`);
      }

      return connection;
    }

    await disconnectHub.call(this, url);
    var {
      protocol,
      transports,
      automaticReconnect,
      serverTimeoutInMilliseconds,
      keepAliveIntervalInMilliseconds
    } = hubOptions || {};
    var builder = new signalR.HubConnectionBuilder();
    builder = core.$isNothing(transports) ? builder.withUrl(url) : builder.withUrl(url, transports);

    if (!core.$isNothing(protocol)) {
      builder = builder.withHubProtocol(protocol);
    }

    if (!core.$isNothing(automaticReconnect)) {
      if (automaticReconnect === true) {
        builder = builder.withAutomaticReconnect();
      } else if (automaticReconnect !== false) {
        builder = builder.withAutomaticReconnect(automaticReconnect);
      }
    }

    if (!core.$isNothing(httpOptions)) {
      builder.httpConnectionOptions = {
        withCredentials: httpOptions == null ? void 0 : httpOptions.withCredentials
      };
    }

    connection = builder.build();

    if (!core.$isNothing(serverTimeoutInMilliseconds)) {
      connection.serverTimeoutInMilliseconds = serverTimeoutInMilliseconds;
    }

    if (!core.$isNothing(keepAliveIntervalInMilliseconds)) {
      connection.keepAliveIntervalInMilliseconds = keepAliveIntervalInMilliseconds;
    }

    var connectionInfo = getConnectionInfo(connection, url),
        mapper = composer.$mapOptions({
      typeIdHandling: core.TypeIdHandling.Auto
    }),
        notify = composer.$notify();
    connection.onclose(async error => {
      notify.$send(new HubClosed(connectionInfo, error));

      if (core.$isNothing(error)) {
        await disconnectHub.call(this, url);
      } else {
        await connectWithInitialRetry.call(this, connection, url);
      }
    });
    connection.on("Process", message => {
      var {
        payload
      } = mapper.$mapTo(message, core.JsonFormat);
      composer.$with(connectionInfo).$with(connection).$send(payload);
    });
    connection.on("Publish", message => {
      var {
        payload
      } = mapper.$mapTo(message, core.JsonFormat);
      composer.$with(connectionInfo).$with(connection).$publish(payload);
    });
    await connectWithInitialRetry.call(this, connection, url);
    connection.onreconnecting(error => notify.$send(new HubReconnecting(connectionInfo, error)));
    connection.onreconnected(connectionId => notify.$send(new HubReconnected(connectionInfo, connectionId)));
    connections.set(url, connection);
    return connection;
  }

  async function connectWithInitialRetry(connection, url) {
    var start = Date.now();

    while (true) {
      try {
        await connection.start();
        return;
      } catch (error) {
        if (Date.now() - start > 10000) {
          throw new Error(`Unable to connect to the Hub at ${url}: ${error.message}`);
        }

        await Promise.delay(5000);
      }
    }
  }

  async function disconnectHub(url) {
    if (core.$isNothing(url)) throw new Error("The url argument is required.");

    var connections = _$1(this).connections,
        connection = connections.get(url);

    if (!core.$isNothing(connection)) {
      connections.delete(url);

      try {
        await connection.stop();
      } catch {// ignore
      }
    }
  }

  core.HandlerBuilder.implement({
    withSignalR() {
      return this.addTypes(from => from.types(core.JsonMapping, HubRouter)).withValidation();
    }

  });

  var _dec$6, _dec2$4, _class$6;
  var XMLHttpRequestHandler = (_dec$6 = core.provides(), _dec2$4 = core.singleton(), _dec$6(_class$6 = _dec2$4(_class$6 = class XMLHttpRequestHandler extends HttpHandler {
    sendRequest(verb, url, request, response, options, composer) {
      var xhr = new XMLHttpRequest(),
          {
        resource,
        responseType,
        contentType,
        headers
      } = request,
          {
        timeout,
        withCredentials
      } = options || {};
      xhr.timeout = timeout;
      xhr.withCredentials = withCredentials;
      xhr.open(verb, url.href);
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      setResponseType(xhr, responseType);
      var promise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          try {
            var {
              status,
              statusText
            } = xhr,
                _contentType = xhr.getResponseHeader("Content-Type"),
                content = getResponse(xhr, _contentType);

            if (status >= 200 && status < 300) {
              if (!(core.$isNothing(content) || core.$isNothing(_contentType) || xhr.responseType !== "")) {
                response.resource = composer.$mapTo(content, _contentType, responseType);
              } else {
                response.resource = content;
              }

              response.headers = createResponseHeaders(xhr);
              response.resourceUri = xhr.responseURL;
              resolve(response);
            } else {
              var error;

              if (!(core.$isNothing(content) || core.$isNothing(_contentType))) {
                var errorContent = composer.$bestEffort().$mapTo(content, _contentType) || content;

                if (errorContent instanceof Error) {
                  error = errorContent;
                } else {
                  error = new HttpError(status, statusText);
                  error.content = errorContent;
                }
              }

              reject(error || new HttpError(status, statusText));
            }
          } catch (error) {
            reject(error);
          }
        };

        xhr.onerror = () => {
          reject(new Error("A network-level error occurred during an XMLHttpRequest."));
        };

        xhr.ontimeout = () => {
          reject(new core.TimeoutError(request, "A timeout occurred during an XMLHttpRequest."));
        };

        xhr.onabort = () => {
          reject(new core.RejectedError(request, "The XMLHttpRequest has been aborted."));
        };
      });
      var body;

      if (!core.$isNothing(resource)) {
        body = getBody(resource, false);

        if (core.$isNothing(body) && core.$isObject(resource)) {
          var content = composer.$mapFrom(resource, contentType);
          body = getBody(content, true);
        }

        if (core.$isNothing(body)) {
          return Promise.reject(request, new Error("Unsupported http content."));
        }
      }

      if (!core.$isNothing(headers)) {
        Reflect.ownKeys(headers).forEach(header => xhr.setRequestHeader(header, headers[header]));
      }

      var optionHeaders = options == null ? void 0 : options.headers;

      if (!core.$isNothing(optionHeaders)) {
        Reflect.ownKeys(optionHeaders).forEach(header => {
          if (!(headers != null && headers.hasOwnProperty(header))) {
            xhr.setRequestHeader(header, optionHeaders[header]);
          }
        });
      }
      xhr.send(body);
      return promise;
    }

  }) || _class$6) || _class$6);

  function getBody(resource, json) {
    if (core.$isString(resource) || resource instanceof Document || TypeHelper.isFormData(resource) || TypeHelper.isArrayBuffer(resource) || TypeHelper.isBlob(resource)) {
      return resource;
    }

    if (TypeHelper.isURLSearchParams(resource)) {
      return resource.toString();
    }

    if (json && core.$isPlainObject(resource)) {
      return JSON.stringify(resource);
    }
  }

  function setResponseType(xhr, responseType) {
    if (TypeHelper.hasArrayBuffer && responseType === ArrayBuffer) {
      xhr.responseType = "arraybuffer";
    } else if (TypeHelper.hasBlob && responseType === Blob) {
      xhr.responseType = "blob";
    } else if (responseType === Document || responseType === XMLDocument) {
      xhr.responseType = "document";
    }
  }

  function getResponse(xhr, contentType) {
    switch (xhr.responseType) {
      case "arraybuffer":
      case "blob":
        return xhr.response;
    }

    var response = xhr.responseXML;
    if (!core.$isNothing(response)) return response;
    response = xhr.response;

    if (response) {
      return JSON.parse(response);
    }
  }

  function createResponseHeaders(xhr) {
    var headers = xhr.getAllResponseHeaders();
    if (core.$isNothing(headers)) return;
    var headerMap = {},
        lines = headers.trim().split(/[\r\n]+/);
    lines.forEach(line => {
      var parts = line.split(': '),
          header = parts.shift(),
          value = parts.join(': ');
      headerMap[header] = value;
    });
    return headerMap;
  }

  core.HandlerBuilder.implement({
    withXMLHttpRequestClient() {
      return this.addTypes(from => from.types(core.JsonMapping, HttpRouter, XMLHttpRequestHandler, ErrorMapping)).withValidation();
    }

  });

  exports.DeleteRequest = DeleteRequest;
  exports.DeleteResponse = DeleteResponse;
  exports.ErrorData = ErrorData;
  exports.ErrorMapping = ErrorMapping;
  exports.GetRequest = GetRequest;
  exports.GetResponse = GetResponse;
  exports.HeadRequest = HeadRequest;
  exports.HeadResponse = HeadResponse;
  exports.HttpError = HttpError;
  exports.HttpHandler = HttpHandler;
  exports.HttpOptions = HttpOptions;
  exports.HttpRouter = HttpRouter;
  exports.HubClosed = HubClosed;
  exports.HubConnect = HubConnect;
  exports.HubConnectionInfo = HubConnectionInfo;
  exports.HubDisconnect = HubDisconnect;
  exports.HubEvent = HubEvent;
  exports.HubOptions = HubOptions;
  exports.HubReconnected = HubReconnected;
  exports.HubReconnecting = HubReconnecting;
  exports.HubRouter = HubRouter;
  exports.PatchRequest = PatchRequest;
  exports.PatchResponse = PatchResponse;
  exports.PostRequest = PostRequest;
  exports.PostResponse = PostResponse;
  exports.PutRequest = PutRequest;
  exports.PutResponse = PutResponse;
  exports.ResourceRequest = ResourceRequest;
  exports.ResourceResponse = ResourceResponse;
  exports.ResourceWrapper = ResourceWrapper;
  exports.TypeHelper = TypeHelper;
  exports.UnknownPayloadError = UnknownPayloadError;
  exports.XMLHttpRequestHandler = XMLHttpRequestHandler;
  exports.normalizeHttpRequest = normalizeHttpRequest;

  Object.defineProperty(exports, '__esModule', { value: true });

});

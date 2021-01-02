define(['exports', '@miruken/core'], function (exports, _core) { 'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.PlayerUpdated = exports.PlayerCreated = exports.RenderPlayer = exports.CreatePlayer = exports.GetPlayer = exports.PlayerResponse = exports.Player = exports.Person = void 0;
    
    var _dec, _class, _descriptor, _temp, _dec2, _dec3, _class3, _class4, _descriptor2, _temp2, _dec4, _dec5, _class6, _temp3, _dec6, _dec7, _class8, _temp4, _dec8, _class10, _temp5, _dec9, _class12, _temp6, _dec10, _class14, _temp7;

    function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

    function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

    function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'proposal-class-properties is enabled and runs after the decorators transform.'); }

    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    class Person extends _core.Base {
        constructor(...args) {
            super(...args);

            _defineProperty(this, "dob", void 0);
        }

    }

    exports.Person = Person;
    var Player = (_dec = (0, _core.design)(Person), (_class = (_temp = class Player extends _core.Base {
        constructor(...args) {
            super(...args);

            _defineProperty(this, "id", void 0);

            _defineProperty(this, "name", void 0);

            _initializerDefineProperty(this, "person", _descriptor, this);
        }

    }, _temp), (_descriptor = _applyDecoratedDescriptor(_class.prototype, "person", [_dec], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: null
    })), _class));
    exports.Player = Player;
    var PlayerResponse = (_dec2 = (0, _core.typeId)("Miruken.AspNetCore.Tests.PlayerResponse, Miruken.AspNetCore.Tests"), _dec3 = (0, _core.design)(Player), _dec2(_class3 = (_class4 = (_temp2 = class PlayerResponse extends _core.Message {
        constructor(player) {
            super();

            _initializerDefineProperty(this, "player", _descriptor2, this);

            this.player = player;
        }

    }, _temp2), (_descriptor2 = _applyDecoratedDescriptor(_class4.prototype, "player", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: null
    })), _class4)) || _class3);
    exports.PlayerResponse = PlayerResponse;
    var GetPlayer = (_dec4 = (0, _core.response)(PlayerResponse), _dec5 = (0, _core.typeId)("Miruken.AspNetCore.Tests.GetPlayer, Miruken.AspNetCore.Tests"), _dec4(_class6 = _dec5(_class6 = (_temp3 = class GetPlayer extends _core.Request {
        constructor(...args) {
            super(...args);

            _defineProperty(this, "playerId", void 0);
        }

    }, _temp3)) || _class6) || _class6);
    exports.GetPlayer = GetPlayer;
    var CreatePlayer = (_dec6 = (0, _core.response)(PlayerResponse), _dec7 = (0, _core.typeId)("Miruken.AspNetCore.Tests.CreatePlayer, Miruken.AspNetCore.Tests"), _dec6(_class8 = _dec7(_class8 = (_temp4 = class CreatePlayer extends _core.Request {
        constructor(player) {
            super();

            _defineProperty(this, "player", void 0);

            this.player = player;
        }

    }, _temp4)) || _class8) || _class8);
    exports.CreatePlayer = CreatePlayer;
    var RenderPlayer = (_dec8 = (0, _core.typeId)("Miruken.AspNetCore.Tests.RenderPlayer, Miruken.AspNetCore.Tests"), _dec8(_class10 = (_temp5 = class RenderPlayer extends _core.Request {
        constructor(player) {
            super();

            _defineProperty(this, "player", void 0);

            this.player = player;
        }

    }, _temp5)) || _class10);
    exports.RenderPlayer = RenderPlayer;
    var PlayerCreated = (_dec9 = (0, _core.typeId)("Miruken.AspNetCore.Tests.PlayerCreated, Miruken.AspNetCore.Tests"), _dec9(_class12 = (_temp6 = class PlayerCreated extends _core.Message {
        constructor(player) {
            super();

            _defineProperty(this, "player", void 0);

            this.player = player;
        }

    }, _temp6)) || _class12);
    exports.PlayerCreated = PlayerCreated;
    var PlayerUpdated = (_dec10 = (0, _core.typeId)("Miruken.AspNetCore.Tests.PlayerUpdated, Miruken.AspNetCore.Tests"), _dec10(_class14 = (_temp7 = class PlayerUpdated extends _core.Message {
        constructor(player) {
            super();

            _defineProperty(this, "player", void 0);

            this.player = player;
        }

    }, _temp7)) || _class14);
    exports.PlayerUpdated = PlayerUpdated;
});

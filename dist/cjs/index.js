"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extension = exports.defaultParameters = exports.JwtSecurity = exports.LogoutEvent = exports.ExpiredEvent = exports.LoginEvent = void 0;
const core_1 = require("@klient/core");
const jwt_1 = require("./services/jwt");
var login_1 = require("./events/login");
Object.defineProperty(exports, "LoginEvent", { enumerable: true, get: function () { return login_1.default; } });
var expired_1 = require("./events/expired");
Object.defineProperty(exports, "ExpiredEvent", { enumerable: true, get: function () { return expired_1.default; } });
var logout_1 = require("./events/logout");
Object.defineProperty(exports, "LogoutEvent", { enumerable: true, get: function () { return logout_1.default; } });
var jwt_2 = require("./services/jwt");
Object.defineProperty(exports, "JwtSecurity", { enumerable: true, get: function () { return jwt_2.default; } });
exports.defaultParameters = {
    jwt: {
        login: undefined,
        refresh: undefined,
        authenticate: undefined,
        storage: undefined,
        decode_options: undefined
    }
};
exports.extension = {
    name: '@klient/jwt',
    initialize: (klient) => {
        klient.parameters.merge(exports.defaultParameters, {
            jwt: klient.parameters.get('jwt') || {}
        });
        const jwt = new jwt_1.default(klient);
        klient.services.set('jwt', jwt);
        klient
            .extends('login', jwt.login.bind(jwt))
            .extends('logout', jwt.logout.bind(jwt))
            .extends('jwt', jwt);
    }
};
core_1.Extensions.push(exports.extension);

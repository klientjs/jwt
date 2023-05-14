"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unixTimestamp = void 0;
const jwt_decode_1 = require("jwt-decode");
const core_1 = require("@klient/core");
const storage_1 = require("@klient/storage");
const logout_1 = require("../events/logout");
const expired_1 = require("../events/expired");
const login_1 = require("../events/login");
const unixTimestamp = () => Math.floor(Date.now() / 1000);
exports.unixTimestamp = unixTimestamp;
class JwtSecurity {
    constructor(klient) {
        var _a;
        this.klient = klient;
        const storageConfig = this.getSecurityParameter('storage');
        if (storageConfig === null || storageConfig === void 0 ? void 0 : storageConfig.type) {
            this.storage = storage_1.default.create(storageConfig.type, storageConfig.options);
        }
        this.state = (_a = this.storage) === null || _a === void 0 ? void 0 : _a.read();
        klient
            .on(core_1.RequestEvent.NAME, (e) => this.refreshCredentials(e), 102)
            .on(core_1.RequestEvent.NAME, (e) => this.setupRequest(e.request), 100)
            .on(expired_1.default.NAME, this.logout.bind(this), -100);
    }
    login(credentials) {
        const _a = this.getSecurityParameter('login', {}), { configure, map } = _a, requestConfig = __rest(_a, ["configure", "map"]);
        const config = Object.assign({ context: {
                action: JwtSecurity.ACTION_LOGIN,
                authenticate: false
            } }, requestConfig);
        if (configure) {
            configure(credentials, config, this);
        }
        else if (!config.method || config.method === 'GET') {
            config.params = credentials;
        }
        else {
            config.data = credentials;
        }
        return this.klient.request(config).then((response) => __awaiter(this, void 0, void 0, function* () {
            yield this.mapLoginResponseToState(response, config);
            return response;
        }));
    }
    logout() {
        return this.klient.dispatcher.dispatch(new logout_1.default(), false).finally(() => {
            this.setState(undefined);
        });
    }
    refresh(event) {
        const _a = this.getSecurityParameter('refresh', {}), { configure, map } = _a, refreshConfig = __rest(_a, ["configure", "map"]);
        const config = Object.assign({ context: {
                action: JwtSecurity.ACTION_REFRESH_CREDENTIALS,
                authenticate: false
            } }, refreshConfig);
        if (configure) {
            configure(this.refreshToken, config, this);
        }
        else {
            config.method = 'POST';
            config.data = { refresh_token: this.refreshToken };
        }
        return this.klient
            .request(config)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            yield this.mapLoginResponseToState(response, config, true);
            return response;
        }))
            .catch((err) => __awaiter(this, void 0, void 0, function* () {
            if (event) {
                yield this.handleCredentialsExpired(event, err);
            }
            throw err;
        }));
    }
    setupRequest(request) {
        const { config, context } = request;
        if (context.authenticate === false || !this.isAuthenticated) {
            return;
        }
        const authenticate = this.getSecurityParameter('authenticate');
        if (authenticate) {
            authenticate(config, this);
        }
        else {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${this.token}`;
        }
        context.isAuthenticated = true;
    }
    decode(token, options) {
        const paramOptions = this.getSecurityParameter('decode_options', {});
        return (0, jwt_decode_1.default)(token, Object.assign(Object.assign({}, paramOptions), options));
    }
    setState(nextState) {
        var _a;
        this.state = nextState;
        (_a = this.storage) === null || _a === void 0 ? void 0 : _a.write(nextState);
    }
    refreshCredentials(event) {
        const _a = this.getSecurityParameter('refresh', {}), { configure, map } = _a, refreshConfig = __rest(_a, ["configure", "map"]);
        if (event.context.authenticate === false || !this.isAuthenticated || (!refreshConfig.url && !configure)) {
            return;
        }
        return this.isTokenExpired && this.isRefreshTokenExpired
            ? this.handleCredentialsExpired(event, new Error('Unable to refresh credentials'))
            : this.refresh(event);
    }
    handleCredentialsExpired(event, err) {
        return this.klient.dispatcher.dispatch(new expired_1.default(event, err), false).then(() => {
            throw err;
        });
    }
    mapLoginResponseToState(response, request, isRefreshTokenResponse = false) {
        let { map } = this.getSecurityParameter('login', {});
        if (isRefreshTokenResponse) {
            map = this.getSecurityParameter('refresh', {}).map;
        }
        let nextState;
        if (map) {
            nextState = map(response, request, this);
        }
        else {
            const { token, refresh_token } = response.data;
            const tokenDecoded = this.decode(token);
            nextState = {
                token,
                tokenExp: tokenDecoded.exp,
                refreshToken: refresh_token,
                refreshTokenExp: undefined,
                date: (0, exports.unixTimestamp)()
            };
            if (refresh_token) {
                nextState.refreshTokenExp = this.decode(refresh_token).exp;
            }
        }
        this.setState(nextState);
        return this.klient.dispatcher.dispatch(new login_1.default(response, this.state, this.decode(this.token)), false);
    }
    getSecurityParameter(key, def = undefined) {
        const value = this.klient.parameters.get(`jwt.${key}`);
        if (value === undefined) {
            return def;
        }
        return this.klient.parameters.get(`jwt.${key}`);
    }
    get isAuthenticated() {
        return typeof this.token === 'string';
    }
    get isTokenExpired() {
        const { token, tokenExp } = this;
        return !token || (typeof tokenExp === 'number' && tokenExp <= (0, exports.unixTimestamp)());
    }
    get isRefreshTokenExpired() {
        const { refreshToken, refreshTokenExp } = this;
        return !refreshToken || (typeof refreshTokenExp === 'number' && refreshTokenExp <= (0, exports.unixTimestamp)());
    }
    get isCredentialsExpired() {
        if (!this.token) {
            return null;
        }
        return this.isTokenExpired && this.isRefreshTokenExpired;
    }
    get token() {
        var _a;
        return (_a = this.state) === null || _a === void 0 ? void 0 : _a.token;
    }
    get tokenExp() {
        var _a;
        return (_a = this.state) === null || _a === void 0 ? void 0 : _a.tokenExp;
    }
    get refreshToken() {
        var _a;
        return (_a = this.state) === null || _a === void 0 ? void 0 : _a.refreshToken;
    }
    get refreshTokenExp() {
        var _a;
        return (_a = this.state) === null || _a === void 0 ? void 0 : _a.refreshTokenExp;
    }
    get authenticationDate() {
        var _a;
        const time = (_a = this.state) === null || _a === void 0 ? void 0 : _a.date;
        if (time) {
            return new Date(time * 1000);
        }
    }
}
exports.default = JwtSecurity;
JwtSecurity.ACTION_LOGIN = 'jwt:login';
JwtSecurity.ACTION_REFRESH_CREDENTIALS = 'jwt:refresh';

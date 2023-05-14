"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@klient/core");
class LoginEvent extends core_1.Event {
    constructor(response, state, decodedToken) {
        super();
        this.response = response;
        this.state = state;
        this.decodedToken = decodedToken;
    }
}
exports.default = LoginEvent;
LoginEvent.NAME = 'jwt:login';

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@klient/core");
class LogoutEvent extends core_1.Event {
}
exports.default = LogoutEvent;
LogoutEvent.NAME = 'jwt:logout';

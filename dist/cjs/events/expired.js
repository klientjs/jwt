"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@klient/core");
class CredentialsExpiredEvent extends core_1.Event {
    constructor(relatedEvent, error) {
        super();
        this.relatedEvent = relatedEvent;
        this.error = error;
    }
}
exports.default = CredentialsExpiredEvent;
CredentialsExpiredEvent.NAME = 'jwt:expired';

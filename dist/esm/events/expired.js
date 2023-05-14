import { Event } from '@klient/core';
export default class CredentialsExpiredEvent extends Event {
    constructor(relatedEvent, error) {
        super();
        this.relatedEvent = relatedEvent;
        this.error = error;
    }
}
CredentialsExpiredEvent.NAME = 'jwt:expired';

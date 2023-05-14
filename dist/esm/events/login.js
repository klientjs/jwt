import { Event } from '@klient/core';
export default class LoginEvent extends Event {
    constructor(response, state, decodedToken) {
        super();
        this.response = response;
        this.state = state;
        this.decodedToken = decodedToken;
    }
}
LoginEvent.NAME = 'jwt:login';

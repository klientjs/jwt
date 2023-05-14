import { Event } from '@klient/core';
import type { AxiosResponse } from 'axios';
import type { AuthenticationState } from '../services/jwt';
export default class LoginEvent extends Event {
    response: AxiosResponse;
    state: AuthenticationState;
    decodedToken: unknown;
    static NAME: string;
    constructor(response: AxiosResponse, state: AuthenticationState, decodedToken: unknown);
}

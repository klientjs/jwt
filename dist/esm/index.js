import { Extensions } from '@klient/core';
import JwtSecurity from './services/jwt';
export { default as LoginEvent } from './events/login';
export { default as ExpiredEvent } from './events/expired';
export { default as LogoutEvent } from './events/logout';
export { default as JwtSecurity } from './services/jwt';
export const defaultParameters = {
    jwt: {
        login: undefined,
        refresh: undefined,
        authenticate: undefined,
        storage: undefined,
        decode_options: undefined
    }
};
export const extension = {
    name: '@klient/jwt',
    initialize: (klient) => {
        klient.parameters.merge(defaultParameters, {
            jwt: klient.parameters.get('jwt') || {}
        });
        const jwt = new JwtSecurity(klient);
        klient.services.set('jwt', jwt);
        klient
            .extends('login', jwt.login.bind(jwt))
            .extends('logout', jwt.logout.bind(jwt))
            .extends('jwt', jwt);
    }
};
Extensions.push(extension);

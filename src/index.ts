import Klient, { Extensions, Request } from '@klient/core';

import type { JwtDecodeOptions } from 'jwt-decode';
import type { AxiosResponse, AxiosRequestConfig } from 'axios';
import type { KlientRequestConfig, Parameters as KlientParameters } from '@klient/core';
import type { StorageOptions } from '@klient/storage';
import JwtSecurity from './services/jwt';
import type { AuthenticationState } from './services/jwt';

export { default as LoginEvent } from './events/login';
export { default as ExpiredEvent } from './events/expired';
export { default as LogoutEvent } from './events/logout';

export { default as JwtSecurity } from './services/jwt';

export type Authenticate = (config: KlientRequestConfig, jwt: JwtSecurity) => void;

export interface ConfigurableStep<T = unknown> extends AxiosRequestConfig {
  configure?: (credentials: T, config: KlientRequestConfig, jwt: JwtSecurity) => void;
  map?: (response: AxiosResponse, config: KlientRequestConfig, jwt: JwtSecurity) => AuthenticationState;
}

export interface Parameters extends KlientParameters {
  jwt?: {
    login?: ConfigurableStep;
    refresh?: ConfigurableStep<string>;
    authenticate?: Authenticate;
    storage?: {
      type: 'cookie' | 'static' | 'localStorage' | string;
      options?: StorageOptions;
    };
    decode_options?: JwtDecodeOptions;
  };
}

export const defaultParameters: Parameters = {
  jwt: {
    login: undefined,
    refresh: undefined,
    authenticate: undefined,
    storage: undefined,
    decode_options: undefined
  }
};

export interface KlientExtended extends Klient<Parameters> {
  jwt: JwtSecurity;
  login: <T>(data: unknown) => Request<T>;
  logout: () => Promise<void>;
}

export const extension = {
  name: '@klient/jwt',
  initialize: (klient: Klient) => {
    klient.parameters.merge(defaultParameters, {
      jwt: (klient.parameters.get('jwt') as Parameters | undefined) || {}
    });

    const jwt = new JwtSecurity(klient);

    klient.services.set('jwt', jwt);

    // prettier-ignore
    klient
      .extends('login', jwt.login.bind(jwt))
      .extends('logout', jwt.logout.bind(jwt))
      .extends('jwt', jwt);
  }
};

Extensions.push(extension);

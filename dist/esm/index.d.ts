import Klient, { Request } from '@klient/core';
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
export declare type Authenticate = (config: KlientRequestConfig, jwt: JwtSecurity) => void;
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
export declare const defaultParameters: Parameters;
export interface KlientExtended extends Klient<Parameters> {
    jwt: JwtSecurity;
    login: <T>(data: unknown) => Request<T>;
    logout: () => Promise<void>;
}
export declare const extension: {
    name: string;
    initialize: (klient: Klient) => void;
};

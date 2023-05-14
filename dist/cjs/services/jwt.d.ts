import { JwtDecodeOptions } from 'jwt-decode';
import Klient, { RequestEvent, KlientRequestConfig, Request } from '@klient/core';
import { Storage } from '@klient/storage';
import type { AxiosError, AxiosResponse } from 'axios';
import type { JwtPayload } from 'jwt-decode';
export declare type AnyObject = {
    [prop: string]: unknown;
};
export interface AuthenticationState extends AnyObject {
    token: string;
    tokenExp?: number;
    refreshToken?: string;
    refreshTokenExp?: number;
    date?: number;
}
export interface DecodedToken {
    exp: number;
}
export declare const unixTimestamp: () => number;
export default class JwtSecurity {
    protected readonly klient: Klient;
    static readonly ACTION_LOGIN = "jwt:login";
    static readonly ACTION_REFRESH_CREDENTIALS = "jwt:refresh";
    readonly storage: Storage | undefined;
    state: AuthenticationState | undefined;
    constructor(klient: Klient);
    login<T>(credentials: unknown): Promise<AxiosResponse<T, any>>;
    logout(): Promise<void>;
    refresh<T>(event?: RequestEvent): Promise<AxiosResponse<T, any>>;
    setupRequest(request: Request): void;
    decode(token: string, options?: JwtDecodeOptions): JwtPayload;
    setState(nextState?: AuthenticationState): void;
    protected refreshCredentials(event: RequestEvent): Promise<AxiosResponse<unknown, any>> | undefined;
    protected handleCredentialsExpired(event: RequestEvent, err: AxiosError | Error): Promise<never>;
    protected mapLoginResponseToState(response: AxiosResponse, request: KlientRequestConfig, isRefreshTokenResponse?: boolean): Promise<void>;
    protected getSecurityParameter(key: string, def?: unknown): unknown;
    get isAuthenticated(): boolean;
    get isTokenExpired(): boolean;
    get isRefreshTokenExpired(): boolean;
    get isCredentialsExpired(): boolean | null;
    get token(): string | undefined;
    get tokenExp(): number | undefined;
    get refreshToken(): string | undefined;
    get refreshTokenExp(): number | undefined;
    get authenticationDate(): Date | undefined;
}

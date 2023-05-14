import jwtDecode, { JwtDecodeOptions } from 'jwt-decode';
import Klient, { RequestEvent, KlientRequestConfig, Request } from '@klient/core';
import StorageFactory, { Storage, StorageOptions } from '@klient/storage';

import type { AxiosError, AxiosResponse } from 'axios';
import type { JwtPayload } from 'jwt-decode';
import LogoutEvent from '../events/logout';
import CredentialsExpiredEvent from '../events/expired';
import LoginEvent from '../events/login';

import type { Authenticate, ConfigurableStep } from '..';

export type AnyObject = { [prop: string]: unknown };

/**
 * These are all data stored as credentials.
 */
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

/**
 * Get current timestamp is seconds.
 */
export const unixTimestamp = () => Math.floor(Date.now() / 1000);

/**
 * JwtSecurity : Manager of JWT authentication.
 *
 * This class is able to perform some login request and keep received token for appending it to requests.
 * It can also check if token is valid with its expiration. If it's not, and if a valid refresh token is stored,
 * this token can be refreshed before initial request execution. If credentials can't be refreshed,
 * the CredentialsExpiredEvent is emitted and the state is destroyed.
 *
 * > Make login request with any kind of content.
 * > The authentication state can be persisted in browser storage.
 * > When the authentication state is created/updated, the LoginEvent is emitted.
 * > The LogoutEvent is emitted when logout method is called or after CredentialsExpiredEvent.
 * > The logout method destroy the state.
 * > Request authentication can be disabled by using context.authenticate in request config.
 */
export default class JwtSecurity {
  static readonly ACTION_LOGIN = 'jwt:login';

  static readonly ACTION_REFRESH_CREDENTIALS = 'jwt:refresh';

  /**
   * Browser memory storage adapter.
   */
  readonly storage: Storage | undefined;

  /**
   * The authentication state
   */
  state: AuthenticationState | undefined;

  constructor(protected readonly klient: Klient) {
    const storageConfig = this.getSecurityParameter('storage') as
      | { type: string; options?: StorageOptions }
      | undefined;

    if (storageConfig?.type) {
      this.storage = StorageFactory.create<AuthenticationState>(storageConfig.type, storageConfig.options);
    }

    this.state = this.storage?.read() as AuthenticationState | undefined;

    klient
      .on(RequestEvent.NAME, (e: RequestEvent) => this.refreshCredentials(e) as Promise<void> | void, 102)
      .on(RequestEvent.NAME, (e: RequestEvent) => this.setupRequest(e.request), 100)
      .on(CredentialsExpiredEvent.NAME, this.logout.bind(this), -100);
  }

  /**
   * Perform a login request. User will be authenticated automatically.
   */
  login<T>(credentials: unknown) {
    // eslint-disable-next-line unused-imports/no-unused-vars
    const { configure, map, ...requestConfig } = this.getSecurityParameter('login', {}) as ConfigurableStep<unknown>;

    const config: KlientRequestConfig = {
      context: {
        action: JwtSecurity.ACTION_LOGIN,
        authenticate: false
      },
      ...requestConfig
    };

    if (configure) {
      configure(credentials, config, this);
    } else if (!config.method || config.method === 'GET') {
      config.params = credentials;
    } else {
      config.data = credentials;
    }

    return this.klient.request<T>(config).then(async (response) => {
      await this.mapLoginResponseToState(response, config);
      return response;
    });
  }

  /**
   * Logout user by removing authentication state.
   */
  logout() {
    return this.klient.dispatcher.dispatch(new LogoutEvent(), false).finally(() => {
      this.setState(undefined);
    });
  }

  refresh<T>(event?: RequestEvent) {
    // eslint-disable-next-line unused-imports/no-unused-vars
    const { configure, map, ...refreshConfig } = this.getSecurityParameter('refresh', {}) as ConfigurableStep<string>;

    const config: KlientRequestConfig = {
      context: {
        action: JwtSecurity.ACTION_REFRESH_CREDENTIALS,
        authenticate: false
      },
      ...refreshConfig
    };

    if (configure) {
      configure(this.refreshToken as string, config, this);
    } else {
      config.method = 'POST';
      config.data = { refresh_token: this.refreshToken };
    }

    return this.klient
      .request<T>(config)
      .then(async (response) => {
        await this.mapLoginResponseToState(response, config, true);
        return response;
      })
      .catch(async (err) => {
        if (event) {
          await this.handleCredentialsExpired(event, err);
        }

        throw err;
      });
  }

  setupRequest(request: Request) {
    const { config, context } = request;

    if (context.authenticate === false || !this.isAuthenticated) {
      return;
    }

    const authenticate = this.getSecurityParameter('authenticate') as Authenticate | undefined;

    if (authenticate) {
      authenticate(config, this);
    } else {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    context.isAuthenticated = true;
  }

  /**
   * Decode specific token, else the token is authentication storage.
   */
  decode(token: string, options?: JwtDecodeOptions): JwtPayload {
    const paramOptions = this.getSecurityParameter('decode_options', {}) as JwtDecodeOptions;
    return jwtDecode(token, { ...paramOptions, ...options });
  }

  setState(nextState?: AuthenticationState) {
    this.state = nextState;
    this.storage?.write(nextState);
  }

  protected refreshCredentials(event: RequestEvent) {
    // eslint-disable-next-line unused-imports/no-unused-vars
    const { configure, map, ...refreshConfig } = this.getSecurityParameter('refresh', {}) as ConfigurableStep<string>;

    if (event.context.authenticate === false || !this.isAuthenticated || (!refreshConfig.url && !configure)) {
      return;
    }

    return this.isTokenExpired && this.isRefreshTokenExpired
      ? this.handleCredentialsExpired(event, new Error('Unable to refresh credentials'))
      : this.refresh(event);
  }

  protected handleCredentialsExpired(event: RequestEvent, err: AxiosError | Error) {
    return this.klient.dispatcher.dispatch(new CredentialsExpiredEvent(event, err), false).then(() => {
      throw err;
    });
  }

  /**
   * From api authentication response to jwt security authentication state.
   */
  protected mapLoginResponseToState(
    response: AxiosResponse,
    request: KlientRequestConfig,
    isRefreshTokenResponse = false
  ): Promise<void> {
    let { map } = this.getSecurityParameter('login', {}) as ConfigurableStep<unknown>;

    if (isRefreshTokenResponse) {
      map = (this.getSecurityParameter('refresh', {}) as ConfigurableStep<string>).map;
    }

    let nextState: AuthenticationState | undefined;

    if (map) {
      nextState = map(response, request, this);
    } else {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { token, refresh_token } = response.data;
      const tokenDecoded = this.decode(token);

      nextState = {
        token,
        tokenExp: tokenDecoded.exp,
        refreshToken: refresh_token,
        refreshTokenExp: undefined,
        date: unixTimestamp()
      };

      if (refresh_token) {
        nextState.refreshTokenExp = this.decode(refresh_token).exp;
      }
    }

    this.setState(nextState);

    return this.klient.dispatcher.dispatch(
      new LoginEvent(response, this.state as AuthenticationState, this.decode(this.token as string)),
      false
    );
  }

  /**
   * Get defined parameter for jwt extension.
   */
  protected getSecurityParameter(key: string, def: unknown = undefined): unknown {
    const value = this.klient.parameters.get(`jwt.${key}`);

    if (value === undefined) {
      return def;
    }

    return this.klient.parameters.get(`jwt.${key}`);
  }

  /**
   * Authentication means that token is found in authentication state.
   */
  get isAuthenticated(): boolean {
    return typeof this.token === 'string';
  }

  /**
   * Check expiration of the stored token.
   */
  get isTokenExpired(): boolean {
    const { token, tokenExp } = this;

    return !token || (typeof tokenExp === 'number' && tokenExp <= unixTimestamp());
  }

  /**
   * Check expiration of the stored refresh token.
   */
  get isRefreshTokenExpired(): boolean {
    const { refreshToken, refreshTokenExp } = this;

    return !refreshToken || (typeof refreshTokenExp === 'number' && refreshTokenExp <= unixTimestamp());
  }

  /**
   * Credentials are not expired until a non-expired token or a refresh token is found.
   */
  get isCredentialsExpired(): boolean | null {
    if (!this.token) {
      return null;
    }

    return this.isTokenExpired && this.isRefreshTokenExpired;
  }

  /**
   * Get token value.
   */
  get token(): string | undefined {
    return this.state?.token as string | undefined;
  }

  /**
   * Get token expiration.
   */
  get tokenExp(): number | undefined {
    return this.state?.tokenExp;
  }

  /**
   * Get refresh token value.
   */
  get refreshToken(): string | undefined {
    return this.state?.refreshToken as string | undefined;
  }

  /**
   * Get refresh token expiration.
   */
  get refreshTokenExp(): number | undefined {
    return this.state?.refreshTokenExp;
  }

  /**
   * Get last authentication date.
   */
  get authenticationDate(): Date | undefined {
    const time = this.state?.date as number | undefined;

    if (time) {
      return new Date(time * 1000);
    }
  }
}

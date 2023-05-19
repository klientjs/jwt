import Klient, { RequestEvent } from '@klient/core';
import { mockAxiosWithRestApi } from '@klient/testing';

import '..';

import type { JwtSecurity, LoginEvent, KlientExtended, Parameters } from '..';

jest.mock('axios');

mockAxiosWithRestApi();

test('login', async () => {
  const klient = new Klient({
    jwt: {
      login: {
        url: '/auth',
        method: 'POST'
      }
    }
  }) as KlientExtended;

  const { jwt } = klient;

  const spyAuthEvent = jest.fn();

  klient.once('jwt:login', (e: LoginEvent) => {
    spyAuthEvent(e.response);
  });

  expect(jwt.isAuthenticated).toBe(false);

  await klient
    .login({ username: 'test', password: 'test' })
    .then((response) => {
      expect(spyAuthEvent).toBeCalledWith(response);
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });

  expect(jwt.isAuthenticated).toBe(true);

  const spyRequestEvent = jest.fn();

  klient.on('request', (e: RequestEvent) => {
    spyRequestEvent(e.config.headers?.Authorization);
  });

  await klient
    .post('/posts', {
      title: 'test',
      content: 'test'
    })
    .then(() => {
      expect(spyRequestEvent).toBeCalledWith(`Bearer ${jwt.token}`);
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
});

test('refresh', async () => {
  const klient = new Klient({
    jwt: {
      login: {
        url: '/auth',
        method: 'POST'
      },
      refresh: {
        url: '/auth/refresh',
        method: 'POST'
      }
    }
  }) as KlientExtended;

  const { jwt } = klient;

  expect(jwt.isAuthenticated).toBe(false);
  expect(jwt.isTokenExpired).toBe(true);
  expect(jwt.isRefreshTokenExpired).toBe(true);
  expect(jwt.isCredentialsExpired).toBe(null);
  expect(jwt.authenticationDate).toBeUndefined();

  await klient
    .login({
      username: 'test',
      password: 'test',
      exp: '0s',
      refreshExp: '1m'
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });

  expect(jwt.isAuthenticated).toBe(true);
  expect(jwt.isTokenExpired).toBe(true);
  expect(jwt.isRefreshTokenExpired).toBe(false);
  expect(jwt.isCredentialsExpired).toBe(false);
  expect(jwt.authenticationDate).toBeInstanceOf(Date);

  const urls: string[] = [];
  const token = jwt.token;
  const refreshToken = jwt.refreshToken;

  klient.on('request', (e: RequestEvent) => {
    urls.push(String(e.config.url));
  });

  await klient
    .request('/posts')
    .then(() => {
      expect(urls[0]).toBe('/auth/refresh');
      expect(urls[1]).toBe('/posts');
      expect(jwt.token).not.toEqual(token);
      expect(jwt.refreshToken).not.toEqual(refreshToken);
      expect(jwt.isAuthenticated).toBe(true);
      expect(jwt.isTokenExpired).toBe(false);
      expect(jwt.isRefreshTokenExpired).toBe(false);
      expect(jwt.isCredentialsExpired).toBe(false);
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
});

test('expired', async () => {
  const klient = new Klient({
    jwt: {
      login: {
        url: '/auth',
        method: 'POST'
      },
      refresh: {
        url: '/auth/refresh',
        method: 'POST'
      }
    }
  }) as KlientExtended;

  const { jwt } = klient;

  await klient
    .login({
      username: 'test',
      password: 'test',
      exp: '0s',
      refreshExp: '0s'
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });

  expect(jwt.isAuthenticated).toBe(true);
  expect(jwt.isTokenExpired).toBe(true);
  expect(jwt.isRefreshTokenExpired).toBe(true);
  expect(jwt.isCredentialsExpired).toBe(true);

  const spyRequestEvent = jest.fn();

  klient.on('request', () => {
    spyRequestEvent();
  });

  await klient
    .request('/posts')
    .then(() => {
      throw new Error('This request must failed');
    })
    .catch((e) => {
      expect(e.message).toBe('Unable to refresh credentials');
      expect(spyRequestEvent).toBeCalledTimes(0);
    });
});

test('unrefreshable', async () => {
  const klient = new Klient<Parameters>({
    jwt: {
      login: {
        url: '/auth',
        method: 'POST'
      },
      refresh: {
        url: '/auth/refresh',
        method: 'POST',
        configure: (refreshToken, config) => {
          config.data = { refresh_token: refreshToken + 'invalid' };
        }
      }
    }
  }) as KlientExtended;

  const { jwt } = klient;

  await klient
    .login({
      username: 'test',
      password: 'test',
      exp: '0s',
      refreshExp: '1s'
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });

  expect(jwt.isAuthenticated).toBe(true);
  expect(jwt.isTokenExpired).toBe(true);
  expect(jwt.isRefreshTokenExpired).toBe(false);
  expect(jwt.isCredentialsExpired).toBe(false);

  const spyJwtExpiredEvent = jest.fn();

  klient.on('jwt:expired', spyJwtExpiredEvent);

  await klient
    .request('/posts')
    .then(() => {
      throw new Error('This request must failed');
    })
    .catch((e) => {
      expect(e.response.status).toBe(400);
      expect(spyJwtExpiredEvent).toBeCalledTimes(1);
    });
});

test('refresh:manual', async () => {
  const klient = new Klient<Parameters>({
    jwt: {
      login: {
        url: '/auth',
        method: 'POST'
      },
      refresh: {
        url: '/auth/refresh',
        method: 'POST',
        configure: (refreshToken, config) => {
          config.data = { refresh_token: refreshToken + 'invalid' };
        }
      }
    }
  }) as KlientExtended;

  const { jwt } = klient;

  await klient
    .login({
      username: 'test',
      password: 'test',
      exp: '0s',
      refreshExp: '1s'
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });

  expect(jwt.isAuthenticated).toBe(true);
  expect(jwt.isTokenExpired).toBe(true);
  expect(jwt.isRefreshTokenExpired).toBe(false);
  expect(jwt.isCredentialsExpired).toBe(false);

  const spyJwtExpiredEvent = jest.fn();

  klient.on('jwt:expired', spyJwtExpiredEvent);

  await klient.jwt
    .refresh()
    .then(() => {
      throw new Error('This request must failed');
    })
    .catch((e) => {
      expect(e.response.status).toBe(400);
      expect(spyJwtExpiredEvent).toBeCalledTimes(0);
    });
});

test('logout', async () => {
  const klient = new Klient({
    jwt: {
      login: {
        url: '/auth',
        method: 'POST'
      }
    }
  }) as KlientExtended;

  const jwt = klient.services.get('jwt') as JwtSecurity;

  expect(jwt.isAuthenticated).toBe(false);

  await klient.login({ username: 'test', password: 'test' }).catch((e) => {
    console.log(e);
    throw e;
  });

  expect(jwt.isAuthenticated).toBe(true);

  await klient.logout();

  expect(jwt.isAuthenticated).toBe(false);
});

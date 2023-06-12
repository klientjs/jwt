/**
 * @jest-environment jsdom
 */

import Klient, { RequestEvent } from '@klient/core';
import { mockAxiosWithRestApi } from '@klient/testing';

import '..';

import type { KlientExtended, Parameters } from '..';
import type { AuthenticationState } from '../services/jwt';

jest.mock('axios');

mockAxiosWithRestApi();

test('empty', async () => {
  const klient = new Klient() as KlientExtended;
  const spyRequestEvent = jest.fn();

  klient.on('request', (e: RequestEvent) => {
    spyRequestEvent(e.config.url, e.config.method);
  });

  await klient
    .login({ username: 'test', password: 'test' })
    .then(() => {
      throw new Error('This request must failed');
    })
    .catch(() => {
      expect(spyRequestEvent).toBeCalledWith(undefined, undefined);
    });
});

test('storage', async () => {
  let klient = new Klient({
    jwt: {
      login: {
        url: '/auth',
        method: 'POST'
      },
      storage: {
        type: 'static'
      }
    }
  }) as KlientExtended;

  expect(klient.jwt.token).toBeUndefined();

  await klient.login({ username: 'test', password: 'test' }).catch((e) => {
    console.log(e);
    throw e;
  });

  expect(klient.jwt.token).toBeDefined();
});

test('auth:configure', async () => {
  const klient = new Klient<Parameters>({
    jwt: {
      login: {
        configure: (credentials, config) => {
          config.params = {
            customUsername: (credentials as [string, string])[0],
            customPassword: (credentials as [string, string])[1]
          };
        }
      }
    }
  }) as KlientExtended;

  const spyRequestEvent = jest.fn();

  klient.on('request', (e: RequestEvent) => {
    spyRequestEvent(e.config.params.customUsername, e.config.params.customPassword);
  });

  await klient
    .login(['test', 'test'])
    .then(() => {
      throw new Error('This request must failed');
    })
    .catch(() => {
      expect(spyRequestEvent).toBeCalledWith('test', 'test');
    });
});

test('auth:map', async () => {
  let customAuthState: AuthenticationState = { token: '' };
  const spyMapFn = jest.fn();

  const klient = new Klient<Parameters>({
    jwt: {
      login: {
        url: '/auth',
        method: 'POST',
        map: ({ data }, config, jwt) => {
          spyMapFn(config.context?.action);

          customAuthState = {
            token: data.token,
            refreshToken: data.refresh_token,
            tokenExp: jwt.decode(data.token).exp,
            refreshTokenExp: jwt.decode(data.refresh_token).exp
          };

          return customAuthState;
        }
      }
    }
  }) as KlientExtended;

  await klient
    .login({ username: 'test', password: 'test' })
    .then(() => {
      expect(klient.jwt.state).toBe(customAuthState);
      expect(spyMapFn).toBeCalledWith('jwt:login');
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
});

test('refresh:configure', async () => {
  const klient = new Klient<Parameters>({
    jwt: {
      login: {
        url: '/auth',
        method: 'POST'
      },
      refresh: {
        configure: (refreshToken, config) => {
          config.headers = config.headers || {};
          config.headers.Test = true;
          (config.method = 'POST'),
            (config.url = '/auth/refresh'),
            (config.data = {
              refresh_token: refreshToken
            });
        }
      }
    }
  }) as KlientExtended;

  await klient.login({ username: 'test', password: 'test', exp: '0s', refreshExp: '1m' }).catch((e) => {
    console.log(e);
    throw e;
  });

  const refreshToken = klient.jwt.refreshToken;
  const spyRequestEvent = jest.fn();

  klient.on('request', (e: RequestEvent) => {
    if (e.context.action === 'jwt:refresh') {
      spyRequestEvent(e.config.data.refresh_token, e.config.headers?.Test);
    }
  });

  await klient
    .get('/posts')
    .then(() => {
      expect(spyRequestEvent).toBeCalledWith(refreshToken, true);
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
});

test('refresh:map', async () => {
  let customAuthState: AuthenticationState = { token: '' };
  const spyMapFn = jest.fn();

  const klient = new Klient<Parameters>({
    jwt: {
      login: {
        url: '/auth',
        method: 'POST'
      },
      refresh: {
        url: '/auth/refresh',
        method: 'POST',
        map: ({ data }, config, jwt) => {
          spyMapFn(config.context?.action);

          customAuthState = {
            token: data.token,
            refreshToken: data.refresh_token,
            tokenExp: jwt.decode(data.token).exp,
            refreshTokenExp: jwt.decode(data.refresh_token).exp
          };

          return customAuthState;
        }
      }
    }
  }) as KlientExtended;

  await klient.login({ username: 'test', password: 'test', exp: '0s', refreshExp: '1m' }).catch((e) => {
    console.log(e);
    throw e;
  });

  await klient
    .get('/posts')
    .then(() => {
      expect(spyMapFn).toBeCalledWith('jwt:refresh');
      expect(klient.jwt.state).toBe(customAuthState);
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
});

test('authenticate', async () => {
  const klient = new Klient<Parameters>({
    jwt: {
      login: {
        url: '/auth',
        method: 'POST'
      },
      authenticate: (config, jwt) => {
        config.headers = config.headers || {};
        config.headers.Authorization = 'Bearer ' + jwt.token;
        config.headers.Test = 'test';
      }
    }
  }) as KlientExtended;

  await klient.login({ username: 'test', password: 'test' }).catch((e) => {
    console.log(e);
    throw e;
  });

  const spyRequestEvent = jest.fn();

  klient.on('request', (e: RequestEvent) => {
    spyRequestEvent(e.config.headers?.Test);
  });

  await klient
    .get('/posts')
    .then(() => {
      expect(spyRequestEvent).toBeCalledWith('test');
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
});

test('watch:storage', async () => {
  const klient = new Klient() as KlientExtended;

  expect((klient.jwt as any).storage).toBe(undefined);

  klient.parameters.set('jwt', {
    storage: {
      type: 'localStorage',
      options: {
        name: 'test'
      }
    }
  });

  expect((klient.jwt as any).storage.constructor.name).toBe('LocalStorage');

  klient.parameters.set('jwt.storage.type', 'static');

  expect((klient.jwt as any).storage.constructor.name).toBe('StaticStorage');

  klient.parameters.set('jwt.storage', {
    type: 'cookie',
    options: {
      name: 'test'
    }
  });

  expect((klient.jwt as any).storage.constructor.name).toBe('CookieStorage');
});

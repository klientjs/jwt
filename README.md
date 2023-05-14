# Klient JWT

![badge-coverage](.github/badges/coverage.svg)

- [Introduction](#introduction)
- [Setup](#setup)
- [Usage](#usage)
- [Parameters](#parameters)
- [Requests authentication](#requests-authentication)
  * [Listener workflow](#listener-workflow)
  * [Disable for a request](#disable-for-a-request)
- [JWT Service](#jwt-service)
  * [Methods](#methods)
    + [login](#login)
    + [logout](#logout)
- [Events](#events)
  * [AuthenticateEvent](#authenticateevent)
  * [CredentialsExpiredEvent](#credentialsexpiredevent)
  * [LogoutEvent](#logoutevent)

&nbsp;

## Introduction

This [Klient](https://github.com/klientjs/core) extension allows you to fetch JWT for current user with its credentials, store it, and authenticate requests with fetched token. The refresh token process is also supported. Every parts of workflow can be adapted directly from parameters.

## Setup

Install package with your favorite package manager :

```bash
# With NPM
$ npm install @klient/jwt

# With YARN
$ yarn add @klient/jwt
```

Then import the extension in your code :

```js
import Klient from '@klient/core';

//
// Register extension
//
import '@klient/jwt';


//
// Build Klient instance
//
const klient = new Klient('...');


//
// See loaded extension
//
console.log(klient.extensions); // Print ["@klient/jwt"]
```

## Usage

```js
import Klient from '@klient/core';

//
// Register extension
//
import '@klient/jwt';


//
// Create klient instance with registered extension
//
const klient = new Klient({
  jwt: {
    auth: {
      url: '/auth',
      method: 'POST'
    }
  }
});


//
// Get a fresh token
//
klient
  .login({ username: '...', password: '...' })
  .then(data => {
    console.log(data); // API response content
  })
;


//
// Check user authentication
//
console.log(klient.jwt.isAuthenticated) // Print true


//
// Listen for requests
//
klient.on('request', e => {
  console.log(e.config.headers.Authorization); // Print "Bearer <received token>"
});


//
// Make a request to private url
//
klient.request('/private').then(...)
```

## Parameters

The JWT parameters allow you to configure whole jwt process.

```js
const klient = new Klient({
  jwt: {
    login: {
      // Url to use when call login method
      url: '/auth',

      // Method to use when call login method
      method: 'POST',

      // Rest of request static configuration
      // All axios options are available
      headers: {
        'Content-Type': 'application/json'
      },

      // Configure request made on login action
      configure: (credentials, config, jwt) => {
        config.data = {
          username: credentials[0],
          password: credentials[0],
        }
      },

      // Map login response to authentication state
      map: (response, config, jwt) => {
        const { token, refresh_token } = response.data;

        return {
          token,
          refreshToken: refresh_token,
          tokenExp: jwt.decode(token).exp,
          refreshTokenExp: jwt.decode(refresh_token).exp,
        }
      }
    },

    refresh: {
      // Url to use when refresh action is invoked
      url: '/auth/refresh',

      // Method to use to refresh credentials
      method: 'POST',

      // Rest of request static configuration
      // All axios options are available
      headers: {
        'Content-Type': 'application/json'
      },

      // Configure request made on refresh credentials action
      configure: (refreshToken, config, jwt) => {
        config.data.customRefreshTokenKey = refreshToken;
      },

      // Map refresh credentials response to authentication state
      map: (response, config, jwt) => {
        const { token, refresh_token } = response.data;

        return {
          token,
          refreshToken: refresh_token,
          tokenExp: jwt.decode(token).exp,
          refreshTokenExp: jwt.decode(refresh_token).exp,
        }
      }
    },

    // Authenticate request manually with current authentication state
    authenticate: (config, jwt) => {
      config.headers = config.headers || {};
      config.headers.Authorization = 'Bearer ' + jwt.token
    },

    // Persist authentication state in a storage
    // See @klient/storage
    storage: {
      type: 'localStorage',
      options: {
        // ...
      }
    },

    // Set jwt decode static options
    decode_options: {
      // jwt decode options
    }
  }
})
```


## Requests authentication

### Listener workflow

JWT service listen RequestEvent and is able to add token in request config if an authenticated user is detected. The exact behavious is described below :

- If user isn't authenticated, jwt service ignores requests.

- If user has a valid token, jwt service add it in request config.

- If user has an expired token, but have a valid refresh token, jwt service will try to refresh token before append it in request config. (This will suspend execution of request, and will reject it if credentials are not refreshable)

- If user has an expired token, and no valid refresh token, the jwt service will emit CredentialsExpiredEvent and reject the request after .

### Disable requests authentication

Authentication can be disabled by using request context :

```js
import Klient from '@klient/core';

//
// Register extension
//
import '@klient/jwt';


//
// Build Klient instance
//
const klient = new Klient('...');

klient.request({
  url: '/public',
  context: {
    authenticate: false // This means "Do not authenticate request"
  }
});
```

## JWT Service

The JWT service is the orchestrator of JWT worklow by analyzing at every request if a stored token is valid, else if it can be refreshed, etc..

### Methods

#### login
---

Get JWT with user credentials.

```typescript
login(credentials: any): Promise<AxiosResponse.data>
```

*Example*

```js
import Klient from '@klient/core';

//
// Register extension
//
import '@klient/jwt';


//
// Build Klient instance
//
const klient = new Klient({
  jwt: {
    login: {
      url '/auth',
      method: 'POST'
    }
  }
});


//
// Construct credentials as they are expected in API
//
const credentials = { username: '...', password: '...' };


//
// Login
//
klient.login(credentials).then(data => {
  // At this point jwt service has created a state to store authentication data
  // and user is considerated as logged.
});
```

&nbsp;

#### logout
---

Remove stored user authentication state.

```typescript
logout(): Promise<void>
```

*Example*

```js
import Klient from '@klient/core';

//
// Register extension
//
import '@klient/jwt';


//
// Build Klient instance
//
const klient = new Klient({
  jwt: {
    login: {
      url '/auth',
      method: 'POST'
    }
  }
});


//
// Construct credentials as they are expected in API
//
const credentials = { username: '...', password: '...' };


//
// Login
//
await klient.login(credentials).then(data => {
  // At this point jwt service has created a state to store authentication data
  // and user is considerated as logged.
});

klient.jwt.isAuthenticated; // True
klient.jwt.state; // { token: 'value', ... }


//
// Logout
//
klient.logout().then(() => {
  klient.jwt.isAuthenticated; // False
  klient.jwt.state; // undefined
});
```

&nbsp;


## Events

### LoginEvent

> alias = `jwt:login`

The LoginEvent is emitted when new token is stored in authentication state (after login method OR during a request when token has been refreshed).

**Properties**

| Name         | Type                  | Description                                   |
|--------------|-----------------------|-----------------------------------------------|
| response     | `AxiosResponse`       | The login/refresh response received from API. |
| token        | `string`              | The response token.                           |
| decodedToken | `object`              | The decoded token.                            |
| refreshToken | `string \| undefined` | The response refresh token.                   |

### CredentialsExpiredEvent

> alias = `jwt:expired`

The CredentialsExpiredEvent is emitted on request execution if user credentials is expired and cannot be refreshed.

**Properties**

| Name         | Type                  | Description                               |
|--------------|-----------------------|-------------------------------------------|
| relatedEvent | `RequestEvent`        | The related event containing the request. |
| error        | `AxiosError \| Error` | The related error.                        |

### LogoutEvent

> alias = `jwt:logout`

The LogoutEvent is emitted before authentication state deletion when calling logout method.

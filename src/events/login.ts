import { Event } from '@klient/core';

import type { AxiosResponse } from 'axios';
import type { AuthenticationState } from '../services/jwt';

export default class LoginEvent extends Event {
  static NAME = 'jwt:login';

  constructor(public response: AxiosResponse, public state: AuthenticationState, public decodedToken: unknown) {
    super();
  }
}

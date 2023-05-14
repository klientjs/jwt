import { Event, RequestEvent } from '@klient/core';

import type { AxiosError } from 'axios';

export default class CredentialsExpiredEvent extends Event {
  static NAME = 'jwt:expired';

  constructor(public relatedEvent: RequestEvent, public error: Error | AxiosError) {
    super();
  }
}

import { Event, RequestEvent } from '@klient/core';
import type { AxiosError } from 'axios';
export default class CredentialsExpiredEvent extends Event {
    relatedEvent: RequestEvent;
    error: Error | AxiosError;
    static NAME: string;
    constructor(relatedEvent: RequestEvent, error: Error | AxiosError);
}

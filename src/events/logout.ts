import { Event } from '@klient/core';

export default class LogoutEvent extends Event {
  static NAME = 'jwt:logout';
}

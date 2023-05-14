import SourceLoginEvent from '../src/events/login';
import SourceLogoutEvent from '../src/events/logout';
import SourceExpiredEvent from '../src/events/expired';
import SourceJwtSecurity from '../src/services/jwt';

import { LoginEvent, LogoutEvent, ExpiredEvent, JwtSecurity } from '../src';

test('export', () => {
  expect(LoginEvent).toBe(SourceLoginEvent);
  expect(LogoutEvent).toBe(SourceLogoutEvent);
  expect(ExpiredEvent).toBe(SourceExpiredEvent);
  expect(JwtSecurity).toBe(SourceJwtSecurity);
});

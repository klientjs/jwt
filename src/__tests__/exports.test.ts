import SourceLoginEvent from '../events/login';
import SourceLogoutEvent from '../events/logout';
import SourceExpiredEvent from '../events/expired';
import SourceJwtSecurity from '../services/jwt';

import { LoginEvent, LogoutEvent, ExpiredEvent, JwtSecurity } from '..';

test('export', () => {
  expect(LoginEvent).toBe(SourceLoginEvent);
  expect(LogoutEvent).toBe(SourceLogoutEvent);
  expect(ExpiredEvent).toBe(SourceExpiredEvent);
  expect(JwtSecurity).toBe(SourceJwtSecurity);
});

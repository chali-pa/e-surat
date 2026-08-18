import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveGoogleAuthMode } from './google';

test('service account takes precedence over OAuth when both are configured', () => {
  assert.equal(
    resolveGoogleAuthMode({
      serviceAccountConfigured: true,
      oauthConfigured: true,
      preferOAuth: true,
    }),
    'service-account'
  );
});

test('OAuth is used only when there is no service account configured', () => {
  assert.equal(
    resolveGoogleAuthMode({
      serviceAccountConfigured: false,
      oauthConfigured: true,
      preferOAuth: true,
    }),
    'oauth'
  );
});

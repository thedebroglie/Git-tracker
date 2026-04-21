function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function looksLikePlaceholder(value) {
  if (isBlank(value)) return false;

  const normalized = String(value).toLowerCase();
  const markers = [
    'replace_with',
    'your_',
    'example',
    'placeholder',
    'changeme',
    'ghp_your',
    'iv1.xxxxx',
    'base64_encoded',
  ];

  return markers.some((marker) => normalized.includes(marker));
}

function maskSecret(value, visibleChars = 4) {
  if (isBlank(value)) return '<missing>';
  const str = String(value);
  if (str.length <= visibleChars) return '*'.repeat(str.length);
  return `${'*'.repeat(Math.max(0, str.length - visibleChars))}${str.slice(-visibleChars)}`;
}

function sanitizeConnection(value) {
  if (isBlank(value)) return '<missing>';
  const str = String(value);

  try {
    const parsed = new URL(str);
    const protocol = parsed.protocol.replace(':', '');
    const host = parsed.host || '<host>';
    const path = parsed.pathname || '';
    return `${protocol}://${host}${path}`;
  } catch (error) {
    return '<provided>';
  }
}

function maskClientId(value) {
  if (isBlank(value)) return '<missing>';
  const str = String(value);
  if (str.length <= 8) return `${str.slice(0, 2)}***`;
  return `${str.slice(0, 4)}***${str.slice(-4)}`;
}

function parseDurationToSeconds(input) {
  if (isBlank(input)) return null;

  const value = String(input).trim().toLowerCase();
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  if (unit === 's') return amount;
  if (unit === 'm') return amount * 60;
  if (unit === 'h') return amount * 60 * 60;
  if (unit === 'd') return amount * 24 * 60 * 60;

  return null;
}

function validateEnvironment() {
  const required = [
    'PORT',
    'NODE_ENV',
    'MONGO_URI',
    'JWT_SECRET',
    'FRONTEND_URL',
    'SYNC_COOLDOWN_MINUTES',
    'GITHUB_APP_INSTALL_URL',
    'GITHUB_APP_WEBHOOK_SECRET',
    'GITHUB_APP_CALLBACK_URL',
  ];

  const missing = required.filter((key) => isBlank(process.env[key]));

  const redisConfigured =
    !isBlank(process.env.REDIS_URL) ||
    (!isBlank(process.env.REDIS_HOST) && !isBlank(process.env.REDIS_PORT));

  if (!redisConfigured) {
    missing.push('REDIS_URL or REDIS_HOST+REDIS_PORT');
  }

  const criticalForProduction = [
    'JWT_SECRET',
    'MONGO_URI',
    'GITHUB_APP_WEBHOOK_SECRET',
    'GITHUB_APP_INSTALL_URL',
    'GITHUB_APP_CALLBACK_URL',
  ];

  const placeholders = criticalForProduction
    .filter((key) => !isBlank(process.env[key]))
    .filter((key) => looksLikePlaceholder(process.env[key]));

  const weakJwtSecret =
    !isBlank(process.env.JWT_SECRET) && String(process.env.JWT_SECRET).length < 16;
  const jwtExpiryRaw = process.env.JWT_EXPIRES_IN || '7d';
  const jwtExpirySeconds = parseDurationToSeconds(jwtExpiryRaw);

  const jwtExpiryTooLong =
    Number.isFinite(jwtExpirySeconds) && jwtExpirySeconds > 30 * 24 * 60 * 60;
  const jwtExpiryTooShort =
    Number.isFinite(jwtExpirySeconds) && jwtExpirySeconds < 15 * 60;

  const adminKeyMissingInProduction =
    (process.env.NODE_ENV || '').toLowerCase() === 'production' &&
    isBlank(process.env.ADMIN_API_KEY);

  const githubAuthClientIdMissing =
    isBlank(process.env.GITHUB_CLIENT_ID) && isBlank(process.env.GITHUB_APP_CLIENT_ID);
  const githubAuthClientSecretMissing =
    isBlank(process.env.GITHUB_CLIENT_SECRET) &&
    isBlank(process.env.GITHUB_APP_CLIENT_SECRET);
  const googleAuthClientIdMissing = isBlank(process.env.GOOGLE_CLIENT_ID);
  const googleAuthClientSecretMissing = isBlank(process.env.GOOGLE_CLIENT_SECRET);
  const googleAuthCallbackMissing = isBlank(process.env.GOOGLE_CALLBACK_URL);

  const errors = [];
  const warnings = [];

  if (missing.length > 0) {
    errors.push(`Missing required environment values: ${missing.join(', ')}`);
  }

  if (weakJwtSecret) {
    errors.push('JWT_SECRET must be at least 16 characters long.');
  }

  if (!Number.isFinite(jwtExpirySeconds)) {
    errors.push('JWT_EXPIRES_IN must be in <number><unit> format using s/m/h/d, e.g., 12h or 7d.');
  }

  if (jwtExpiryTooLong) {
    errors.push('JWT_EXPIRES_IN exceeds policy maximum of 30d.');
  }

  if (jwtExpiryTooShort) {
    warnings.push('JWT_EXPIRES_IN is very short (<15m); this may degrade user experience.');
  }

  if (adminKeyMissingInProduction) {
    errors.push('ADMIN_API_KEY is required in production for protected admin routes.');
  }

  if (githubAuthClientIdMissing || githubAuthClientSecretMissing) {
    warnings.push(
      'GitHub auth connect flow may fail: set GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET or GITHUB_APP_CLIENT_ID/GITHUB_APP_CLIENT_SECRET.'
    );
  }

  if (googleAuthClientIdMissing || googleAuthClientSecretMissing || googleAuthCallbackMissing) {
    warnings.push(
      'Google sign-in may fail: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL.'
    );
  }

  if (placeholders.length > 0) {
    const message = `Placeholder values detected for: ${placeholders.join(', ')}`;
    if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function getSanitizedStartupConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    mongoUri: sanitizeConnection(process.env.MONGO_URI),
    frontendUrl: process.env.FRONTEND_URL || '<missing>',
    syncCooldownMinutes: process.env.SYNC_COOLDOWN_MINUTES || '<missing>',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    redis: {
      mode: !isBlank(process.env.REDIS_URL) ? 'url' : 'host-port',
      redisUrl: sanitizeConnection(process.env.REDIS_URL),
      redisHost: process.env.REDIS_HOST || '<missing>',
      redisPort: process.env.REDIS_PORT || '<missing>',
    },
    githubApp: {
      appId: process.env.GITHUB_APP_ID || '<missing>',
      installUrlConfigured: !isBlank(process.env.GITHUB_APP_INSTALL_URL),
      callbackUrl: process.env.GITHUB_APP_CALLBACK_URL || '<missing>',
      webhookSecretMasked: maskSecret(process.env.GITHUB_APP_WEBHOOK_SECRET),
      deliveryTTL: process.env.GITHUB_WEBHOOK_DELIVERY_TTL_SECONDS || '86400',
    },
    googleAuth: {
      clientIdMasked: maskClientId(process.env.GOOGLE_CLIENT_ID),
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || '<missing>',
    },
    jwtSecretMasked: maskSecret(process.env.JWT_SECRET),
  };
}

export { validateEnvironment, getSanitizedStartupConfig };

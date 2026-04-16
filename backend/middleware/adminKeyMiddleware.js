function requireAdminKey(req, res, next) {
  const configuredAdminKey = process.env.ADMIN_API_KEY;
  const providedKey = req.get('x-admin-key');

  if (!configuredAdminKey) {
    return res.status(503).json({
      error: 'ADMIN_API_KEY is not configured',
      code: 'ADMIN_NOT_CONFIGURED',
    });
  }

  if (!providedKey || providedKey !== configuredAdminKey) {
    return res.status(403).json({
      error: 'Admin access denied',
      code: 'ADMIN_FORBIDDEN',
    });
  }

  return next();
}

export default requireAdminKey;

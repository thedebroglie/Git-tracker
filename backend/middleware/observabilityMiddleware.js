import crypto from 'crypto';

function getOrCreateRequestId(req) {
  const incoming = req.get('x-request-id');
  return incoming && incoming.trim() ? incoming.trim() : crypto.randomUUID();
}

function requestContextMiddleware(req, res, next) {
  const requestId = getOrCreateRequestId(req);
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

function requestLoggingMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    const entry = {
      level: 'info',
      type: 'http_request',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      userAgent: req.get('user-agent') || 'unknown',
      ip: req.ip,
    };

    console.log(JSON.stringify(entry));
  });

  next();
}

export { requestContextMiddleware, requestLoggingMiddleware };

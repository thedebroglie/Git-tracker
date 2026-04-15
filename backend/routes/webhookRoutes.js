import { Router } from 'express';
import crypto from 'crypto';
import { setIfNotExistsWithTTL } from '../utils/ephemeralStore.js';

const router = Router();

function isValidSignature(secret, rawBody, receivedSignature) {
  if (!secret || !rawBody || !receivedSignature) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;

  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(receivedSignature, 'utf8');

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

router.post('/github', async (req, res) => {
  try {
    const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
    const signature = req.get('x-hub-signature-256');
    const event = req.get('x-github-event');
    const deliveryId = req.get('x-github-delivery');
    const rawBody = req.rawBody;

    if (!secret) {
      return res.status(500).json({
        error: 'Webhook secret not configured',
      });
    }

    if (!signature || !event || !deliveryId) {
      return res.status(400).json({
        error: 'Missing required GitHub webhook headers',
      });
    }

    if (!isValidSignature(secret, rawBody, signature)) {
      return res.status(401).json({
        error: 'Invalid webhook signature',
      });
    }

    const ttlSeconds = parseInt(process.env.GITHUB_WEBHOOK_DELIVERY_TTL_SECONDS, 10) || 86400;
    const idempotencyKey = `github:webhook:delivery:${deliveryId}`;
    const inserted = await setIfNotExistsWithTTL(idempotencyKey, '1', ttlSeconds);

    if (!inserted) {
      return res.status(202).json({
        status: 'duplicate_ignored',
        deliveryId,
      });
    }

    const payload = req.body || {};

    if (event === 'ping') {
      return res.status(200).json({
        status: 'ok',
        event,
        deliveryId,
      });
    }

    if (event === 'installation') {
      const installationId = payload.installation?.id;
      const action = payload.action;

      console.log(
        `[Webhook] installation event: action=${action}, installation_id=${installationId}`
      );
    }

    if (event === 'installation_repositories') {
      const installationId = payload.installation?.id;
      const action = payload.action;

      console.log(
        `[Webhook] installation_repositories event: action=${action}, installation_id=${installationId}`
      );
    }

    return res.status(202).json({
      status: 'accepted',
      event,
      deliveryId,
    });
  } catch (error) {
    console.error('GitHub webhook handler error:', error.message);
    return res.status(500).json({
      error: 'Failed to process webhook',
    });
  }
});

export default router;

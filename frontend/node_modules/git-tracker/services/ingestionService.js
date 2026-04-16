import NormalizedContributionEvent from '../models/NormalizedContributionEvent.js';
import WebhookIngestionEnvelope from '../models/WebhookIngestionEnvelope.js';
import IngestionDeadLetter from '../models/IngestionDeadLetter.js';
import { normalizeWebhookEnvelope } from './normalizationService.js';

function getEnvelopeExpiryDate() {
  const days = parseInt(process.env.WEBHOOK_ENVELOPE_RETENTION_DAYS, 10) || 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getDeadLetterExpiryDate() {
  const days = parseInt(process.env.INGESTION_DEAD_LETTER_RETENTION_DAYS, 10) || 90;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getMaxRetries() {
  return parseInt(process.env.INGESTION_MAX_RETRIES, 10) || 3;
}

async function ensureWebhookEnvelope({ deliveryId, eventType, payload }) {
  const installationId = payload?.installation?.id
    ? payload.installation.id.toString()
    : null;
  const action = payload?.action || 'unknown';

  const envelope = await WebhookIngestionEnvelope.findOneAndUpdate(
    { deliveryId },
    {
      $setOnInsert: {
        deliveryId,
        receivedAt: new Date(),
        normalizedStatus: 'pending',
        retryCount: 0,
      },
      $set: {
        eventType,
        action,
        installationId,
        payload,
        expiresAt: getEnvelopeExpiryDate(),
      },
    },
    { upsert: true, new: true }
  );

  return envelope;
}

async function moveToDeadLetter(envelope, errorMessage) {
  await IngestionDeadLetter.create({
    deliveryId: envelope.deliveryId,
    eventType: envelope.eventType,
    installationId: envelope.installationId,
    payload: envelope.payload,
    retryAttempts: envelope.retryCount,
    errorMessage,
    failedAt: new Date(),
    expiresAt: getDeadLetterExpiryDate(),
  });

  envelope.normalizedStatus = 'dead_lettered';
  envelope.lastError = errorMessage;
  await envelope.save();
}

async function persistNormalizedEvents(envelope, normalizedEvents) {
  for (const event of normalizedEvents) {
    await NormalizedContributionEvent.findOneAndUpdate(
      { eventId: event.eventId },
      {
        $set: event,
      },
      { upsert: true, new: true }
    );
  }
}

async function ingestEnvelopeWithRetry(envelope) {
  const maxRetries = getMaxRetries();

  while (envelope.retryCount < maxRetries) {
    try {
      const normalizedEvents = await normalizeWebhookEnvelope(envelope);
      await persistNormalizedEvents(envelope, normalizedEvents);

      envelope.normalizedStatus = 'success';
      envelope.normalizedAt = new Date();
      envelope.lastError = undefined;
      await envelope.save();

      return {
        status: 'success',
        normalizedCount: normalizedEvents.length,
      };
    } catch (error) {
      envelope.retryCount += 1;
      envelope.normalizedStatus = 'failed';
      envelope.lastError = error.message;
      await envelope.save();

      if (envelope.retryCount >= maxRetries) {
        await moveToDeadLetter(envelope, error.message);
        return {
          status: 'dead_lettered',
          normalizedCount: 0,
          error: error.message,
        };
      }
    }
  }

  return {
    status: 'failed',
    normalizedCount: 0,
    error: envelope.lastError || 'ingestion_failed',
  };
}

async function ingestWebhookEvent({ deliveryId, eventType, payload }) {
  const envelope = await ensureWebhookEnvelope({ deliveryId, eventType, payload });
  const result = await ingestEnvelopeWithRetry(envelope);

  return {
    envelopeId: envelope._id,
    deliveryId,
    ...result,
  };
}

async function runWebhookBackfillBatch({
  installationId,
  from,
  to,
  eventTypes,
  limit = 200,
  force = false,
}) {
  const query = {};
  if (installationId) query.installationId = installationId;
  if (from || to) {
    query.receivedAt = {};
    if (from) query.receivedAt.$gte = new Date(from);
    if (to) query.receivedAt.$lte = new Date(to);
  }
  if (Array.isArray(eventTypes) && eventTypes.length > 0) {
    query.eventType = { $in: eventTypes };
  }
  if (!force) {
    query.normalizedStatus = { $in: ['pending', 'failed', 'dead_lettered'] };
  }

  const envelopes = await WebhookIngestionEnvelope.find(query)
    .sort({ receivedAt: 1 })
    .limit(Math.max(1, Math.min(limit, 1000)));

  let success = 0;
  let deadLettered = 0;
  let failed = 0;

  for (const envelope of envelopes) {
    const result = await ingestEnvelopeWithRetry(envelope);
    if (result.status === 'success') success += 1;
    else if (result.status === 'dead_lettered') deadLettered += 1;
    else failed += 1;
  }

  return {
    scanned: envelopes.length,
    success,
    deadLettered,
    failed,
  };
}

export { ingestWebhookEvent, runWebhookBackfillBatch };

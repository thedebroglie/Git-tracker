import test from 'node:test';
import assert from 'node:assert/strict';
import Student from '../models/Student.js';
import NormalizedContributionEvent from '../models/NormalizedContributionEvent.js';
import WebhookIngestionEnvelope from '../models/WebhookIngestionEnvelope.js';
import IngestionDeadLetter from '../models/IngestionDeadLetter.js';
import { ingestWebhookEvent } from '../services/ingestionService.js';

const originals = {
  studentFind: Student.find,
  normalizedUpsert: NormalizedContributionEvent.findOneAndUpdate,
  envelopeUpsert: WebhookIngestionEnvelope.findOneAndUpdate,
  deadLetterCreate: IngestionDeadLetter.create,
};

function restoreModelMethods() {
  Student.find = originals.studentFind;
  NormalizedContributionEvent.findOneAndUpdate = originals.normalizedUpsert;
  WebhookIngestionEnvelope.findOneAndUpdate = originals.envelopeUpsert;
  IngestionDeadLetter.create = originals.deadLetterCreate;
}

test('webhook ingestion stores normalized events on success', async () => {
  const envelopeSaves = [];
  const persistedEvents = [];
  let deadLetterWrites = 0;

  Student.find = () => ({
    select: async () => [
      { _id: 'stu-1', githubAppInstallationId: '999' },
    ],
  });

  WebhookIngestionEnvelope.findOneAndUpdate = async (query, update) => ({
    _id: 'env-1',
    deliveryId: query.deliveryId,
    eventType: update.$set.eventType,
    action: update.$set.action,
    installationId: update.$set.installationId,
    payload: update.$set.payload,
    receivedAt: new Date('2026-04-17T10:00:00.000Z'),
    normalizedStatus: 'pending',
    retryCount: 0,
    lastError: null,
    normalizedAt: null,
    save: async function () {
      envelopeSaves.push({
        normalizedStatus: this.normalizedStatus,
        retryCount: this.retryCount,
        lastError: this.lastError,
      });
    },
  });

  NormalizedContributionEvent.findOneAndUpdate = async (filter, update) => {
    persistedEvents.push({ filter, update });
    return { _id: 'norm-1' };
  };

  IngestionDeadLetter.create = async () => {
    deadLetterWrites += 1;
    return { _id: 'dlq-1' };
  };

  try {
    const result = await ingestWebhookEvent({
      deliveryId: 'delivery-1',
      eventType: 'push',
      payload: {
        installation: { id: 999 },
        repository: { full_name: 'acme/repo' },
        commits: [{ distinct: true }, { distinct: false }],
        pusher: { name: 'demo' },
      },
    });

    assert.equal(result.deliveryId, 'delivery-1');
    assert.equal(result.status, 'success');
    assert.equal(result.normalizedCount, 1);

    assert.equal(persistedEvents.length, 1);
    assert.equal(persistedEvents[0].filter.eventId, 'delivery-1:push');
    assert.equal(deadLetterWrites, 0);

    assert.equal(envelopeSaves.length, 1);
    assert.equal(envelopeSaves[0].normalizedStatus, 'success');
  } finally {
    restoreModelMethods();
  }
});

test('webhook ingestion dead-letters after max retries', async () => {
  const previousMaxRetries = process.env.INGESTION_MAX_RETRIES;
  process.env.INGESTION_MAX_RETRIES = '2';

  const envelopeSaves = [];
  const deadLetterRecords = [];

  Student.find = () => ({
    select: async () => [
      { _id: 'stu-1', githubAppInstallationId: '123' },
    ],
  });

  WebhookIngestionEnvelope.findOneAndUpdate = async (query, update) => ({
    _id: 'env-2',
    deliveryId: query.deliveryId,
    eventType: update.$set.eventType,
    action: update.$set.action,
    installationId: update.$set.installationId,
    payload: update.$set.payload,
    receivedAt: new Date('2026-04-17T10:00:00.000Z'),
    normalizedStatus: 'pending',
    retryCount: 0,
    lastError: null,
    normalizedAt: null,
    save: async function () {
      envelopeSaves.push({
        normalizedStatus: this.normalizedStatus,
        retryCount: this.retryCount,
        lastError: this.lastError,
      });
    },
  });

  NormalizedContributionEvent.findOneAndUpdate = async () => {
    throw new Error('forced_upsert_failure');
  };

  IngestionDeadLetter.create = async (record) => {
    deadLetterRecords.push(record);
    return { _id: 'dlq-2' };
  };

  try {
    const result = await ingestWebhookEvent({
      deliveryId: 'delivery-2',
      eventType: 'push',
      payload: {
        installation: { id: 123 },
        repository: { full_name: 'acme/repo' },
      },
    });

    assert.equal(result.status, 'dead_lettered');
    assert.equal(result.normalizedCount, 0);
    assert.equal(result.error, 'forced_upsert_failure');

    assert.equal(deadLetterRecords.length, 1);
    assert.equal(deadLetterRecords[0].deliveryId, 'delivery-2');
    assert.equal(deadLetterRecords[0].retryAttempts, 2);
    assert.equal(deadLetterRecords[0].errorMessage, 'forced_upsert_failure');

    assert.equal(envelopeSaves.length >= 3, true);
    assert.equal(envelopeSaves[0].normalizedStatus, 'failed');
    assert.equal(envelopeSaves[envelopeSaves.length - 1].normalizedStatus, 'dead_lettered');
  } finally {
    process.env.INGESTION_MAX_RETRIES = previousMaxRetries;
    restoreModelMethods();
  }
});

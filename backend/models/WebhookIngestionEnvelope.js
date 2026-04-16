import mongoose from 'mongoose';

const webhookIngestionEnvelopeSchema = new mongoose.Schema(
  {
    deliveryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      default: 'unknown',
    },
    installationId: {
      type: String,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    normalizedStatus: {
      type: String,
      enum: ['pending', 'success', 'failed', 'dead_lettered'],
      default: 'pending',
      index: true,
    },
    normalizedAt: Date,
    retryCount: {
      type: Number,
      default: 0,
    },
    lastError: String,
    expiresAt: {
      type: Date,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

webhookIngestionEnvelopeSchema.index({ normalizedStatus: 1, receivedAt: 1 });

const WebhookIngestionEnvelope = mongoose.model(
  'WebhookIngestionEnvelope',
  webhookIngestionEnvelopeSchema
);

export default WebhookIngestionEnvelope;

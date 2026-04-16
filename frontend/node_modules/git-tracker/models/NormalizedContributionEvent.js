import mongoose from 'mongoose';

const normalizedContributionEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      default: 'github_webhook',
    },
    deliveryId: {
      type: String,
      required: true,
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
    repositoryFullName: {
      type: String,
      index: true,
    },
    actorLogin: String,
    studentIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Student',
      default: [],
      index: true,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    rawEnvelopeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WebhookIngestionEnvelope',
      index: true,
    },
    expiresAt: {
      type: Date,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

normalizedContributionEventSchema.index({ installationId: 1, occurredAt: -1 });
normalizedContributionEventSchema.index({ repositoryFullName: 1, occurredAt: -1 });

const NormalizedContributionEvent = mongoose.model(
  'NormalizedContributionEvent',
  normalizedContributionEventSchema
);

export default NormalizedContributionEvent;

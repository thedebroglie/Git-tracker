import mongoose from 'mongoose';

const ingestionDeadLetterSchema = new mongoose.Schema(
  {
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
    installationId: {
      type: String,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    retryAttempts: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      required: true,
    },
    failedAt: {
      type: Date,
      default: Date.now,
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

ingestionDeadLetterSchema.index({ eventType: 1, failedAt: -1 });

const IngestionDeadLetter = mongoose.model('IngestionDeadLetter', ingestionDeadLetterSchema);

export default IngestionDeadLetter;

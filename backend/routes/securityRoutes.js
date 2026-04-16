import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireAdminKey from '../middleware/adminKeyMiddleware.js';
import Student from '../models/Student.js';
import GithubStats from '../models/GithubStats.js';
import NormalizedContributionEvent from '../models/NormalizedContributionEvent.js';
import WebhookIngestionEnvelope from '../models/WebhookIngestionEnvelope.js';

const router = Router();

async function countSuspiciousContent() {
  const checks = [
    {
      name: 'normalized_metadata_patch',
      query: { 'metadata.patch': { $exists: true, $ne: null } },
      model: NormalizedContributionEvent,
    },
    {
      name: 'normalized_metadata_diff',
      query: { 'metadata.diff': { $exists: true, $ne: null } },
      model: NormalizedContributionEvent,
    },
    {
      name: 'normalized_metadata_content',
      query: { 'metadata.content': { $exists: true, $ne: null } },
      model: NormalizedContributionEvent,
    },
    {
      name: 'envelope_payload_patch',
      query: { 'payload.patch': { $exists: true, $ne: null } },
      model: WebhookIngestionEnvelope,
    },
    {
      name: 'envelope_payload_diff',
      query: { 'payload.diff': { $exists: true, $ne: null } },
      model: WebhookIngestionEnvelope,
    },
    {
      name: 'envelope_payload_content',
      query: { 'payload.content': { $exists: true, $ne: null } },
      model: WebhookIngestionEnvelope,
    },
  ];

  const results = [];
  for (const check of checks) {
    const count = await check.model.countDocuments(check.query);
    results.push({ name: check.name, count });
  }
  return results;
}

// ─── GET /api/security/privacy-audit — Admin privacy compliance snapshot ───
router.get('/privacy-audit', authMiddleware, requireAdminKey, async (req, res) => {
  try {
    const [students, stats, events, envelopes, suspiciousContent] = await Promise.all([
      Student.countDocuments({}),
      GithubStats.countDocuments({}),
      NormalizedContributionEvent.countDocuments({}),
      WebhookIngestionEnvelope.countDocuments({}),
      countSuspiciousContent(),
    ]);

    const hasSuspiciousContent = suspiciousContent.some((item) => item.count > 0);

    return res.json({
      policy: {
        metadataOnlyStorage: true,
        sourceCodeStorageAllowed: false,
        tokenStorage: 'JWT for auth; GitHub tokens excluded from default model serialization',
      },
      collections: {
        students,
        githubStats: stats,
        normalizedContributionEvents: events,
        webhookIngestionEnvelopes: envelopes,
      },
      suspiciousContent,
      verdict: hasSuspiciousContent ? 'review_required' : 'compliant',
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Privacy audit error:', error.message);
    return res.status(500).json({ error: 'Failed to generate privacy audit' });
  }
});

// ─── GET /api/security/threat-model — Runtime threat mitigations summary ───
router.get('/threat-model', authMiddleware, requireAdminKey, async (req, res) => {
  return res.json({
    mitigations: [
      'Request correlation IDs and structured logs enabled',
      'Signed GitHub webhook verification with timing-safe comparison enabled',
      'Webhook idempotency protection enabled by delivery id',
      'Route-level abuse throttling enabled for auth and webhook endpoints',
      'Security headers enabled globally',
      'Environment validation includes secret and token lifespan checks',
    ],
    generatedAt: new Date().toISOString(),
  });
});

export default router;

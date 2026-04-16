import Student from '../models/Student.js';

function getRetentionDate(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function toInstallationId(payload) {
  const id = payload?.installation?.id;
  return id ? id.toString() : null;
}

function eventOccurredAt(payload) {
  const direct = payload?.sender?.updated_at || payload?.repository?.updated_at;
  return direct ? new Date(direct) : new Date();
}

function normalizeBase({ envelope, action, repositoryFullName, metadata }) {
  return {
    source: 'github_webhook',
    deliveryId: envelope.deliveryId,
    eventType: envelope.eventType,
    action,
    installationId: envelope.installationId,
    repositoryFullName,
    actorLogin: envelope.payload?.sender?.login || envelope.payload?.installation?.account?.login || null,
    occurredAt: eventOccurredAt(envelope.payload),
    receivedAt: envelope.receivedAt,
    metadata,
    rawEnvelopeId: envelope._id,
    expiresAt: getRetentionDate(parseInt(process.env.NORMALIZED_EVENT_RETENTION_DAYS, 10) || 365),
  };
}

function normalizeInstallation(envelope) {
  const payload = envelope.payload || {};
  const installation = payload.installation || {};

  return [
    {
      ...normalizeBase({
        envelope,
        action: payload.action || 'unknown',
        repositoryFullName: null,
        metadata: {
          accountLogin: installation?.account?.login || null,
          repositorySelection: installation?.repository_selection || 'all',
          suspendedBy: payload?.suspended_by?.login || null,
        },
      }),
      eventId: `${envelope.deliveryId}:installation`,
    },
  ];
}

function normalizeInstallationRepositories(envelope) {
  const payload = envelope.payload || {};
  const added = Array.isArray(payload.repositories_added) ? payload.repositories_added : [];
  const removed = Array.isArray(payload.repositories_removed) ? payload.repositories_removed : [];

  const repos = [...added, ...removed]
    .map((repo) => repo?.full_name)
    .filter(Boolean);

  const deduped = Array.from(new Set(repos));
  if (deduped.length === 0) {
    deduped.push(null);
  }

  return deduped.map((repositoryFullName, index) => ({
    ...normalizeBase({
      envelope,
      action: payload.action || 'unknown',
      repositoryFullName,
      metadata: {
        repositorySelection: payload?.installation?.repository_selection || 'selected',
        addedCount: added.length,
        removedCount: removed.length,
      },
    }),
    eventId: `${envelope.deliveryId}:installation_repositories:${index}`,
  }));
}

function normalizePush(envelope) {
  const payload = envelope.payload || {};
  const commits = Array.isArray(payload.commits) ? payload.commits : [];

  return [
    {
      ...normalizeBase({
        envelope,
        action: 'push',
        repositoryFullName: payload?.repository?.full_name || null,
        metadata: {
          ref: payload.ref || null,
          before: payload.before || null,
          after: payload.after || null,
          commitCount: commits.length,
          distinctCommitCount: commits.filter((commit) => !!commit?.distinct).length,
          pusher: payload?.pusher?.name || null,
        },
      }),
      eventId: `${envelope.deliveryId}:push`,
    },
  ];
}

function normalizePullRequest(envelope) {
  const payload = envelope.payload || {};
  const pr = payload.pull_request || {};

  return [
    {
      ...normalizeBase({
        envelope,
        action: payload.action || 'unknown',
        repositoryFullName: payload?.repository?.full_name || null,
        metadata: {
          number: pr.number || payload.number || null,
          state: pr.state || null,
          merged: Boolean(pr.merged),
          draft: Boolean(pr.draft),
          author: pr?.user?.login || null,
          baseRef: pr?.base?.ref || null,
          headRef: pr?.head?.ref || null,
        },
      }),
      eventId: `${envelope.deliveryId}:pull_request`,
    },
  ];
}

function normalizeIssues(envelope) {
  const payload = envelope.payload || {};
  const issue = payload.issue || {};

  return [
    {
      ...normalizeBase({
        envelope,
        action: payload.action || 'unknown',
        repositoryFullName: payload?.repository?.full_name || null,
        metadata: {
          number: issue.number || payload.number || null,
          state: issue.state || null,
          author: issue?.user?.login || null,
          assigneeCount: Array.isArray(issue.assignees) ? issue.assignees.length : 0,
          labelCount: Array.isArray(issue.labels) ? issue.labels.length : 0,
        },
      }),
      eventId: `${envelope.deliveryId}:issues`,
    },
  ];
}

function normalizeUnknown(envelope) {
  return [
    {
      ...normalizeBase({
        envelope,
        action: envelope.action || 'unknown',
        repositoryFullName: envelope.payload?.repository?.full_name || null,
        metadata: {
          note: 'Unhandled event type captured for analysis',
        },
      }),
      eventId: `${envelope.deliveryId}:unknown`,
    },
  ];
}

async function attachStudentMappings(events) {
  const installationIds = Array.from(
    new Set(events.map((event) => event.installationId).filter(Boolean))
  );

  if (installationIds.length === 0) {
    return events.map((event) => ({ ...event, studentIds: [] }));
  }

  const students = await Student.find({
    githubAppInstallationId: { $in: installationIds },
  }).select('_id githubAppInstallationId');

  const map = new Map();
  for (const student of students) {
    const key = student.githubAppInstallationId;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(student._id);
  }

  return events.map((event) => ({
    ...event,
    studentIds: map.get(event.installationId) || [],
  }));
}

async function normalizeWebhookEnvelope(envelope) {
  const type = envelope.eventType;

  let events = [];
  if (type === 'installation') {
    events = normalizeInstallation(envelope);
  } else if (type === 'installation_repositories') {
    events = normalizeInstallationRepositories(envelope);
  } else if (type === 'push') {
    events = normalizePush(envelope);
  } else if (type === 'pull_request') {
    events = normalizePullRequest(envelope);
  } else if (type === 'issues') {
    events = normalizeIssues(envelope);
  } else {
    events = normalizeUnknown(envelope);
  }

  return attachStudentMappings(events);
}

export { normalizeWebhookEnvelope };

import Student from '../models/Student.js';
import { reconcileGithubIdentityFromWebhook } from './identityMappingService.js';

function toInstallationId(payload) {
  const installationId = payload?.installation?.id;
  if (!installationId) return null;
  return installationId.toString();
}

function extractRepoFullNames(payload) {
  const repos = [];

  const added = Array.isArray(payload?.repositories_added)
    ? payload.repositories_added
    : [];
  const removed = Array.isArray(payload?.repositories_removed)
    ? payload.repositories_removed
    : [];

  for (const repo of added) {
    if (repo?.full_name) repos.push(repo.full_name);
  }
  for (const repo of removed) {
    if (repo?.full_name) repos.push(repo.full_name);
  }

  if (repos.length > 0) {
    return Array.from(new Set(repos));
  }

  if (payload?.repository?.full_name) {
    return [payload.repository.full_name];
  }

  return [];
}

async function applyWebhookStatIncrement(filter, field) {
  await Student.updateMany(filter, {
    $inc: { [`githubWebhookStats.${field}`]: 1 },
    $set: { githubLastWebhookEventAt: new Date() },
  });
}

async function handleInstallationEvent(payload) {
  const installationId = toInstallationId(payload);
  if (!installationId) {
    return { processed: false, reason: 'missing_installation_id' };
  }

  const action = payload?.action || 'unknown';
  const accountLogin = payload?.installation?.account?.login || null;

  if (action === 'deleted' || action === 'suspend') {
    const result = await Student.updateMany(
      { githubAppInstallationId: installationId },
      {
        $set: {
          githubAppInstalled: false,
          githubAppSetupAction: action,
          githubAppAccountLogin: accountLogin,
          githubLastWebhookEventAt: new Date(),
        },
        $inc: { 'githubWebhookStats.installation': 1 },
      }
    );

    return { processed: true, matched: result.matchedCount, modified: result.modifiedCount };
  }

  const selection = payload?.installation?.repository_selection || 'all';

  const result = await Student.updateMany(
    { githubAppInstallationId: installationId },
    {
      $set: {
        githubAppInstalled: true,
        githubAppSetupAction: action,
        githubAppAccountLogin: accountLogin,
        githubAppRepositorySelection: selection,
        githubLastWebhookEventAt: new Date(),
      },
      $inc: { 'githubWebhookStats.installation': 1 },
    }
  );

  return { processed: true, matched: result.matchedCount, modified: result.modifiedCount };
}

async function handleInstallationRepositoriesEvent(payload) {
  const installationId = toInstallationId(payload);
  if (!installationId) {
    return { processed: false, reason: 'missing_installation_id' };
  }

  const repos = extractRepoFullNames(payload);
  const selection = payload?.installation?.repository_selection || 'selected';

  const result = await Student.updateMany(
    { githubAppInstallationId: installationId },
    {
      $set: {
        githubAppRepositorySelection: selection,
        githubLastWebhookEventAt: new Date(),
      },
      $inc: { 'githubWebhookStats.installationRepositories': 1 },
      ...(repos.length > 0 ? { $addToSet: { githubTrackedRepositories: { $each: repos } } } : {}),
    }
  );

  if (Array.isArray(payload?.repositories_removed) && payload.repositories_removed.length > 0) {
    const removed = payload.repositories_removed
      .map((repo) => repo?.full_name)
      .filter(Boolean);

    if (removed.length > 0) {
      await Student.updateMany(
        { githubAppInstallationId: installationId },
        { $pull: { githubTrackedRepositories: { $in: removed } } }
      );
    }
  }

  return { processed: true, matched: result.matchedCount, modified: result.modifiedCount };
}

async function handlePushEvent(payload) {
  const installationId = toInstallationId(payload);
  if (!installationId) {
    return { processed: false, reason: 'missing_installation_id' };
  }

  const repository = payload?.repository?.full_name;
  const update = {
    $set: {
      githubLastWebhookEventAt: new Date(),
      githubLastPushAt: new Date(),
    },
    $inc: { 'githubWebhookStats.push': 1 },
  };

  if (repository) {
    update.$addToSet = { githubTrackedRepositories: repository };
  }

  const result = await Student.updateMany(
    { githubAppInstallationId: installationId },
    update
  );

  return { processed: true, matched: result.matchedCount, modified: result.modifiedCount };
}

async function handlePullRequestEvent(payload) {
  const installationId = toInstallationId(payload);
  if (!installationId) {
    return { processed: false, reason: 'missing_installation_id' };
  }

  const repository = payload?.repository?.full_name;
  const update = {
    $set: {
      githubLastWebhookEventAt: new Date(),
      githubLastPullRequestEventAt: new Date(),
    },
    $inc: { 'githubWebhookStats.pullRequest': 1 },
  };

  if (repository) {
    update.$addToSet = { githubTrackedRepositories: repository };
  }

  const result = await Student.updateMany(
    { githubAppInstallationId: installationId },
    update
  );

  return { processed: true, matched: result.matchedCount, modified: result.modifiedCount };
}

async function handleIssuesEvent(payload) {
  const installationId = toInstallationId(payload);
  if (!installationId) {
    return { processed: false, reason: 'missing_installation_id' };
  }

  const repository = payload?.repository?.full_name;
  const update = {
    $set: {
      githubLastWebhookEventAt: new Date(),
      githubLastIssueEventAt: new Date(),
    },
    $inc: { 'githubWebhookStats.issues': 1 },
  };

  if (repository) {
    update.$addToSet = { githubTrackedRepositories: repository };
  }

  const result = await Student.updateMany(
    { githubAppInstallationId: installationId },
    update
  );

  return { processed: true, matched: result.matchedCount, modified: result.modifiedCount };
}

async function handleUnknownEvent(payload) {
  const installationId = toInstallationId(payload);
  if (!installationId) {
    return { processed: false, reason: 'missing_installation_id' };
  }

  const result = await Student.updateMany(
    { githubAppInstallationId: installationId },
    {
      $set: { githubLastWebhookEventAt: new Date() },
      $inc: { 'githubWebhookStats.unknown': 1 },
    }
  );

  return { processed: true, matched: result.matchedCount, modified: result.modifiedCount };
}

async function processGithubWebhookEvent(event, payload) {
  await reconcileGithubIdentityFromWebhook(payload, `webhook_${event}`);

  if (event === 'installation') {
    return handleInstallationEvent(payload);
  }

  if (event === 'installation_repositories') {
    return handleInstallationRepositoriesEvent(payload);
  }

  if (event === 'push') {
    return handlePushEvent(payload);
  }

  if (event === 'pull_request') {
    return handlePullRequestEvent(payload);
  }

  if (event === 'issues') {
    return handleIssuesEvent(payload);
  }

  return handleUnknownEvent(payload);
}

export { processGithubWebhookEvent };

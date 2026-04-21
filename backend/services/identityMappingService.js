import Student from '../models/Student.js';
import GithubStats from '../models/GithubStats.js';
import WebhookIngestionEnvelope from '../models/WebhookIngestionEnvelope.js';
import NormalizedContributionEvent from '../models/NormalizedContributionEvent.js';
import IngestionDeadLetter from '../models/IngestionDeadLetter.js';
import { invalidateLeaderboardCache } from './leaderboardCacheService.js';

function normalizeUsername(username) {
  if (!username || typeof username !== 'string') return null;
  const trimmed = username.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toCanonical(username) {
  const normalized = normalizeUsername(username);
  return normalized ? normalized.toLowerCase() : null;
}

function upsertUsernameHistory(history, username, source) {
  const normalized = normalizeUsername(username);
  const canonical = toCanonical(normalized);
  if (!normalized || !canonical) return history;

  const existing = history.find((entry) => entry.canonical === canonical);
  if (existing) {
    existing.observedAt = new Date();
    existing.source = source;
    return history;
  }

  history.push({
    username: normalized,
    canonical,
    observedAt: new Date(),
    source,
  });

  return history;
}

async function linkGithubIdentity({ studentId, githubUser, accessToken, source = 'oauth_callback' }) {
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found for identity linking');
  }

  const nextUsername = normalizeUsername(githubUser?.login);
  const prevUsername = normalizeUsername(student.githubUsername);

  const history = Array.isArray(student.githubUsernameHistory)
    ? student.githubUsernameHistory.map((entry) => ({ ...entry.toObject?.() || entry }))
    : [];

  if (prevUsername && toCanonical(prevUsername) !== toCanonical(nextUsername)) {
    upsertUsernameHistory(history, prevUsername, 'username_previous');
  }
  upsertUsernameHistory(history, nextUsername, source);

  student.githubUsername = nextUsername;
  student.githubUsernameCanonical = toCanonical(nextUsername);
  student.githubId = githubUser?.id ? githubUser.id.toString() : student.githubId;
  student.githubNodeId = githubUser?.node_id || student.githubNodeId;
  student.githubConnected = true;
  student.githubDisconnectedAt = null;
  student.githubIdentityLastVerifiedAt = new Date();
  student.githubAccessToken = accessToken;
  student.avatar = githubUser?.avatar_url || null;
  student.bio = githubUser?.bio || '';
  student.githubUsernameHistory = history;

  await student.save();

  return {
    studentId: student._id,
    githubUsername: student.githubUsername,
    githubNodeId: student.githubNodeId || null,
    usernameHistoryCount: student.githubUsernameHistory.length,
  };
}

async function reconcileGithubIdentityFromWebhook(payload, source = 'webhook_sender') {
  const senderId = payload?.sender?.id ? payload.sender.id.toString() : null;
  const senderNodeId = payload?.sender?.node_id || null;
  const senderLogin = normalizeUsername(payload?.sender?.login);

  if (!senderLogin || (!senderId && !senderNodeId)) {
    return { matched: 0, updated: 0 };
  }

  const query = {
    $or: [],
  };

  if (senderNodeId) query.$or.push({ githubNodeId: senderNodeId });
  if (senderId) query.$or.push({ githubId: senderId });

  if (query.$or.length === 0) {
    return { matched: 0, updated: 0 };
  }

  const students = await Student.find(query);
  let updated = 0;

  for (const student of students) {
    const prevUsername = normalizeUsername(student.githubUsername);
    if (toCanonical(prevUsername) === toCanonical(senderLogin)) {
      if (!student.githubNodeId && senderNodeId) {
        student.githubNodeId = senderNodeId;
        student.githubIdentityLastVerifiedAt = new Date();
        await student.save();
        updated += 1;
      }
      continue;
    }

    const history = Array.isArray(student.githubUsernameHistory)
      ? student.githubUsernameHistory.map((entry) => ({ ...entry.toObject?.() || entry }))
      : [];

    if (prevUsername) {
      upsertUsernameHistory(history, prevUsername, 'username_previous');
    }
    upsertUsernameHistory(history, senderLogin, source);

    student.githubUsername = senderLogin;
    student.githubUsernameCanonical = toCanonical(senderLogin);
    if (senderId) student.githubId = senderId;
    if (senderNodeId) student.githubNodeId = senderNodeId;
    student.githubIdentityLastVerifiedAt = new Date();
    student.githubUsernameHistory = history;
    await student.save();
    updated += 1;
  }

  return {
    matched: students.length,
    updated,
  };
}

async function disconnectGithubIdentity(studentId) {
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found for disconnect');
  }

  if (student.githubUsername) {
    const history = Array.isArray(student.githubUsernameHistory)
      ? student.githubUsernameHistory.map((entry) => ({ ...entry.toObject?.() || entry }))
      : [];
    upsertUsernameHistory(history, student.githubUsername, 'manual_disconnect');
    student.githubUsernameHistory = history;
  }

  student.githubConnected = false;
  student.githubAccessToken = undefined;
  student.githubDisconnectedAt = new Date();
  student.avatar = undefined;
  student.bio = undefined;
  student.githubAppInstalled = false;
  student.githubAppInstallationId = undefined;
  student.githubTrackedRepositories = [];
  student.githubAppRepositorySelection = 'all';
  student.githubAppSetupAction = 'manual_disconnect';

  await student.save();

  return {
    studentId: student._id,
    githubConnected: student.githubConnected,
    disconnectedAt: student.githubDisconnectedAt,
    usernameHistoryCount: student.githubUsernameHistory.length,
  };
}

async function deleteStudentAccount(studentId) {
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found for account deletion');
  }

  const installationId = student.githubAppInstallationId || null;

  const statsDelete = await GithubStats.deleteOne({ userId: student._id });
  const envelopeDelete = installationId
    ? await WebhookIngestionEnvelope.deleteMany({ installationId })
    : { deletedCount: 0 };
  const deadLetterDelete = installationId
    ? await IngestionDeadLetter.deleteMany({ installationId })
    : { deletedCount: 0 };

  const normalizedPull = await NormalizedContributionEvent.updateMany(
    { studentIds: student._id },
    { $pull: { studentIds: student._id } }
  );

  const studentDelete = await Student.deleteOne({ _id: student._id });
  await invalidateLeaderboardCache();

  return {
    deletedStudent: studentDelete.deletedCount || 0,
    deletedStats: statsDelete.deletedCount || 0,
    deletedEnvelopes: envelopeDelete.deletedCount || 0,
    deletedDeadLetters: deadLetterDelete.deletedCount || 0,
    normalizedEventsDetached:
      normalizedPull.modifiedCount || normalizedPull.nModified || 0,
  };
}

export {
  linkGithubIdentity,
  reconcileGithubIdentityFromWebhook,
  disconnectGithubIdentity,
  deleteStudentAccount,
};

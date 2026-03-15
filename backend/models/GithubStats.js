import mongoose from 'mongoose';

const githubStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
      index: true,
    },

    // Activity
    commits: { type: Number, default: 0 },
    contributionsLast30Days: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },

    // Collaboration
    prsOpened: { type: Number, default: 0 },
    prsMergedExternal: { type: Number, default: 0 }, // excludes self-repo PRs
    prsMergedTotal: { type: Number, default: 0 },     // total including self-PRs
    issues: { type: Number, default: 0 },
    codeReviews: { type: Number, default: 0 },

    // Impact
    meaningfulRepoCount: { type: Number, default: 0 },
    totalRepoCount: { type: Number, default: 0 },
    emptyRepoCount: { type: Number, default: 0 },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
    watchers: { type: Number, default: 0 },

    // Skill
    languageCount: { type: Number, default: 0 },
    languageList: { type: [String], default: [] },

    // Anti-cheat reference
    selfPRPercentage: { type: Number, default: 0 },

    // Score breakdown for debugging/transparency
    scoreBreakdown: {
      type: {
        PAS: Number,
        OCS: Number,
        PIS: Number,
        CIS: Number,
        SDS: Number,
      },
      default: {},
    },
    capsApplied: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    fromCache: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const GithubStats = mongoose.model('GithubStats', githubStatsSchema);

export default GithubStats;

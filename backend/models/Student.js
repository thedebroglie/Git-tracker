import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    enrollmentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
      enum: ['CSE', 'IT', 'ECE', 'ME', 'CV'],
    },
    year: {
      type: Number,
      required: true,
    },
    passwordHash: {
      type: String,
      select: false, // never returned by default in queries
    },

    // GitHub OAuth fields
    githubId: String,       // numeric GitHub user ID from OAuth
    githubUsername: String,  // set ONLY from verified OAuth response
    githubConnected: {
      type: Boolean,
      default: false,
    },
    githubAppInstalled: {
      type: Boolean,
      default: false,
    },
    githubAppInstallationId: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
    githubAppSetupAction: String,
    githubAccessToken: {
      type: String,
      select: false,
    },
    avatar: String,
    bio: String,

    // Score & rank
    score: {
      type: Number,
      default: 0,
      index: true,
    },
    tierRank: {
      type: String,
      default: 'Bronze',
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Elite'],
    },
    leaderboardRank: {
      type: Number,
      default: 0,
    },

    // Profile stats
    followers: {
      type: Number,
      default: 0,
    },
    publicRepos: {
      type: Number,
      default: 0,
    },

    // Sync
    lastSyncedAt: Date,

    // Anti-cheat
    antiCheatFlags: {
      type: [String],
      default: [],
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },

    // Rank history — trimmed to last 52 entries
    rankHistory: {
      type: [
        {
          rank: Number,
          score: Number,
          recordedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: rankChange — diff between last two rankHistory entries
studentSchema.virtual('rankChange').get(function () {
  const history = this.rankHistory;
  if (!history || history.length < 2) return 0;
  const prev = history[history.length - 2].rank;
  const curr = history[history.length - 1].rank;
  // Positive = improved (lower rank number is better)
  return prev - curr;
});

// Ensure passwordHash is NEVER returned in JSON
studentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.githubAccessToken;
  return obj;
};

const Student = mongoose.model('Student', studentSchema);

export default Student;

export const BADGE_REGISTRY = {
    // --- EVALUATION & SCORE MILESTONES ---
    PERFECT_SCORE: {
        id: "PERFECT_SCORE",
        title: "Sharpshooter",
        desc: "Scored 100% on any evaluation",
        icon: "🎯",
        check: (stats) => stats.pct === 100
    },
    CENTURION: {
        id: "CENTURION",
        title: "Centurion",
        desc: "Answered 100 or more total questions correctly",
        icon: "🛡️",
        check: (stats) => stats.totalCorrect >= 100
    },
    TESTER: {
        id: "TESTER",
        title: "Tester",
        desc: "Completed 10 or more evaluations",
        icon: "🎖️",
        check: (stats) => stats.totalEvaluations >= 10
    },
    SENIOR: {
        id: "SENIOR",
        title: "Senior",
        desc: "Completed 30 or more evaluations",
        icon: "🎗️",
        check: (stats) => stats.totalEvaluations >= 30
    },
    HALF_CENTURY: {
        id: "HALF_CENTURY",
        title: "Veteran",
        desc: "Completed 50 total evaluations",
        icon: "⚔️",
        check: (stats) => stats.totalEvaluations >= 50
    },

    // --- STAR PROGRESSION TIERS ---
    PROTOSTAR: {
        id: "PROTOSTAR",
        title: "Protostar",
        desc: "Earned 50 or more lifetime points",
        icon: "✨",
        check: (stats) => (stats.points || 0) >= 50
    },
    WHITE_STAR: {
        id: "WHITE_STAR",
        title: "White Star",
        desc: "Earned 250 or more lifetime points",
        icon: "⚪",
        check: (stats) => (stats.points || 0) >= 250
    },
    GOLD_STAR: {
        id: "GOLD_STAR",
        title: "Gold Star",
        desc: "Earned 500 or more lifetime points",
        icon: "⭐",
        check: (stats) => (stats.points || 0) >= 500
    },
    RED_STAR: {
        id: "RED_STAR",
        title: "Red Star",
        desc: "Earned 1,000 or more lifetime points",
        icon: "🔴",
        check: (stats) => (stats.points || 0) >= 1000
    },

    // --- TIME & STUDY MILESTONES ---
    NIGHT_OWL: {
        id: "NIGHT_OWL",
        title: "Night Ops",
        desc: "Completed an evaluation between 22:00 and 04:00",
        icon: "🌙",
        check: () => {
            const hour = new Date().getHours();
            return hour >= 22 || hour < 4;
        }
    },
    EARLY_BIRD: {
        id: "EARLY_BIRD",
        title: "Early Bird",
        desc: "Completed an evaluation between 05:00 and 08:00",
        icon: "🌅",
        check: () => {
            const hour = new Date().getHours();
            return hour >= 5 && hour < 8;
        }
    },
    FAST_LEARNER: {
        id: "FAST_LEARNER",
        title: "Fast Learner",
        desc: "Scored 90% or higher on your very first evaluation",
        icon: "⚡",
        check: (stats) => stats.totalEvaluations === 1 && stats.pct >= 90
    },
    SCHOLAR: {
        id: "SCHOLAR",
        title: "Scholar",
        desc: "Maintained an overall average score of 85% or higher across 5+ tests",
        icon: "📜",
        check: (stats) => stats.totalEvaluations >= 5 && (stats.averagePct || 0) >= 85
    },
    LEGENDARY: {
        id: "LEGENDARY",
        title: "Legendary",
        desc: "Earned 1,000 or more lifetime points",
        icon: "👑",
        check: (stats) => (stats.points || 0) >= 1000
    }
};
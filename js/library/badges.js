/**
 * BADGE REGISTRY
 * Comprehensive achievement milestone tracking system
 */
export const BADGE_REGISTRY = {
    // --- ACCURACY & SCORE MILESTONES ---
    PERFECT_SCORE: {
        id: "PERFECT_SCORE",
        title: "Sharpshooter",
        desc: "Scored 100% on any evaluation",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => Number(stats.pct || 0) === 100
    },
    MARKSMAN: {
        id: "MARKSMAN",
        title: "Marksman",
        desc: "Scored 90% or higher on an evaluation",
        icon: `<span class="arrow-icon arrow-right"></span>`,
        check: (stats) => Number(stats.pct || 0) >= 90
    },
    FAST_LEARNER: {
        id: "FAST_LEARNER",
        title: "Fast Learner",
        desc: "Scored 90% or higher on your very first evaluation",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => Number(stats.totalEvaluations || 0) === 1 && Number(stats.pct || 0) >= 90
    },
    SCHOLAR: {
        id: "SCHOLAR",
        title: "Scholar",
        desc: "Maintained an overall average of 85% or higher across 5+ evaluations",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => Number(stats.totalEvaluations || 0) >= 5 && Number(stats.averagePct || 0) >= 85
    },

    // --- VOLUME & QUESTION COUNT MILESTONES ---
    FIRST_BLOOD: {
        id: "FIRST_BLOOD",
        title: "Initiate",
        desc: "Completed your first official evaluation",
        icon: `<span class="arrow-icon arrow-right"></span>`,
        check: (stats) => Number(stats.totalEvaluations || 0) >= 1
    },
    TESTER: {
        id: "TESTER",
        title: "Tester",
        desc: "Completed 10 or more evaluations",
        icon: `<span class="arrow-icon arrow-right"></span>`,
        check: (stats) => Number(stats.totalEvaluations || 0) >= 10
    },
    SENIOR: {
        id: "SENIOR",
        title: "Senior Operator",
        desc: "Completed 25 or more evaluations",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => Number(stats.totalEvaluations || 0) >= 25
    },
    HALF_CENTURY: {
        id: "HALF_CENTURY",
        title: "Veteran",
        desc: "Completed 50 or more evaluations",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => Number(stats.totalEvaluations || 0) >= 50
    },
    CENTURION: {
        id: "CENTURION",
        title: "Centurion",
        desc: "Answered 100 or more total questions correctly",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => Number(stats.totalCorrect || 0) >= 100
    },
    MASTER_GUNNER: {
        id: "MASTER_GUNNER",
        title: "Master Gunner",
        desc: "Answered 500 or more total questions correctly",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => Number(stats.totalCorrect || 0) >= 500
    },
    GRAND_MASTER: {
        id: "GRAND_MASTER",
        title: "Grand Master",
        desc: "Answered 1,000 or more total questions correctly",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => Number(stats.totalCorrect || 0) >= 1000
    },

    // --- POINT PROGRESSION TIERS ---
    PROTOSTAR: {
        id: "PROTOSTAR",
        title: "Protostar",
        desc: "Earned 50 or more lifetime points",
        icon: `<span class="arrow-icon arrow-right"></span>`,
        check: (stats) => Number(stats.points || 0) >= 50
    },
    DWARF_STAR: {
        id: "DWARF_STAR",
        title: "Dwarf Star",
        desc: "Earned 100 or more lifetime points",
        icon: `<span class="arrow-icon arrow-right"></span>`,
        check: (stats) => Number(stats.points || 0) >= 100
    },
    WHITE_STAR: {
        id: "WHITE_STAR",
        title: "White Star",
        desc: "Earned 250 or more lifetime points",
        icon: `<span class="arrow-icon arrow-right"></span>`,
        check: (stats) => Number(stats.points || 0) >= 250
    },
    GOLD_STAR: {
        id: "GOLD_STAR",
        title: "Gold Star",
        desc: "Earned 500 or more lifetime points",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => Number(stats.points || 0) >= 500
    },
    RED_STAR: {
        id: "RED_STAR",
        title: "Red Star",
        desc: "Earned 1,000 or more lifetime points",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => Number(stats.points || 0) >= 1000
    },
    LEGENDARY: {
        id: "LEGENDARY",
        title: "Supreme Vanguard",
        desc: "Earned 2,500 or more lifetime points",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => Number(stats.points || 0) >= 2500
    },

    // --- TIME & SPECIAL OPS MILESTONES ---
    NIGHT_OWL: {
        id: "NIGHT_OWL",
        title: "Night Ops",
        desc: "Completed an evaluation drill between 22:00 and 04:00",
        icon: `<span class="arrow-icon arrow-right"></span>`,
        check: () => {
            const hour = new Date().getHours();
            return hour >= 22 || hour < 4;
        }
    },
    EARLY_BIRD: {
        id: "EARLY_BIRD",
        title: "Dawn Readiness",
        desc: "Completed an evaluation drill between 05:00 and 08:00",
        icon: `<span class="arrow-icon arrow-right"></span>`,
        check: () => {
            const hour = new Date().getHours();
            return hour >= 5 && hour < 8;
        }
    },
    DAILY_INITIATE: {
        id: "DAILY_INITIATE",
        title: "Daily Responder",
        desc: "Earned points on a Daily Readiness Challenge",
        icon: `<span class="arrow-icon arrow-right"></span>`,
        check: (stats) => !!stats.dailyChallengeCompleted
    },
    REDACTED_SURVIVOR: {
        id: "REDACTED_SURVIVOR",
        title: "Classified Clearance",
        desc: "Scored 80% or higher in Redacted Mode",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => stats.isRedactedMode && Number(stats.pct || 0) >= 80
    },
    REDACTED_MASTER: {
        id: "REDACTED_MASTER",
        title: "Black Ops Specialist",
        desc: "Scored 100% on a Redacted Mode evaluation drill",
        icon: `<span class="arrow-icon arrow-up"></span>`,
        check: (stats) => stats.isRedactedMode && Number(stats.pct || 0) === 100
    },
};
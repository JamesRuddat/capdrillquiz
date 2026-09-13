import { database } from '../config.js';
import { state } from '../state.js';
import { BADGE_REGISTRY } from '../library/badges.js';
import { showToast } from './user-service.js';

/**
 * Tactical Rank Tiers tied directly to badge progression count
 */
export const RANK_TIERS = [
    { name: "Airman", badgesRequired: 0, icon: "/assets/drill/airman.svg" },
    { name: "Assistant Element Leader", badgesRequired: 1, icon: "/assets/drill/assistant_element_leader.svg" },
    { name: "Element Leader", badgesRequired: 3, icon: "/assets/drill/element_leader.svg" },
    { name: "Guide", badgesRequired: 5, icon: "/assets/drill/guide.svg" },
    { name: "Colors Commander", badgesRequired: 8, icon: "/assets/drill/colors.svg" },
    { name: "Flight Sergeant", badgesRequired: 12, icon: "/assets/drill/flight_sergeant.svg" },
    { name: "Flight Commander", badgesRequired: 16, icon: "/assets/drill/flight_commander.svg" },
    { name: "First Sergeant", badgesRequired: 20, icon: "/assets/drill/first_sergeant.svg" },
    { name: "Squadron Staff Officer", badgesRequired: 25, icon: "/assets/drill/staff_officer.svg" },
    { name: "Squadron Adjutant", badgesRequired: 30, icon: "/assets/drill/adjutant.svg" },
    { name: "Squadron Commander", badgesRequired: 36, icon: "/assets/drill/squadron_commander.svg" },
    { name: "Group Commander", badgesRequired: 42, icon: "/assets/drill/group_commander.svg" },
    { name: "Commander of Troops", badgesRequired: 50, icon: "/assets/drill/commander_of_troops.svg" }
];

/**
 * Calculates current operator rank title, icon, and progress percentage to next tier
 */
export function calculateRankProgress(userBadges = {}) {
    const earnedCount = Object.keys(userBadges).length;

    let currentTier = RANK_TIERS[0];
    let nextTier = RANK_TIERS[1];

    for (let i = 0; i < RANK_TIERS.length; i++) {
        if (earnedCount >= RANK_TIERS[i].badgesRequired) {
            currentTier = RANK_TIERS[i];
            nextTier = RANK_TIERS[i + 1] || null;
        }
    }

    if (!nextTier) {
        return {
            rankName: currentTier.name,
            icon: currentTier.icon,
            progressText: `${earnedCount} Badges (MAX RANK)`,
            percentage: 100
        };
    }

    const currentReq = currentTier.badgesRequired;
    const nextReq = nextTier.badgesRequired;
    const progressInTier = earnedCount - currentReq;
    const tierSpan = nextReq - currentReq;
    const percentage = Math.min(100, Math.max(0, (progressInTier / tierSpan) * 100));

    return {
        rankName: currentTier.name,
        icon: currentTier.icon,
        progressText: `${earnedCount} / ${nextReq} Badges`,
        percentage: Math.round(percentage)
    };
}

/**
 * Dynamically updates the home page Operational Rank Card DOM elements
 */
export async function updateRankCardUI(userBadges = null) {
    const rankLabel = document.getElementById("home-user-rank");
    const ptsLabel = document.getElementById("home-user-pts");
    const progressFill = document.getElementById("home-rank-progress");
    const rankIcon = document.querySelector(".rank-card .rank-icon");

    if (!rankLabel || !progressFill) return;

    const uid = state.userUid || localStorage.getItem("active_uid");

    // Helper function to insert formatted emblem HTML
    const renderIcon = (iconPath, titleName) => {
        if (!rankIcon) return;
        rankIcon.innerHTML = `<img src="${iconPath}" alt="${titleName}" class="rank-emblem-img" onError="this.style.display='none'">`;
    };

    // Guest Default State
    if (!uid) {
        rankLabel.innerText = RANK_TIERS[0].name;
        if (ptsLabel) ptsLabel.innerText = `0 / ${RANK_TIERS[1].badgesRequired} Badges`;
        renderIcon(RANK_TIERS[0].icon, RANK_TIERS[0].name);
        progressFill.style.width = "0%";
        return;
    }

    try {
        let badges = userBadges;
        if (!badges) {
            const snapshot = await database.ref(`users/${uid}/badges`).once("value");
            badges = snapshot.val() || {};
        }

        const rankInfo = calculateRankProgress(badges);

        rankLabel.innerText = rankInfo.rankName;
        if (ptsLabel) ptsLabel.innerText = rankInfo.progressText;
        renderIcon(rankInfo.icon, rankInfo.rankName);

        progressFill.style.width = `${rankInfo.percentage}%`;

        window.dispatchEvent(new CustomEvent("app:rank-updated", { detail: rankInfo }));

    } catch (err) {
        console.error("Failed to update rank card UI:", err);
    }
}

/**
 * Evaluates and grants missing badges based on full user stats snapshot.
 */
export async function evaluateUserBadges(userData = {}) {
    const user = state.currentUser;
    if (!user) return userData.badges || {};

    const userRef = database.ref(`users/${user.uid}`);
    const currentBadges = userData.badges || {};

    const rawPoints = Number(userData.points || userData.lifetimePoints || state.userPoints || 0);
    const evals = Number(userData.totalEvaluations || 0);
    const correct = Number(userData.totalCorrect || 0);

    const stats = {
        ...userData,
        pct: Number(userData.pct || 0),
        totalCorrect: correct,
        totalEvaluations: evals,
        points: rawPoints,
        lifetimePoints: rawPoints,
        averagePct: userData.averagePct || (evals > 0 ? (correct / (evals * 10)) * 100 : 0),
        aeCorrect: Number(userData.aeCorrect || 0),
        esCorrect: Number(userData.esCorrect || 0),
        branch: userData.branch || state.activeBranchKey || ''
    };

    const updates = {};
    const newlyEarned = [];

    Object.values(BADGE_REGISTRY).forEach(badge => {
        if (!currentBadges[badge.id] && badge.check(stats)) {
            const timestamp = new Date().toISOString();
            updates[`badges/${badge.id}`] = timestamp;
            currentBadges[badge.id] = timestamp;
            newlyEarned.push(badge);
        }
    });

    if (Object.keys(updates).length > 0) {
        try {
            await userRef.update(updates);
            newlyEarned.forEach(badge => {
                showToast(`Achievement Unlocked: ${badge.icon} ${badge.title}!`, "success");
            });

            updateRankCardUI(currentBadges);

        } catch (err) {
            console.error("Failed to update user badges in database:", err);
        }
    } else {
        updateRankCardUI(currentBadges);
    }

    return currentBadges;
}

/**
 * Evaluates and grants new badges specifically after completing an evaluation
 */
export async function checkAndAwardBadges(evalResults) {
    const user = state.currentUser;
    if (!user) return;

    const userRef = database.ref(`users/${user.uid}`);

    try {
        const snapshot = await userRef.once('value');
        const userData = snapshot.val() || {};

        const activeBranch = evalResults.branch || state.activeBranchKey || 'GENERAL';
        const newTotalCorrect = (userData.totalCorrect || 0) + (evalResults.correctCount || 0);
        const newTotalEvals = (userData.totalEvaluations || 0) + 1;
        const newPoints = (userData.points || 0) + (evalResults.pointsEarned || evalResults.correctCount || 0);

        const updatedStats = {
            ...userData,
            pct: evalResults.pct,
            totalCorrect: newTotalCorrect,
            totalEvaluations: newTotalEvals,
            points: newPoints,
            branch: activeBranch
        };

        if (activeBranch === 'AE') {
            updatedStats.aeCorrect = (userData.aeCorrect || 0) + (evalResults.correctCount || 0);
        } else if (activeBranch === 'ES') {
            updatedStats.esCorrect = (userData.esCorrect || 0) + (evalResults.correctCount || 0);
        }

        const metricsUpdate = {
            totalCorrect: updatedStats.totalCorrect,
            totalEvaluations: updatedStats.totalEvaluations,
            points: updatedStats.points
        };
        if (updatedStats.aeCorrect !== undefined) metricsUpdate.aeCorrect = updatedStats.aeCorrect;
        if (updatedStats.esCorrect !== undefined) metricsUpdate.esCorrect = updatedStats.esCorrect;

        await userRef.update(metricsUpdate);
        await evaluateUserBadges(updatedStats);

    } catch (err) {
        console.error("Failed to evaluate badges on quiz submit:", err);
    }
}

/**
 * Renders earned & locked badges into a responsive grid
 */
export function renderUserBadges(containerId, userBadges = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = Object.values(BADGE_REGISTRY).map(badge => {
        const isUnlocked = !!userBadges[badge.id];
        const statusClass = isUnlocked ? 'badge-unlocked' : 'badge-locked';

        const statusLabel = isUnlocked
            ? '<span class="badge-status-unlocked">Unlocked ✓</span>'
            : '<span class="badge-status-locked">Locked</span>';

        return `
            <div class="badge-card ${statusClass}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-title">${badge.title}</div>
                <div class="badge-desc">${badge.desc}</div>
                <div class="badge-status-container">
                    ${statusLabel}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="badge-grid">${html}</div>`;
}
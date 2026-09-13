import { database } from '../config.js';
import { state } from '../state.js';
import { BADGE_REGISTRY } from '../components/badges.js';
import { showToast } from './user-service.js';

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
        } catch (err) {
            console.error("Failed to update user badges in database:", err);
        }
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
            : '<span class="badge-status-locked">Locked 🔒</span>';

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
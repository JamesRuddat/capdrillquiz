import { database } from '../config.js';
import { state } from '../state.js';
import { BADGE_REGISTRY } from '../components/badges.js';
import { showToast } from './user-service.js';

/**
 * Evaluates and grants missing badges based on full user stats snapshot.
 * Safe to call anywhere (e.g. Profile Page load or Quiz Submission).
 */
export async function evaluateUserBadges(userData = {}) {
    const user = state.currentUser;
    if (!user) return userData.badges || {};

    const userRef = database.ref(`users/${user.uid}`);
    const currentBadges = userData.badges || {};

    // Coerce values to numbers so numeric comparisons (>= 50) work properly
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

        // Track subject specific correct counters
        if (activeBranch === 'AE') {
            updatedStats.aeCorrect = (userData.aeCorrect || 0) + (evalResults.correctCount || 0);
        } else if (activeBranch === 'ES') {
            updatedStats.esCorrect = (userData.esCorrect || 0) + (evalResults.correctCount || 0);
        }

        // 1. Update aggregate metrics in Firebase
        const metricsUpdate = {
            totalCorrect: updatedStats.totalCorrect,
            totalEvaluations: updatedStats.totalEvaluations,
            points: updatedStats.points
        };
        if (updatedStats.aeCorrect !== undefined) metricsUpdate.aeCorrect = updatedStats.aeCorrect;
        if (updatedStats.esCorrect !== undefined) metricsUpdate.esCorrect = updatedStats.esCorrect;

        await userRef.update(metricsUpdate);

        // 2. Run badge checks against updated stats
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

        // Distinct styling: Unlocked badges get vibrant gold borders; locked badges are dimmed and greyscale
        const cardStyle = isUnlocked
            ? 'background: rgba(255, 204, 0, 0.1); border: 3px solid var(--primary-color); box-shadow: 0 2px 8px rgba(255, 205, 0, 0.15);'
            : 'background: var(--card-background); border: 1px solid var(--border-color); opacity: 0.45; filter: grayscale(100%);';

        const statusLabel = isUnlocked
            ? '<span style="color: #2ea043; font-weight: bold;">Unlocked ✓</span>'
            : '<span style="color: var(--light-text-color);">Locked 🔒</span>';

        return `
            <div class="badge-card" style="${cardStyle} padding: 0.8em; border-radius: 8px; text-align: center; transition: transform 0.15s ease;">
                <div style="font-size: 2.2rem; line-height: 1.2;">${badge.icon}</div>
                <div style="font-weight: bold; margin-top: 0.4em; font-size: 0.9rem;">${badge.title}</div>
                <div style="font-size: 0.75rem; color: var(--light-text-color); margin: 0.3em 0 0.5em 0; line-height: 1.3;">${badge.desc}</div>
                <div style="font-size: 0.7rem;">
                    ${statusLabel}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1em;">${html}</div>`;
}
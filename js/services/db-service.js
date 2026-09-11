import { database, SUPER_UID } from '../config.js';
import { state } from '../state.js';
import { showToast } from './user-service.js';
import { showConfirm } from '../pages/modal.js';

/**
 * Saves completed quiz score to Firebase Realtime Database
 * @param {Object} scoreData - Contains name, branch, score, pct, date
 * @returns {Promise<void>}
 */
export function saveScoreToDB(scoreData) {
    const payload = {
        ...scoreData,
        callsign: state.userCallsign || scoreData.name || "Anonymous",
        uid: state.currentUser ? state.currentUser.uid : null,
        timestamp: Date.now()
    };

    return database.ref("scores").push(payload);
}

/**
 * Fetches all score records once
 * @param {Function} callback - Callback function receiving array of score logs
 */
export function fetchScoresOnce(callback) {
    database.ref("scores").once("value", snapshot => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }

        let logs = [];
        snapshot.forEach(child => {
            logs.push({ key: child.key, ...child.val() });
        });
        callback(logs);
    }, error => {
        console.error("Error fetching scores once:", error);
        callback([]);
    });
}

/**
 * Fetches scores sorted by percentage descending
 * @param {Function} callback - Callback function receiving array of score logs
 */
export function fetchScoresOrderedByPct(callback) {
    database.ref("scores").orderByChild("pct").once("value", snapshot => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }

        let logs = [];
        snapshot.forEach(child => {
            logs.push({ key: child.key, ...child.val() });
        });

        // Firebase orders ascending, so reverse to display top scores first
        logs.reverse();
        callback(logs);
    }, error => {
        console.error("Error fetching ordered scores:", error);
        callback([]);
    });
}

/**
 * Registers or toggles an 'up' or 'down' vote on a question
 * @param {string} branchKey 
 * @param {string} questionId 
 * @param {string} voteType - 'up' or 'down'
 */
export async function voteQuestion(branchKey, questionId, voteType) {
    if (!state.currentUser) {
        showToast("You must be logged in to vote on questions!", "error");
        return;
    }

    const uid = state.currentUser.uid;
    const voteRef = database.ref(`subjects/${branchKey}/questions/${questionId}/votes/${uid}`);
    const snapshot = await voteRef.once("value");

    if (snapshot.exists() && snapshot.val() === voteType) {
        await voteRef.remove();
        showToast("Vote removed", "info");
    } else {
        await voteRef.set(voteType);
        showToast(voteType === "up" ? "Upvoted question!" : "Downvoted question", "info");
    }
}

/**
 * Toggles a report/flag on a question for moderator review
 * @param {string} branchKey 
 * @param {string} questionId 
 */
export async function toggleQuestionFlag(branchKey, questionId) {
    if (!state.currentUser) {
        showToast("You must be logged in to flag questions!", "error");
        return;
    }

    const uid = state.currentUser.uid;
    const flagRef = database.ref(`subjects/${branchKey}/questions/${questionId}/flags/${uid}`);
    const snapshot = await flagRef.once("value");

    if (snapshot.exists()) {
        await flagRef.remove();
        showToast("Flag removed", "info");
    } else {
        await flagRef.set(true);
        showToast("Question flagged for moderator review", "warning");
    }
}

/**
 * Sets verified status on a question (Admins & Mods only)
 * @param {string} branchKey 
 * @param {string} questionId 
 */
export async function verifyQuestion(branchKey, questionId) {
    const userRole = state.userRole || (state.currentUser?.uid === SUPER_UID ? "admin" : "user");
    if (userRole !== "admin" && userRole !== "mod") {
        showToast("Only moderators can verify questions!", "error");
        return;
    }

    try {
        await database.ref(`subjects/${branchKey}/questions/${questionId}`).update({
            verified: true,
            verifiedBy: state.currentUser.uid,
            verifiedAt: new Date().toISOString()
        });
        showToast("Question verified successfully!", "success");
    } catch (err) {
        showToast("Failed to verify question: " + err.message, "error");
    }
}

/**
 * Permanently deletes a question card from a subject module
 * @param {string} branchKey 
 * @param {string} questionId 
 */
export async function deleteQuestion(branchKey, questionId) {
    const confirmed = await showConfirm("Permanently delete this question?", "Delete Question");
    if (confirmed) {
        try {
            await database.ref(`subjects/${branchKey}/questions/${questionId}`).remove();
            showToast("Question deleted", "info");
        } catch (err) {
            showToast("Delete failed: " + err.message, "error");
        }
    }
}
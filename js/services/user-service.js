import { database } from '../config.js';
import { state } from '../state.js';

/**
 * Awards points to the logged-in user or triggers a prompt to non-logged-in guests.
 * @param {number} pointsToEarn - Number of points to credit.
 * @param {string} reason - Description of the achievement.
 */
export async function awardPoints(pointsToEarn, reason = "completing an activity") {
    const user = state.currentUser;

    if (!user) {
        showGuestPointPrompt(pointsToEarn, reason);
        return;
    }

    const userRef = database.ref(`users/${user.uid}/points`);

    try {
        const snapshot = await userRef.once('value');
        const currentPoints = snapshot.val() || 0;
        const newPoints = currentPoints + pointsToEarn;

        await userRef.set(newPoints);

        showToast(`+${pointsToEarn} Points Earned for ${reason}! Total: ${newPoints} pts`, "success");
    } catch (err) {
        console.error("Error updating user points:", err);
    }
}

/**
 * Displays a toast notification informing guests about missed points.
 */
function showGuestPointPrompt(points, reason) {
    showToast(
        `💡 Log in to claim ${points} points for ${reason}!`,
        "info"
    );
}

/**
 * Toast Notification Utility
 */
export function showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-bubble toast-${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add("toast-show"), 50);

    setTimeout(() => {
        toast.classList.remove("toast-show");
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
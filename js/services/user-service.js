import { database, SUPER_UID } from '../config.js';
import { state } from '../state.js';

/**
 * Assigns a role ('admin', 'mod', or 'user') to a target user UID
 * @param {string} targetUid 
 * @param {string} newRole - 'admin' | 'mod' | 'user'
 */
export async function updateUserRole(targetUid, newRole) {
    if (!state.currentUser) {
        showToast("You must be logged in!", "error");
        return;
    }

    const userUid = state.currentUser.uid;
    const isSuperAdmin = userUid === SUPER_UID;
    const currentRole = state.userRole || (isSuperAdmin ? "admin" : "user");

    if (currentRole !== "admin" && !isSuperAdmin) {
        showToast("Only Admins can modify user roles!", "error");
        return;
    }

    if (!["admin", "mod", "user"].includes(newRole)) {
        showToast("Invalid role specified.", "error");
        return;
    }

    try {
        await database.ref(`users/${targetUid}/role`).set(newRole);
        showToast(`User role updated to '${newRole.toUpperCase()}'`, "success");
    } catch (err) {
        showToast("Failed to update role: " + err.message, "error");
    }
}

/**
 * Searches users node by email or callsign to find target UID
 * @param {string} query 
 */
export async function findUserByQuery(query) {
    const cleanQuery = query.trim().toLowerCase();
    try {
        const snapshot = await database.ref("users").once("value");
        const users = snapshot.val() || {};

        for (const [uid, userData] of Object.entries(users)) {
            const email = (userData.email || "").toLowerCase();
            const callsign = (userData.callsign || "").toLowerCase();

            if (email === cleanQuery || callsign === cleanQuery || uid === query) {
                return { uid, ...userData };
            }
        }
    } catch (err) {
        console.error("Error searching users:", err);
    }
    return null;
}

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

    const pointsRef = database.ref(`users/${user.uid}/points`);

    try {
        const { snapshot } = await pointsRef.transaction((currentPoints) => {
            return (currentPoints || 0) + pointsToEarn;
        });

        const newPoints = snapshot.val();
        state.userPoints = newPoints; // Update local state

        // Sync header badge immediately
        const header = document.querySelector("site-header");
        if (header && typeof header.renderUser === 'function') {
            header.renderUser(state.userCallsign, state.userPoints);
        }

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

    const container = document.getElementById("toast-container");
    const lastToast = container?.lastElementChild;
    if (lastToast) {
        lastToast.style.cursor = "pointer";
        lastToast.addEventListener("click", () => {
            const header = document.querySelector("site-header");
            const googleAuthBtn = header ? header.querySelector("#google-auth-btn") : document.getElementById("google-auth-btn");
            if (googleAuthBtn) googleAuthBtn.click();
        });
    }
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
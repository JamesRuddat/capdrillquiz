import { database, SUPER_UID } from '../config.js';
import { state } from '../state.js';

/**
 * Assigns a role ('admin', 'mod', or 'user') to a target user UID
 */
export async function updateUserRole(targetUid, newRole) {
    if (!state.currentUser) {
        showToast("You must be logged in!", "error");
        return;
    }

    const userUid = state.currentUser.uid;
    const isSuper = userUid === SUPER_UID;
    const currentRole = state.userRole || (isSuper ? "admin" : "user");

    if (currentRole !== "admin" && !isSuper) {
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
 * Awards points to the logged-in user with instant optimistic UI update + DB transaction sync
 */
export async function awardPoints(pointsToEarn, reason = "completing an activity") {
    const user = state.currentUser;

    if (!user) {
        showGuestPointPrompt(pointsToEarn, reason);
        return;
    }

    // 1. Calculate optimistic new total and update UI instantly (0ms latency)
    const currentPoints = state.userPoints || 0;
    const optimisticTotal = currentPoints + pointsToEarn;
    state.updatePoints(optimisticTotal);

    showToast(`+${pointsToEarn} Points Earned for ${reason}! Total: ${optimisticTotal} pts`, "success");

    // 2. Synchronize in the background with Firebase Realtime DB
    const pointsRef = database.ref(`users/${user.uid}/points`);

    try {
        const { snapshot } = await pointsRef.transaction((dbPoints) => {
            return (dbPoints || 0) + pointsToEarn;
        });

        const syncedPoints = snapshot.val();
        if (syncedPoints !== optimisticTotal) {
            state.updatePoints(syncedPoints);
        }
    } catch (err) {
        console.error("Error syncing user points to database:", err);
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
            import('./auth-service.js').then(m => m.triggerAuthFlow());
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

/**
 * Converts a File object into a compressed Base64 Data URI.
 */
export function convertImageToBase64(file, maxWidth = 800, quality = 0.75) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error("Please select a valid image file."));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const base64String = canvas.toDataURL('image/jpeg', quality);
                resolve(base64String);
            };

            img.onerror = (err) => reject(new Error("Failed to load image into canvas: " + err));
        };

        reader.onerror = (err) => reject(new Error("Failed to read image file: " + err));
    });
}
import { auth, database } from '../config.js';
import { state } from '../state.js';
import { editUserCallsign, handleGoogleAuth, initializeUserCallsign } from '../services/auth-service.js';
import { renderUserBadges, evaluateUserBadges } from '../services/badge-service.js';

document.addEventListener("DOMContentLoaded", () => {
    const guestNotice = document.getElementById("profile-guest-notice");
    const profileContent = document.getElementById("profile-content");
    const signinBtn = document.getElementById("profile-signin-btn");
    const editBtn = document.getElementById("btn-change-callsign");

    if (signinBtn) signinBtn.onclick = () => handleGoogleAuth();
    if (editBtn) editBtn.onclick = () => editUserCallsign().then(() => loadUserProfile());

    // Helper to toggle visibility cleanly
    function showProfile() {
        if (guestNotice) {
            guestNotice.classList.add("hidden");
            guestNotice.style.display = "none";
        }
        if (profileContent) {
            profileContent.classList.remove("hidden");
            profileContent.style.display = "block";
        }
    }

    function showGuest() {
        if (guestNotice) {
            guestNotice.classList.remove("hidden");
            guestNotice.style.display = "block";
        }
        if (profileContent) {
            profileContent.classList.add("hidden");
            profileContent.style.display = "none";
        }
    }

    // 1. Check local session storage instantly
    const cachedUid = Object.keys(sessionStorage)
        .find(k => k.startsWith("callsign_"))
        ?.replace("callsign_", "");

    if (cachedUid) {
        showProfile();
    }

    // 2. React to Auth observer
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            showProfile();
            await initializeUserCallsign(user);
            await loadUserProfile();
        } else {
            showGuest();
        }
    });
});

async function loadUserProfile() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await database.ref(`users/${user.uid}`).once("value");
        const userData = snapshot.val() || {};

        const callsign = userData.callsign || state.userCallsign || "Anonymous Cadet";
        const points = userData.points || 0;
        const evals = userData.totalEvaluations || 0;
        const correct = userData.totalCorrect || 0;

        // Compile comprehensive user metrics to evaluate badge qualifications
        const userStats = {
            ...userData,
            points: points,
            totalEvaluations: evals,
            totalCorrect: correct,
            averagePct: evals > 0 ? (correct / (evals * 10)) * 100 : 0 // Fallback estimate
        };

        // 1. Check & persist earned badges based on current user statistics
        const updatedBadges = await evaluateUserBadges(userStats);
        const finalBadges = updatedBadges || userData.badges || {};

        // 2. DOM Binding
        const nameEl = document.getElementById("profile-callsign-display");
        const uidEl = document.getElementById("profile-uid-display");
        const ptsEl = document.getElementById("profile-points-display");
        const evalsEl = document.getElementById("stat-evals-count");
        const correctEl = document.getElementById("stat-correct-count");

        if (nameEl) nameEl.innerText = callsign;
        if (uidEl) uidEl.innerText = `UID: ${user.uid}`;
        if (ptsEl) ptsEl.innerText = `⭐ ${points} pts`;
        if (evalsEl) evalsEl.innerText = evals;
        if (correctEl) correctEl.innerText = correct;

        // 3. Render Badges Showcase (Displays Earned vs Locked Badges)
        renderUserBadges("user-badges-grid", finalBadges);

    } catch (err) {
        console.error("Failed to load profile data:", err);
    }
}
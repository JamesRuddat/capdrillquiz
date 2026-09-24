import { auth, googleProvider, database } from '../config.js';
import { state } from '../state.js';
import { showToast } from './user-service.js';
import { showPrompt, showModal, showConfirm } from './modal-service.js';
import { renderLeaderboard } from '../components/leaderboard.js';

// Instantiate Microsoft OAuth Provider
const microsoftProvider = new firebase.auth.OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({ prompt: 'select_account' });

const CALLSIGNS = [
    "Patrol", "Patroller", "Squadron", "Falcon", "Viper", "Stratus", "Maverick", "Skyhawk", "Apex", "Eagle", "Ghost", "Stealth", "Vector", "Thunder", "Raven",
    "Neutron", "Quark", "Photon", "Tachyonic", "Vector-Zero", "Entropy", "Zero-Point", "Singularity", "Orbital", "Parallax", "Flux", "Zenith",
    "Matrix", "Cipher", "Tardis", "Kessel", "Cyber", "Glitch", "Hyperdrive", "Sprocket", "Skywalker", "Vader", "Warp-Core", "Holo",
    "Sudo", "Kernel", "Stack", "Byte", "Binary", "Bit-Flip", "Nand", "Router", "Payload", "Hex", "Data-Stream", "Cache",
    "Sputnik", "Aero", "Azimuth", "Baud", "Telepathy", "Galileo", "Copernicus", "Squelch", "Radar", "Beacon", "Telemetry", "Altimeter"
];

/**
 * Resets application user state and persistent local cache
 */
function resetAuthState() {
    if (state.userUid) {
        localStorage.removeItem(`welcomed_${state.userUid}`);
    }
    state.setUser(null, null, 0);
    state.authInitialized = false;
}

// Global Auth State Observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        await initializeUserCallsign(user);
    } else {
        resetAuthState();
    }
});

/**
 * Common sign-out handler
 */
export async function handleSignOut() {
    try {
        await auth.signOut();
        resetAuthState();
        showToast("Signed out successfully.", "info");
        renderLeaderboard();
    } catch (error) {
        showToast(`Error signing out: ${error.message}`, "error");
    }
}

/**
 * Account linking handler for collision resolution
 */
async function handleAccountCollision(error, attemptedProviderName) {
    const pendingCredential = error.credential;
    const email = error.email;

    const shouldLink = await showConfirm(
        `An account registered with ${email} already exists using a different sign-in method. Would you like to sign in with Google to link your ${attemptedProviderName} account?`,
        "Account Already Exists"
    );

    if (shouldLink) {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            if (result?.user && pendingCredential) {
                await result.user.linkWithCredential(pendingCredential);
                showToast(`${attemptedProviderName} successfully linked to your account!`, "success");
                await initializeUserCallsign(result.user);
            }
        } catch (linkError) {
            console.error("Account linking error:", linkError);
            showToast(`Failed to link account: ${linkError.message}`, "error");
        }
    }
}

export async function handleGoogleAuth() {
    if (state.currentUser) {
        await handleSignOut();
    } else {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            if (result?.user) {
                await initializeUserCallsign(result.user);
            }
        } catch (error) {
            if (error.code === 'auth/account-exists-with-different-credential') {
                await handleAccountCollision(error, "Google");
            } else if (error.code !== 'auth/popup-closed-by-user') {
                console.error("Google Auth Error:", error);
                showToast(`Authentication Failed: ${error.message}`, "error");
            }
        }
    }
}

export async function handleMicrosoftAuth() {
    if (state.currentUser) {
        await handleSignOut();
    } else {
        try {
            const result = await auth.signInWithPopup(microsoftProvider);
            if (result?.user) {
                await initializeUserCallsign(result.user);
            }
        } catch (error) {
            if (error.code === 'auth/account-exists-with-different-credential') {
                await handleAccountCollision(error, "Microsoft");
            } else if (error.code !== 'auth/popup-closed-by-user') {
                console.error("Microsoft Auth Error:", error);
                showToast(`Authentication Failed: ${error.message}`, "error");
            }
        }
    }
}

export async function triggerAuthFlow() {
    if (state.currentUser) {
        await handleSignOut();
        return;
    }

    const container = document.createElement("div");
    container.className = "flex-col gap-md width-full";

    const googleBtn = document.createElement("button");
    googleBtn.type = "button";
    googleBtn.className = "btn-tactical btn-blue width-full flex-row";
    googleBtn.innerHTML = `
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style="width:18px;height:18px;">
        <span>Sign in with Google</span>
    `;
    googleBtn.onclick = () => {
        const overlay = document.getElementById("custom-modal-overlay");
        if (overlay) overlay.classList.add("hidden");
        handleGoogleAuth();
    };

    const msBtn = document.createElement("button");
    msBtn.type = "button";
    msBtn.className = "btn-tactical btn-blue width-full flex-row";
    msBtn.innerHTML = `
        <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" style="width:18px;height:18px;">
        <span>Sign in with Microsoft</span>
    `;
    msBtn.onclick = () => {
        const overlay = document.getElementById("custom-modal-overlay");
        if (overlay) overlay.classList.add("hidden");
        handleMicrosoftAuth();
    };

    container.appendChild(googleBtn);
    container.appendChild(msBtn);

    await showModal(container, "Select Authentication Provider");
}

export function generateTacticalCallsign() {
    const callsign = CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)];
    const num = Math.floor(10 + Math.random() * 89);
    return `${callsign}-${num}`;
}

export async function initializeUserCallsign(user) {
    if (!user) return null;

    // 1. Instant Cache Hydration
    const cachedCallsign = localStorage.getItem(`callsign_${user.uid}`);
    const cachedPoints = parseInt(localStorage.getItem(`points_${user.uid}`) || "0", 10);
    const hasBeenWelcomed = localStorage.getItem(`welcomed_${user.uid}`);

    if (cachedCallsign) {
        state.setUser(user, cachedCallsign, cachedPoints);

        if (!hasBeenWelcomed) {
            localStorage.setItem(`welcomed_${user.uid}`, "true");
            state.authInitialized = true;
            showToast(`Welcome back, ${cachedCallsign}! Ready for duty.`, "success");
        }
        return cachedCallsign;
    }

    // 2. Database Fetch
    try {
        const userRef = database.ref(`users/${user.uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val() || {};

        let finalCallsign = userData.callsign;
        const isNewUser = !finalCallsign;

        if (isNewUser) {
            const defaultCallsign = generateTacticalCallsign();
            const chosenCallsign = await showPrompt(
                "Welcome to PROP! To protect you on public leaderboards, confirm or customize your callsign below:",
                defaultCallsign,
                "Welcome!"
            );

            finalCallsign = chosenCallsign?.trim() || defaultCallsign;

            await userRef.update({
                callsign: finalCallsign,
                provider: user.providerData[0]?.providerId || 'unknown',
                createdAt: new Date().toISOString()
            });
        }

        const points = userData.points || 0;
        state.setUser(user, finalCallsign, points);

        const hasBeenWelcomedDb = localStorage.getItem(`welcomed_${user.uid}`);
        if (!hasBeenWelcomedDb) {
            localStorage.setItem(`welcomed_${user.uid}`, "true");
            state.authInitialized = true;
            const welcomeMsg = isNewUser
                ? `Welcome, ${finalCallsign}! Tactical handle initialized.`
                : `Welcome back, ${finalCallsign}! Ready for duty.`;
            showToast(welcomeMsg, "success");
        }

        renderLeaderboard();
        return finalCallsign;
    } catch (err) {
        console.error("Failed to initialize user callsign:", err);
        return null;
    }
}

export async function editUserCallsign() {
    const user = state.currentUser;
    if (!user) {
        showToast("Please log in to edit your callsign.", "info");
        return;
    }

    const current = state.userCallsign || generateTacticalCallsign();
    const newCallsign = await showPrompt(
        "Enter a new tactical handle for public leaderboards:",
        current,
        "Update Callsign"
    );

    if (newCallsign?.trim()) {
        const cleanCallsign = newCallsign.trim();
        try {
            await database.ref(`users/${user.uid}/callsign`).set(cleanCallsign);
            state.setUser(user, cleanCallsign, state.userPoints);
            renderLeaderboard();
            showToast(`Callsign updated: ${cleanCallsign}`, "success");
        } catch (err) {
            console.error("Failed to update callsign:", err);
            showToast("Failed to update callsign.", "error");
        }
    }
}
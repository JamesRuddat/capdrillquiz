import { auth, googleProvider, database } from '../config.js';
import { state } from '../state.js';
import { showToast } from './user-service.js';
import { showPrompt, showModal, showConfirm } from '../pages/modal.js';
import { renderLeaderboard } from '../components/leaderboard.js';

// Instantiate Microsoft OAuth Provider
const microsoftProvider = new firebase.auth.OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
    prompt: 'select_account'
});

const CALLSIGNS = [
    // --- Tactical, Unit & Patrol Handles ---
    "Patrol", "Patroller", "Squadron", "Falcon", "Viper", "Stratus", "Maverick", "Skyhawk", "Apex", "Eagle", "Ghost", "Stealth", "Vector", "Thunder", "Raven",
    // --- STEM & Physics ---
    "Neutron", "Quark", "Photon", "Tachyonic", "Vector-Zero", "Entropy", "Zero-Point", "Singularity", "Orbital", "Parallax", "Flux", "Zenith",
    // --- Sci-Fi & Lore ---
    "Matrix", "Cipher", "Tardis", "Kessel", "Cyber", "Glitch", "Hyperdrive", "Sprocket", "Skywalker", "Vader", "Warp-Core", "Holo",
    // --- Computing & Tech ---
    "Sudo", "Kernel", "Stack", "Byte", "Binary", "Bit-Flip", "Nand", "Router", "Payload", "Hex", "Data-Stream", "Cache",
    // --- Avionics, Space & Radio ---
    "Sputnik", "Aero", "Azimuth", "Baud", "Telepathy", "Galileo", "Copernicus", "Squelch", "Radar", "Beacon", "Telemetry", "Altimeter"
];

// Helper: Safely trigger site-header UI updates
function syncHeaderUI(method, ...args) {
    const header = document.querySelector("site-header");
    if (header && typeof header[method] === 'function') {
        header[method](...args);
    }
}

// Helper: Reset application user state and active session storage
function resetAuthState() {
    if (state.currentUser?.uid) {
        sessionStorage.removeItem(`callsign_${state.currentUser.uid}`);
        sessionStorage.removeItem(`points_${state.currentUser.uid}`);
        sessionStorage.removeItem(`welcomed_${state.currentUser.uid}`);
    }
    state.currentUser = null;
    state.userUid = null;
    state.userCallsign = null;
    state.userPoints = 0;
    state.authInitialized = false;

    syncHeaderUI('renderGuest');
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
 * Common sign-out handler for all auth providers
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
 * Universal handler to resolve duplicate account credentials across all OAuth providers
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
            // Sign in with original provider (e.g. Google)
            const result = await auth.signInWithPopup(googleProvider);
            
            // Link the attempted provider credential to the logged-in user
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

/**
 * Handles Google Auth sign-in popup flow
 */
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

/**
 * Handles Microsoft Auth sign-in popup flow
 */
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

/**
 * Prompts user to select an OAuth provider (Google / Microsoft)
 * or executes sign-out if already logged in.
 */
export async function triggerAuthFlow() {
    if (state.currentUser) {
        await handleSignOut();
        return;
    }

    const container = document.createElement("div");
    container.style.cssText = "display: flex; flex-direction: column; gap: 0.8em; width: 100%;";

    const googleBtn = document.createElement("button");
    googleBtn.type = "button";
    googleBtn.className = "btn-tactical btn-blue";
    googleBtn.style.cssText = "width: 100%; justify-content: flex-start; gap: 10px; padding: 0.8em;";
    googleBtn.innerHTML = `
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style="width: 18px; height: 18px; pointer-events: none;">
        <span>Sign in with Google</span>
    `;
    googleBtn.onclick = () => {
        const overlay = document.getElementById("custom-modal-overlay");
        if (overlay) overlay.classList.add("hidden");
        handleGoogleAuth();
    };

    const msBtn = document.createElement("button");
    msBtn.type = "button";
    msBtn.className = "btn-tactical btn-blue";
    msBtn.style.cssText = "width: 100%; justify-content: flex-start; gap: 10px; padding: 0.8em;";
    msBtn.innerHTML = `
        <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" style="width: 18px; height: 18px; pointer-events: none;">
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

/**
 * Generates a random tactical callsign handle (e.g. Patrol-42)
 */
export function generateTacticalCallsign() {
    const callsign = CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)];
    const num = Math.floor(10 + Math.random() * 89);
    return `${callsign}-${num}`;
}

/**
 * Ensures user has an assigned callsign in Firebase upon logging in
 */
export async function initializeUserCallsign(user) {
    if (!user) return null;

    state.currentUser = user;
    state.userUid = user.uid;

    const cachedCallsign = sessionStorage.getItem(`callsign_${user.uid}`);
    const cachedPoints = sessionStorage.getItem(`points_${user.uid}`);
    const hasBeenWelcomed = sessionStorage.getItem(`welcomed_${user.uid}`);

    // 1. FAST PATH: Local Session Cache
    if (cachedCallsign !== null) {
        state.userCallsign = cachedCallsign;
        state.userPoints = cachedPoints ? parseInt(cachedPoints, 10) : 0;

        syncHeaderUI('renderUser', state.userCallsign, state.userPoints);

        if (!hasBeenWelcomed) {
            sessionStorage.setItem(`welcomed_${user.uid}`, "true");
            state.authInitialized = true;
            showToast(`Welcome back, ${state.userCallsign}! Ready for duty.`, "success");
        }
        return state.userCallsign;
    }

    // 2. SLOW PATH: Database Fetch
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

        state.userCallsign = finalCallsign;
        state.userPoints = userData.points || 0;

        sessionStorage.setItem(`callsign_${user.uid}`, finalCallsign);
        sessionStorage.setItem(`points_${user.uid}`, state.userPoints.toString());

        if (!state.authInitialized) {
            state.authInitialized = true;
            const welcomeMsg = isNewUser 
                ? `Welcome, ${finalCallsign}! Tactical handle initialized.`
                : `Welcome back, ${finalCallsign}! Ready for duty.`;
            showToast(welcomeMsg, "success");
        }

        syncHeaderUI('renderUser', state.userCallsign, state.userPoints);
        renderLeaderboard();

        return state.userCallsign;
    } catch (err) {
        console.error("Failed to initialize user callsign:", err);
        return null;
    }
}

/**
 * Allows the user to update their callsign from the UI menu
 */
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
            
            state.userCallsign = cleanCallsign;
            sessionStorage.setItem(`callsign_${user.uid}`, cleanCallsign);

            syncHeaderUI('renderUser', cleanCallsign, state.userPoints || 0);
            renderLeaderboard();

            showToast(`Callsign updated: ${cleanCallsign}`, "success");
        } catch (err) {
            console.error("Failed to update callsign:", err);
            showToast("Failed to update callsign.", "error");
        }
    }
}
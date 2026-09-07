import { auth, googleProvider, database } from '../config.js';
import { state } from '../state.js';
import { showToast } from './user-service.js';
import { showPrompt } from '../components/modal.js';
import { renderLeaderboard } from '../components/leaderboard.js';

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
 * Toggles Google Auth sign-in and sign-out via Popup Flow
 */
export async function handleGoogleAuth() {
    if (state.currentUser) {
        try {
            await auth.signOut();
            resetAuthState();
            showToast("Signed out successfully.", "info");
            renderLeaderboard();
        } catch (error) {
            showToast(`Error signing out: ${error.message}`, "error");
        }
    } else {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            if (result?.user) {
                await initializeUserCallsign(result.user);
            }
        } catch (error) {
            if (error.code !== 'auth/popup-closed-by-user') {
                console.error("Google Auth Error:", error);
                showToast(`Authentication Failed: ${error.message}`, "error");
            }
        }
    }
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
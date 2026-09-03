import { auth, googleProvider, database } from '../config.js';
import { state } from '../state.js';
import { showToast } from './user-service.js';
import { showPrompt } from '../components/modal.js';

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

/**
 * Toggles Google Auth sign-in and sign-out
 */
export async function handleGoogleAuth() {
    if (state.currentUser) {
        try {
            const uid = state.currentUser.uid;
            await auth.signOut();
            
            // Clear session caches
            sessionStorage.removeItem(`callsign_${uid}`);
            sessionStorage.removeItem(`points_${uid}`);
            
            showToast("Signed out successfully.", "info");
        } catch (error) {
            showToast("Error signing out: " + error.message, "error");
        }
    } else {
        try {
            await auth.signInWithPopup(googleProvider);
        } catch (error) {
            console.error("Google Auth Error:", error);
            showToast("Authentication Failed: " + error.message, "error");
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

    // 1. FAST PATH: Check local session cache first to eliminate navigation load times
    const cachedCallsign = sessionStorage.getItem(`callsign_${user.uid}`);
    const cachedPoints = sessionStorage.getItem(`points_${user.uid}`);

    if (cachedCallsign !== null) {
        state.userCallsign = cachedCallsign;
        state.userPoints = cachedPoints ? parseInt(cachedPoints, 10) : 0;
        return state.userCallsign;
    }

    // 2. SLOW PATH: Fetch from Firebase only on initial login or uncached session
    try {
        const userRef = database.ref(`users/${user.uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val() || {};

        let finalCallsign = userData.callsign;

        // First-Time Sign-In Prompt
        if (!finalCallsign) {
            const defaultCallsign = generateTacticalCallsign();
            
            const chosenCallsign = await showPrompt(
                "Welcome to PROP! To protect you on public leaderboards, confirm or customize your callsign below:",
                defaultCallsign,
                "Welcome!"
            );

            finalCallsign = (chosenCallsign && chosenCallsign.trim() !== '') 
                ? chosenCallsign.trim() 
                : defaultCallsign;

            await userRef.update({
                callsign: finalCallsign,
                createdAt: new Date().toISOString()
            });

            showToast(`Welcome, ${finalCallsign}! Tactical handle initialized.`, "success");
        } else {
            showToast(`Welcome back, ${finalCallsign}! Ready for duty.`, "success");
        }

        // Store state & update local cache
        state.userCallsign = finalCallsign;
        state.userPoints = userData.points || 0;

        sessionStorage.setItem(`callsign_${user.uid}`, finalCallsign);
        sessionStorage.setItem(`points_${user.uid}`, state.userPoints.toString());

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

    if (newCallsign && newCallsign.trim() !== '') {
        const cleanCallsign = newCallsign.trim();
        
        try {
            await database.ref(`users/${user.uid}/callsign`).set(cleanCallsign);
            
            // 1. Update state & sync local session cache immediately
            state.userCallsign = cleanCallsign;
            sessionStorage.setItem(`callsign_${user.uid}`, cleanCallsign);

            // 2. Sync site-header component badge
            const header = document.querySelector("site-header");
            if (header && typeof header.renderUser === 'function') {
                header.renderUser(cleanCallsign, state.userPoints || 0);
            }

            showToast(`Callsign updated: ${cleanCallsign}`, "success");
        } catch (err) {
            console.error("Failed to update callsign:", err);
            showToast("Failed to update callsign.", "error");
        }
    }
}
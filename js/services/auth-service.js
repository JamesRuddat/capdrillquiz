import { auth, googleProvider } from '../config.js';
import { state } from '../state.js';

export async function handleGoogleAuth() {
    if (state.currentUser) {
        try {
            await auth.signOut();
        } catch (error) {
            alert("Error signing out: " + error.message);
        }
    } else {
        try {
            await auth.signInWithPopup(googleProvider);
        } catch (error) {
            console.error("Google Auth Error:", error);
            alert("Authentication Failed: " + error.message);
        }
    }
}
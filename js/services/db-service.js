import { database } from '../config.js';
import { state } from '../state.js';

/**
 * Saves completed quiz score to Firebase Realtime Database
 * @param {Object} scoreData - Contains name, branch, score, pct, date
 * @returns {Promise<void>}
 */
export function saveScoreToDB(scoreData) {
    const payload = {
        ...scoreData,
        callsign: state.userCallsign || scoreData.name || "Anonymous Cadet",
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
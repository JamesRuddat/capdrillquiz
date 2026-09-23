import { database, SUPER_UID } from '../config.js';
import { state } from '../state.js';
import { showToast } from './user-service.js';
import { showConfirm } from '../pages/modal.js';

/**
 * Validates and inserts a single subject or mass JSON object containing multiple subjects into Firebase.
 * Supports zero-question datasets (e.g., study guides, tools, and overview nodes).
 * 
 * @param {Object|string} rawJson - Raw JSON string or parsed object
 * @returns {Promise<boolean>}
 */
export async function insertQuizDataset(rawJson) {
    const uid = state.userUid || (state.currentUser ? state.currentUser.uid : null);
    if (!uid) {
        showToast("You must be logged in to create or import quiz datasets!", "error");
        return false;
    }

    let parsedData;

    // 1. Sanitize and parse JSON string input
    try {
        if (typeof rawJson === 'string') {
            let sanitized = rawJson.trim();
            if (sanitized.startsWith('```')) {
                sanitized = sanitized.replace(/^```(json)?/, '').replace(/```$/, '').trim();
            }
            parsedData = JSON.parse(sanitized);
        } else {
            parsedData = rawJson;
        }
    } catch (e) {
        showToast("Invalid JSON syntax: " + e.message, "error");
        return false;
    }

    // 2. Validate Root Keys
    const rootKeys = Object.keys(parsedData);
    if (rootKeys.length === 0) {
        showToast("Schema Error: Root JSON object cannot be empty.", "error");
        return false;
    }

    let totalSaved = 0;

    // 3. Loop over ALL root keys in the JSON payload (mass import)
    for (const branchKey of rootKeys) {
        const subjectData = parsedData[branchKey];

        if (!subjectData || typeof subjectData !== 'object') {
            continue;
        }

        if (!subjectData.branchName) {
            showToast(`Schema Error in '${branchKey}': Missing required 'branchName'.`, "error");
            return false;
        }

        // Validate Questions & Links
        const questionsArray = Array.isArray(subjectData.questions) ? subjectData.questions : [];
        const linksArray = Array.isArray(subjectData.links) ? subjectData.links : [];

        const hasResourceHoldings = linksArray.length > 0 || Boolean(subjectData.url) || Boolean(subjectData.pdfUrl);
        const isOverviewNode = branchKey.includes("MILESTONE") || branchKey.includes("OVERVIEW") || (subjectData.category && subjectData.category.includes("Achievement"));

        // Allow zero questions IF the node has links, external URLs, or represents an overview/milestone card
        if (questionsArray.length === 0 && !hasResourceHoldings && !isOverviewNode) {
            showToast(`Schema Error in '${branchKey}': Subject must contain questions, links, or a valid URL reference.`, "error");
            return false;
        }

        // Validate Individual Question Objects if present
        for (let idx = 0; idx < questionsArray.length; idx++) {
            const q = questionsArray[idx];
            if (!q.q || typeof q.q !== 'string') {
                showToast(`Schema Error in '${branchKey}': Question #${idx + 1} is missing a valid 'q' string.`, "error");
                return false;
            }
            if (!Array.isArray(q.options) || q.options.length !== 4) {
                showToast(`Schema Error in '${branchKey}': Question #${idx + 1} must contain exactly 4 'options'.`, "error");
                return false;
            }
            if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) {
                showToast(`Schema Error in '${branchKey}': Question #${idx + 1} must have a valid 'answer' index (0-3).`, "error");
                return false;
            }
        }

        // Transform Questions Array to Firebase Map
        const questionsMap = {};
        questionsArray.forEach((q, idx) => {
            const qId = `q_${Date.now()}_${idx}`;
            questionsMap[qId] = {
                q: q.q,
                imageUrl: q.imageUrl || "",
                options: q.options,
                answer: q.answer,
                explanation: q.explanation || "",
                upvotes: 0,
                downvotes: 0,
                createdBy: uid,
                createdAt: new Date().toISOString()
            };
        });

        // Format dynamic multi-links array
        const formattedLinks = linksArray.map(l => ({
            label: l.label || "Resource Link",
            url: l.url || "#",
            type: l.type || "quiz"
        }));

        // Build Final Payload
        const payload = {
            branchName: subjectData.branchName,
            category: subjectData.category || "General",
            publication: subjectData.publication || "Civil Air Patrol Cadet Program",
            pdfUrl: subjectData.pdfUrl || "",
            url: subjectData.url || "",
            links: formattedLinks,
            description: subjectData.description || "",
            imageUrl: subjectData.imageUrl || "",
            createdBy: uid,
            createdAt: new Date().toISOString(),
            questions: questionsMap
        };

        // Persist each subject into Firebase Realtime Database
        try {
            await database.ref(`subjects/${branchKey}`).set(payload);
            totalSaved++;
        } catch (err) {
            console.error(`Database insert error for ${branchKey}:`, err);
            showToast(`Failed to save dataset '${branchKey}': ` + err.message, "error");
            return false;
        }
    }

    showToast(`Successfully inserted ${totalSaved} dataset node(s) to Firebase!`, "success");
    return true;
}

/**
 * Saves completed quiz score to Firebase Realtime Database
 */
export async function saveScoreToDB(scoreData) {
    const payload = {
        ...scoreData,
        callsign: state.userCallsign || scoreData.name || "Anonymous",
        uid: state.userUid || (state.currentUser ? state.currentUser.uid : null),
        timestamp: Date.now()
    };

    try {
        await database.ref("scores").push(payload);
    } catch (err) {
        console.error("Error saving score to database:", err);
        showToast("Failed to record score online.", "error");
    }
}

/**
 * Fetches all score records once
 */
export async function fetchScoresOnce(callback) {
    try {
        const snapshot = await database.ref("scores").once("value");
        if (!snapshot.exists()) {
            if (callback) callback([]);
            return [];
        }

        let logs = [];
        snapshot.forEach(child => {
            logs.push({ key: child.key, ...child.val() });
        });

        if (callback) callback(logs);
        return logs;
    } catch (error) {
        console.error("Error fetching scores once:", error);
        if (callback) callback([]);
        return [];
    }
}

/**
 * Fetches scores sorted by percentage descending
 */
export async function fetchScoresOrderedByPct(callback) {
    try {
        const snapshot = await database.ref("scores").orderByChild("pct").once("value");
        if (!snapshot.exists()) {
            if (callback) callback([]);
            return [];
        }

        let logs = [];
        snapshot.forEach(child => {
            logs.push({ key: child.key, ...child.val() });
        });

        logs.reverse();
        if (callback) callback(logs);
        return logs;
    } catch (error) {
        console.error("Error fetching ordered scores:", error);
        if (callback) callback([]);
        return [];
    }
}

/**
 * Registers or toggles an 'up' or 'down' vote on a question
 */
export async function voteQuestion(branchKey, questionId, voteType) {
    const uid = state.userUid || (state.currentUser ? state.currentUser.uid : null);
    if (!uid) {
        showToast("You must be logged in to vote on questions!", "error");
        return;
    }

    const voteRef = database.ref(`subjects/${branchKey}/questions/${questionId}/votes/${uid}`);
    const snapshot = await voteRef.once("value");

    if (snapshot.exists() && snapshot.val() === voteType) {
        await voteRef.remove();
        showToast("Vote removed", "info");
    } else {
        await voteRef.set(voteType);
        showToast(voteType === "up" ? "Upvoted question!" : "Downvoted question", "info");
    }
}

/**
 * Toggles a report/flag on a question for moderator review
 */
export async function toggleQuestionFlag(branchKey, questionId) {
    const uid = state.userUid || (state.currentUser ? state.currentUser.uid : null);
    if (!uid) {
        showToast("You must be logged in to flag questions!", "error");
        return;
    }

    const flagRef = database.ref(`subjects/${branchKey}/questions/${questionId}/flags/${uid}`);
    const snapshot = await flagRef.once("value");

    if (snapshot.exists()) {
        await flagRef.remove();
        showToast("Flag removed", "info");
    } else {
        await flagRef.set(true);
        showToast("Question flagged for moderator review", "warning");
    }
}

/**
 * Sets verified status on a question (Admins & Mods only)
 */
export async function verifyQuestion(branchKey, questionId) {
    const uid = state.userUid || (state.currentUser ? state.currentUser.uid : null);
    const userRole = state.userRole || (uid === SUPER_UID ? "admin" : "user");

    if (userRole !== "admin" && userRole !== "mod") {
        showToast("Only moderators can verify questions!", "error");
        return;
    }

    try {
        await database.ref(`subjects/${branchKey}/questions/${questionId}`).update({
            verified: true,
            verifiedBy: uid,
            verifiedAt: new Date().toISOString()
        });
        showToast("Question verified successfully!", "success");
    } catch (err) {
        showToast("Failed to verify question: " + err.message, "error");
    }
}

/**
 * Permanently deletes a question card from a subject
 */
export async function deleteQuestion(branchKey, questionId) {
    const confirmed = await showConfirm("Permanently delete this question?", "Delete Question");
    if (confirmed) {
        try {
            await database.ref(`subjects/${branchKey}/questions/${questionId}`).remove();
            showToast("Question deleted", "info");
        } catch (err) {
            showToast("Delete failed: " + err.message, "error");
        }
    }
}
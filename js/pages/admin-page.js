import { database, SUPER_UID } from '../config.js';
import { state } from '../state.js';
import { showToast, updateUserRole } from '../services/user-service.js';
import { deleteQuestion, verifyQuestion } from '../services/db-service.js';
import { showConfirm } from './modal.js';

let cachedUsersData = {};

/**
 * Controller: Admin & Personnel Panel Controller
 */
export function initAdminPage() {
    const authGuard = document.getElementById("admin-auth-guard");
    const searchBtn = document.getElementById("btn-admin-search");
    const searchInput = document.getElementById("admin-user-search");

    // Guard view against non-authorized users
    const checkAuth = () => {
        const userUid = state.currentUser ? state.currentUser.uid : null;
        const isSuper = userUid === SUPER_UID;
        const userRole = state.userRole || (isSuper ? "admin" : "user");

        if (!state.currentUser || (userRole !== "admin" && userRole !== "mod" && !isSuper)) {
            if (authGuard) {
                authGuard.innerHTML = `<span class="auth-denied"><strong>ACCESS DENIED:</strong> You must be an Admin or Moderator to view this page.</span>`;
            }
            return false;
        }

        if (authGuard) {
            authGuard.innerHTML = `Authorized as: <strong>${userRole.toUpperCase()}</strong> (${state.userCallsign || state.currentUser.email})`;
        }
        return true;
    };

    if (!checkAuth()) return;

    if (searchBtn) {
        searchBtn.onclick = () => performUserSearch(searchInput?.value);
    }

    if (searchInput) {
        // Real-time directory table filtering as user types
        searchInput.oninput = (e) => filterPersonnelTable(e.target.value);
        searchInput.onkeyup = (e) => {
            if (e.key === "Enter") performUserSearch(searchInput.value);
        };
    }

    renderPersonnelList();
    renderFlaggedQuestionsTable();
}

/**
 * Renders the full directory of registered personnel with search-filter capability
 */
export async function renderPersonnelList() {
    const container = document.getElementById("admin-user-list-container");
    if (!container) return;

    try {
        const snapshot = await database.ref("users").once("value");
        cachedUsersData = snapshot.val() || {};

        const userUid = state.currentUser ? state.currentUser.uid : null;
        const isSuper = userUid === SUPER_UID;
        const userKeys = Object.keys(cachedUsersData);

        if (userKeys.length === 0) {
            container.innerHTML = `<p class="subtext">No registered personnel profiles found.</p>`;
            return;
        }

        let html = `
            <table class="admin-table width-full" id="admin-personnel-table">
                <thead>
                    <tr>
                        <th>Callsign / Email</th>
                        <th>Role</th>
                        <th>Points</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        userKeys.forEach(uid => {
            const u = cachedUsersData[uid] || {};
            const role = u.role || "user";
            const callsign = u.callsign || "Unknown Cadet";
            const email = u.email || "No Email";
            const points = u.points || 0;

            const isTargetSuper = uid === SUPER_UID;
            const canChange = isSuper || (!isTargetSuper && state.userRole === "admin");

            html += `
                <tr class="personnel-row" data-search="${callsign.toLowerCase()} ${email.toLowerCase()} ${uid.toLowerCase()}">
                    <td>
                        <strong>${callsign}</strong>
                        <div class="subtext">Email: ${email}</div>
                        <div class="subtext font-mono">UID: ${uid}</div>
                    </td>
                    <td><span class="badge-status badge-${role}">${role.toUpperCase()}</span></td>
                    <td><strong>${points} pts</strong></td>
                    <td>
                        <div class="flex-row gap-xs">
                            <button class="btn-tactical btn-blue btn-sm" onclick="window.inspectUser('${uid}')">
                                Inspect 🔍
                            </button>
                            ${canChange ? `
                                <select class="admin-role-select form-select-inline" onchange="window.handleRoleChange('${uid}', this.value)">
                                    <option value="user" ${role === 'user' ? 'selected' : ''}>Cadet</option>
                                    <option value="mod" ${role === 'mod' ? 'selected' : ''}>Moderator</option>
                                    <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;

    } catch (err) {
        console.error("Failed to load personnel list:", err);
        container.innerHTML = `<p class="text-incorrect">Failed to load personnel roster: ${err.message}</p>`;
    }
}

/**
 * Live client-side filtering for personnel directory table
 */
function filterPersonnelTable(query) {
    const term = (query || "").toLowerCase().trim();
    const rows = document.querySelectorAll("#admin-personnel-table .personnel-row");

    rows.forEach(row => {
        const searchData = row.dataset.search || "";
        if (!term || searchData.includes(term)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

/**
 * Inspects a specific user by UID directly from the directory table
 */
window.inspectUser = function (uid) {
    if (!uid) return;
    performUserSearch(uid);
};

/**
 * Handles role updates from directory table
 */
window.handleRoleChange = async function (targetUid, newRole) {
    const confirmed = await showConfirm(`Change role for user to '${newRole.toUpperCase()}'?`, "Update Personnel Role");
    if (confirmed) {
        try {
            await updateUserRole(targetUid, newRole);
            showToast("Role updated successfully!", "success");
            renderPersonnelList();
        } catch (err) {
            showToast("Failed to update role: " + err.message, "error");
        }
    }
};

/**
 * Fetches user profile, scores, and authored questions for inspection
 */
async function performUserSearch(query) {
    if (!query || query.trim() === "") {
        showToast("Please enter an Email, Callsign, or UID to search.", "error");
        return;
    }

    const cleanQuery = query.trim().toLowerCase();
    const container = document.getElementById("admin-user-profile-container");
    if (container) container.innerHTML = `<div class="admin-search-loading">Searching user database...</div>`;

    try {
        let matchedUid = null;
        let matchedUserData = null;

        for (const [uid, uData] of Object.entries(cachedUsersData)) {
            const email = (uData.email || "").toLowerCase();
            const callsign = (uData.callsign || "").toLowerCase();

            if (email === cleanQuery || callsign === cleanQuery || uid === query.trim()) {
                matchedUid = uid;
                matchedUserData = uData;
                break;
            }
        }

        if (!matchedUid) {
            if (container) container.innerHTML = `<div class="quiz-card admin-search-empty">No user found matching "<strong>${query}</strong>"</div>`;
            return;
        }

        const scoresSnap = await database.ref("scores").once("value");
        const allScores = scoresSnap.val() || {};
        const userScores = [];

        Object.values(allScores).forEach(score => {
            if (score.uid === matchedUid || score.name?.toLowerCase() === matchedUserData.callsign?.toLowerCase()) {
                userScores.push(score);
            }
        });

        const subjectsSnap = await database.ref("subjects").once("value");
        const subjects = subjectsSnap.val() || {};
        const userQuestions = [];

        Object.entries(subjects).forEach(([branchKey, branchData]) => {
            const questions = branchData.questions || {};
            Object.entries(questions).forEach(([qid, qData]) => {
                if (qData.createdBy === matchedUid) {
                    userQuestions.push({
                        branchKey,
                        branchName: branchData.branchName || branchKey,
                        qid,
                        ...qData
                    });
                }
            });
        });

        renderUserProfile(matchedUid, matchedUserData, userScores, userQuestions);

    } catch (err) {
        showToast("Error retrieving user records: " + err.message, "error");
    }
}

/**
 * Renders user profile details
 */
function renderUserProfile(uid, userData, scores, questions) {
    const container = document.getElementById("admin-user-profile-container");
    if (!container) return;

    const currentRole = userData.role || "user";
    const userUid = state.currentUser ? state.currentUser.uid : null;
    const isSuper = userUid === SUPER_UID;
    const isAdmin = isSuper || state.userRole === "admin";

    let scoresHTML = scores.length === 0
        ? `<p class="subtext">No quiz activity recorded for this user.</p>`
        : `
            <table class="admin-table width-full">
                <thead>
                    <tr>
                        <th>Subject</th>
                        <th>Score</th>
                        <th>Percentage</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${scores.map(s => `
                        <tr>
                            <td>${s.branch || 'General'}</td>
                            <td>${s.score}</td>
                            <td><strong>${s.pct}%</strong></td>
                            <td>${s.date || (s.timestamp ? new Date(s.timestamp).toLocaleDateString() : 'N/A')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

    let questionsHTML = questions.length === 0
        ? `<p class="subtext">This user has not authored any questions.</p>`
        : questions.map(q => {
            const isVerified = q.verified === true;
            return `
                <div class="admin-q-card card padding-sm margin-bottom-xs">
                    <div class="flex-row-between">
                        <span class="badge-status badge-verified">${q.branchName}</span>
                        <div>
                            ${isVerified
                                ? `<span class="badge-status badge-verified">VERIFIED</span>`
                                : `<button data-admin-action="verify-q" data-branch="${q.branchKey}" data-qid="${q.qid}" class="btn-tactical btn-blue btn-sm">Verify</button>`
                            }
                            <button data-admin-action="delete-q" data-branch="${q.branchKey}" data-qid="${q.qid}" class="btn-tactical btn-clear btn-sm">Delete</button>
                        </div>
                    </div>
                    <div class="font-bold margin-top-xs">${q.q}</div>
                    <div class="subtext margin-top-xs">
                        <strong>Ans:</strong> ${q.options ? q.options[q.answer] : 'N/A'} | <em>Citation:</em> ${q.explanation || 'None'}
                    </div>
                </div>
            `;
        }).join('');

    container.innerHTML = `
        <div class="quiz-card admin-profile-card">
            <div class="flex-row-between">
                <div>
                    <h2>${userData.callsign || 'Cadet Profile'}</h2>
                    <div class="subtext">Email: ${userData.email || 'N/A'} | UID: ${uid}</div>
                    <div class="margin-top-xs">Total Points: <strong>${userData.points || 0} pts</strong></div>
                </div>

                ${isAdmin ? `
                    <div class="flex-row gap-xs align-center">
                        <label for="admin-role-select" class="font-bold">Role:</label>
                        <select id="admin-role-select" class="form-select-inline">
                            <option value="user" ${currentRole === 'user' ? 'selected' : ''}>USER</option>
                            <option value="mod" ${currentRole === 'mod' ? 'selected' : ''}>MODERATOR</option>
                            <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>ADMIN</option>
                        </select>
                        <button id="btn-save-role" class="btn-tactical btn-gold btn-sm">Update Role</button>
                    </div>
                ` : `<span class="badge-status badge-${currentRole}">Role: ${currentRole.toUpperCase()}</span>`}
            </div>

            <div class="margin-top-md">
                <h3>Performance History (${scores.length})</h3>
                ${scoresHTML}
            </div>

            <div class="margin-top-md">
                <h3>Authored Questions (${questions.length})</h3>
                ${questionsHTML}
            </div>
        </div>
    `;

    const saveRoleBtn = document.getElementById("btn-save-role");
    if (saveRoleBtn) {
        saveRoleBtn.onclick = async () => {
            const newRole = document.getElementById("admin-role-select")?.value;
            if (newRole) {
                await updateUserRole(uid, newRole);
                renderPersonnelList();
            }
        };
    }

    container.onclick = async (e) => {
        const btn = e.target.closest("button[data-admin-action]");
        if (!btn) return;

        const action = btn.dataset.adminAction;
        const branch = btn.dataset.branch;
        const qid = btn.dataset.qid;

        if (action === "verify-q") {
            await verifyQuestion(branch, qid);
            performUserSearch(uid);
        } else if (action === "delete-q") {
            await deleteQuestion(branch, qid);
            performUserSearch(uid);
        }
    };

    container.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Renders pending flagged questions queue
 */
export async function renderFlaggedQuestionsTable() {
    const container = document.getElementById("admin-flagged-questions-container");
    if (!container) return;

    try {
        const snapshot = await database.ref("subjects").once("value");
        const subjectsData = snapshot.val() || {};

        let flaggedList = [];

        Object.keys(subjectsData).forEach(branchKey => {
            const subject = subjectsData[branchKey];
            const questionsMap = subject.questions || {};

            Object.keys(questionsMap).forEach(qId => {
                const q = questionsMap[qId];
                if (q.flags && Object.keys(q.flags).length > 0) {
                    flaggedList.push({
                        branchKey,
                        branchName: subject.branchName || branchKey,
                        qId,
                        ...q
                    });
                }
            });
        });

        if (flaggedList.length === 0) {
            container.innerHTML = `<p class="subtext">No flagged questions pending review.</p>`;
            return;
        }

        let html = `
            <div class="quiz-card">
                <h3>Flagged Questions Review Queue (${flaggedList.length})</h3>
                <div class="flex-col gap-md">
                    ${flaggedList.map(item => `
                        <div class="card padding-sm">
                            <div class="flex-row-between">
                                <span class="badge-status badge-unverified">${item.branchName}</span>
                                <span class="text-flagged font-bold">🚩 ${Object.keys(item.flags).length} Flag(s)</span>
                            </div>
                            <p class="font-bold margin-top-xs">${item.q}</p>
                            <p class="subtext">Citation: ${item.explanation || 'N/A'}</p>
                            <div class="flex-row-between margin-top-xs">
                                <button class="btn-tactical btn-blue btn-sm" onclick="window.clearQuestionFlags('${item.branchKey}', '${item.qId}')">
                                    Clear Flags
                                </button>
                                <button class="btn-tactical btn-clear btn-sm" onclick="window.deleteAdminQuestion('${item.branchKey}', '${item.qId}')">
                                    Delete Question
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;

    } catch (err) {
        console.error("Failed to fetch flagged questions:", err);
        container.innerHTML = `<p class="text-incorrect">Failed to load flagged question queue.</p>`;
    }
}

/**
 * Clears flags on a question card
 */
window.clearQuestionFlags = async function (branchKey, qId) {
    try {
        await database.ref(`subjects/${branchKey}/questions/${qId}/flags`).remove();
        showToast("Flags cleared from question", "success");
        renderFlaggedQuestionsTable();
    } catch (err) {
        showToast("Action failed: " + err.message, "error");
    }
};

/**
 * Permanently deletes a flagged question card
 */
window.deleteAdminQuestion = async function (branchKey, qId) {
    const confirmed = await showConfirm("Permanently delete this flagged question?", "Delete Question");
    if (confirmed) {
        try {
            await database.ref(`subjects/${branchKey}/questions/${qId}`).remove();
            showToast("Question removed", "info");
            renderFlaggedQuestionsTable();
        } catch (err) {
            showToast("Delete failed: " + err.message, "error");
        }
    }
};
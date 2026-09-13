import { database, SUPER_UID } from '../config.js';
import { state } from '../state.js';
import { showToast, updateUserRole } from '../services/user-service.js';
import { deleteQuestion, verifyQuestion } from '../services/db-service.js';

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
        searchInput.onkeyup = (e) => {
            if (e.key === "Enter") performUserSearch(searchInput.value);
        };
    }
}

async function performUserSearch(query) {
    if (!query || query.trim() === "") {
        showToast("Please enter an Email, Callsign, or UID to search.", "error");
        return;
    }

    const cleanQuery = query.trim().toLowerCase();
    const container = document.getElementById("admin-user-profile-container");
    if (container) container.innerHTML = `<div class="admin-search-loading">Searching database...</div>`;

    try {
        // 1. Fetch User Record
        const usersSnap = await database.ref("users").once("value");
        const users = usersSnap.val() || {};
        let matchedUid = null;
        let matchedUserData = null;

        for (const [uid, uData] of Object.entries(users)) {
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

        // 2. Fetch User Scores
        const scoresSnap = await database.ref("scores").once("value");
        const allScores = scoresSnap.val() || {};
        const userScores = [];

        Object.values(allScores).forEach(score => {
            if (score.uid === matchedUid || score.name?.toLowerCase() === matchedUserData.callsign?.toLowerCase()) {
                userScores.push(score);
            }
        });

        // 3. Fetch Questions Created By User across all Subjects
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

        // 4. Render Aggregated Profile
        renderUserProfile(matchedUid, matchedUserData, userScores, userQuestions);

    } catch (err) {
        showToast("Error retrieving user records: " + err.message, "error");
    }
}

function renderUserProfile(uid, userData, scores, questions) {
    const container = document.getElementById("admin-user-profile-container");
    if (!container) return;

    const currentRole = userData.role || "user";
    const userUid = state.currentUser ? state.currentUser.uid : null;
    const isSuper = userUid === SUPER_UID;
    const isAdmin = isSuper || state.userRole === "admin";

    // Format Scores Table
    let scoresHTML = scores.length === 0
        ? `<p class="admin-empty-text">No quiz activity recorded for this user.</p>`
        : `
            <table class="admin-table">
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

    // Format Created Questions List
    let questionsHTML = questions.length === 0
        ? `<p class="admin-empty-text">This user has not authored any questions.</p>`
        : questions.map(q => {
            const isVerified = q.verified === true;
            return `
                <div class="admin-q-card">
                    <div class="admin-q-header">
                        <span class="admin-q-branch">${q.branchName}</span>
                        <div>
                            ${isVerified
                    ? `<span class="admin-badge-verified">VERIFIED</span>`
                    : `<button data-admin-action="verify-q" data-branch="${q.branchKey}" data-qid="${q.qid}" class="btn-tactical btn-blue btn-sm">Verify</button>`
                }
                            <button data-admin-action="delete-q" data-branch="${q.branchKey}" data-qid="${q.qid}" class="btn-tactical btn-clear btn-sm btn-margin-left">Delete</button>
                        </div>
                    </div>
                    <div class="admin-q-text">${q.q}</div>
                    <div class="admin-q-meta">
                        <strong>Ans:</strong> ${q.options ? q.options[q.answer] : 'N/A'} | <em>Citation:</em> ${q.explanation || 'None'}
                    </div>
                </div>
            `;
        }).join('');

    container.innerHTML = `
        <div class="quiz-card admin-profile-card">
            <div class="admin-profile-header">
                <div>
                    <h2 class="admin-user-title">${userData.callsign || 'Cadet'}</h2>
                    <div class="admin-user-subtext">Email: ${userData.email || 'N/A'} | UID: ${uid}</div>
                    <div class="admin-user-points">Total Points: <strong>${userData.points || 0} pts</strong></div>
                </div>

                ${isAdmin ? `
                    <div class="admin-role-controls">
                        <label for="admin-role-select" class="admin-role-label">Role:</label>
                        <select id="admin-role-select" class="admin-role-select">
                            <option value="user" ${currentRole === 'user' ? 'selected' : ''}>USER</option>
                            <option value="mod" ${currentRole === 'mod' ? 'selected' : ''}>MODERATOR</option>
                            <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>ADMIN</option>
                        </select>
                        <button id="btn-save-role" class="btn-tactical btn-gold btn-sm">Update Role</button>
                    </div>
                ` : `<span class="admin-role-badge">Role: ${currentRole.toUpperCase()}</span>`}
            </div>

            <!-- Tabs / Sections -->
            <div class="admin-section-spacing">
                <h3 class="admin-section-heading">Performance History (${scores.length})</h3>
                ${scoresHTML}
            </div>

            <div>
                <h3 class="admin-section-heading">Created Questions (${questions.length})</h3>
                ${questionsHTML}
            </div>
        </div>
    `;

    // Bind Role Save Handler
    const saveRoleBtn = document.getElementById("btn-save-role");
    if (saveRoleBtn) {
        saveRoleBtn.onclick = async () => {
            const newRole = document.getElementById("admin-role-select")?.value;
            if (newRole) {
                await updateUserRole(uid, newRole);
            }
        };
    }

    // Bind Action Listener for Quick Verification / Deletion
    container.onclick = async (e) => {
        const btn = e.target.closest("button[data-admin-action]");
        if (!btn) return;

        const action = btn.dataset.adminAction;
        const branch = btn.dataset.branch;
        const qid = btn.dataset.qid;

        if (action === "verify-q") {
            await verifyQuestion(branch, qid);
            performUserSearch(uid); // Refresh profile
        } else if (action === "delete-q") {
            await deleteQuestion(branch, qid);
            performUserSearch(uid); // Refresh profile
        }
    };
}
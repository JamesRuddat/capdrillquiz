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
        const isSuperAdmin = userUid === SUPER_UID;
        const userRole = state.userRole || (isSuperAdmin ? "admin" : "user");

        if (!state.currentUser || (userRole !== "admin" && userRole !== "mod" && !isSuperAdmin)) {
            if (authGuard) {
                authGuard.innerHTML = `<span style="color: #f85149;"><strong>ACCESS DENIED:</strong> You must be an Admin or Moderator to view this page.</span>`;
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
    if (container) container.innerHTML = `<div style="padding: 1em;">Searching database...</div>`;

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
            if (container) container.innerHTML = `<div class="quiz-card" style="padding: 1.5em; text-align: center;">No user found matching "<strong>${query}</strong>"</div>`;
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
    const isSuperAdmin = userUid === SUPER_UID;
    const isAdmin = isSuperAdmin || state.userRole === "admin";

    // Format Scores Table
    let scoresHTML = scores.length === 0 
        ? `<p style="color: var(--light-text-color); font-size: 0.85rem;">No quiz activity recorded for this user.</p>`
        : `
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 0.5em;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
                        <th style="padding: 0.4em;">Subject</th>
                        <th style="padding: 0.4em;">Score</th>
                        <th style="padding: 0.4em;">Percentage</th>
                        <th style="padding: 0.4em;">Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${scores.map(s => `
                        <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <td style="padding: 0.4em;">${s.branch || 'General'}</td>
                            <td style="padding: 0.4em;">${s.score}</td>
                            <td style="padding: 0.4em;"><strong>${s.pct}%</strong></td>
                            <td style="padding: 0.4em;">${s.date || (s.timestamp ? new Date(s.timestamp).toLocaleDateString() : 'N/A')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

    // Format Created Questions List
    let questionsHTML = questions.length === 0
        ? `<p style="color: var(--light-text-color); font-size: 0.85rem;">This user has not authored any questions.</p>`
        : questions.map(q => {
            const isVerified = q.verified === true;
            return `
                <div style="padding: 0.8em; border-radius: 4px; margin-bottom: 0.5em; background: rgba(0,0,0,0.03); border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5em; margin-bottom: 0.3em;">
                        <span style="font-size: 0.75rem; font-weight: bold; text-transform: uppercase; color: var(--primary-color);">${q.branchName}</span>
                        <div>
                            ${isVerified 
                                ? `<span style="color: #2ea043; font-size: 0.75rem; font-weight: bold;">✓ VERIFIED</span>` 
                                : `<button data-admin-action="verify-q" data-branch="${q.branchKey}" data-qid="${q.qid}" class="btn-tactical btn-blue btn-sm">Verify</button>`
                            }
                            <button data-admin-action="delete-q" data-branch="${q.branchKey}" data-qid="${q.qid}" class="btn-tactical btn-clear btn-sm" style="margin-left: 0.3em;">Delete</button>
                        </div>
                    </div>
                    <div style="font-weight: 600; font-size: 0.9rem;">${q.q}</div>
                    <div style="font-size: 0.8rem; color: var(--light-text-color); margin-top: 0.2em;">
                        <strong>Ans:</strong> ${q.options ? q.options[q.answer] : 'N/A'} | <em>Citation:</em> ${q.explanation || 'None'}
                    </div>
                </div>
            `;
        }).join('');

    container.innerHTML = `
        <div class="quiz-card" style="margin-bottom: 1.5em; padding: 1.2em;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.8em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.8em; margin-bottom: 1em;">
                <div>
                    <h2 style="margin: 0;">${userData.callsign || 'Cadet'}</h2>
                    <div style="font-size: 0.8rem; color: var(--light-text-color);">Email: ${userData.email || 'N/A'} | UID: ${uid}</div>
                    <div style="font-size: 0.85rem; margin-top: 0.2em;">Total Points: <strong>${userData.points || 0} pts</strong></div>
                </div>

                ${isAdmin ? `
                    <div style="display: flex; align-items: center; gap: 0.5em;">
                        <label for="admin-role-select" style="font-size: 0.85rem; font-weight: bold;">Role:</label>
                        <select id="admin-role-select" style="width: auto; padding: 0.3em;">
                            <option value="user" ${currentRole === 'user' ? 'selected' : ''}>USER</option>
                            <option value="mod" ${currentRole === 'mod' ? 'selected' : ''}>MODERATOR</option>
                            <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>ADMIN</option>
                        </select>
                        <button id="btn-save-role" class="btn-tactical btn-gold btn-sm">Update Role</button>
                    </div>
                ` : `<span style="font-weight: bold; font-size: 0.85rem;">Role: ${currentRole.toUpperCase()}</span>`}
            </div>

            <!-- Tabs / Sections -->
            <div style="margin-bottom: 1.5em;">
                <h3 style="font-size: 1.1rem; margin-bottom: 0.4em;">📊 Quiz Performance History (${scores.length})</h3>
                ${scoresHTML}
            </div>

            <div>
                <h3 style="font-size: 1.1rem; margin-bottom: 0.4em;">✏️ Created Questions (${questions.length})</h3>
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
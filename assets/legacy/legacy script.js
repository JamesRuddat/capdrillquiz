// ==========================================
// 1. GLOBAL STATE & FIREBASE INITIALIZATION
// ==========================================
let QUESTION_REGISTRY = {};
let activeBranchKey = "";
let activeName = "";
let activeQuestions = [];
let currentIdx = 0;
let score = 0;
let currentUser = null;
let activeModuleListenerRef = null;

const SUPER_UID = 'e8cCmxtEqMN4pr9i3DCkl2yo2iz2';

const firebaseConfig = {
    apiKey: "AIzaSyBr9AkWSSW7_qesMsj3nBwluLWjfjOULVY",
    authDomain: "cap-evaluator.firebaseapp.com",
    databaseURL: "https://cap-evaluator-default-rtdb.firebaseio.com",
    projectId: "cap-evaluator",
    storageBucket: "cap-evaluator.firebasestorage.app",
    messagingSenderId: "320253213583",
    appId: "1:320253213583:web:4ade28e5e88f8f3b03e9fa",
    measurementId: "G-RZDRVYD6TC"
};

// Initialize Firebase App, Database, & Auth
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ==========================================
// 2. DOM INITIALIZATION & EVENT LISTENERS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Nav Bar Click Event Handlers
    document.getElementById("nav-home").addEventListener("click", () => showView('home-view'));
    document.getElementById("nav-setup").addEventListener("click", () => showView('setup-view'));
    document.getElementById("nav-leaderboard").addEventListener("click", () => showView('leaderboard-view'));
    document.getElementById("nav-hub").addEventListener("click", () => { 
        showView('hub-view'); 
        renderUnifiedHub();
    });

    // Global Action Controls
    document.getElementById("theme-toggle-btn").addEventListener("click", toggleTheme);
    document.getElementById("google-auth-btn").addEventListener("click", handleGoogleAuth);
    document.getElementById("btn-launch-eval").addEventListener("click", () => showView('setup-view'));
    document.getElementById("btn-begin-assessment").addEventListener("click", startQuiz);
    document.getElementById("next-question-btn").addEventListener("click", advanceQuestion);
    
    // Result View Navigation
    document.getElementById("btn-res-another").addEventListener("click", () => showView('setup-view'));
    document.getElementById("btn-res-leaderboard").addEventListener("click", () => showView('leaderboard-view'));
    document.getElementById("btn-res-home").addEventListener("click", () => showView('home-view'));

    // Leaderboard Filter
    document.getElementById("filter-leaderboard").addEventListener("change", renderLeaderboard);

    // Hub Accordions & Controls
    document.getElementById("trig-module-form").addEventListener("click", () => toggleAccordion('module-form-accordion'));
    document.getElementById("trig-question-form").addEventListener("click", () => toggleAccordion('question-form-accordion'));
    document.getElementById("btn-create-module").addEventListener("click", createNewQuizModule);
    document.getElementById("btn-add-question").addEventListener("click", addCustomQuestion);
    
    // Unified Hub Module Select & Delete
    document.getElementById("bank-inspect-select").addEventListener("change", renderUnifiedHub);
    document.getElementById("btn-delete-module").addEventListener("click", deleteQuizModule);

    // Setup Firebase Auth State Observer
    auth.onAuthStateChanged((user) => {
        const authBtn = document.getElementById("google-auth-btn");
        const cadetInput = document.getElementById("cadet-name");
        
        if (user) {
            currentUser = user;
            authBtn.innerText = `Sign Out (${user.displayName || 'User'})`;
            if (cadetInput && !cadetInput.value) {
                cadetInput.value = user.displayName || "";
            }
        } else {
            currentUser = null;
            authBtn.innerText = "Sign in with Google";
        }

        const hubView = document.getElementById("hub-view");
        if (hubView && !hubView.classList.contains("hidden")) {
            renderUnifiedHub();
        }
    });

    // Global Real-Time Database Reader for Modules Metadata
    database.ref("subjects").on("value", (snapshot) => {
        const data = snapshot.val();
        if (data) {
            QUESTION_REGISTRY = data;
            populateBranchDropdowns();
            renderModuleList();
            
            const hubView = document.getElementById("hub-view");
            if (hubView && !hubView.classList.contains("hidden")) {
                renderUnifiedHub();
            }
        } else {
            const treeEl = document.getElementById("dynamic-publications-tree");
            if (treeEl) {
                treeEl.innerHTML = `<div style="color: var(--alert-color); padding: 0.5em; border: 1px dashed var(--alert-color);">
                    ❌ No quiz modules found in database under 'subjects/'. Use Quiz Hub to create one!
                </div>`;
            }
        }
    });

    updateDashboardMetrics();
    renderLeaderboard();
});

// ==========================================
// 3. GOOGLE AUTHENTICATION (FIREBASE)
// ==========================================
async function handleGoogleAuth() {
    if (currentUser) {
        try {
            await auth.signOut();
        } catch (error) {
            alert("Error signing out: " + error.message);
        }
    } else {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            console.log("Logged in user:", result.user);
        } catch (error) {
            console.error("Google Auth Error:", error);
            alert("Authentication Failed: " + error.message);
        }
    }
}

// ==========================================
// 4. DROPDOWNS & NAVIGATION ROUTER
// ==========================================
function populateBranchDropdowns() {
    const setupSelect = document.getElementById("quiz-select");
    const builderTargetSelect = document.getElementById("builder-target-quiz");
    const inspectSelect = document.getElementById("bank-inspect-select");
    const leaderboardSelect = document.getElementById("filter-leaderboard");

    const moduleKeys = Object.keys(QUESTION_REGISTRY);

    if (setupSelect) setupSelect.innerHTML = "";
    if (builderTargetSelect) builderTargetSelect.innerHTML = "";
    if (inspectSelect) inspectSelect.innerHTML = "";

    const currentFilter = leaderboardSelect ? leaderboardSelect.value : "ALL";
    if (leaderboardSelect) {
        leaderboardSelect.innerHTML = `<option value="ALL">All Modules</option>`;
    }

    if (moduleKeys.length === 0) {
        if (setupSelect) setupSelect.innerHTML = `<option value="">No Modules Available</option>`;
        if (builderTargetSelect) builderTargetSelect.innerHTML = `<option value="">No Modules Available</option>`;
        if (inspectSelect) inspectSelect.innerHTML = `<option value="">No Modules Available</option>`;
        return;
    }

    moduleKeys.forEach((key) => {
        const item = QUESTION_REGISTRY[key];
        const label = `${item.branchName || key} (${item.publication || 'Standard'})`;

        if (setupSelect) setupSelect.innerHTML += `<option value="${key}">${label}</option>`;
        if (builderTargetSelect) builderTargetSelect.innerHTML += `<option value="${key}">${label}</option>`;
        if (inspectSelect) inspectSelect.innerHTML += `<option value="${key}">${label}</option>`;
        if (leaderboardSelect) leaderboardSelect.innerHTML += `<option value="${item.branchName || key}">${item.branchName || key}</option>`;
    });

    if (leaderboardSelect) leaderboardSelect.value = currentFilter;
    if (setupSelect && setupSelect.value) activeBranchKey = setupSelect.value;
}

function renderModuleList() {
    const treeContainer = document.getElementById("dynamic-publications-tree");
    if (!treeContainer) return;

    const moduleKeys = Object.keys(QUESTION_REGISTRY);

    if (moduleKeys.length === 0) {
        treeContainer.innerHTML = `<span style="color: var(--light-text-color);">No modules registered in database yet.</span>`;
        return;
    }

    let html = `<ul class="tree">`;
    moduleKeys.forEach((key) => {
        const item = QUESTION_REGISTRY[key];
        const rawQs = item.questions;
        const count = rawQs ? (Array.isArray(rawQs) ? rawQs.length : Object.keys(rawQs).length) : 0;

        html += `
            <li><strong>${item.branchName || key} — ${item.publication || 'N/A'}</strong>
                <ul>
                    <li>Category: ${item.category || 'General'}</li>
                    <li>Registered Questions: ${count}</li>
                </ul>
            </li>
        `;
    });
    html += `</ul>`;

    treeContainer.innerHTML = html;
}

function showView(viewId) {
    const views = ['home-view', 'setup-view', 'quiz-view', 'results-view', 'leaderboard-view', 'hub-view'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', id !== viewId);
    });

    const navMap = {
        'home-view': 'nav-home',
        'setup-view': 'nav-setup',
        'leaderboard-view': 'nav-leaderboard',
        'hub-view': 'nav-hub'
    };

    document.querySelectorAll('#navbar a').forEach(a => a.classList.remove('active-nav'));
    if (navMap[viewId] && document.getElementById(navMap[viewId])) {
        document.getElementById(navMap[viewId]).classList.add('active-nav');
    }

    if (viewId === 'home-view') updateDashboardMetrics();
    if (viewId === 'leaderboard-view') renderLeaderboard();
    if (viewId === 'hub-view') renderUnifiedHub();
}

function sanitizeInput(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
}

function toggleTheme() {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme");
    root.setAttribute("data-theme", current === "dark" ? "light" : "dark");
}

function toggleAccordion(id) {
    const content = document.getElementById(id);
    const icon = document.getElementById(id + "-icon");
    
    if (content) {
        const isExpanded = content.classList.toggle("expanded");
        const trigger = content.previousElementSibling;
        if (trigger && trigger.classList.contains("accordion-trigger")) {
            trigger.classList.toggle("active-trigger", isExpanded);
        }
        if (icon) {
            icon.innerText = isExpanded ? "▲" : "▼";
        }
    }
}

// ==========================================
// 5. METRICS & TOP HONOR ROLL
// ==========================================
function updateDashboardMetrics() {
    database.ref("scores").once("value", (snapshot) => {
        let logs = [];
        snapshot.forEach((childSnapshot) => {
            logs.push(childSnapshot.val());
        });

        const totalEl = document.getElementById("stat-total-evals");
        if (totalEl) totalEl.innerText = logs.length;

        const modulesCountEl = document.getElementById("stat-modules-count");
        if (modulesCountEl) modulesCountEl.innerText = Object.keys(QUESTION_REGISTRY).length;

        const homeTopBody = document.getElementById("home-top-scores-body");
        if (homeTopBody) {
            logs.sort((a, b) => b.pct - a.pct);
            const topPerformers = logs.slice(0, 5);

            if (topPerformers.length === 0) {
                homeTopBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--light-text-color);">No scores logged yet. Be the first!</td></tr>`;
            } else {
                homeTopBody.innerHTML = topPerformers.map((entry, idx) => `
                    <tr>
                        <td><strong>#${idx + 1} ${entry.name}</strong></td>
                        <td>${entry.branch}</td>
                        <td style="color: var(--alert-color); font-weight: bold;">${entry.score} (${entry.pct}%)</td>
                        <td style="color: var(--light-text-color); font-size: 0.85rem;">${entry.date}</td>
                    </tr>
                `).join('');
            }
        }
    });
}

// ==========================================
// 6. QUIZ RUNNER ENGINE
// ==========================================
function startQuiz() {
    const nameInput = document.getElementById("cadet-name").value.trim();
    activeName = nameInput || (currentUser ? currentUser.displayName : "Anonymous");
    
    const selectEl = document.getElementById("quiz-select");
    if (!selectEl || !selectEl.value) {
        alert("Please select a quiz module first!");
        return;
    }
    
    activeBranchKey = selectEl.value;
    const registryEntry = QUESTION_REGISTRY[activeBranchKey];

    if (!registryEntry || !registryEntry.questions) {
        alert("No questions found for this module in Firebase.");
        return;
    }

    const rawQuestions = registryEntry.questions;
    activeQuestions = Array.isArray(rawQuestions) 
        ? [...rawQuestions] 
        : Object.values(rawQuestions);

    if (activeQuestions.length === 0) {
        alert("This module does not have any questions added yet!");
        return;
    }

    currentIdx = 0;
    score = 0;

    document.getElementById("quiz-standard-badge").innerText = `[MODULE: ${activeBranchKey}]`;
    showView('quiz-view');
    loadQuestion();
}

function loadQuestion() {
    const q = activeQuestions[currentIdx];
    document.getElementById("question-tracker").innerText = `Question ${currentIdx + 1} of ${activeQuestions.length}`;
    document.getElementById("question-text").innerText = q.q;

    const container = document.getElementById("options-container");
    container.innerHTML = "";

    const feedbackPanel = document.getElementById("feedback-panel");
    feedbackPanel.className = "hidden";
    document.getElementById("next-question-btn").classList.add("hidden");

    q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.innerText = `${idx + 1}. ${opt}`;
        btn.onclick = () => selectOption(idx);
        container.appendChild(btn);
    });
}

function selectOption(selectedIdx) {
    const q = activeQuestions[currentIdx];
    const buttons = document.querySelectorAll("#options-container .option-btn");

    buttons.forEach(btn => btn.disabled = true);

    const feedbackPanel = document.getElementById("feedback-panel");
    feedbackPanel.classList.remove("hidden");

    if (selectedIdx === q.answer) {
        score++;
        buttons[selectedIdx].classList.add("correct");
        feedbackPanel.className = "correct-panel";
        feedbackPanel.innerHTML = `<strong>[CORRECT]</strong> ${q.explanation || ''}`;
    } else {
        buttons[selectedIdx].classList.add("incorrect");
        if (buttons[q.answer]) buttons[q.answer].classList.add("correct");
        feedbackPanel.className = "incorrect-panel";
        feedbackPanel.innerHTML = `<strong>[INCORRECT]</strong> ${q.explanation || ''}`;
    }

    document.getElementById("next-question-btn").classList.remove("hidden");
}

function advanceQuestion() {
    currentIdx++;
    if (currentIdx < activeQuestions.length) {
        loadQuestion();
    } else {
        finishQuiz();
    }
}

function finishQuiz() {
    const total = activeQuestions.length;
    const pct = Math.round((score / total) * 100);
    const cleanName = sanitizeInput(activeName);

    document.getElementById("results-title").innerText = `${cleanName} — Score: ${pct}%`;
    const branchName = QUESTION_REGISTRY[activeBranchKey] ? QUESTION_REGISTRY[activeBranchKey].branchName : activeBranchKey;
    document.getElementById("score-summary").innerText = `Evaluatee scored ${score} out of ${total} correct under ${branchName} regulations.`;

    database.ref("scores").push({
        name: cleanName,
        branch: activeBranchKey,
        score: `${score}/${total}`,
        pct: pct,
        date: new Date().toLocaleDateString()
    }).then(() => {
        updateDashboardMetrics();
    });

    showView('results-view');
}

// ==========================================
// 7. LEADERBOARD VIEW
// ==========================================
function renderLeaderboard() {
    const filterSelect = document.getElementById("filter-leaderboard");
    const filter = filterSelect ? filterSelect.value : "ALL";
    const tbody = document.getElementById("leaderboard-body");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" class="text-center">Loading universal scores from Firebase...</td></tr>`;

    database.ref("scores").orderByChild("pct").once("value", (snapshot) => {
        tbody.innerHTML = "";
        let logs = [];

        snapshot.forEach((childSnapshot) => {
            logs.push(childSnapshot.val());
        });

        logs.reverse();

        const filtered = logs.filter(item => filter === "ALL" || item.branch === filter);

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--light-text-color);">No scores logged yet for this filter.</td></tr>`;
            return;
        }

        filtered.forEach(entry => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${entry.name}</strong></td>
                <td>${entry.branch}</td>
                <td><strong>${entry.score} (${entry.pct}%)</strong></td>
                <td class="timestamp">${entry.date}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// ==========================================
// INDEPENDENT TIMER & VOTING ENGINE
// ==========================================
const ACTIVE_INTERVALS = {}; 
const VOTE_COOLDOWNS = {}; 
const COOLDOWN_SECONDS = 5;

function voteQuestion(branchKey, questionId, voteType) {
    if (!currentUser) {
        alert("You must be logged in to vote!");
        return;
    }

    const now = Date.now();
    const lastVoteTime = VOTE_COOLDOWNS[questionId] || 0;
    const timeElapsed = Math.floor((now - lastVoteTime) / 1000);

    if (timeElapsed < COOLDOWN_SECONDS) {
        return; // Prevent clicking while cooling down
    }

    // Lock item immediately
    VOTE_COOLDOWNS[questionId] = now;

    const userId = currentUser.uid;
    const voteRef = database.ref(`subjects/${branchKey}/questions/${questionId}/votes/${userId}`);

    // Update Firebase
    voteRef.once("value", (snapshot) => {
        const existingVote = snapshot.val();
        if (existingVote === voteType) {
            voteRef.remove(); // Toggle off vote
        } else {
            voteRef.set(voteType); // Set vote
        }
    }).catch((err) => {
        console.error("Voting failed:", err);
        delete VOTE_COOLDOWNS[questionId];
        renderUnifiedHub();
    });

    // Start timer for this exact question
    startVoteCooldownTimer(questionId);
}

function startVoteCooldownTimer(questionId) {
    // Clear any pre-existing timer running on this specific item
    if (ACTIVE_INTERVALS[questionId]) {
        clearInterval(ACTIVE_INTERVALS[questionId]);
    }

    ACTIVE_INTERVALS[questionId] = setInterval(() => {
        const now = Date.now();
        const lastVote = VOTE_COOLDOWNS[questionId] || 0;
        const timeElapsed = Math.floor((now - lastVote) / 1000);
        const remaining = COOLDOWN_SECONDS - timeElapsed;

        const upBtn = document.getElementById(`vote-up-btn-${questionId}`);
        const downBtn = document.getElementById(`vote-down-btn-${questionId}`);

        if (remaining > 0) {
            if (upBtn) {
                upBtn.innerText = `⏳ ${remaining}s`;
                upBtn.disabled = true;
            }
            if (downBtn) {
                downBtn.innerText = `⏳ ${remaining}s`;
                downBtn.disabled = true;
            }
        } else {
            // Clean up timer once countdown reaches zero
            clearInterval(ACTIVE_INTERVALS[questionId]);
            delete ACTIVE_INTERVALS[questionId];
            delete VOTE_COOLDOWNS[questionId];

            // Re-render UI to show real vote counts again
            const hubView = document.getElementById("hub-view");
            if (hubView && !hubView.classList.contains("hidden")) {
                renderUnifiedHub();
            }
        }
    }, 1000);

    // Run initial UI render immediately
    renderUnifiedHub();
}

window.voteQuestion = voteQuestion;

// ==========================================
// UNIFIED HUB ENGINE
// ==========================================
function renderUnifiedHub() {
    const inspectSelect = document.getElementById("bank-inspect-select");
    const container = document.getElementById("bank-inspector-list");
    const deleteModBtn = document.getElementById("btn-delete-module");
    const authStatus = document.getElementById("hub-auth-status");

    if (!inspectSelect || !inspectSelect.value || !container) return;

    const branch = inspectSelect.value;
    const data = QUESTION_REGISTRY[branch];
    const userUid = currentUser ? currentUser.uid : null;
    const isSuperAdmin = userUid === SUPER_UID;
    const isModuleOwner = data && data.createdBy && data.createdBy === userUid;

    if (authStatus) {
        if (isSuperAdmin) {
            authStatus.innerHTML = `<strong>Mode: SUPER ADMIN</strong> (Full Control)`;
        } else if (currentUser) {
            authStatus.innerHTML = `Signed in as: <strong>${currentUser.displayName || currentUser.email}</strong>`;
        } else {
            authStatus.innerHTML = `Status: Guest (Read-Only Mode)`;
        }
    }

    if (!data) return;

    if (deleteModBtn) {
        deleteModBtn.classList.toggle("hidden", !(isSuperAdmin || isModuleOwner));
    }

    if (activeModuleListenerRef) {
        activeModuleListenerRef.off();
    }

    activeModuleListenerRef = database.ref(`subjects/${branch}/questions`);
    activeModuleListenerRef.on("value", (snapshot) => {
        const rawQs = snapshot.val() || {};
        const questionsList = Array.isArray(rawQs) 
            ? rawQs.map((q, idx) => ({ id: idx, ...q }))
            : Object.keys(rawQs).map(k => ({ id: k, ...rawQs[k] }));

        if (questionsList.length === 0) {
            container.innerHTML = `<div style="padding: 0.8em; color: var(--light-text-color); border: 1px dashed var(--primary-color);">
                No questions exist in module '${branch}' yet. Use the accordion above to add one!
            </div>`;
            return;
        }

        container.innerHTML = questionsList.map((q, idx) => {
            const canEditQuestion = isSuperAdmin || isModuleOwner || (q.createdBy && q.createdBy === userUid);
            const optsArray = Array.isArray(q.options) ? q.options : Object.values(q.options || []);

            // 1. Calculate Votes (Support BOTH new 'votes' map AND legacy 'upvotes'/'downvotes' numbers)
            const votesObj = q.votes || {};
            let upvotes = typeof q.upvotes === "number" ? q.upvotes : 0;
            let downvotes = typeof q.downvotes === "number" ? q.downvotes : 0;
            let userVote = null;

            if (q.votes) {
                upvotes = 0;
                downvotes = 0;
                Object.keys(votesObj).forEach(uid => {
                    if (votesObj[uid] === "up") upvotes++;
                    if (votesObj[uid] === "down") downvotes++;
                    if (currentUser && uid === currentUser.uid) {
                        userVote = votesObj[uid];
                    }
                });
            }

            // 2. Cooldown calculation
            const now = Date.now();
            const lastVote = VOTE_COOLDOWNS[q.id] || 0;
            const timeElapsed = Math.floor((now - lastVote) / 1000);
            const isCoolingDown = timeElapsed < COOLDOWN_SECONDS;
            const remainingTime = COOLDOWN_SECONDS - timeElapsed;

            const upText = isCoolingDown ? `⏳ ${remainingTime}s` : `👍 ${upvotes}`;
            const downText = isCoolingDown ? `⏳ ${remainingTime}s` : `👎 ${downvotes}`;
            const disabledAttr = isCoolingDown ? 'disabled="true"' : '';

            const upStyle = userVote === "up" ? "font-weight: bold; border: 2px solid green;" : "";
            const downStyle = userVote === "down" ? "font-weight: bold; border: 2px solid red;" : "";

            const votingButtonsHTML = `
                <div style="display: flex; gap: 0.8em; align-items: center; font-size: 0.85rem;">
                    <span>Rating:</span>
                    <button id="vote-up-btn-${q.id}" ${disabledAttr} onclick="window.voteQuestion('${branch}', '${q.id}', 'up')" style="padding: 2px 8px; cursor: pointer; ${upStyle}">
                        ${upText}
                    </button>
                    <button id="vote-down-btn-${q.id}" ${disabledAttr} onclick="window.voteQuestion('${branch}', '${q.id}', 'down')" style="padding: 2px 8px; cursor: pointer; ${downStyle}">
                        ${downText}
                    </button>
                </div>
            `;

            if (canEditQuestion) {
                return `
                    <div style="padding: 1em; border-radius: 4px; margin-bottom: 0.8em; background: rgba(0,0,0,0.05); border: 1px solid var(--primary-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5em;">
                            <strong>Q${idx + 1} (Owner / Admin Control)</strong>
                            <button onclick="window.deleteQuestion('${branch}', '${q.id}')" class="btn-tactical btn-clear">Delete</button>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.4em;">
                            <input type="text" id="edit-q-${q.id}" value="${q.q ? q.q.replace(/"/g, '&quot;') : ''}">
                            <input type="text" id="edit-opt0-${q.id}" value="${optsArray[0] ? optsArray[0].replace(/"/g, '&quot;') : ''}">
                            <input type="text" id="edit-opt1-${q.id}" value="${optsArray[1] ? optsArray[1].replace(/"/g, '&quot;') : ''}">
                            <input type="text" id="edit-opt2-${q.id}" value="${optsArray[2] ? optsArray[2].replace(/"/g, '&quot;') : ''}">
                            <input type="text" id="edit-opt3-${q.id}" value="${optsArray[3] ? optsArray[3].replace(/"/g, '&quot;') : ''}">
                            <select id="edit-ans-${q.id}">
                                <option value="0" ${q.answer == 0 ? 'selected' : ''}>Correct: Option 1</option>
                                <option value="1" ${q.answer == 1 ? 'selected' : ''}>Correct: Option 2</option>
                                <option value="2" ${q.answer == 2 ? 'selected' : ''}>Correct: Option 3</option>
                                <option value="3" ${q.answer == 3 ? 'selected' : ''}>Correct: Option 4</option>
                            </select>
                            <input type="text" id="edit-exp-${q.id}" value="${q.explanation ? q.explanation.replace(/"/g, '&quot;') : ''}">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4em;">
                                <button onclick="window.saveQuestionEdit('${branch}', '${q.id}')" class="btn-tactical">Update</button>
                                ${votingButtonsHTML}
                            </div>
                        </div>
                    </div>
                `;
            }

            return `
                <div style="padding: 0.8em; border-radius: 4px; margin-bottom: 0.6em; background: rgba(0,0,0,0.05); border: 1px solid var(--primary-color);">
                    <div style="font-weight: bold; margin-bottom: 0.3em;">Q${idx + 1}: ${q.q}</div>
                    <div style="color: var(--primary-color);"><strong>Correct Answer:</strong> ${optsArray[q.answer] || 'N/A'}</div>
                    <div style="margin: 0.4em 0; font-size: 0.8rem; color: var(--light-text-color);">
                        <strong>Options:</strong> ${optsArray.map((opt, i) => `${i + 1}. ${opt}`).join(' | ')}
                    </div>
                    <div style="color: var(--light-text-color); font-size: 0.8rem; margin-top: 0.2em;">
                        <em>Citation:</em> ${q.explanation || 'N/A'}
                    </div>
                    <div style="margin-top: 0.5em;">${votingButtonsHTML}</div>
                </div>
            `;
        }).join('');
    });
}

function createNewQuizModule() {
    const keyInput = document.getElementById("new-quiz-key").value.trim();
    const titleInput = document.getElementById("new-quiz-title").value.trim();
    const catInput = document.getElementById("new-quiz-category").value.trim();
    const publicationInput = document.getElementById("new-quiz-publication").value.trim();

    const cleanKey = keyInput.toUpperCase().replace(/[^A-Z0-9_]/g, '');

    if (!cleanKey || !titleInput) {
        alert("Please provide at least a Module Key and Quiz Title.");
        return;
    }

    if (!window.validateInputsClean([keyInput, titleInput, catInput, publicationInput])) {
        alert("Inappropriate language detected in your module fields. Please revise your text.");
        return;
    }

    if (!currentUser) {
        alert("You must be logged in to create a module!");
        return;
    }

    database.ref(`subjects/${cleanKey}`).set({
        branchName: titleInput,
        category: catInput || "General",
        publication: publicationInput || "Standard Regulation",
        createdBy: currentUser.uid,
        questions: {}
    }).then(() => {
        document.getElementById("new-quiz-key").value = "";
        document.getElementById("new-quiz-title").value = "";
        document.getElementById("new-quiz-category").value = "";
        document.getElementById("new-quiz-publication").value = "";
        toggleAccordion('module-form-accordion');
        alert(`Module '${cleanKey}' created successfully in cloud database!`);
    }).catch((err) => {
        alert("Error creating module: " + err.message);
    });
}

function addCustomQuestion() {
    const selectEl = document.getElementById("builder-target-quiz");
    if (!selectEl || !selectEl.value) {
        alert("Please select a target module first.");
        return;
    }

    if (!currentUser) {
        alert("You must be logged in to create a question!");
        return;
    }

    const branch = selectEl.value;
    const prompt = document.getElementById("builder-q-prompt").value.trim();
    const opt0 = document.getElementById("builder-opt-0").value.trim();
    const opt1 = document.getElementById("builder-opt-1").value.trim();
    const opt2 = document.getElementById("builder-opt-2").value.trim();
    const opt3 = document.getElementById("builder-opt-3").value.trim();
    const explanation = document.getElementById("builder-explanation").value.trim();
    
    if (!window.validateInputsClean([prompt, opt0, opt1, opt2, opt3, explanation])) {
        alert("Inappropriate language detected in your question. Please keep content professional.");
        return;
    }

    const correctIdx = parseInt(document.getElementById("builder-correct-opt").value, 10);

    if (!prompt || !opt0 || !opt1) {
        alert("Please provide a question prompt and at least Options 1 & 2.");
        return;
    }

    const rawOptions = [opt0, opt1, opt2, opt3];
    const options = rawOptions.filter(opt => opt !== "");

    if (correctIdx >= options.length) {
        alert("Selected correct answer option is empty! Please choose a valid option.");
        return;
    }

    const newQuestion = {
        q: prompt,
        options: options,
        answer: correctIdx,
        explanation: explanation || "Custom user-added regulation question.",
        createdBy: currentUser.uid
    };

    database.ref(`subjects/${branch}/questions`).push(newQuestion)
        .then(() => {
            document.getElementById("builder-q-prompt").value = "";
            document.getElementById("builder-opt-0").value = "";
            document.getElementById("builder-opt-1").value = "";
            document.getElementById("builder-opt-2").value = "";
            document.getElementById("builder-opt-3").value = "";
            document.getElementById("builder-explanation").value = "";
            document.getElementById("builder-correct-opt").value = "0";

            toggleAccordion('question-form-accordion');
            alert("Question added directly to Cloud Database!");
        })
        .catch(err => alert("Error saving question: " + err.message));
}

function saveQuestionEdit(branchKey, questionId) {
    const prompt = document.getElementById(`edit-q-${questionId}`).value.trim();
    const opt0 = document.getElementById(`edit-opt0-${questionId}`).value.trim();
    const opt1 = document.getElementById(`edit-opt1-${questionId}`).value.trim();
    const opt2 = document.getElementById(`edit-opt2-${questionId}`).value.trim();
    const opt3 = document.getElementById(`edit-opt3-${questionId}`).value.trim();
    const answer = parseInt(document.getElementById(`edit-ans-${questionId}`).value, 10);
    const explanation = document.getElementById(`edit-exp-${questionId}`).value.trim();

    const rawOptions = [opt0, opt1, opt2, opt3];
    const options = rawOptions.filter(o => o !== "");

    if (!prompt || options.length < 2) {
        alert("Question must have a prompt and at least 2 options.");
        return;
    }

    database.ref(`subjects/${branchKey}/questions/${questionId}`).update({
        q: prompt,
        options: options,
        answer: answer,
        explanation: explanation
    }).then(() => {
        alert("Question updated successfully!");
    }).catch(err => alert("Update failed: " + err.message));
}

function deleteQuestion(branchKey, questionId) {
    if (confirm("Are you sure you want to permanently delete this question?")) {
        database.ref(`subjects/${branchKey}/questions/${questionId}`).remove()
            .then(() => {
                alert("Question deleted successfully!");
            })
            .catch(err => alert("Delete failed: " + err.message));
    }
}

function deleteQuizModule() {
    const selectEl = document.getElementById("bank-inspect-select");
    if (!selectEl || !selectEl.value) return;

    const branchKey = selectEl.value;

    if (confirm(`CRITICAL WARNING: Permanently delete module '${branchKey}' and ALL its questions from Firebase?`)) {
        database.ref(`subjects/${branchKey}`).remove()
            .then(() => {
                alert(`Module '${branchKey}' deleted!`);
            })
            .catch(err => alert("Module delete failed: " + err.message));
    }
}

// Global scope exports for inline onclick attributes
window.voteQuestion = voteQuestion;
window.saveQuestionEdit = saveQuestionEdit;
window.deleteQuestion = deleteQuestion;
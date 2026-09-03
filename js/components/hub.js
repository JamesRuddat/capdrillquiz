import { database, SUPER_UID } from '../config.js';
import { state } from '../state.js';
import { validateInputsClean } from '../profanity-filter.js';
import { convertImageToBase64 } from '../services/image-service.js';

export function voteQuestion(branchKey, questionId, voteType, creatorUid) {
    if (!state.currentUser) {
        alert("You must be logged in to vote!");
        return;
    }

    const now = Date.now();
    const lastVoteTime = state.VOTE_COOLDOWNS[questionId] || 0;
    const timeElapsed = Math.floor((now - lastVoteTime) / 1000);

    if (timeElapsed < state.COOLDOWN_SECONDS) return;

    state.VOTE_COOLDOWNS[questionId] = now;

    const qRef = database.ref(`quizModules/${branchKey}/questions/${questionId}`);
    const creatorRef = creatorUid ? database.ref(`users/${creatorUid}/stars`) : null;

    if (voteType === 'up') {
        qRef.child("upvotes").transaction(count => (count || 0) + 1);
        if (creatorRef) creatorRef.transaction(stars => (stars || 0) + 1);
    } else if (voteType === 'down') {
        qRef.child("downvotes").transaction(count => (count || 0) + 1);
        if (creatorRef) creatorRef.transaction(stars => (stars || 0) - 1);
    }

    startVoteCooldownTimer(questionId);
}

export function startVoteCooldownTimer(questionId) {
    if (state.ACTIVE_INTERVALS[questionId]) {
        clearInterval(state.ACTIVE_INTERVALS[questionId]);
    }

    state.ACTIVE_INTERVALS[questionId] = setInterval(() => {
        const now = Date.now();
        const lastVote = state.VOTE_COOLDOWNS[questionId] || 0;
        const timeElapsed = Math.floor((now - lastVote) / 1000);
        const remaining = state.COOLDOWN_SECONDS - timeElapsed;

        const upBtn = document.getElementById(`vote-up-btn-${questionId}`);
        const downBtn = document.getElementById(`vote-down-btn-${questionId}`);

        if (remaining > 0) {
            if (upBtn) { upBtn.innerText = `⏳ ${remaining}s`; upBtn.disabled = true; }
            if (downBtn) { downBtn.innerText = `⏳ ${remaining}s`; downBtn.disabled = true; }
        } else {
            clearInterval(state.ACTIVE_INTERVALS[questionId]);
            delete state.ACTIVE_INTERVALS[questionId];
            delete state.VOTE_COOLDOWNS[questionId];

            const hubView = document.getElementById("hub-view");
            if (hubView && !hubView.classList.contains("hidden")) {
                renderUnifiedHub();
            }
        }
    }, 1000);

    renderUnifiedHub();
}

/**
 * Module Editing Controls
 */
export function toggleEditModule(key) {
    state.isCreatingNewModule = false;
    state.editingModuleKey = state.editingModuleKey === key ? null : key;
    renderUnifiedHub();
}

export function toggleCreateModuleCard(show) {
    state.editingModuleKey = null;
    state.isCreatingNewModule = show;
    renderUnifiedHub();
}

export function saveModuleEdit(key) {
    const categoryInput = document.getElementById("edit-mod-category");
    const titleInput = document.getElementById("edit-mod-title");
    const manualInput = document.getElementById("edit-mod-manual");
    const bgImageInput = document.getElementById("edit-mod-bg");

    if (!categoryInput || !titleInput || !manualInput) return;

    const catVal = categoryInput.value.trim();
    const titleVal = titleInput.value.trim();
    const manualVal = manualInput.value.trim();
    const bgVal = bgImageInput ? bgImageInput.value.trim() : "";

    if (!validateInputsClean([catVal, titleVal, manualVal, bgVal])) {
        showToast("Inappropriate language detected in updates.", "error");
        return;
    }

    const updatedData = {
        category: catVal || "General",
        branchName: titleVal || key,
        manual: manualVal || "Standard Regulation",
        imageUrl: bgVal
    };

    database.ref(`quizModules/${key}`).update(updatedData)
        .then(() => {
            if (state.QUESTION_REGISTRY[key]) {
                Object.assign(state.QUESTION_REGISTRY[key], updatedData);
            }
            state.editingModuleKey = null;
            renderUnifiedHub();
            showToast("Module updated successfully!", "success");
        })
        .catch(err => showToast("Failed to save module: " + err.message, "error"));
}

export function submitNewModuleCard() {
    if (!state.currentUser) {
        showToast("You must be logged in to create a module!", "error");
        return;
    }

    const keyVal = document.getElementById("create-mod-key")?.value.trim() || "";
    const titleVal = document.getElementById("create-mod-title")?.value.trim() || "";
    const catVal = document.getElementById("create-mod-category")?.value.trim() || "General";
    const manualVal = document.getElementById("create-mod-manual")?.value.trim() || "Standard Regulation";
    const bgVal = document.getElementById("create-mod-bg")?.value.trim() || "";

    const cleanKey = keyVal.toUpperCase().replace(/[^A-Z0-9_]/g, '');

    if (!cleanKey || !titleVal) {
        showToast("Please enter a Module Key ID and Title.", "error");
        return;
    }

    if (!validateInputsClean([cleanKey, titleVal, catVal, manualVal, bgVal])) {
        showToast("Inappropriate content detected.", "error");
        return;
    }

    if (state.QUESTION_REGISTRY[cleanKey]) {
        showToast("A module with this Key ID already exists!", "error");
        return;
    }

    const newModuleData = {
        branchName: titleVal,
        category: catVal,
        manual: manualVal,
        imageUrl: bgVal,
        createdBy: state.currentUser.uid,
        questions: {}
    };

    database.ref(`quizModules/${cleanKey}`).set(newModuleData)
        .then(() => {
            state.isCreatingNewModule = false;
            state.editingModuleKey = cleanKey;

            const selectEl = document.getElementById("bank-inspect-select");
            if (selectEl) selectEl.value = cleanKey;

            renderUnifiedHub();
            showToast("New module published!", "success");
        })
        .catch(err => showToast("Failed to publish module: " + err.message, "error"));
}

export function addBlankQuestionCard(branchKey) {
    if (!state.currentUser) {
        showToast("You must be logged in to add questions!", "error");
        return;
    }

    if (!branchKey) {
        showToast("Please select a valid quiz module first.", "error");
        return;
    }

    const newQRef = database.ref(`quizModules/${branchKey}/questions`).push();
    const newQId = newQRef.key;

    const newQuestionData = {
        q: "New Question Prompt",
        options: ["Option 1", "Option 2", "Option 3", "Option 4"],
        answer: 0,
        explanation: "Regulation reference or manual citation.",
        imageUrl: "",
        upvotes: 0,
        downvotes: 0,
        createdBy: state.currentUser.uid
    };

    newQRef.set(newQuestionData)
        .then(() => {
            showToast("Blank question card added", "success");

            // Auto scroll & focus on newly added question input
            setTimeout(() => {
                const newEl = document.getElementById(`edit-q-${newQId}`);
                if (newEl) {
                    newEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    newEl.focus();
                    newEl.select();
                }
            }, 100);
        })
        .catch(err => showToast("Failed to add question card: " + err.message, "error"));
}

export function renderUnifiedHub() {
    const inspectSelect = document.getElementById("bank-inspect-select");
    const container = document.getElementById("bank-inspector-list");
    const deleteModBtn = document.getElementById("btn-delete-module");
    const authStatus = document.getElementById("hub-auth-status");

    if (!container) return;

    const userUid = state.currentUser ? state.currentUser.uid : null;
    const isSuperAdmin = userUid === SUPER_UID;

    if (authStatus) {
        if (isSuperAdmin) authStatus.innerHTML = `<strong>Mode: SUPER ADMIN</strong> (Full Control)`;
        else if (state.currentUser) authStatus.innerHTML = `Signed in as: <strong>${state.currentUser.displayName || state.currentUser.email}</strong>`;
        else authStatus.innerHTML = `Status: Guest (Read-Only Mode)`;
    }

    // 1. INLINE NEW MODULE CARD BUILDER
    if (state.isCreatingNewModule) {
        container.innerHTML = `
            <div class="quiz-card" style="margin-bottom: 1.2em; border: 2px dashed var(--primary-color); padding: 1.2em;">
                <h3 style="margin: 0 0 0.6em 0; color: var(--primary-color);">➕ Create New Quiz Module</h3>
                <div style="display: flex; flex-direction: column; gap: 0.5em;">
                    <input type="text" id="create-mod-key" placeholder="Module Key ID (e.g., CAP_AERO_CH1)">
                    <input type="text" id="create-mod-title" placeholder="Module Title (e.g., Aerospace Chapter 1)">
                    <input type="text" id="create-mod-category" placeholder="Category (e.g., Leadership, Drill, Aero)">
                    <input type="text" id="create-mod-manual" placeholder="Manual Citation (e.g., CAPP 60-33)">
                    <input type="url" id="create-mod-bg" placeholder="Background Image URL (https://...)">
                </div>
                <div class="quiz-card-footer" style="display: flex; gap: 0.5em; margin-top: 0.8em;">
                    <button class="btn-tactical" data-action="submit-new-module" style="flex: 1;">
                        Publish Module Card
                    </button>
                    <button class="btn-tactical btn-clear" data-action="cancel-create-module" style="flex: 1;">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const branch = inspectSelect ? inspectSelect.value : "";
    const data = state.QUESTION_REGISTRY[branch];
    const isModuleOwner = data && data.createdBy && data.createdBy === userUid;

    if (deleteModBtn) deleteModBtn.classList.toggle("hidden", !(isSuperAdmin || isModuleOwner));

    if (!data) {
        container.innerHTML = `<div style="padding: 0.8em; color: var(--light-text-color);">Select a valid module above to manage questions.</div>`;
        return;
    }

    const rawQs = data.questions || {};
    const totalQs = Array.isArray(rawQs) ? rawQs.length : Object.keys(rawQs).length;
    const isEditingModule = state.editingModuleKey === branch;

    const bgStyle = data.imageUrl
        ? `background: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${data.imageUrl}') center/cover no-repeat; color: #fff;`
        : '';

    // 2. WYSIWYG MODULE CARD HEADER
    let moduleCardHTML = "";
    if (isEditingModule) {
        moduleCardHTML = `
            <div class="quiz-card" style="margin-bottom: 1.2em; border: 2px dashed var(--primary-color); padding: 1em; ${bgStyle}">
                <div>
                    <div class="quiz-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5em;">
                        <input type="text" id="edit-mod-category" value="${(data.category || 'General').replace(/"/g, '&quot;')}" placeholder="Category" style="width: auto; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; padding: 2px 6px;">
                        <span style="font-size: 0.8rem; color: ${data.imageUrl ? '#ddd' : 'var(--light-text-color)'};">${totalQs} Questions</span>
                    </div>
                    
                    <div class="quiz-card-title" style="margin: 0.4em 0;">
                        <input type="text" id="edit-mod-title" value="${(data.branchName || branch).replace(/"/g, '&quot;')}" placeholder="Module Title" style="font-size: 1.1rem; font-weight: bold; width: 100%;">
                    </div>
                    
                    <div class="quiz-card-meta" style="margin-bottom: 0.6em;">
                        <strong>Manual:</strong> 
                        <input type="text" id="edit-mod-manual" value="${(data.manual || 'Standard Regulation').replace(/"/g, '&quot;')}" placeholder="Manual Citation" style="font-size: 0.85rem; width: 70%; display: inline-block;">
                    </div>

                    <div style="margin-top: 0.4em;">
                        <input type="url" id="edit-mod-bg" value="${(data.imageUrl || '').replace(/"/g, '&quot;')}" placeholder="Card Background Image URL (https://...)" style="font-size: 0.8rem; width: 100%;">
                    </div>
                </div>

                <div class="quiz-card-footer" style="display: flex; gap: 0.5em; margin-top: 0.8em;">
                    <button class="btn-tactical" data-action="save-module" data-key="${branch}" style="flex: 1;">
                        Save Info
                    </button>
                    <button class="btn-tactical btn-clear" data-action="cancel-edit-module" style="flex: 1;">
                        Cancel
                    </button>
                </div>
            </div>
        `;
    } else {
        const canEditModule = isSuperAdmin || isModuleOwner;
        moduleCardHTML = `
            <div class="quiz-card" style="margin-bottom: 1.2em; ${bgStyle}">
                <div>
                    <div class="quiz-card-header">
                        <span class="quiz-card-badge">${data.category || 'General'}</span>
                        <span style="font-size: 0.8rem; color: ${data.imageUrl ? '#ddd' : 'var(--light-text-color)'};">${totalQs} Questions</span>
                    </div>
                    <div class="quiz-card-title">${data.branchName || branch}</div>
                    <div class="quiz-card-meta" style="color: ${data.imageUrl ? '#eee' : 'inherit'};">
                        <strong>Manual:</strong> ${data.manual || 'Standard Regulation'}
                    </div>
                </div>
                <div class="quiz-card-footer" style="display: flex; gap: 0.5em; margin-top: 0.8em; flex-wrap: wrap;">
                    ${canEditModule ? `
                        <button class="btn-tactical" data-action="edit-module" data-key="${branch}" style="flex: 1;">
                            Edit Info
                        </button>
                    ` : ''}
                    <button class="btn-tactical btn-blue" data-action="launch-module" data-key="${branch}" style="flex: 1;">
                        Take Quiz
                    </button>
                </div>
            </div>
        `;
    }

    // 3. REAL-TIME QUESTION LIST LISTENER & RENDERER
    if (state.activeModuleListenerRef) state.activeModuleListenerRef.off();

    state.activeModuleListenerRef = database.ref(`quizModules/${branch}/questions`);
    state.activeModuleListenerRef.on("value", (snapshot) => {
        const qSnap = snapshot.val() || {};
        const questionsList = Array.isArray(qSnap)
            ? qSnap.map((q, idx) => ({ id: idx, ...q }))
            : Object.keys(qSnap).map(k => ({ id: k, ...qSnap[k] }));

        let questionsHTML = "";

        if (questionsList.length === 0) {
            questionsHTML = `<div style="padding: 0.8em; color: var(--light-text-color);">No questions exist in module '${branch}' yet. Tap '➕ Add Question Card' above to create one!</div>`;
        } else {
            questionsHTML = questionsList.map((q, idx) => {
                const canEditQuestion = isSuperAdmin || isModuleOwner || (q.createdBy && q.createdBy === userUid);
                const optsArray = Array.isArray(q.options) ? q.options : Object.values(q.options || []);

                const upvotes = typeof q.upvotes === "number" ? q.upvotes : 0;
                const downvotes = typeof q.downvotes === "number" ? q.downvotes : 0;

                const now = Date.now();
                const lastVote = state.VOTE_COOLDOWNS[q.id] || 0;
                const timeElapsed = Math.floor((now - lastVote) / 1000);
                const isCoolingDown = timeElapsed < state.COOLDOWN_SECONDS;
                const remainingTime = state.COOLDOWN_SECONDS - timeElapsed;

                const upText = isCoolingDown ? `⏳ ${remainingTime}s` : `👍 ${upvotes}`;
                const downText = isCoolingDown ? `⏳ ${remainingTime}s` : `👎 ${downvotes}`;
                const disabledAttr = isCoolingDown ? 'disabled="true"' : '';

                const votingButtonsHTML = `
                    <div style="display: flex; gap: 0.4em; align-items: center; font-size: 0.85rem;">
                        <span>Rating:</span>
                        <button id="vote-up-btn-${q.id}" ${disabledAttr} data-action="vote" data-branch="${branch}" data-qid="${q.id}" data-type="up" data-creator="${q.createdBy || ''}" style="padding: 2px 8px; cursor: pointer;">
                            ${upText}
                        </button>
                        <button id="vote-down-btn-${q.id}" ${disabledAttr} data-action="vote" data-branch="${branch}" data-qid="${q.id}" data-type="down" data-creator="${q.createdBy || ''}" style="padding: 2px 8px; cursor: pointer;">
                            ${downText}
                        </button>
                    </div>
                `;

                const questionImgHTML = q.imageUrl
                    ? `<div style="margin: 0.5em 0;"><img src="${q.imageUrl}" alt="Visual Cue" style="max-width: 100%; max-height: 200px; border-radius: 4px; border: 1px solid #ccc;"></div>`
                    : '';

                if (canEditQuestion) {
                    return `
                        <div style="padding: 1em; border-radius: 4px; margin-bottom: 0.8em; background: rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5em;">
                                <strong>Q${idx + 1} (Owner / Admin Control)</strong>
                                <button data-action="delete-q" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-clear">Delete</button>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 0.3em;">
                                <input type="text" id="edit-q-${q.id}" value="${q.q ? q.q.replace(/"/g, '&quot;') : ''}">
                                <input type="url" id="edit-qimg-${q.id}" placeholder="Question Visual Cue Image URL (Optional)" value="${q.imageUrl ? q.imageUrl.replace(/"/g, '&quot;') : ''}">
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
                                ${questionImgHTML}
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4em;">
                                    <button data-action="save-q" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-gold">Update</button>
                                    ${votingButtonsHTML}
                                </div>
                            </div>
                        </div>
                    `;
                }

                return `
                    <div style="padding: 0.8em; border-radius: 4px; margin-bottom: 0.6em; background: rgba(0,0,0,0.05); border: 1px solid var(--primary-color);">
                        <div style="font-weight: bold; margin-bottom: 0.3em;">Q${idx + 1}: ${q.q}</div>
                        ${questionImgHTML}
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
        }

        container.innerHTML = moduleCardHTML + questionsHTML;
    });
}

export function saveQuestionEdit(branchKey, questionId) {
    const prompt = document.getElementById(`edit-q-${questionId}`)?.value.trim();
    const qImgEl = document.getElementById(`edit-qimg-${questionId}`);
    const qImgUrl = qImgEl ? qImgEl.value.trim() : "";
    const opt0 = document.getElementById(`edit-opt0-${questionId}`)?.value.trim() || "";
    const opt1 = document.getElementById(`edit-opt1-${questionId}`)?.value.trim() || "";
    const opt2 = document.getElementById(`edit-opt2-${questionId}`)?.value.trim() || "";
    const opt3 = document.getElementById(`edit-opt3-${questionId}`)?.value.trim() || "";
    const answer = parseInt(document.getElementById(`edit-ans-${questionId}`)?.value || "0", 10);
    const explanation = document.getElementById(`edit-exp-${questionId}`)?.value.trim() || "";

    const options = [opt0, opt1, opt2, opt3].filter(o => o !== "");

    if (!prompt || options.length < 2) {
        showToast("Question needs a prompt and at least 2 options.", "error");
        return;
    }

    // Filter check: validate all input text fields
    if (!validateInputsClean([prompt, opt0, opt1, opt2, opt3, explanation, qImgUrl])) {
        showToast("Inappropriate language detected in your updates.", "error");
        return;
    }

    database.ref(`quizModules/${branchKey}/questions/${questionId}`).update({
        q: prompt,
        imageUrl: qImgUrl,
        options: options,
        answer: answer,
        explanation: explanation
    })
        .then(() => showToast("Question updated!", "success"))
        .catch(err => showToast("Update failed: " + err.message, "error"));
}

export function deleteQuestion(branchKey, questionId) {
    if (confirm("Permanently delete this question?")) {
        database.ref(`quizModules/${branchKey}/questions/${questionId}`).remove()
            .then(() => showToast("Question deleted", "info"))
            .catch(err => showToast("Delete failed: " + err.message, "error"));
    }
}

export function deleteQuizModule() {
    const selectEl = document.getElementById("bank-inspect-select");
    if (!selectEl || !selectEl.value) return;

    const branchKey = selectEl.value;
    if (confirm(`CRITICAL WARNING: Delete module '${branchKey}' and ALL questions?`)) {
        database.ref(`quizModules/${branchKey}`).remove()
            .then(() => showToast(`Module '${branchKey}' deleted`, "info"))
            .catch(err => showToast("Module delete failed: " + err.message, "error"));
    }
}

/**
 * Non-blocking toast notification helper using CSS classes
 */
export function showToast(message, type = 'info') {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-bubble toast-${type}`;

    // Add icon indicators based on type
    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    // Trigger smooth CSS entrance animation
    requestAnimationFrame(() => {
        toast.classList.add("toast-show");
    });

    // Auto dismiss after 2.5 seconds
    setTimeout(() => {
        toast.classList.remove("toast-show");
        setTimeout(() => toast.remove(), 250);
    }, 2500);
}
import { database, SUPER_UID } from '../config.js';
import { state } from '../state.js';
import { validateInputsClean } from '../profanity-filter.js';
import { showModal, showConfirm } from './modal.js';

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

export function renderUnifiedHub() {
    const inspectSelect = document.getElementById("bank-inspect-select");
    const container = document.getElementById("bank-inspector-list");
    const deleteModBtn = document.getElementById("btn-delete-module");
    const authStatus = document.getElementById("hub-auth-status");

    if (!inspectSelect || !inspectSelect.value || !container) return;

    const branch = inspectSelect.value;
    const data = state.QUESTION_REGISTRY[branch];
    const userUid = state.currentUser ? state.currentUser.uid : null;
    const isSuperAdmin = userUid === SUPER_UID;
    const isModuleOwner = data && data.createdBy && data.createdBy === userUid;

    if (authStatus) {
        if (isSuperAdmin) authStatus.innerHTML = `<strong>Mode: SUPER ADMIN</strong> (Full Control)`;
        else if (state.currentUser) authStatus.innerHTML = `Signed in as: <strong>${state.currentUser.displayName || state.currentUser.email}</strong>`;
        else authStatus.innerHTML = `Status: Guest (Read-Only Mode)`;
    }

    if (!data) return;
    if (deleteModBtn) deleteModBtn.classList.toggle("hidden", !(isSuperAdmin || isModuleOwner));

    if (state.activeModuleListenerRef) state.activeModuleListenerRef.off();

    state.activeModuleListenerRef = database.ref(`quizModules/${branch}/questions`);
    state.activeModuleListenerRef.on("value", (snapshot) => {
        const rawQs = snapshot.val() || {};
        const questionsList = Array.isArray(rawQs) 
            ? rawQs.map((q, idx) => ({ id: idx, ...q }))
            : Object.keys(rawQs).map(k => ({ id: k, ...rawQs[k] }));

        if (questionsList.length === 0) {
            container.innerHTML = `<div style="padding: 0.8em; color: var(--light-text-color); border: 1px dashed var(--primary-color);">No questions exist in module '${branch}' yet.</div>`;
            return;
        }

        container.innerHTML = questionsList.map((q, idx) => {
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
                <div style="display: flex; gap: 0.8em; align-items: center; font-size: 0.85rem;">
                    <span>Rating:</span>
                    <button id="vote-up-btn-${q.id}" ${disabledAttr} data-action="vote" data-branch="${branch}" data-qid="${q.id}" data-type="up" data-creator="${q.createdBy || ''}" style="padding: 2px 8px; cursor: pointer;">
                        ${upText}
                    </button>
                    <button id="vote-down-btn-${q.id}" ${disabledAttr} data-action="vote" data-branch="${branch}" data-qid="${q.id}" data-type="down" data-creator="${q.createdBy || ''}" style="padding: 2px 8px; cursor: pointer;">
                        ${downText}
                    </button>
                </div>
            `;

            if (canEditQuestion) {
                return `
                    <div style="padding: 1em; border-radius: 4px; margin-bottom: 0.8em; background: rgba(0,0,0,0.05); border: 1px solid var(--primary-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5em;">
                            <strong>Q${idx + 1} (Owner / Admin Control)</strong>
                            <button data-action="delete-q" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-clear">Delete</button>
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
                                <button data-action="save-q" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical">Update</button>
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

export function createNewQuizModule() {
    const keyInput = document.getElementById("new-quiz-key").value.trim();
    const titleInput = document.getElementById("new-quiz-title").value.trim();
    const catInput = document.getElementById("new-quiz-category").value.trim();
    const manualInput = document.getElementById("new-quiz-manual").value.trim();

    const cleanKey = keyInput.toUpperCase().replace(/[^A-Z0-9_]/g, '');

    if (!cleanKey || !titleInput) {
        alert("Please provide at least a Module Key and Quiz Title.");
        return;
    }

    if (!validateInputsClean([keyInput, titleInput, catInput, manualInput])) {
        alert("Inappropriate language detected in your module fields.");
        return;
    }

    if (!state.currentUser) {
        alert("You must be logged in to create a module!");
        return;
    }

    database.ref(`quizModules/${cleanKey}`).set({
        branchName: titleInput,
        category: catInput || "General",
        manual: manualInput || "Standard Regulation",
        createdBy: state.currentUser.uid,
        questions: {}
    }).then(() => {
        document.getElementById("new-quiz-key").value = "";
        document.getElementById("new-quiz-title").value = "";
        document.getElementById("new-quiz-category").value = "";
        document.getElementById("new-quiz-manual").value = "";
        alert(`Module '${cleanKey}' created successfully!`);
    }).catch((err) => alert("Error creating module: " + err.message));
}

export function addCustomQuestion() {
    const selectEl = document.getElementById("builder-target-quiz");
    if (!selectEl || !selectEl.value) {
        alert("Please select a target module first.");
        return;
    }

    if (!state.currentUser) {
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

    if (!validateInputsClean([prompt, opt0, opt1, opt2, opt3, explanation])) {
        alert("Inappropriate language detected in your question.");
        return;
    }

    const correctIdx = parseInt(document.getElementById("builder-correct-opt").value, 10);
    if (!prompt || !opt0 || !opt1) {
        alert("Please provide a question prompt and at least Options 1 & 2.");
        return;
    }

    const options = [opt0, opt1, opt2, opt3].filter(opt => opt !== "");

    database.ref(`quizModules/${branch}/questions`).push({
        q: prompt,
        options: options,
        answer: correctIdx,
        explanation: explanation || "Custom user-added regulation question.",
        createdBy: state.currentUser.uid
    }).then(() => {
        document.getElementById("builder-q-prompt").value = "";
        document.getElementById("builder-opt-0").value = "";
        document.getElementById("builder-opt-1").value = "";
        document.getElementById("builder-opt-2").value = "";
        document.getElementById("builder-opt-3").value = "";
        document.getElementById("builder-explanation").value = "";
        alert("Question added to Cloud Database!");
    }).catch(err => alert("Error saving question: " + err.message));
}

export function saveQuestionEdit(branchKey, questionId) {
    const prompt = document.getElementById(`edit-q-${questionId}`).value.trim();
    const opt0 = document.getElementById(`edit-opt0-${questionId}`).value.trim();
    const opt1 = document.getElementById(`edit-opt1-${questionId}`).value.trim();
    const opt2 = document.getElementById(`edit-opt2-${questionId}`).value.trim();
    const opt3 = document.getElementById(`edit-opt3-${questionId}`).value.trim();
    const answer = parseInt(document.getElementById(`edit-ans-${questionId}`).value, 10);
    const explanation = document.getElementById(`edit-exp-${questionId}`).value.trim();

    const options = [opt0, opt1, opt2, opt3].filter(o => o !== "");

    if (!prompt || options.length < 2) {
        alert("Question must have a prompt and at least 2 options.");
        return;
    }

    database.ref(`quizModules/${branchKey}/questions/${questionId}`).update({
        q: prompt,
        options: options,
        answer: answer,
        explanation: explanation
    }).then(() => alert("Question updated successfully!"))
      .catch(err => alert("Update failed: " + err.message));
}

export function deleteQuestion(branchKey, questionId) {
    if (confirm("Permanently delete this question?")) {
        database.ref(`quizModules/${branchKey}/questions/${questionId}`).remove()
            .then(() => alert("Question deleted successfully!"))
            .catch(err => alert("Delete failed: " + err.message));
    }
}

export function deleteQuizModule() {
    const selectEl = document.getElementById("bank-inspect-select");
    if (!selectEl || !selectEl.value) return;

    const branchKey = selectEl.value;
    if (confirm(`CRITICAL WARNING: Delete module '${branchKey}' and ALL questions?`)) {
        database.ref(`quizModules/${branchKey}`).remove()
            .then(() => alert(`Module '${branchKey}' deleted!`))
            .catch(err => alert("Module delete failed: " + err.message));
    }
}
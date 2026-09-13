import { database, SUPER_UID } from '../config.js';
import { state } from '../state.js';
import { validateInputsClean } from '../profanity-filter.js';
import { awardPoints, showToast, updateUserRole, findUserByQuery } from '../services/user-service.js';
import { voteQuestion, toggleQuestionFlag, verifyQuestion, deleteQuestion } from '../services/db-service.js';
import { showConfirm } from './modal.js';

let isInitialLoadComplete = false;

/**
 * Utility: Converts uploaded image file to a compressed Base64 string
 */
function handleImageFileUpload(fileInput, textInput, maxDim = 800) {
    const file = fileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Please select a valid image file.", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            if (width > height && width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
            } else if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            textInput.value = canvas.toDataURL("image/jpeg", 0.75);
            showToast("Image uploaded and processed!", "success");
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * Converts raw URLs in text to clickable hyperlinks
 */
function formatTextWithLinks(text = "") {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-link">${url}</a>`;
    });
}

/**
 * Controller Initialization
 */
export function initHubPage() {
    const inspectSelect = document.getElementById("bank-inspect-select");
    if (inspectSelect) {
        inspectSelect.removeEventListener("change", handleSubjectSelectChange);
        inspectSelect.addEventListener("change", handleSubjectSelectChange);
    }

    const deleteModBtn = document.getElementById("btn-delete-module");
    if (deleteModBtn) {
        deleteModBtn.removeEventListener("click", deleteQuizModule);
        deleteModBtn.addEventListener("click", deleteQuizModule);
    }

    const addQuestionBtn = document.getElementById("btn-add-question-card");
    if (addQuestionBtn) {
        addQuestionBtn.onclick = () => {
            const activeBranch = inspectSelect ? inspectSelect.value : "";
            if (!activeBranch) {
                showToast("Please select a target subject first.", "error");
                return;
            }
            addBlankQuestionCard(activeBranch);
        };
    }

    const createCardBtn = document.getElementById("btn-create-module-card");
    if (createCardBtn) {
        createCardBtn.onclick = () => toggleCreateModuleCard(true);
    }

    // Dynamic Click & Change Handler
    const inspectorList = document.getElementById("bank-inspector-list");
    if (inspectorList) {
        inspectorList.onclick = (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;

            const action = btn.dataset.action;
            const branch = btn.dataset.key || btn.dataset.branch;
            const qid = btn.dataset.qid;

            switch (action) {
                case "submit-new-module": submitNewModuleCard(); break;
                case "cancel-create-module": toggleCreateModuleCard(false); break;
                case "edit-module": toggleEditModule(branch); break;
                case "save-module": saveModuleEdit(branch); break;
                case "cancel-edit-module": toggleEditModule(null); break;
                case "launch-module":
                    const selectEl = document.getElementById("quiz-select") || document.getElementById("bank-inspect-select");
                    if (selectEl) selectEl.value = branch;
                    window.location.href = "setup.html";
                    break;
                case "save-q": saveQuestionEdit(branch, qid); break;
                case "delete-q": deleteQuestion(branch, qid); break;
                case "vote":
                    voteQuestion(branch, qid, btn.dataset.type);
                    break;
                case "flag-q":
                    toggleQuestionFlag(branch, qid);
                    break;
                case "verify-q":
                    verifyQuestion(branch, qid);
                    break;
                case "trigger-create-from-blank": toggleCreateModuleCard(true); break;
                case "trigger-file-upload":
                    const targetInputId = btn.dataset.target;
                    const fileInput = document.getElementById(`${targetInputId}-file`);
                    if (fileInput) fileInput.click();
                    break;
            }
        };

        inspectorList.onchange = (e) => {
            if (e.target.type === "file" && e.target.dataset.textTarget) {
                const textInput = document.getElementById(e.target.dataset.textTarget);
                if (textInput) {
                    handleImageFileUpload(e.target, textInput);
                }
            }
        };
    }

    // Wait for database sync before initial state selection
    database.ref('subjects').once('value', (snapshot) => {
        state.QUESTION_REGISTRY = snapshot.val() || {};
        isInitialLoadComplete = true;
        
        populateInspectSelectOptions();
        processUrlRouteParameters();
    });
}

function populateInspectSelectOptions() {
    const inspectSelect = document.getElementById("bank-inspect-select");
    if (!inspectSelect) return;

    const keys = Object.keys(state.QUESTION_REGISTRY || {});
    let optionsHTML = `<option value="">-- Select a Subject --</option>`;

    keys.forEach(key => {
        const mod = state.QUESTION_REGISTRY[key];
        optionsHTML += `<option value="${key}">${mod.branchName || key}</option>`;
    });

    inspectSelect.innerHTML = optionsHTML;
}

function processUrlRouteParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get("search")?.trim();
    const editSubjectKey = urlParams.get("subject")?.trim();
    const inspectSelect = document.getElementById("bank-inspect-select");

    if (editSubjectKey && state.QUESTION_REGISTRY[editSubjectKey]) {
        if (inspectSelect) inspectSelect.value = editSubjectKey;
        state.isCreatingNewModule = false;
        renderUnifiedHub();
        return;
    }

    if (searchQuery) {
        state.isCreatingNewModule = true;
        if (inspectSelect) inspectSelect.value = "";
        renderUnifiedHub();

        setTimeout(() => {
            const titleInput = document.getElementById("create-mod-title");
            if (titleInput) {
                titleInput.value = searchQuery;
                titleInput.focus();
            }
        }, 50);

        showToast(`Creating new module for "${searchQuery}"`, "info");
        return;
    }

    // Default: Blank State
    if (inspectSelect) inspectSelect.value = "";
    state.isCreatingNewModule = false;
    renderUnifiedHub();
}

function handleSubjectSelectChange(e) {
    state.isCreatingNewModule = false;
    state.editingModuleKey = null;
    renderUnifiedHub();
}

export function toggleEditModule(key) {
    state.isCreatingNewModule = false;
    state.editingModuleKey = state.editingModuleKey === key ? null : key;
    renderUnifiedHub();
}

export function toggleCreateModuleCard(show) {
    state.editingModuleKey = null;
    state.isCreatingNewModule = show;
    
    const inspectSelect = document.getElementById("bank-inspect-select");
    if (show && inspectSelect) inspectSelect.value = "";
    
    renderUnifiedHub();
}

export function saveModuleEdit(key) {
    const catVal = document.getElementById("edit-mod-category")?.value.trim();
    const titleVal = document.getElementById("edit-mod-title")?.value.trim();
    const publicationVal = document.getElementById("edit-mod-publication")?.value.trim();
    const descVal = document.getElementById("edit-mod-description")?.value.trim() || "";
    const bgVal = document.getElementById("edit-mod-bg")?.value.trim() || "";

    if (!catVal || !titleVal || !publicationVal) return;

    if (!validateInputsClean([catVal, titleVal, publicationVal, descVal, bgVal])) {
        showToast("Inappropriate content detected in updates.", "error");
        return;
    }

    const updatedData = {
        category: catVal || "General",
        branchName: titleVal || key,
        publication: publicationVal || "Standard Regulation",
        description: descVal,
        imageUrl: bgVal
    };

    database.ref(`subjects/${key}`).update(updatedData)
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
    const publicationVal = document.getElementById("create-mod-publication")?.value.trim() || "Standard Regulation";
    const descVal = document.getElementById("create-mod-description")?.value.trim() || "";
    const bgVal = document.getElementById("create-mod-bg")?.value.trim() || "";

    const cleanKey = keyVal.toUpperCase().replace(/[^A-Z0-9_]/g, '');

    if (!cleanKey || !titleVal) {
        showToast("Please enter a Module Key ID and Title.", "error");
        return;
    }

    if (!validateInputsClean([cleanKey, titleVal, catVal, publicationVal, descVal, bgVal])) {
        showToast("Inappropriate content detected.", "error");
        return;
    }

    if (state.QUESTION_REGISTRY[cleanKey]) {
        showToast("A subject with this Key ID already exists!", "error");
        return;
    }

    const newModuleData = {
        branchName: titleVal,
        category: catVal,
        publication: publicationVal,
        description: descVal,
        imageUrl: bgVal,
        createdBy: state.currentUser.uid,
        questions: {}
    };

    database.ref(`subjects/${cleanKey}`).set(newModuleData)
        .then(() => {
            state.isCreatingNewModule = false;
            state.editingModuleKey = cleanKey;

            const selectEl = document.getElementById("bank-inspect-select");
            if (selectEl) selectEl.value = cleanKey;

            awardPoints(100, "Creating a New Subject Module");
            renderUnifiedHub();
            showToast("New subject published!", "success");
        })
        .catch(err => showToast("Failed to publish module: " + err.message, "error"));
}

export function addBlankQuestionCard(branchKey) {
    if (!state.currentUser) {
        showToast("You must be logged in to add questions!", "error");
        return;
    }

    const userUid = state.currentUser.uid;
    const isSuper = userUid === SUPER_UID;
    const userRole = state.userRole || (isSuper ? "admin" : "user");
    
    // Verified Authors (Admins & Moderators) auto-verify their creations
    const isVerifiedAuthor = isSuper || userRole === "admin" || userRole === "mod";

    const newQRef = database.ref(`subjects/${branchKey}/questions`).push();

    const newQuestionData = {
        q: "New Question Prompt",
        options: ["Option 1", "Option 2", "Option 3", "Option 4"],
        answer: 0,
        explanation: "Regulation reference or publication citation.",
        imageUrl: "",
        verified: isVerifiedAuthor,
        createdBy: userUid
    };

    if (isVerifiedAuthor) {
        newQuestionData.verifiedBy = userUid;
        newQuestionData.verifiedAt = new Date().toISOString();
    }

    newQRef.set(newQuestionData)
        .then(() => showToast(isVerifiedAuthor ? "Question added & auto-verified!" : "Blank question card added (Pending Review)", "success"))
        .catch(err => showToast("Failed to add question card: " + err.message, "error"));
}

export function renderUnifiedHub() {
    const inspectSelect = document.getElementById("bank-inspect-select");
    const container = document.getElementById("bank-inspector-list");
    const deleteModBtn = document.getElementById("btn-delete-module");
    const authStatus = document.getElementById("hub-auth-status");

    if (!container) return;

    const userUid = state.currentUser ? state.currentUser.uid : null;
    const isSuper = userUid === SUPER_UID;
    const userRole = state.userRole || (isSuper ? "admin" : "user");

    if (authStatus) {
        let roleBadge = "Guest";
        if (isSuper) roleBadge = "SUPER ADMIN";
        else if (userRole === "admin") roleBadge = "ADMIN";
        else if (userRole === "mod") roleBadge = "MODERATOR";
        else if (state.currentUser) roleBadge = "CADET";

        const isModOrAdmin = isSuper || userRole === "admin" || userRole === "mod";

        authStatus.innerHTML = `
            <div class="hub-auth-banner">
                <span>Status: <strong>${roleBadge}</strong> (${state.userCallsign || state.currentUser?.email || 'Read-Only'})</span>
                ${isModOrAdmin ? `
                    <button id="btn-manage-roles" class="btn-tactical btn-gold btn-sm btn-padding-compact">
                        ⚙️ Open Personnel Panel
                    </button>
                ` : ''}
            </div>
        `;

        // Wire click handler to open admin.html panel
        const manageBtn = document.getElementById("btn-manage-roles");
        if (manageBtn) {
            manageBtn.onclick = () => {
                window.location.href = "admin.html";
            };
        }
    }

    // 1. Create New Subject View
    if (state.isCreatingNewModule) {
        container.innerHTML = `
            <div class="quiz-card hub-create-card">
                <h3 class="hub-create-title">➕ Create New Subject</h3>
                <div class="hub-form-stack">
                    <input type="text" id="create-mod-key" placeholder="Module Key ID (e.g., CAP_AERO_CH1)">
                    <input type="text" id="create-mod-title" placeholder="Module Title (e.g., Aerospace Chapter 1)">
                    <input type="text" id="create-mod-category" placeholder="Category (e.g., Leadership, Drill, Aero)">
                    <input type="text" id="create-mod-publication" placeholder="Publication Citation (e.g., CAPP 60-33)">
                    <textarea id="create-mod-description" placeholder="Subject Description & Study Links (http://...)" rows="3" class="hub-textarea"></textarea>
                    
                    <div class="hub-file-upload-row">
                        <input type="text" id="create-mod-bg" placeholder="Background Image URL or Upload Image" class="flex-1">
                        <input type="file" id="create-mod-bg-file" data-text-target="create-mod-bg" accept="image/*" class="hidden">
                        <button type="button" class="btn-tactical btn-gold" data-action="trigger-file-upload" data-target="create-mod-bg">📁 Upload</button>
                    </div>
                </div>
                <div class="quiz-card-footer hub-card-footer">
                    <button class="btn-tactical flex-1" data-action="submit-new-module">Publish Subject</button>
                    <button class="btn-tactical btn-clear flex-1" data-action="cancel-create-module">Cancel</button>
                </div>
            </div>
        `;
        return;
    }

    const branch = inspectSelect ? inspectSelect.value : "";
    const data = state.QUESTION_REGISTRY[branch];
    const isModuleOwner = data && data.createdBy && data.createdBy === userUid;

    if (deleteModBtn) deleteModBtn.classList.toggle("hidden", !(isSuper || isModuleOwner));

    // 2. Blank State View
    if (!branch || !data) {
        container.innerHTML = `
            <div class="quiz-card hub-blank-card">
                <h3 class="hub-blank-title">Subject Hub Manager</h3>
                <p class="hub-blank-desc">
                    Select an existing subject from the dropdown above to manage its question bank, or click below to publish a brand-new module.
                </p>
                <button class="btn-tactical btn-gold" data-action="trigger-create-from-blank">➕ Create New Subject</button>
            </div>
        `;
        return;
    }

    // 3. Selected Subject View
    const rawQs = data.questions || {};
    const totalQs = Array.isArray(rawQs) ? rawQs.length : Object.keys(rawQs).length;
    const isEditingModule = state.editingModuleKey === branch;

    const bgClass = data.imageUrl ? 'hub-card-custom-bg' : '';
    const bgStyleAttr = data.imageUrl ? `style="background-image: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${data.imageUrl}');"` : '';

    let moduleCardHTML = "";
    if (isEditingModule) {
        moduleCardHTML = `
            <div class="quiz-card hub-edit-card ${bgClass}" ${bgStyleAttr}>
                <div>
                    <div class="quiz-card-header hub-card-header-row">
                        <input type="text" id="edit-mod-category" value="${(data.category || 'General').replace(/"/g, '&quot;')}" placeholder="Category" class="hub-category-input">
                        <span class="hub-question-count">${totalQs} Questions</span>
                    </div>
                    
                    <div class="hub-field-margin">
                        <input type="text" id="edit-mod-title" value="${(data.branchName || branch).replace(/"/g, '&quot;')}" placeholder="Module Title" class="hub-title-input">
                    </div>
                    
                    <div class="hub-field-margin-sm">
                        <strong>Publication:</strong> 
                        <input type="text" id="edit-mod-publication" value="${(data.publication || 'Standard Regulation').replace(/"/g, '&quot;')}" placeholder="Publication Citation" class="hub-publication-input">
                    </div>

                    <div class="hub-field-margin-xs">
                        <textarea id="edit-mod-description" placeholder="Subject Description & Links (http://...)" rows="3" class="hub-textarea">${data.description || ''}</textarea>
                    </div>

                    <div class="hub-file-upload-row hub-field-margin-xs">
                        <input type="text" id="edit-mod-bg" value="${(data.imageUrl || '').replace(/"/g, '&quot;')}" placeholder="Card Background Image URL or Upload Image" class="hub-bg-input flex-1">
                        <input type="file" id="edit-mod-bg-file" data-text-target="edit-mod-bg" accept="image/*" class="hidden">
                        <button type="button" class="btn-tactical btn-gold" data-action="trigger-file-upload" data-target="edit-mod-bg">📁 Upload</button>
                    </div>
                </div>

                <div class="quiz-card-footer hub-card-footer">
                    <button class="btn-tactical flex-1" data-action="save-module" data-key="${branch}">Save Info</button>
                    <button class="btn-tactical btn-clear flex-1" data-action="cancel-edit-module">Cancel</button>
                </div>
            </div>
        `;
    } else {
        const canEditModule = isSuper || isModuleOwner;
        const formattedDescription = formatTextWithLinks(data.description || '');

        moduleCardHTML = `
            <div class="quiz-card hub-display-card ${bgClass}" ${bgStyleAttr}>
                <div>
                    <div class="quiz-card-header">
                        <span class="quiz-card-badge">${data.category || 'General'}</span>
                        <span class="hub-question-count ${data.imageUrl ? 'text-light-overlay' : 'text-dim'}">${totalQs} Questions</span>
                    </div>
                    <div class="quiz-card-title">${data.branchName || branch}</div>
                    <div class="quiz-card-meta ${data.imageUrl ? 'text-light-overlay' : ''}">
                        <strong>Publication:</strong> ${data.publication || 'Standard Regulation'}
                    </div>
                    ${formattedDescription ? `
                        <div class="hub-desc-container ${data.imageUrl ? 'text-bright-overlay' : ''}">
                            ${formattedDescription}
                        </div>
                    ` : ''}
                </div>
                <div class="quiz-card-footer hub-card-footer flex-wrap">
                    ${canEditModule ? `<button class="btn-tactical flex-1" data-action="edit-module" data-key="${branch}">Edit Info</button>` : ''}
                    <button class="btn-tactical btn-blue flex-1" data-action="launch-module" data-key="${branch}">Take Quiz</button>
                </div>
            </div>
        `;
    }

    if (state.activeModuleListenerRef) state.activeModuleListenerRef.off();

    state.activeModuleListenerRef = database.ref(`subjects/${branch}/questions`);
    state.activeModuleListenerRef.on("value", (snapshot) => {
        const qSnap = snapshot.val() || {};
        const questionsList = Array.isArray(qSnap)
            ? qSnap.map((q, idx) => ({ id: idx, ...q }))
            : Object.keys(qSnap).map(k => ({ id: k, ...qSnap[k] }));

        let questionsHTML = questionsList.length === 0 
            ? `<div class="hub-no-questions">No questions exist in subject '${branch}' yet. Tap '➕ Add Question Card' above to create one!</div>`
            : questionsList.map((q, idx) => renderQuestionItem(q, idx, branch, isSuper || isModuleOwner, userUid)).join('');

        container.innerHTML = moduleCardHTML + questionsHTML;
    });
}

function renderQuestionItem(q, idx, branch, canEditSubject, userUid) {
    const canEditQuestion = canEditSubject || (q.createdBy && q.createdBy === userUid);
    const optsArray = Array.isArray(q.options) ? q.options : Object.values(q.options || []);

    let upvoteCount = q.upvotes || 0;
    let downvoteCount = q.downvotes || 0;

    if (q.votes && typeof q.votes === 'object') {
        upvoteCount = 0;
        downvoteCount = 0;
        Object.values(q.votes).forEach(val => {
            if (val === 'up' || val === true) upvoteCount++;
            if (val === 'down') downvoteCount++;
        });
    }

    const flagCount = q.flags ? Object.keys(q.flags).length : 0;
    const isVerified = q.verified === true;

    const userRole = state.userRole || (userUid === SUPER_UID ? "admin" : "user");
    const isModOrAdmin = userRole === "admin" || userRole === "mod";

    const verificationBadge = isVerified 
        ? `<span class="badge-verified">VERIFIED</span>`
        : `<span class="badge-unverified">UNVERIFIED</span>`;

    const questionImgHTML = q.imageUrl
        ? `<div class="hub-q-img-wrapper"><img src="${q.imageUrl}" alt="Visual Cue" class="hub-q-img"></div>`
        : '';

const actionControlsHTML = `
    <div class="hub-q-controls flex-row-between width-full">
        <!-- Left Side: Voting Controls -->
        <div class="hub-voting-controls">
            <button data-action="vote" data-type="up" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-sm btn-padding-tight" title="Helpful Question">
                👍 ${upvoteCount}
            </button>
            <button data-action="vote" data-type="down" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-sm btn-padding-tight" title="Needs Rewording / Poor Quality">
                👎 ${downvoteCount}
            </button>
        </div>

        <!-- Right Side: Moderation & Flag Controls -->
        <div class="hub-footer-actions-right">
            ${(!isVerified && isModOrAdmin) ? `
                <button data-action="verify-q" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-blue btn-sm btn-padding-normal">
                    Verify
                </button>
            ` : ''}
            <button data-action="flag-q" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-sm btn-clear btn-padding-tight ${flagCount > 0 ? 'text-flagged' : ''}" title="Inappropriate or Incorrect">
                🚩 ${flagCount}
            </button>
        </div>
    </div>
`;

if (canEditQuestion) {
    return `
        <div class="hub-q-card ${isVerified ? 'hub-q-card-verified' : 'hub-q-card-unverified'}">
            <div class="hub-q-header">
                <div class="hub-q-title-group">
                    <strong>Question ${idx + 1}</strong>
                    ${verificationBadge}
                </div>
            </div>
            <div class="hub-form-stack-xs">
                <input type="text" id="edit-q-${q.id}" value="${q.q ? q.q.replace(/"/g, '&quot;') : ''}">
                
                <div class="hub-file-upload-row">
                    <input type="text" id="edit-qimg-${q.id}" placeholder="Image URL or Upload Image" value="${q.imageUrl ? q.imageUrl.replace(/"/g, '&quot;') : ''}" class="flex-1">
                    <input type="file" id="edit-qimg-${q.id}-file" data-text-target="edit-qimg-${q.id}" accept="image/*" class="hidden">
                    <button type="button" class="btn-tactical btn-gold btn-sm" data-action="trigger-file-upload" data-target="edit-qimg-${q.id}">📁 Upload</button>
                </div>

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
                
                <div class="hub-q-card-footer">
                    <!-- Left Side: Voting Controls & Update Action -->
                    <div class="hub-footer-actions-left">
                        <div class="hub-voting-controls">
                            <button type="button" class="btn-tactical btn-sm" data-action="vote-up" data-branch="${branch}" data-qid="${q.id}">👍 ${q.upvotes || 0}</button>
                            <button type="button" class="btn-tactical btn-sm" data-action="vote-down" data-branch="${branch}" data-qid="${q.id}">👎 ${q.downvotes || 0}</button>
                        </div>
                        <button data-action="save-q" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-gold">Update</button>
                    </div>

                    <!-- Right Side: Flag & Delete Controls -->
                    <div class="hub-footer-actions-right">
                        <button type="button" data-action="flag-q" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-sm ${q.isFlagged ? 'btn-red' : 'btn-clear'}" title="Flag Question">Flag</button>
                        <button data-action="delete-q" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-clear btn-sm">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

    return `
        <div class="hub-q-card ${isVerified ? 'hub-q-card-verified' : 'hub-q-card-unverified'}">
            <div class="hub-q-header">
                <div class="hub-q-title-group">
                    <span class="font-bold">Question ${idx + 1}: ${q.q}</span>
                    ${verificationBadge}
                </div>
                ${actionControlsHTML}
            </div>
            ${questionImgHTML}
            <div class="text-primary font-bold"><strong>Correct Answer:</strong> ${optsArray[q.answer] || 'N/A'}</div>
            <div class="hub-q-options-text">
                <strong>Options:</strong> ${optsArray.map((opt, i) => `${i + 1}. ${opt}`).join(' | ')}
            </div>
            <div class="hub-q-citation-text">
                <em>Citation:</em> ${q.explanation || 'N/A'}
            </div>
        </div>
    `;
}

export async function saveQuestionEdit(branchKey, questionId) {
    const prompt = document.getElementById(`edit-q-${questionId}`)?.value.trim();
    const qImgUrl = document.getElementById(`edit-qimg-${questionId}`)?.value.trim() || "";
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

    if (!validateInputsClean([prompt, opt0, opt1, opt2, opt3, explanation, qImgUrl])) {
        showToast("Inappropriate content detected.", "error");
        return;
    }

    const userUid = state.currentUser ? state.currentUser.uid : null;
    const isSuper = userUid === SUPER_UID;
    const userRole = state.userRole || (isSuper ? "admin" : "user");
    const isVerifiedAuthor = isSuper || userRole === "admin" || userRole === "mod";

    const updatePayload = {
        q: prompt,
        imageUrl: qImgUrl,
        options: options,
        answer: answer,
        explanation: explanation
    };

    // If an Admin/Mod edits an item, auto-verify it upon saving
    if (isVerifiedAuthor) {
        updatePayload.verified = true;
        updatePayload.verifiedBy = userUid;
        updatePayload.verifiedAt = new Date().toISOString();
    }

    database.ref(`subjects/${branchKey}/questions/${questionId}`).update(updatePayload)
        .then(() => showToast("Question updated!", "success"))
        .catch(err => showToast("Update failed: " + err.message, "error"));
}

export async function deleteQuizModule() {
    const selectEl = document.getElementById("bank-inspect-select");
    if (!selectEl || !selectEl.value) return;

    const branchKey = selectEl.value;
    const confirmed = await showConfirm(`CRITICAL WARNING: Delete subject '${branchKey}' and ALL questions?`, "Delete Subject Module");
    if (confirmed) {
        database.ref(`subjects/${branchKey}`).remove()
            .then(() => showToast(`Module '${branchKey}' deleted`, "info"))
            .catch(err => showToast("Module delete failed: " + err.message, "error"));
    }
}
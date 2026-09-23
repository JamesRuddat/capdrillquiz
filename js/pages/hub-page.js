import { database, SUPER_UID } from '../config.js';
import { state } from '../state.js';
import { validateInputsClean } from '../profanity-filter.js';
import { awardPoints, showToast, updateUserRole } from '../services/user-service.js';
import { voteQuestion, toggleQuestionFlag, verifyQuestion, deleteQuestion } from '../services/db-service.js';
import { showConfirm } from './modal.js';

let isInitialLoadComplete = false;

/**
 * Global helper attached to window to append dynamic link rows in Hub forms
 */
window.addLinkRow = function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rowDiv = document.createElement("div");
    rowDiv.className = "dynamic-link-row flex-row-between gap-sm margin-top-xs";
    rowDiv.innerHTML = `
        <input type="text" class="link-label flex-1" placeholder="Button Label (e.g., Leadership Practice Test)">
        <input type="text" class="link-url flex-1" placeholder="URL path or https://...">
        <select class="link-type">
            <option value="quiz">Quiz</option>
            <option value="simulator">Simulator</option>
            <option value="pdf">PDF Handbook</option>
        </select>
        <button type="button" class="btn-tactical btn-red btn-sm" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(rowDiv);
};

/**
 * Scans a container for dynamic link rows and extracts an array of link objects
 */
function collectDynamicLinksFromDOM(containerId) {
    const rows = document.querySelectorAll(`#${containerId} .dynamic-link-row`);
    const links = [];

    rows.forEach(row => {
        const label = row.querySelector('.link-label')?.value.trim();
        const url = row.querySelector('.link-url')?.value.trim();
        const type = row.querySelector('.link-type')?.value;

        if (url) {
            links.push({
                label: label || 'Resource',
                url: url,
                type: type || 'quiz'
            });
        }
    });

    return links;
}

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
 * Utility: Resolves custom launcher page URL
 */
function getSubjectLaunchUrl(data, branchKey) {
    if (data && data.url) return data.url;

    // Direct mappings for standalone simulators
    if (branchKey === "DRILL_36_2203") return "/pages/drill.html";
    if (branchKey === "ELT_DF_SIM" || branchKey === "DF_SEARCH_SIM") return "/pages/df-search.html";

    return null;
}

/**
 * Utility: Sorts subject keys based on chosen sort criteria (including millisecond timestamp precision)
 * @param {Object} registry - state.QUESTION_REGISTRY object
 * @param {string} sortBy - 'newest', 'oldest', 'title', or 'questions'
 * @returns {Array<string>} Array of sorted subject keys
 */
export function getSortedSubjectKeys(registry = {}, sortBy = "newest") {
    const keys = Object.keys(registry || {});

    return keys.sort((a, b) => {
        const itemA = registry[a] || {};
        const itemB = registry[b] || {};

        // Parse full millisecond timestamps
        const timeA = itemA.createdAt ? new Date(itemA.createdAt).getTime() : 0;
        const timeB = itemB.createdAt ? new Date(itemB.createdAt).getTime() : 0;

        if (sortBy === "newest") {
            if (timeB !== timeA) return timeB - timeA; // Exact time comparison (newest first)
            return (itemA.branchName || a).localeCompare(itemB.branchName || b); // Fallback: A-Z
        }

        if (sortBy === "oldest") {
            if (timeA !== timeB) return timeA - timeB; // Exact time comparison (oldest first)
            return (itemA.branchName || a).localeCompare(itemB.branchName || b); // Fallback: A-Z
        }

        if (sortBy === "title") {
            const nameA = (itemA.branchName || a).toLowerCase();
            const nameB = (itemB.branchName || b).toLowerCase();
            return nameA.localeCompare(nameB); // Alphabetical A-Z
        }

        if (sortBy === "questions") {
            const countA = Array.isArray(itemA.questions) ? itemA.questions.length : Object.keys(itemA.questions || {}).length;
            const countB = Array.isArray(itemB.questions) ? itemB.questions.length : Object.keys(itemB.questions || {}).length;
            if (countB !== countA) return countB - countA; // Most questions first
            return timeB - timeA; // Secondary fallback: newest first
        }

        return 0;
    });
}

/**
 * Populates dropdown inspector options sorted by selected order with time badge
 */
export function populateInspectSelectOptions(sortBy = "newest") {
    const inspectSelect = document.getElementById("bank-inspect-select");
    if (!inspectSelect) return;

    const registry = state.QUESTION_REGISTRY || {};
    const sortedKeys = getSortedSubjectKeys(registry, sortBy);

    let optionsHTML = `<option value="">-- Select a Subject --</option>`;

    sortedKeys.forEach(key => {
        const mod = registry[key];
        
        // Display date and local time if timestamp exists
        let timeLabel = "";
        if (mod.createdAt) {
            const d = new Date(mod.createdAt);
            timeLabel = ` (${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
        }

        optionsHTML += `<option value="${key}">${mod.branchName || key}${timeLabel}</option>`;
    });

    inspectSelect.innerHTML = optionsHTML;
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

    const deleteModBtn = document.getElementById("btn-delete-subject");
    if (deleteModBtn) {
        deleteModBtn.removeEventListener("click", deleteQuizSubject);
        deleteModBtn.addEventListener("click", deleteQuizSubject);
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

    const sortSelect = document.getElementById("hub-sort-select");
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            populateInspectSelectOptions(e.target.value);
        });
    }

    const createCardBtn = document.getElementById("btn-create-subject-card");
    if (createCardBtn) {
        createCardBtn.onclick = () => toggleCreateSubjectCard(true);
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
                case "submit-new-subject": submitNewSubjectCard(); break;
                case "cancel-create-subject": toggleCreateSubjectCard(false); break;
                case "edit-subject": toggleEditSubject(branch); break;
                case "save-subject": saveSubjectEdit(branch); break;
                case "cancel-edit-subject": toggleEditSubject(null); break;
                case "launch-subject": {
                    const targetUrl = btn.dataset.url;
                    if (targetUrl) {
                        window.location.href = targetUrl;
                    } else {
                        const selectEl = document.getElementById("quiz-select") || document.getElementById("bank-inspect-select");
                        if (selectEl) selectEl.value = branch;
                        window.location.href = `setup.html?subject=${branch}`;
                    }
                    break;
                }
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
                case "trigger-create-from-blank": toggleCreateSubjectCard(true); break;
                case "trigger-file-upload": {
                    const targetInputId = btn.dataset.target;
                    const fileInput = document.getElementById(`${targetInputId}-file`);
                    if (fileInput) fileInput.click();
                    break;
                }
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

    database.ref('subjects').once('value', (snapshot) => {
        state.QUESTION_REGISTRY = snapshot.val() || {};
        isInitialLoadComplete = true;

        const currentSort = sortSelect ? sortSelect.value : "newest";
        populateInspectSelectOptions(currentSort);
        processUrlRouteParameters();
    });
}

function processUrlRouteParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get("search")?.trim();
    const editSubjectKey = urlParams.get("subject")?.trim();
    const inspectSelect = document.getElementById("bank-inspect-select");

    if (editSubjectKey && state.QUESTION_REGISTRY[editSubjectKey]) {
        if (inspectSelect) inspectSelect.value = editSubjectKey;
        state.isCreatingNewSubject = false;
        renderUnifiedHub();
        return;
    }

    if (searchQuery) {
        state.isCreatingNewSubject = true;
        if (inspectSelect) inspectSelect.value = "";
        renderUnifiedHub();

        setTimeout(() => {
            const titleInput = document.getElementById("create-mod-title");
            if (titleInput) {
                titleInput.value = searchQuery;
                titleInput.focus();
            }
        }, 50);

        showToast(`Creating new subject for "${searchQuery}"`, "info");
        return;
    }

    if (inspectSelect) inspectSelect.value = "";
    state.isCreatingNewSubject = false;
    renderUnifiedHub();
}

function handleSubjectSelectChange(e) {
    state.isCreatingNewSubject = false;
    state.editingSubjectKey = null;
    renderUnifiedHub();
}

export function toggleEditSubject(key) {
    state.isCreatingNewSubject = false;
    state.editingSubjectKey = state.editingSubjectKey === key ? null : key;
    renderUnifiedHub();
}

export function toggleCreateSubjectCard(show) {
    state.editingSubjectKey = null;
    state.isCreatingNewSubject = show;

    const inspectSelect = document.getElementById("bank-inspect-select");
    if (show && inspectSelect) inspectSelect.value = "";

    renderUnifiedHub();
}

export function saveSubjectEdit(key) {
    const catVal = document.getElementById("edit-mod-category")?.value.trim();
    const titleVal = document.getElementById("edit-mod-title")?.value.trim();
    const publicationVal = document.getElementById("edit-mod-publication")?.value.trim();
    const descVal = document.getElementById("edit-mod-description")?.value.trim() || "";
    const bgVal = document.getElementById("edit-mod-bg")?.value.trim() || "";

    // Collect dynamic multi-link entries
    const dynamicLinks = collectDynamicLinksFromDOM("edit-dynamic-links-container");

    if (!catVal || !titleVal || !publicationVal) return;

    if (!validateInputsClean([catVal, titleVal, publicationVal, descVal, bgVal])) {
        showToast("Inappropriate content detected in updates.", "error");
        return;
    }

    const updatedData = {
        category: catVal || "General",
        branchName: titleVal || key,
        publication: publicationVal || "Standard Regulation",
        links: dynamicLinks,
        description: descVal,
        imageUrl: bgVal
    };

    database.ref(`subjects/${key}`).update(updatedData)
        .then(() => {
            if (state.QUESTION_REGISTRY[key]) {
                Object.assign(state.QUESTION_REGISTRY[key], updatedData);
            }
            state.editingSubjectKey = null;
            renderUnifiedHub();
            showToast("Subject updated successfully!", "success");
        })
        .catch(err => showToast("Failed to save subject: " + err.message, "error"));
}

export function submitNewSubjectCard() {
    if (!state.currentUser) {
        showToast("You must be logged in to create a subject!", "error");
        return;
    }

    const keyVal = document.getElementById("create-mod-key")?.value.trim() || "";
    const titleVal = document.getElementById("create-mod-title")?.value.trim() || "";
    const catVal = document.getElementById("create-mod-category")?.value.trim() || "General";
    const publicationVal = document.getElementById("create-mod-publication")?.value.trim() || "Standard Regulation";
    const descVal = document.getElementById("create-mod-description")?.value.trim() || "";
    const bgVal = document.getElementById("create-mod-bg")?.value.trim() || "";

    // Collect dynamic multi-link entries
    const dynamicLinks = collectDynamicLinksFromDOM("create-dynamic-links-container");

    const cleanKey = keyVal.toUpperCase().replace(/[^A-Z0-9_]/g, '');

    if (!cleanKey || !titleVal) {
        showToast("Please enter a Subject Key ID and Title.", "error");
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

    const newSubjectData = {
        branchName: titleVal,
        category: catVal,
        publication: publicationVal,
        links: dynamicLinks,
        description: descVal,
        imageUrl: bgVal,
        createdBy: state.currentUser.uid,
        createdAt: new Date().toISOString(),
        questions: {}
    };

    database.ref(`subjects/${cleanKey}`).set(newSubjectData)
        .then(() => {
            state.isCreatingNewSubject = false;
            state.editingSubjectKey = cleanKey;

            const sortSelect = document.getElementById("hub-sort-select");
            populateInspectSelectOptions(sortSelect ? sortSelect.value : "newest");

            const selectEl = document.getElementById("bank-inspect-select");
            if (selectEl) selectEl.value = cleanKey;

            awardPoints(100, "Creating a New Subject");
            renderUnifiedHub();
            showToast("New subject published!", "success");
        })
        .catch(err => showToast("Failed to publish subject: " + err.message, "error"));
}

export function addBlankQuestionCard(branchKey) {
    if (!state.currentUser) {
        showToast("You must be logged in to add questions!", "error");
        return;
    }

    const userUid = state.currentUser.uid;
    const isSuper = userUid === SUPER_UID;
    const userRole = state.userRole || (isSuper ? "admin" : "user");

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
    const deleteModBtn = document.getElementById("btn-delete-subject");
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
                        Open Personnel Panel
                    </button>
                ` : ''}
            </div>
        `;

        const manageBtn = document.getElementById("btn-manage-roles");
        if (manageBtn) {
            manageBtn.onclick = () => {
                window.location.href = "admin.html";
            };
        }
    }

    // 1. Create New Subject Form
    if (state.isCreatingNewSubject) {
        container.innerHTML = `
            <div class="quiz-card hub-create-card">
                <h3 class="hub-create-title">Create New Subject</h3>
                <div class="hub-form-stack">
                    <input type="text" id="create-mod-key" placeholder="Subject Key ID (e.g., CAP_DRILL, CAP_STAFF)">
                    <input type="text" id="create-mod-title" placeholder="Subject Title (e.g., Civil Air Patrol Drill)">
                    <input type="text" id="create-mod-category" placeholder="Category (e.g., Drill, Leadership, ES)">
                    <input type="text" id="create-mod-publication" placeholder="Publication Citation (e.g., CAPP 60-33)">
                    
                    <!-- Dynamic Dynamic Links Container -->
                    <div id="create-dynamic-links-container" class="hub-form-stack-xs margin-top-xs">
                        <label class="font-bold text-sm">Action Buttons / Practice Sets:</label>
                    </div>
                    <button type="button" class="btn-tactical btn-gold btn-sm margin-bottom-xs" onclick="window.addLinkRow('create-dynamic-links-container')">
                        Add Link
                    </button>

                    <textarea id="create-mod-description" placeholder="Subject Description" rows="3" class="hub-textarea"></textarea>
                    
                    <div class="hub-file-upload-row">
                        <input type="text" id="create-mod-bg" placeholder="Card Background Image URL or Upload Image" class="flex-1">
                        <input type="file" id="create-mod-bg-file" data-text-target="create-mod-bg" accept="image/*" class="hidden">
                        <button type="button" class="btn-tactical btn-gold" data-action="trigger-file-upload" data-target="create-mod-bg">Upload</button>
                    </div>
                </div>
                <div class="quiz-card-footer hub-card-footer">
                    <button class="btn-tactical flex-1" data-action="submit-new-subject">Publish Subject</button>
                    <button class="btn-tactical btn-clear flex-1" data-action="cancel-create-subject">Cancel</button>
                </div>
            </div>
        `;
        return;
    }

    const branch = inspectSelect ? inspectSelect.value : "";
    const data = state.QUESTION_REGISTRY[branch];
    const isSubjectOwner = data && data.createdBy && data.createdBy === userUid;

    if (deleteModBtn) deleteModBtn.classList.toggle("hidden", !(isSuper || isSubjectOwner));

    // 2. Blank State View
    if (!branch || !data) {
        container.innerHTML = `
            <div class="quiz-card hub-blank-card">
                <h3 class="hub-blank-title">Subject Hub Manager</h3>
                <p class="hub-blank-desc">
                    Select an existing subject from the dropdown above to manage its question bank, or click below to publish a brand-new subject.
                </p>
                <button class="btn-tactical btn-gold" data-action="trigger-create-from-blank">Create New Subject</button>
            </div>
        `;
        return;
    }

    // 3. Selected Subject View
    const rawQs = data.questions || {};
    const totalQs = Array.isArray(rawQs) ? rawQs.length : Object.keys(rawQs).length;
    const isEditingSubject = state.editingSubjectKey === branch;

    const bgClass = data.imageUrl ? 'hub-card-custom-bg' : '';
    const bgStyleAttr = data.imageUrl ? `style="background-image: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${data.imageUrl}');"` : '';

    let subjectCardHTML = "";
    if (isEditingSubject) {
        const existingLinks = data.links || [];

        subjectCardHTML = `
            <div class="quiz-card hub-edit-card ${bgClass}" ${bgStyleAttr}>
                <div>
                    <div class="quiz-card-header hub-card-header-row">
                        <input type="text" id="edit-mod-category" value="${(data.category || 'General').replace(/"/g, '&quot;')}" placeholder="Category" class="hub-category-input">
                        <span class="hub-question-count">${totalQs} Questions</span>
                    </div>
                    
                    <div class="hub-field-margin">
                        <input type="text" id="edit-mod-title" value="${(data.branchName || branch).replace(/"/g, '&quot;')}" placeholder="Subject Title" class="hub-title-input">
                    </div>
                    
                    <div class="hub-field-margin-sm">
                        <strong>Publication Citation:</strong> 
                        <input type="text" id="edit-mod-publication" value="${(data.publication || 'Standard Regulation').replace(/"/g, '&quot;')}" placeholder="Publication Citation" class="hub-publication-input">
                    </div>

                    <!-- Dynamic Multi-Link Editor -->
                    <div id="edit-dynamic-links-container" class="hub-form-stack-xs hub-field-margin-sm">
                        <label class="font-bold text-sm">Action Buttons / Practice Links:</label>
                        ${existingLinks.map(link => `
                            <div class="dynamic-link-row flex-row-between gap-sm">
                                <input type="text" class="link-label flex-1" placeholder="Button Label" value="${(link.label || '').replace(/"/g, '&quot;')}">
                                <input type="text" class="link-url flex-1" placeholder="URL or setup.html?subject=XYZ" value="${(link.url || '').replace(/"/g, '&quot;')}">
                                <select class="link-type">
                                    <option value="quiz" ${link.type === 'quiz' ? 'selected' : ''}>Quiz</option>
                                    <option value="simulator" ${link.type === 'simulator' ? 'selected' : ''}>Simulator</option>
                                    <option value="pdf" ${link.type === 'pdf' ? 'selected' : ''}>PDF</option>
                                </select>
                                <button type="button" class="btn-tactical btn-red btn-sm" onclick="this.parentElement.remove()">✕</button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" class="btn-tactical btn-gold btn-sm margin-bottom-sm" onclick="window.addLinkRow('edit-dynamic-links-container')">
                        Add Link
                    </button>

                    <div class="hub-field-margin-xs">
                        <textarea id="edit-mod-description" placeholder="Subject Description" rows="3" class="hub-textarea">${data.description || ''}</textarea>
                    </div>

                    <div class="hub-file-upload-row hub-field-margin-xs">
                        <input type="text" id="edit-mod-bg" value="${(data.imageUrl || '').replace(/"/g, '&quot;')}" placeholder="Card Background Image URL or Upload Image" class="hub-bg-input flex-1">
                        <input type="file" id="edit-mod-bg-file" data-text-target="edit-mod-bg" accept="image/*" class="hidden">
                        <button type="button" class="btn-tactical btn-gold" data-action="trigger-file-upload" data-target="edit-mod-bg">Upload</button>
                    </div>
                </div>

                <div class="quiz-card-footer hub-card-footer">
                    <button class="btn-tactical flex-1" data-action="save-subject" data-key="${branch}">Save Info</button>
                    <button class="btn-tactical btn-clear flex-1" data-action="cancel-edit-subject">Cancel</button>
                </div>
            </div>
        `;
} else {
        const canEditSubject = isSuper || isSubjectOwner;
        const formattedDescription = formatTextWithLinks(data.description || '');

        const customLaunchUrl = getSubjectLaunchUrl(data, branch);
        const isSimulator = Boolean(customLaunchUrl);
        const hasQuestions = totalQs > 0;
        
        // Show launch button ONLY if it is a simulator/custom URL OR has at least 1 question
        const showLaunchButton = isSimulator || hasQuestions;

        const launchButtonText = isSimulator ? "Launch Simulator ➔" : "Take Quiz ➔";
        const launchBtnClass = isSimulator ? "btn-gold" : "btn-blue";

        subjectCardHTML = `
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
                    ${canEditSubject ? `<button class="btn-tactical flex-1" data-action="edit-subject" data-key="${branch}">Edit Info</button>` : ''}
                    ${showLaunchButton ? `
                        <button class="btn-tactical ${launchBtnClass} flex-1" 
                                data-action="launch-subject" 
                                data-key="${branch}" 
                                ${customLaunchUrl ? `data-url="${customLaunchUrl}"` : ''}>
                            ${launchButtonText}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    if (state.activeSubjectListenerRef) state.activeSubjectListenerRef.off();

    state.activeSubjectListenerRef = database.ref(`subjects/${branch}/questions`);
    state.activeSubjectListenerRef.on("value", (snapshot) => {
        const qSnap = snapshot.val() || {};
        const questionsList = Array.isArray(qSnap)
            ? qSnap.map((q, idx) => ({ id: idx, ...q }))
            : Object.keys(qSnap).map(k => ({ id: k, ...qSnap[k] }));

        let questionsHTML = questionsList.length === 0
            ? `<div class="hub-no-questions">No questions exist in subject '${branch}' yet. Tap 'Add Question Card' above to create one!</div>`
            : questionsList.map((q, idx) => renderQuestionItem(q, idx, branch, isSuper || isSubjectOwner, userUid)).join('');

        container.innerHTML = subjectCardHTML + questionsHTML;
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
            <div class="hub-voting-controls">
                <button data-action="vote" data-type="up" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-sm btn-padding-tight" title="Helpful Question">
                    👍 ${upvoteCount}
                </button>
                <button data-action="vote" data-type="down" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-sm btn-padding-tight" title="Needs Rewording / Poor Quality">
                    👎 ${downvoteCount}
                </button>
            </div>

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
                    <button type="button" class="btn-tactical btn-gold btn-sm" data-action="trigger-file-upload" data-target="edit-qimg-${q.id}">Upload</button>
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
                    <div class="hub-footer-actions-left">
                        <div class="hub-voting-controls">
                            <button type="button" class="btn-tactical btn-sm" data-action="vote-up" data-branch="${branch}" data-qid="${q.id}">👍 ${q.upvotes || 0}</button>
                            <button type="button" class="btn-tactical btn-sm" data-action="vote-down" data-branch="${branch}" data-qid="${q.id}">👎 ${q.downvotes || 0}</button>
                        </div>
                        <button data-action="save-q" data-branch="${branch}" data-qid="${q.id}" class="btn-tactical btn-gold">Update</button>
                    </div>

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
                <strong>Options:</strong> ${optsArray.map((opt, i) => `${i + 1}.${opt}`).join(' | ')}
            </div>
            <div class="hub-q-citation-text">
                <em>Citation:</em> ${formatTextWithLinks(q.explanation || 'N/A')}
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

    if (isVerifiedAuthor) {
        updatePayload.verified = true;
        updatePayload.verifiedBy = userUid;
        updatePayload.verifiedAt = new Date().toISOString();
    }

    database.ref(`subjects/${branchKey}/questions/${questionId}`).update(updatePayload)
        .then(() => showToast("Question updated!", "success"))
        .catch(err => showToast("Update failed: " + err.message, "error"));
}

export async function deleteQuizSubject() {
    const selectEl = document.getElementById("bank-inspect-select");
    if (!selectEl || !selectEl.value) return;

    const branchKey = selectEl.value;
    const confirmed = await showConfirm(`CRITICAL WARNING: Delete subject '${branchKey}' and ALL questions?`, "Delete Subject");
    if (confirmed) {
        database.ref(`subjects/${branchKey}`).remove()
            .then(() => showToast(`Subject '${branchKey}' deleted`, "info"))
            .catch(err => showToast("Subject delete failed: " + err.message, "error"));
    }
}
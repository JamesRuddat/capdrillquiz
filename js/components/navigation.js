import { state } from '../state.js';
import { updateDashboardMetrics, renderLeaderboard } from './leaderboard.js';
import { renderUnifiedHub } from '../pages/hub-page.js';

// Helper function to extract valid, non-null questions from arrays or sparse Firebase objects
function getValidQuestionsCount(questionsPayload) {
    if (!questionsPayload) return 0;

    const items = Array.isArray(questionsPayload)
        ? questionsPayload
        : Object.values(questionsPayload);

    return items.filter(q => q && typeof q === 'object' && typeof q.q === 'string' && q.q.trim() !== '').length;
}

export function showView(viewId) {
    const views = ['home-view', 'setup-view', 'quiz-view', 'results-view', 'leaderboard-view', 'hub-view'];

    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', id !== viewId);
    });

    const selectView = document.getElementById('select-view');
    if (selectView) {
        const isAllowedView = (viewId === 'home-view' || viewId === 'setup-view');
        selectView.classList.toggle('hidden', !isAllowedView);
    }

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

    if (viewId === 'home-view') {
        updateDashboardMetrics();
        renderLeaderboard();
        renderSubjectCards();
    }
    if (viewId === 'setup-view') {
        populateBranchDropdowns();
    }
    if (viewId === 'leaderboard-view') renderLeaderboard();
    if (viewId === 'hub-view') renderUnifiedHub();
}

export function populateBranchDropdowns() {
    const setupSelect = document.getElementById("quiz-select");
    const builderTargetSelect = document.getElementById("builder-target-quiz");
    const inspectSelect = document.getElementById("bank-inspect-select");
    const leaderboardSelect = document.getElementById("filter-leaderboard");

    // Standardized to localStorage
    const savedCardSubject = localStorage.getItem("selectedSubjectKey");

    const savedSetup = setupSelect ? (savedCardSubject || setupSelect.value) : savedCardSubject;
    const savedBuilder = builderTargetSelect ? builderTargetSelect.value : "";
    const savedInspect = inspectSelect ? inspectSelect.value : "";
    const currentFilter = leaderboardSelect ? leaderboardSelect.value : "ALL";

    const subjectKeys = Object.keys(state.QUESTION_REGISTRY || {});

    if (setupSelect) setupSelect.innerHTML = "";
    if (builderTargetSelect) builderTargetSelect.innerHTML = "";
    if (inspectSelect) inspectSelect.innerHTML = "";
    if (leaderboardSelect) leaderboardSelect.innerHTML = `<option value="ALL">All Subjects</option>`;

    if (subjectKeys.length === 0) {
        if (setupSelect) setupSelect.innerHTML = `<option value="">No Subjects Available</option>`;
        if (builderTargetSelect) builderTargetSelect.innerHTML = `<option value="">No Subjects Available</option>`;
        if (inspectSelect) inspectSelect.innerHTML = `<option value="">No Subjects Available</option>`;
        return;
    }

    subjectKeys.forEach((key) => {
        const item = state.QUESTION_REGISTRY[key];
        const label = `${item.branchName || key} (${item.publication || 'Standard'})`;

        const opt1 = document.createElement("option");
        opt1.value = key;
        opt1.textContent = label;

        const opt2 = document.createElement("option");
        opt2.value = key;
        opt2.textContent = label;

        const opt3 = document.createElement("option");
        opt3.value = key;
        opt3.textContent = label;

        if (setupSelect) setupSelect.appendChild(opt1);
        if (builderTargetSelect) builderTargetSelect.appendChild(opt2);
        if (inspectSelect) inspectSelect.appendChild(opt3);

        if (leaderboardSelect) {
            const optLb = document.createElement("option");
            optLb.value = key;
            optLb.textContent = item.branchName || key;
            leaderboardSelect.appendChild(optLb);
        }
    });

    if (inspectSelect && savedInspect && state.QUESTION_REGISTRY[savedInspect]) {
        inspectSelect.value = savedInspect;
    }

    if (setupSelect && savedSetup && state.QUESTION_REGISTRY[savedSetup]) {
        setupSelect.value = savedSetup;
    }

    if (builderTargetSelect && savedBuilder && state.QUESTION_REGISTRY[savedBuilder]) {
        builderTargetSelect.value = savedBuilder;
    }

    if (leaderboardSelect) {
        leaderboardSelect.value = currentFilter;
    }

    if (setupSelect && setupSelect.value) {
        state.activeBranchKey = setupSelect.value;
    }

    localStorage.removeItem("selectedSubjectKey");

    updateSliderLimits();
}

export function renderSubjectList() {
    const treeContainer = document.getElementById("dynamic-publications-tree");
    if (!treeContainer) return;

    const subjectKeys = Object.keys(state.QUESTION_REGISTRY || {});

    if (subjectKeys.length === 0) {
        treeContainer.innerHTML = `<span class="text-dim">No subjects registered in database yet.</span>`;
        return;
    }

    let html = `<ul class="tree">`;
    subjectKeys.forEach((key) => {
        const item = state.QUESTION_REGISTRY[key];
        const count = getValidQuestionsCount(item.questions);

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

export function updateSliderLimits() {
    const selectEl = document.getElementById("quiz-select");
    const slider = document.getElementById("quiz-question-count-slider");
    const label = document.getElementById("quiz-question-count-label");

    if (!selectEl || !slider || !label) return;

    const selectedKey = selectEl.value;
    const subject = state.QUESTION_REGISTRY ? state.QUESTION_REGISTRY[selectedKey] : null;

    if (!subject || !subject.questions) {
        slider.min = 1;
        slider.max = 1;
        slider.value = 1;
        label.innerText = "0 Questions";
        return;
    }

    const totalAvailable = getValidQuestionsCount(subject.questions);

    if (totalAvailable === 0) {
        slider.min = 1;
        slider.max = 1;
        slider.value = 1;
        label.innerText = "0 Questions";
        return;
    }

    slider.min = 1;
    slider.max = totalAvailable;
    slider.value = totalAvailable;

    label.innerText = `${totalAvailable} ${totalAvailable === 1 ? 'Question' : 'Questions'} (Max: ${totalAvailable})`;
}

export function toggleTheme() {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme");
    root.setAttribute("data-theme", current === "dark" ? "light" : "dark");
}

export function toggleAccordion(id) {
    const content = document.getElementById(id);
    const icon = document.getElementById(id + "-icon");
    if (content) {
        const isExpanded = content.classList.toggle("expanded");
        const trigger = content.previousElementSibling;
        if (trigger && trigger.classList.contains("accordion-trigger")) {
            trigger.classList.toggle("active-trigger", isExpanded);
        }
        if (icon) icon.innerText = isExpanded ? "▲" : "▼";
    }
}

export function sanitizeInput(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
}

export function renderSubjectCards() {
    const gridContainer = document.getElementById("quiz-cards-grid");
    if (!gridContainer) return;

    const subjectKeys = Object.keys(state.QUESTION_REGISTRY || {});

    if (subjectKeys.length === 0) {
        gridContainer.innerHTML = `<div class="text-center text-dim grid-span-full">No active subjects available.</div>`;
        return;
    }

    gridContainer.innerHTML = subjectKeys.map(key => {
        const data = state.QUESTION_REGISTRY[key];
        const totalQs = getValidQuestionsCount(data.questions);

        const bgClass = data.imageUrl ? 'quiz-card-custom-bg' : '';
        const bgStyleAttr = data.imageUrl ? `style="background-image: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${data.imageUrl}');"` : '';

        return `
            <div class="quiz-card ${bgClass}" ${bgStyleAttr}>
                <div>
                    <div class="quiz-card-header flex-row-between">
                        <span class="quiz-card-badge">${data.category || 'General'}</span>
                        <span class="text-sm ${data.imageUrl ? 'text-overlay-light' : 'text-dim'}">${totalQs} Questions</span>
                    </div>
                    <div class="quiz-card-title">${data.branchName || key}</div>
                    <div class="quiz-card-meta ${data.imageUrl ? 'text-overlay-bright' : ''}">
                        <strong>Publication:</strong> ${data.publication || 'Standard Regulation'}
                    </div>
                </div>
                <div class="quiz-card-footer">
                    <button class="btn-tactical btn-blue width-full btn-card-start" data-key="${key}" type="button">
                        Start
                    </button>
                </div>
            </div>
        `;
    }).join('');

    gridContainer.querySelectorAll(".btn-card-start").forEach(btn => {
        btn.onclick = (e) => {
            const selectedKey = e.currentTarget.dataset.key;
            // Standardized to localStorage
            localStorage.setItem("selectedSubjectKey", selectedKey);
            window.location.href = "setup.html";
        };
    });
}
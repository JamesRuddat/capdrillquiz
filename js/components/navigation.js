import { state } from '../state.js';
import { updateDashboardMetrics } from './leaderboard.js';
import { renderLeaderboard } from './leaderboard.js';
import { renderUnifiedHub } from './hub.js';

export function showView(viewId) {
    // Top-level views
    const views = ['home-view', 'setup-view', 'quiz-view', 'results-view', 'leaderboard-view', 'hub-view'];
    
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', id !== viewId);
    });

    // Control 'select-view' visibility explicitly:
    // Only show when on 'home-view' or 'setup-view'
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

    // Update active navbar tab
    document.querySelectorAll('#navbar a').forEach(a => a.classList.remove('active-nav'));
    if (navMap[viewId] && document.getElementById(navMap[viewId])) {
        document.getElementById(navMap[viewId]).classList.add('active-nav');
    }

    // View-specific initializations
    if (viewId === 'home-view') {
        updateDashboardMetrics();
        renderModuleCards();
    }
    if (viewId === 'leaderboard-view') renderLeaderboard();
    if (viewId === 'hub-view') renderUnifiedHub();
}

export function populateBranchDropdowns() {
    const setupSelect = document.getElementById("quiz-select");
    const builderTargetSelect = document.getElementById("builder-target-quiz");
    const inspectSelect = document.getElementById("bank-inspect-select");
    const leaderboardSelect = document.getElementById("filter-leaderboard");

    // 1. Save currently active values before wiping elements
    const savedSetup = setupSelect ? setupSelect.value : "";
    const savedBuilder = builderTargetSelect ? builderTargetSelect.value : "";
    const savedInspect = inspectSelect ? inspectSelect.value : "";
    const currentFilter = leaderboardSelect ? leaderboardSelect.value : "ALL";

    const moduleKeys = Object.keys(state.QUESTION_REGISTRY);

    if (setupSelect) setupSelect.innerHTML = "";
    if (builderTargetSelect) builderTargetSelect.innerHTML = "";
    if (inspectSelect) inspectSelect.innerHTML = "";
    if (leaderboardSelect) leaderboardSelect.innerHTML = `<option value="ALL">All Modules</option>`;

    if (moduleKeys.length === 0) {
        if (setupSelect) setupSelect.innerHTML = `<option value="">No Modules Available</option>`;
        if (builderTargetSelect) builderTargetSelect.innerHTML = `<option value="">No Modules Available</option>`;
        if (inspectSelect) inspectSelect.innerHTML = `<option value="">No Modules Available</option>`;
        return;
    }

    moduleKeys.forEach((key) => {
        const item = state.QUESTION_REGISTRY[key];
        const label = `${item.branchName || key} (${item.manual || 'Standard'})`;

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

    // 2. Restore selections if the modules still exist in state
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

    updateSliderLimits();
}

export function renderModuleList() {
    const treeContainer = document.getElementById("dynamic-manuals-tree");
    if (!treeContainer) return;

    const moduleKeys = Object.keys(state.QUESTION_REGISTRY);

    if (moduleKeys.length === 0) {
        treeContainer.innerHTML = `<span style="color: var(--light-text-color);">No modules registered in database yet.</span>`;
        return;
    }

    let html = `<ul class="tree">`;
    moduleKeys.forEach((key) => {
        const item = state.QUESTION_REGISTRY[key];
        const rawQs = item.questions;
        const count = rawQs ? (Array.isArray(rawQs) ? rawQs.length : Object.keys(rawQs).length) : 0;

        html += `
            <li><strong>${item.branchName || key} — ${item.manual || 'N/A'}</strong>
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
    const module = state.QUESTION_REGISTRY[selectedKey];

    if (!module || !module.questions) {
        slider.min = 1;
        slider.max = 1;
        slider.value = 1;
        label.innerText = "0 Questions";
        return;
    }

    const rawQuestions = module.questions;
    const totalAvailable = Array.isArray(rawQuestions)
        ? rawQuestions.length
        : Object.keys(rawQuestions).length;

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

export function renderModuleCards() {
    const gridContainer = document.getElementById("quiz-cards-grid");
    if (!gridContainer) return;

    const moduleKeys = Object.keys(state.QUESTION_REGISTRY);

    if (moduleKeys.length === 0) {
        gridContainer.innerHTML = `<div class="text-center" style="color: var(--light-text-color);">No active modules available.</div>`;
        return;
    }

    gridContainer.innerHTML = moduleKeys.map(key => {
        const data = state.QUESTION_REGISTRY[key];
        const rawQs = data.questions || {};
        const totalQs = Array.isArray(rawQs) ? rawQs.length : Object.keys(rawQs).length;

        // Apply background image overlay if an imageUrl exists
        const bgStyle = data.imageUrl 
            ? `background: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${data.imageUrl}') center/cover no-repeat; color: #ffffff;`
            : '';

        return `
            <div class="quiz-card" style="${bgStyle}">
                <div>
                    <div class="quiz-card-header">
                        <span class="quiz-card-badge">${data.category || 'General'}</span>
                        <span style="font-size: 0.8rem; color: ${data.imageUrl ? '#ddd' : 'var(--light-text-color)'};">${totalQs} Questions</span>
                    </div>
                    <div class="quiz-card-title">${data.branchName || key}</div>
                    <div class="quiz-card-meta" style="color: ${data.imageUrl ? '#eee' : 'inherit'};">
                        <strong>Manual:</strong> ${data.manual || 'Standard Regulation'}
                    </div>
                </div>
                <div class="quiz-card-footer" style="margin-top: 0.8em;">
                    <button class="btn-tactical btn-blue" data-action="launch-module" data-key="${key}" style="width: 100%;">
                        ⚡ Start Quiz
                    </button>
                </div>
            </div>
        `;
    }).join('');
}
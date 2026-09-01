import { state } from '../state.js';
import { updateDashboardMetrics } from './leaderboard.js';
import { renderLeaderboard } from './leaderboard.js';
import { renderUnifiedHub } from './hub.js';

export function showView(viewId) {
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

export function populateBranchDropdowns() {
    const setupSelect = document.getElementById("quiz-select");
    const builderTargetSelect = document.getElementById("builder-target-quiz");
    const inspectSelect = document.getElementById("bank-inspect-select");
    const leaderboardSelect = document.getElementById("filter-leaderboard");

    const moduleKeys = Object.keys(state.QUESTION_REGISTRY);

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
        const item = state.QUESTION_REGISTRY[key];
        const label = `${item.branchName || key} (${item.manual || 'Standard'})`;

        if (setupSelect) setupSelect.innerHTML += `<option value="${key}">${label}</option>`;
        if (builderTargetSelect) builderTargetSelect.innerHTML += `<option value="${key}">${label}</option>`;
        if (inspectSelect) inspectSelect.innerHTML += `<option value="${key}">${label}</option>`;
        if (leaderboardSelect) leaderboardSelect.innerHTML += `<option value="${key}">${item.branchName || key}</option>`;
    });

    if (leaderboardSelect) leaderboardSelect.value = currentFilter;
    if (setupSelect && setupSelect.value) state.activeBranchKey = setupSelect.value;
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

    // Set slider boundaries directly to the module set count
    slider.min = 1;
    slider.max = totalAvailable;
    slider.value = totalAvailable; // Default to full question set

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
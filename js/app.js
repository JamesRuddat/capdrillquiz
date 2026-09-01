import { auth, database } from './config.js';
import { state } from './state.js';
import { handleGoogleAuth } from './services/auth-service.js';
import { 
    showView, 
    populateBranchDropdowns, 
    renderModuleList, 
    toggleTheme, 
    toggleAccordion,
    updateSliderLimits
} from './components/navigation.js';
import { startQuiz, advanceQuestion } from './components/quiz-engine.js';
import { updateDashboardMetrics, renderLeaderboard } from './components/leaderboard.js';
import { 
    renderUnifiedHub, 
    createNewQuizModule, 
    addCustomQuestion, 
    voteQuestion, 
    saveQuestionEdit, 
    deleteQuestion, 
    deleteQuizModule 
} from './components/hub.js';

document.addEventListener("DOMContentLoaded", () => {
    // Navigation Listeners
    document.getElementById("nav-home").addEventListener("click", () => showView('home-view'));
    document.getElementById("nav-setup").addEventListener("click", () => showView('setup-view'));
    document.getElementById("nav-leaderboard").addEventListener("click", () => showView('leaderboard-view'));
    document.getElementById("nav-hub").addEventListener("click", () => { showView('hub-view'); renderUnifiedHub(); });

    // Hero Action Buttons
    const heroStartBtn = document.getElementById("btn-hero-start");
    const heroHubBtn = document.getElementById("btn-hero-hub");
    if (heroStartBtn) heroStartBtn.addEventListener("click", () => showView('setup-view'));
    if (heroHubBtn) heroHubBtn.addEventListener("click", () => { showView('hub-view'); renderUnifiedHub(); });

    // Global & Quiz Action Controls
    document.getElementById("theme-toggle-btn").addEventListener("click", toggleTheme);
    document.getElementById("google-auth-btn").addEventListener("click", handleGoogleAuth);
    document.getElementById("btn-launch-eval").addEventListener("click", () => showView('setup-view'));
    document.getElementById("btn-begin-assessment").addEventListener("click", startQuiz);
    document.getElementById("next-question-btn").addEventListener("click", advanceQuestion);

    // Question Count Slider Listeners
    const quizSelect = document.getElementById("quiz-select");
    const countSlider = document.getElementById("quiz-question-count-slider");
    const countLabel = document.getElementById("quiz-question-count-label");

    if (quizSelect) {
        quizSelect.addEventListener("change", updateSliderLimits);
    }

    if (countSlider && countLabel) {
        countSlider.addEventListener("input", (e) => {
            const val = e.target.value;
            const max = countSlider.max;
            countLabel.innerText = `${val} ${val == 1 ? 'Question' : 'Questions'} (Max: ${max})`;
        });
    }

    // Results Navigation
    document.getElementById("btn-res-another").addEventListener("click", () => showView('setup-view'));
    document.getElementById("btn-res-leaderboard").addEventListener("click", () => showView('leaderboard-view'));
    document.getElementById("btn-res-home").addEventListener("click", () => showView('home-view'));

    // Accordions & Hub Controls
    document.getElementById("trig-module-form").addEventListener("click", () => toggleAccordion('module-form-accordion'));
    document.getElementById("trig-question-form").addEventListener("click", () => toggleAccordion('question-form-accordion'));
    document.getElementById("btn-create-module").addEventListener("click", createNewQuizModule);
    document.getElementById("btn-add-question").addEventListener("click", addCustomQuestion);
    document.getElementById("bank-inspect-select").addEventListener("change", renderUnifiedHub);
    document.getElementById("btn-delete-module").addEventListener("click", deleteQuizModule);
    document.getElementById("filter-leaderboard").addEventListener("change", renderLeaderboard);

    // Dynamic Card Delegation
    document.getElementById("bank-inspector-list").addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;

        const action = btn.dataset.action;
        const branch = btn.dataset.branch;
        const qid = btn.dataset.qid;

        if (action === "vote") voteQuestion(branch, qid, btn.dataset.type, btn.dataset.creator);
        else if (action === "save-q") saveQuestionEdit(branch, qid);
        else if (action === "delete-q") deleteQuestion(branch, qid);
    });

    // Auth Observer
    auth.onAuthStateChanged((user) => {
        const authBtn = document.getElementById("google-auth-btn");
        state.currentUser = user || null;
        if (authBtn) authBtn.innerText = user ? `Sign Out (${user.displayName || 'User'})` : "Sign in with Google";

        const hubView = document.getElementById("hub-view");
        if (hubView && !hubView.classList.contains("hidden")) {
            renderUnifiedHub();
        }
    });

    // DB Observer
    database.ref("quizModules").on("value", (snapshot) => {
        state.QUESTION_REGISTRY = snapshot.val() || {};
        populateBranchDropdowns();
        renderModuleList();

        const hubView = document.getElementById("hub-view");
        if (hubView && !hubView.classList.contains("hidden")) {
            renderUnifiedHub();
        }
    });

    updateDashboardMetrics();
    renderLeaderboard();
});
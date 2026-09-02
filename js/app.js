import { auth, database } from './config.js';
import { state } from './state.js';
import { handleGoogleAuth } from './services/auth-service.js';
import { 
    showView, 
    populateBranchDropdowns, 
    renderModuleList,
    renderModuleCards,
    toggleTheme, 
    updateSliderLimits
} from './components/navigation.js';
import { startQuiz, advanceQuestion } from './components/quiz-engine.js';
import { updateDashboardMetrics, renderLeaderboard } from './components/leaderboard.js';
import { 
    renderUnifiedHub, 
    addBlankQuestionCard,
    voteQuestion, 
    saveQuestionEdit, 
    deleteQuestion, 
    deleteQuizModule,
    toggleEditModule,
    toggleCreateModuleCard,
    saveModuleEdit,
    submitNewModuleCard
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

    // Hamburger Mobile Menu Toggle
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const navDrawer = document.getElementById("nav-drawer");

    if (hamburgerBtn && navDrawer) {
        // Toggle menu state on button click
        hamburgerBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Stops the event from reaching document listener
            const isOpen = navDrawer.classList.contains("is-open");
            
            if (isOpen) {
                navDrawer.classList.remove("is-open");
                hamburgerBtn.classList.remove("is-active");
            } else {
                navDrawer.classList.add("is-open");
                hamburgerBtn.classList.add("is-active");
            }
        });

        // Close menu when clicking any navigation link
        navDrawer.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navDrawer.classList.remove("is-open");
                hamburgerBtn.classList.remove("is-active");
            });
        });

        // Close menu when clicking outside anywhere else on screen
        document.addEventListener("click", (e) => {
            const isClickInsideMenu = navDrawer.contains(e.target);
            const isClickOnHamburger = hamburgerBtn.contains(e.target);

            if (!isClickInsideMenu && !isClickOnHamburger) {
                navDrawer.classList.remove("is-open");
                hamburgerBtn.classList.remove("is-active");
            }
        });
    }

    // Global & Quiz Action Controls
    document.getElementById("theme-toggle-btn").addEventListener("click", toggleTheme);
    document.getElementById("google-auth-btn").addEventListener("click", handleGoogleAuth);
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

    // Module & Question Header Controls
    const createModCardBtn = document.getElementById("btn-create-module-card");
    if (createModCardBtn) {
        createModCardBtn.addEventListener("click", () => toggleCreateModuleCard(true));
    }

    const addQuestionCardBtn = document.getElementById("btn-add-question-card");
    if (addQuestionCardBtn) {
        addQuestionCardBtn.addEventListener("click", () => {
            const inspectSelect = document.getElementById("bank-inspect-select");
            const activeBranch = inspectSelect ? inspectSelect.value : "";
            if (!activeBranch) {
                alert("Please select a target module first.");
                return;
            }
            addBlankQuestionCard(activeBranch);
        });
    }

    // Results Navigation
    document.getElementById("btn-res-another").addEventListener("click", () => showView('setup-view'));
    document.getElementById("btn-res-leaderboard").addEventListener("click", () => showView('leaderboard-view'));
    document.getElementById("btn-res-home").addEventListener("click", () => showView('home-view'));

    // Module Dropdown & Delete Listeners
    const inspectSelect = document.getElementById("bank-inspect-select");
    if (inspectSelect) inspectSelect.addEventListener("change", renderUnifiedHub);

    const deleteModBtn = document.getElementById("btn-delete-module");
    if (deleteModBtn) deleteModBtn.addEventListener("click", deleteQuizModule);

    const filterLeaderboard = document.getElementById("filter-leaderboard");
    if (filterLeaderboard) filterLeaderboard.addEventListener("change", renderLeaderboard);

    // Home View Card Grid Delegation
    const quizCardsGrid = document.getElementById("quiz-cards-grid");
    if (quizCardsGrid) {
        quizCardsGrid.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action='launch-module']");
            if (!btn) return;

            const moduleKey = btn.dataset.key;
            const selectEl = document.getElementById("quiz-select");

            if (selectEl) {
                selectEl.value = moduleKey;
                updateSliderLimits();
            }

            showView('setup-view');
        });
    }

    // Dynamic Inspector Delegation (Cards & Questions)
    const inspectorList = document.getElementById("bank-inspector-list");
    if (inspectorList) {
        inspectorList.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;

            const action = btn.dataset.action;
            const key = btn.dataset.key;
            const branch = btn.dataset.branch;
            const qid = btn.dataset.qid;

            // Module Card Actions
            if (action === "edit-module") toggleEditModule(key);
            else if (action === "cancel-edit-module") toggleEditModule(null);
            else if (action === "save-module") saveModuleEdit(key);
            else if (action === "submit-new-module") submitNewModuleCard();
            else if (action === "cancel-create-module") toggleCreateModuleCard(false);
            else if (action === "launch-module") {
                const selectEl = document.getElementById("quiz-select");
                if (selectEl) selectEl.value = key;
                showView('setup-view');
            }
            // Question Card Actions
            else if (action === "vote") voteQuestion(branch, qid, btn.dataset.type, btn.dataset.creator);
            else if (action === "save-q") saveQuestionEdit(branch, qid);
            else if (action === "delete-q") deleteQuestion(branch, qid);
        });
    }

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
        renderModuleCards();

        const hubView = document.getElementById("hub-view");
        if (hubView && !hubView.classList.contains("hidden")) {
            renderUnifiedHub();
        }
    });

    updateDashboardMetrics();
    renderLeaderboard();
});
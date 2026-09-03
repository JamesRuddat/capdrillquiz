import { auth, database } from './config.js';
import { state } from './state.js';
import { handleGoogleAuth } from './services/auth-service.js';
import { initFlashcards } from './components/flashcards.js';
import {
    populateBranchDropdowns,
    renderModuleList,
    renderModuleCards,
    toggleTheme,
    updateSliderLimits
} from './components/navigation.js';
import { startQuiz, exitQuizSession, loadQuestion, renderResults, advanceQuestion, updateBannerImage } from './components/quiz-engine.js';
import { updateDashboardMetrics, renderLeaderboard, initTableSorting } from './components/leaderboard.js';
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

    const addListener = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    };

    // Attach Next Question button handler
    const nextBtn = document.getElementById("next-question-btn");
    if (nextBtn) {
        nextBtn.addEventListener("click", advanceQuestion);
    }

    if (document.getElementById("quiz-view")) {
        loadQuestion();
    }

    if (document.getElementById("results-view")) {
        renderResults();
    }

    if (document.getElementById("flashcard-view")) {
        initFlashcards();
    }

    initTableSorting("leaderboard-table");

    addListener("btn-res-another", "click", () => window.location.href = "setup.html");
    addListener("btn-res-leaderboard", "click", () => window.location.href = "leaderboard.html");
    addListener("btn-res-home", "click", () => window.location.href = "index.html");

    addListener("google-auth-btn", "click", handleGoogleAuth);

    // Mode Selection Button Triggers
    addListener("btn-mode-test", "click", () => startQuiz("test"));
    addListener("btn-mode-study", "click", () => startQuiz("study"));
    addListener("btn-mode-flashcards", "click", () => startQuiz("flashcard"));
    addListener("btn-quiz-exit", "click", exitQuizSession);

    // Subject Selector and Banner Image Sync
    const quizSelect = document.getElementById("quiz-select");
    const countSlider = document.getElementById("quiz-question-count-slider");
    const countLabel = document.getElementById("quiz-question-count-label");

    if (quizSelect) {
        quizSelect.addEventListener("change", () => {
            updateSliderLimits();
            updateBannerImage();
        });
    }

    if (countSlider && countLabel) {
        countSlider.addEventListener("input", (e) => {
            const val = e.target.value;
            const max = countSlider.max;
            countLabel.innerText = `${val} ${val == 1 ? 'Question' : 'Questions'} (Max: ${max})`;
        });
    }

    addListener("btn-create-module-card", "click", () => toggleCreateModuleCard(true));

    addListener("btn-add-question-card", "click", () => {
        const inspectSelect = document.getElementById("bank-inspect-select");
        const activeBranch = inspectSelect ? inspectSelect.value : "";
        if (!activeBranch) {
            alert("Please select a target subject first.");
            return;
        }
        addBlankQuestionCard(activeBranch);
    });

    const inspectSelect = document.getElementById("bank-inspect-select");
    if (inspectSelect) inspectSelect.addEventListener("change", renderUnifiedHub);

    addListener("btn-delete-module", "click", deleteQuizModule);

    const filterLeaderboard = document.getElementById("filter-leaderboard");
    if (filterLeaderboard) filterLeaderboard.addEventListener("change", renderLeaderboard);

    const quizCardsGrid = document.getElementById("quiz-cards-grid");
    if (quizCardsGrid) {
        quizCardsGrid.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action='launch-module']");
            if (!btn) return;

            const moduleKey = btn.dataset.key;
            localStorage.setItem("selectedModuleKey", moduleKey);
            window.location.href = "setup.html";
        });
    }

    const inspectorList = document.getElementById("bank-inspector-list");
    if (inspectorList) {
        inspectorList.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;

            const action = btn.dataset.action;
            const key = btn.dataset.key;
            const branch = btn.dataset.branch;
            const qid = btn.dataset.qid;

            if (action === "edit-module") toggleEditModule(key);
            else if (action === "cancel-edit-module") toggleEditModule(null);
            else if (action === "save-module") saveModuleEdit(key);
            else if (action === "submit-new-module") submitNewModuleCard();
            else if (action === "cancel-create-module") toggleCreateModuleCard(false);
            else if (action === "launch-module") {
                localStorage.setItem("selectedModuleKey", key);
                window.location.href = "setup.html";
            }
            else if (action === "vote") voteQuestion(branch, qid, btn.dataset.type, btn.dataset.creator);
            else if (action === "save-q") saveQuestionEdit(branch, qid);
            else if (action === "delete-q") deleteQuestion(branch, qid);
        });
    }

    function getInitials(name) {
        if (!name) return "U";
        const parts = name.trim().split(" ");
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
    }

    auth.onAuthStateChanged((user) => {
        state.currentUser = user || null;

        const googleAuthBtn = document.getElementById("google-auth-btn");
        const userWrapper = document.getElementById("user-menu-wrapper");
        const avatarBtn = document.getElementById("user-avatar-btn");
        const dropdownName = document.getElementById("user-dropdown-name");

        if (user) {
            if (googleAuthBtn) googleAuthBtn.classList.add("hidden");
            if (userWrapper) userWrapper.classList.remove("hidden");
            if (avatarBtn) avatarBtn.innerText = getInitials(user.displayName);
            if (dropdownName) dropdownName.innerText = user.displayName || "User Profile";
        } else {
            if (googleAuthBtn) googleAuthBtn.classList.remove("hidden");
            if (userWrapper) userWrapper.classList.add("hidden");
        }
    });

    database.ref("quizModules").on("value", (snapshot) => {
        state.QUESTION_REGISTRY = snapshot.val() || {};

        populateBranchDropdowns();
        renderModuleList();
        renderModuleCards();

        const savedModule = localStorage.getItem("selectedModuleKey");
        if (savedModule && quizSelect && state.QUESTION_REGISTRY[savedModule]) {
            quizSelect.value = savedModule;
            updateSliderLimits();
            updateBannerImage();
            localStorage.removeItem("selectedModuleKey");
        } else {
            updateBannerImage();
        }

        if (document.getElementById("bank-inspector-list")) {
            renderUnifiedHub();
        }
    });

    updateDashboardMetrics();
    renderLeaderboard();
});
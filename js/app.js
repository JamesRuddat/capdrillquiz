import { auth, database } from './config.js';
import { state } from './state.js';
import { initializeUserCallsign } from './services/auth-service.js';
import { initQuizPage, initResultsPage, updateBannerImage, startQuiz } from './components/quiz-engine.js';
import { initFlashcards } from './components/flashcards.js';
import { initLeaderboardPage, updateDashboardMetrics, initTableSorting } from './components/leaderboard.js';
import { initHubPage, renderUnifiedHub } from './pages/hub-page.js';
import { populateBranchDropdowns, renderModuleList, renderModuleCards, updateSliderLimits } from './components/navigation.js';
import { initAdminPage } from './pages/admin-page.js';

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. ROUTER: Initialize view controllers
    if (document.getElementById("quiz-view")) initQuizPage();
    if (document.getElementById("results-view")) initResultsPage();
    if (document.getElementById("flashcard-view")) initFlashcards();
    if (document.getElementById("filter-leaderboard")) initLeaderboardPage();
    if (document.getElementById("bank-inspector-list")) initHubPage();
    if (document.getElementById("admin-view")) initAdminPage();

    // HOME PAGE INITIALIZATION (Loads stats grid & top honor roll table)
    if (document.getElementById("home-view") || document.getElementById("home-top-scores-body")) {
        updateDashboardMetrics();
        initTableSorting("leaderboard-table");
    }

    // 2. SETUP VIEW BINDINGS
    if (document.getElementById("setup-view")) {
        const quizSelect = document.getElementById("quiz-select");
        const slider = document.getElementById("quiz-question-count-slider");
        const sliderLabel = document.getElementById("quiz-question-count-label");

        if (quizSelect) {
            quizSelect.addEventListener("change", () => {
                updateSliderLimits();
                updateBannerImage();
            });
        }

        if (slider && sliderLabel) {
            slider.addEventListener("input", (e) => {
                const val = e.target.value;
                const max = slider.max;
                sliderLabel.innerText = `${val} ${val === '1' ? 'Question' : 'Questions'} (Max: ${max})`;
            });
        }

        // Mode Action Buttons
        const btnTest = document.getElementById("btn-mode-test");
        const btnStudy = document.getElementById("btn-mode-study");
        const btnFlashcards = document.getElementById("btn-mode-flashcards");

        if (btnTest) btnTest.onclick = () => startQuiz("test");
        if (btnStudy) btnStudy.onclick = () => startQuiz("study");
        if (btnFlashcards) btnFlashcards.onclick = () => startQuiz("flashcard");
    }

    // 3. AUTH OBSERVER: Sync state, roles, and header UI
    auth.onAuthStateChanged(async (user) => {
        state.currentUser = user || null;
        const header = document.querySelector("site-header");

        if (user) {
            const callsign = await initializeUserCallsign(user);

            // Fetch and store user role in global state
            try {
                const roleSnap = await database.ref(`users/${user.uid}/role`).once("value");
                state.userRole = roleSnap.val() || "user";
            } catch (err) {
                console.error("Error fetching user role:", err);
                state.userRole = "user";
            }

            if (header && typeof header.renderUser === 'function') {
                header.renderUser(callsign, state.userPoints || 0);
            }
        } else {
            state.userCallsign = null;
            state.userPoints = 0;
            state.userRole = "guest";
            if (header && typeof header.renderGuest === 'function') {
                header.renderGuest();
            }
        }

        // Re-run view guards or UI updates dependent on auth role change
        if (document.getElementById("admin-view")) initAdminPage();
        if (document.getElementById("bank-inspector-list")) renderUnifiedHub();
    });

    // 4. DATABASE SYNC: Maintain dynamic question registry & UI elements
    database.ref("subjects").on("value", (snapshot) => {
        state.QUESTION_REGISTRY = snapshot.val() || {};

        populateBranchDropdowns();
        renderModuleList();
        renderModuleCards();

        // Refresh metrics counter when modules load or change
        if (document.getElementById("home-view") || document.getElementById("home-top-scores-body")) {
            updateDashboardMetrics();
        }

        if (document.getElementById("setup-view")) {
            updateSliderLimits();
            updateBannerImage();
        }

        if (document.getElementById("bank-inspector-list")) {
            renderUnifiedHub();
        }
    });
});
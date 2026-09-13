import { auth, database } from './config.js';
import { state } from './state.js';
import { initializeUserCallsign } from './services/auth-service.js';
import { initQuizPage, initResultsPage, updateBannerImage, startQuiz } from './components/quiz-engine.js';
import { initFlashcards } from './components/flashcards.js';
import { initLeaderboardPage, updateDashboardMetrics, initTableSorting } from './components/leaderboard.js';
import { initHubPage, renderUnifiedHub } from './pages/hub-page.js';
import { populateBranchDropdowns, renderSubjectList, renderSubjectCards, updateSliderLimits } from './components/navigation.js';
import { initAdminPage } from './pages/admin-page.js';
import { initDailyChallenge } from './components/daily-challenge.js';

document.addEventListener("DOMContentLoaded", () => {

    // 1. IMMEDIATE OPTIMISTIC RENDERING (0ms Delay from Cache)
    if (document.getElementById("quiz-select")) {
        populateBranchDropdowns();
    }
    if (document.getElementById("quiz-cards-grid")) {
        renderSubjectCards();
    }

    // 2. ROUTER: Initialize view controllers
    if (document.getElementById("quiz-view")) initQuizPage();
    if (document.getElementById("results-view")) initResultsPage();
    if (document.getElementById("flashcard-view")) initFlashcards();
    if (document.getElementById("filter-leaderboard")) initLeaderboardPage();
    if (document.getElementById("bank-inspector-list")) initHubPage();
    if (document.getElementById("admin-view")) initAdminPage();

    // Home Page Stats
    if (document.getElementById("home-view") || document.getElementById("home-top-scores-body")) {
        updateDashboardMetrics();
        initTableSorting("leaderboard-table");
    }

    // 3. SETUP VIEW BINDINGS
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

        // Mode Action Buttons (Attached via Event Listeners for ES Subject Scope)
        const btnTest = document.getElementById("btn-mode-test");
        const btnStudy = document.getElementById("btn-mode-study");
        const btnFlashcards = document.getElementById("btn-mode-flashcards");

        if (btnTest) btnTest.addEventListener("click", () => startQuiz("test"));
        if (btnStudy) btnStudy.addEventListener("click", () => startQuiz("study"));
        if (btnFlashcards) btnFlashcards.addEventListener("click", () => startQuiz("flashcard"));
    }

    // 4. AUTH OBSERVER: Centralized state sync
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const [callsign, roleSnap, pointsSnap] = await Promise.all([
                    initializeUserCallsign(user),
                    database.ref(`users/${user.uid}/role`).once("value"),
                    database.ref(`users/${user.uid}/points`).once("value")
                ]);

                const points = pointsSnap.val() || 0;
                state.userRole = roleSnap.val() || "user";

                state.setUser(user, callsign, points);

            } catch (err) {
                console.error("Error syncing auth state:", err);
                state.setUser(user, "User", 0);
            }
        } else {
            state.setUser(null, null, 0);
            state.userRole = "guest";
        }

        if (document.getElementById("admin-view")) initAdminPage();
        if (document.getElementById("bank-inspector-list")) renderUnifiedHub();
    });

    // 5. DATABASE SYNC: Real-time subject registry updates
    database.ref("subjects").on("value", (snapshot) => {
        state.QUESTION_REGISTRY = snapshot.val() || {};

        requestAnimationFrame(() => {
            populateBranchDropdowns();
            renderSubjectList();
            renderSubjectCards();

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

            if (document.getElementById("daily-question-text")) {
                initDailyChallenge();
            }
        });
    });
});
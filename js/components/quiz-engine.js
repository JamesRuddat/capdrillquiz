import { state } from '../state.js';
import { sanitizeInput } from './navigation.js';
import { saveScoreToDB } from '../services/db-service.js';
import { updateDashboardMetrics } from './leaderboard.js';
import { awardPoints, showToast } from '../services/user-service.js';
import { showConfirm } from './modal.js';

export function initQuizPage() {
    loadQuestion();

    const nextBtn = document.getElementById("next-question-btn");
    if (nextBtn) {
        nextBtn.addEventListener("click", advanceQuestion);
    }

    const exitBtn = document.getElementById("btn-quiz-exit");
    if (exitBtn) {
        exitBtn.addEventListener("click", exitQuizSession);
    }
}

export function initResultsPage() {
    renderResults();

    const anotherBtn = document.getElementById("btn-res-another");
    if (anotherBtn) anotherBtn.addEventListener("click", () => window.location.href = "setup.html");

    const leaderboardBtn = document.getElementById("btn-res-leaderboard");
    if (leaderboardBtn) leaderboardBtn.addEventListener("click", () => window.location.href = "leaderboard.html");

    const homeBtn = document.getElementById("btn-res-home");
    if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "index.html");
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function extractValidQuestions(rawQuestions) {
    if (!rawQuestions) return [];
    const rawItems = Array.isArray(rawQuestions) 
        ? rawQuestions 
        : Object.values(rawQuestions);

    return rawItems.filter(q => q && typeof q === 'object' && typeof q.q === 'string' && q.q.trim() !== '');
}

export function updateBannerImage() {
    const selectEl = document.getElementById("quiz-select");
    const bannerEl = document.getElementById("subject-banner");
    const bannerTitleEl = document.querySelector("#subject-banner .banner-title");
    
    if (!selectEl || !bannerEl) return;

    const activeBranchKey = selectEl.value;
    const registryEntry = state.QUESTION_REGISTRY[activeBranchKey];

    const defaultImage = "https://www.gocivilairpatrol.com/media/photoalbums/67190384_2450135768383102_536700487_A2E9342E843CE.jpg?dimensions=950x633";
    const imageUrl = (registryEntry && registryEntry.imageUrl) ? registryEntry.imageUrl : defaultImage;
    const subjectTitle = (registryEntry && registryEntry.branchName) ? registryEntry.branchName : "Subject Configuration";

    bannerEl.style.backgroundImage = `url('${imageUrl}')`;

    if (bannerTitleEl) {
        bannerTitleEl.innerText = subjectTitle;
    }
}

export function startQuiz(mode = 'test') {
    const selectEl = document.getElementById("quiz-select");
    if (!selectEl || !selectEl.value) {
        showToast("Please select a quiz subject first!", "error");
        return;
    }

    const activeBranchKey = selectEl.value;
    const registryEntry = state.QUESTION_REGISTRY[activeBranchKey];

    if (!registryEntry || !registryEntry.questions) {
        showToast("No questions found for this subject.", "error");
        return;
    }

    const pool = extractValidQuestions(registryEntry.questions);
    if (pool.length === 0) {
        showToast("This subject does not have valid questions yet!", "error");
        return;
    }

    const slider = document.getElementById("quiz-question-count-slider");
    const requestedCount = slider ? parseInt(slider.value, 10) : pool.length;

    const randomizedPool = shuffleArray(pool);
    const activeQuestions = randomizedPool.slice(0, Math.min(requestedCount, pool.length));

    // Resolve name/callsign
    const nameInput = document.getElementById("name")?.value.trim();
    const activeName = state.userCallsign || nameInput || (state.currentUser ? state.currentUser.displayName : "Anonymous Cadet");

    const quizSession = {
        mode,
        activeName,
        activeBranchKey,
        branchName: registryEntry.branchName || activeBranchKey,
        activeQuestions,
        currentIdx: 0,
        score: 0
    };

    localStorage.setItem("activeQuizSession", JSON.stringify(quizSession));

    if (mode === 'flashcard') {
        window.location.href = "flashcards.html";
    } else {
        window.location.href = "quiz.html";
    }
}

export function loadQuestion() {
    const sessionRaw = localStorage.getItem("activeQuizSession");
    if (!sessionRaw) {
        window.location.href = "setup.html";
        return;
    }

    const session = JSON.parse(sessionRaw);

    if (!session.activeQuestions || session.activeQuestions.length === 0) {
        window.location.href = "setup.html";
        return;
    }

    const q = session.activeQuestions[session.currentIdx];

    if (!q || !q.q) {
        console.error("Invalid question payload at index:", session.currentIdx);
        window.location.href = "setup.html";
        return;
    }

    const badgeEl = document.getElementById("quiz-standard-badge");
    const trackerEl = document.getElementById("question-tracker");
    const textEl = document.getElementById("question-text");
    const container = document.getElementById("options-container");
    const feedbackPanel = document.getElementById("feedback-panel");
    const nextBtn = document.getElementById("next-question-btn");

    if (!textEl || !container) return; 

    if (badgeEl) badgeEl.innerText = `[MODULE: ${session.branchName}] (${session.mode.toUpperCase()} MODE)`;
    if (trackerEl) trackerEl.innerText = `Question ${session.currentIdx + 1} of ${session.activeQuestions.length}`;
    if (textEl) textEl.innerText = q.q;

    container.innerHTML = "";
    if (feedbackPanel) feedbackPanel.className = "hidden";
    if (nextBtn) nextBtn.classList.add("hidden");

    q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.innerText = `${idx + 1}. ${opt}`;
        btn.onclick = () => selectOption(idx);
        container.appendChild(btn);
    });
}

export function selectOption(selectedIdx) {
    const sessionRaw = localStorage.getItem("activeQuizSession");
    if (!sessionRaw) return;
    
    const session = JSON.parse(sessionRaw);
    const q = session.activeQuestions[session.currentIdx];
    const buttons = document.querySelectorAll("#options-container .option-btn");

    buttons.forEach(btn => btn.disabled = true);

    if (selectedIdx === q.answer) {
        session.score++;
    }

    if (!session.userAnswers) session.userAnswers = [];
    session.userAnswers[session.currentIdx] = selectedIdx;

    localStorage.setItem("activeQuizSession", JSON.stringify(session));

    const feedbackPanel = document.getElementById("feedback-panel");
    const nextBtn = document.getElementById("next-question-btn");

    if (session.mode === 'test') {
        buttons[selectedIdx].style.borderColor = "var(--alert-color)";
        buttons[selectedIdx].style.backgroundColor = "rgba(255, 205, 0, 0.15)";

        if (feedbackPanel) {
            feedbackPanel.className = "hidden";
            feedbackPanel.innerHTML = "";
        }

        if (nextBtn) {
            nextBtn.classList.remove("hidden");
        }
    } else {
        if (feedbackPanel) feedbackPanel.classList.remove("hidden");

        if (selectedIdx === q.answer) {
            buttons[selectedIdx].classList.add("correct");
            if (feedbackPanel) {
                feedbackPanel.className = "correct-panel";
                feedbackPanel.innerHTML = `<strong>[CORRECT]</strong> ${q.explanation || ''}`;
            }
        } else {
            buttons[selectedIdx].classList.add("incorrect");
            if (buttons[q.answer]) buttons[q.answer].classList.add("correct");
            if (feedbackPanel) {
                feedbackPanel.className = "incorrect-panel";
                feedbackPanel.innerHTML = `<strong>[INCORRECT]</strong> ${q.explanation || ''}`;
            }
        }

        if (nextBtn) {
            nextBtn.classList.remove("hidden");
        }
    }
}

export function advanceQuestion() {
    const session = JSON.parse(localStorage.getItem("activeQuizSession"));
    session.currentIdx++;
    localStorage.setItem("activeQuizSession", JSON.stringify(session));

    if (session.currentIdx < session.activeQuestions.length) {
        loadQuestion();
    } else {
        finishQuiz();
    }
}

export async function finishQuiz() {
    const session = JSON.parse(localStorage.getItem("activeQuizSession"));
    if (!session) return;

    const total = session.activeQuestions.length;
    const pct = Math.round((session.score / total) * 100);
    const cleanName = sanitizeInput(state.userCallsign || session.activeName);

    if (session.mode === 'test') {
        const pointsEarned = session.score * 10;
        if (pointsEarned > 0) {
            awardPoints(pointsEarned, "Test Evaluation");
        }
    } else if (session.mode === 'study') {
        awardPoints(50, "Study Set Completion");
    }

    const scoreResult = {
        cleanName,
        activeBranchKey: session.activeBranchKey,
        branchName: session.branchName,
        score: session.score,
        total,
        pct,
        mode: session.mode,
        questions: session.activeQuestions,
        userAnswers: session.userAnswers || [],
        date: new Date().toLocaleDateString()
    };

    localStorage.setItem("lastQuizResult", JSON.stringify(scoreResult));

    if (session.mode === 'test') {
        try {
            await saveScoreToDB({
                uid: state.currentUser ? state.currentUser.uid : null,
                name: cleanName,
                branch: session.activeBranchKey,
                score: `${session.score}/${total}`,
                pct: pct,
                date: scoreResult.date
            });
            updateDashboardMetrics();
        } catch (err) {
            console.error("Failed to save score to DB:", err);
        }
    }

    localStorage.removeItem("activeQuizSession");
    window.location.href = "results.html";
}

export function renderResults() {
    const resultRaw = localStorage.getItem("lastQuizResult");
    if (!resultRaw) {
        window.location.href = "index.html";
        return;
    }

    const res = JSON.parse(resultRaw);
    const titleEl = document.getElementById("results-title");
    const summaryEl = document.getElementById("score-summary");
    const advisoryEl = document.getElementById("results-advisory");
    const breakdownEl = document.getElementById("results-breakdown");

    if (titleEl) {
        titleEl.innerText = `${res.cleanName} — Score: ${res.pct}%`;
    }

    if (summaryEl) {
        summaryEl.innerText = `Evaluatee scored ${res.score} out of ${res.total} correct under ${res.branchName || res.activeBranchKey} regulations (${(res.mode || 'test').toUpperCase()} MODE).`;
    }

    if (advisoryEl) {
        if (res.mode === 'test') {
            advisoryEl.innerText = "[EVALUATION COMPLETE] Assessment recorded to leaderboard.";
        } else {
            advisoryEl.innerText = "[PRACTICE COMPLETE] Study evaluation results below.";
        }
    }

    if (breakdownEl && res.questions && res.questions.length > 0) {
        breakdownEl.innerHTML = `
            <h2 style="font-size: 1.2rem; margin-bottom: 0.8em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.4em;">
                Detailed Item Breakdown
            </h2>
        `;

        res.questions.forEach((q, idx) => {
            const userChoiceIdx = res.userAnswers[idx];
            const isCorrect = (userChoiceIdx === q.answer);

            const card = document.createElement("div");
            card.className = "col";
            card.style.marginBottom = "1em";
            card.style.borderLeft = isCorrect ? "4px solid #2ea043" : "4px solid #f85149";

            let optionsHtml = "";
            q.options.forEach((opt, optIdx) => {
                let badge = "";
                let style = "padding: 0.5em; border-radius: 4px; margin: 0.2em 0; font-size: 0.85rem;";

                if (optIdx === q.answer) {
                    style += " background: rgba(46, 160, 67, 0.2); color: #2ea043; font-weight: bold;";
                    badge = " ✓ [CORRECT ANSWER]";
                } else if (optIdx === userChoiceIdx && !isCorrect) {
                    style += " background: rgba(248, 81, 73, 0.2); color: #f85149; font-weight: bold;";
                    badge = " ✗ [YOUR SELECTION]";
                } else {
                    style += " opacity: 0.7;";
                }

                optionsHtml += `<div style="${style}">${optIdx + 1}. ${opt}${badge}</div>`;
            });

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 0.85rem; margin-bottom: 0.5em;">
                    <span>Item ${idx + 1}</span>
                    <span style="color: ${isCorrect ? '#2ea043' : '#f85149'};">
                        ${isCorrect ? '[CORRECT]' : '[INCORRECT]'}
                    </span>
                </div>
                <p style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.6em;">${q.q}</p>
                <div>${optionsHtml}</div>
                ${q.explanation ? `<div style="font-size: 0.8rem; color: var(--light-text-color); margin-top: 0.6em; font-style: italic;">Note: ${q.explanation}</div>` : ''}
            `;

            breakdownEl.appendChild(card);
        });
    }
}

export async function exitQuizSession() {
    const sessionRaw = localStorage.getItem("activeQuizSession");
    if (!sessionRaw) {
        window.location.href = "setup.html";
        return;
    }

    const session = JSON.parse(sessionRaw);

    if (session.mode === 'test') {
        const confirmed = await showConfirm(
            "Exiting early will cancel your test and your score will NOT be saved to the leaderboard. Are you sure you want to exit?",
            "Exit Test Session"
        );
        if (!confirmed) return;
    }

    localStorage.removeItem("activeQuizSession");
    window.location.href = "setup.html";
}
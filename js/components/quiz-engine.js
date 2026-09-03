import { state } from '../state.js';
import { sanitizeInput } from './navigation.js';
import { saveScoreToDB } from '../services/db-service.js';
import { updateDashboardMetrics } from './leaderboard.js';

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

/**
 * Updates the top hero banner image when a subject is selected
 */
export function updateBannerImage() {
    const selectEl = document.getElementById("quiz-select");
    const bannerEl = document.getElementById("subject-banner");
    const bannerTitleEl = document.querySelector("#subject-banner .banner-title");
    
    if (!selectEl || !bannerEl) return;

    const activeBranchKey = selectEl.value;
    const registryEntry = state.QUESTION_REGISTRY[activeBranchKey];

    // Fallback default image and title if key or entry doesn't exist yet
    const defaultImage = "https://www.gocivilairpatrol.com/media/photoalbums/67190384_2450135768383102_536700487_A2E9342E843CE.jpg?dimensions=950x633";
    const imageUrl = (registryEntry && registryEntry.imageUrl) ? registryEntry.imageUrl : defaultImage;
    const subjectTitle = (registryEntry && registryEntry.branchName) ? registryEntry.branchName : "Subject Configuration";

    // Update background image
    bannerEl.style.backgroundImage = `url('${imageUrl}')`;

    // Update banner title text dynamically
    if (bannerTitleEl) {
        bannerTitleEl.innerText = subjectTitle;
    }
}

/**
 * Starts a quiz session in a specified mode ('test', 'study', or 'flashcard')
 */
export function startQuiz(mode = 'test') {
    const nameInput = document.getElementById("name")?.value.trim();
    const activeName = nameInput || (state.currentUser ? state.currentUser.displayName : "Anonymous");
    
    const selectEl = document.getElementById("quiz-select");
    if (!selectEl || !selectEl.value) {
        alert("Please select a quiz subject first!");
        return;
    }
    
    const activeBranchKey = selectEl.value;
    const registryEntry = state.QUESTION_REGISTRY[activeBranchKey];

    if (!registryEntry || !registryEntry.questions) {
        alert("No questions found for this subject in Firebase.");
        return;
    }

    const pool = extractValidQuestions(registryEntry.questions);

    if (pool.length === 0) {
        alert("This subject does not have any valid questions added yet!");
        return;
    }

    const slider = document.getElementById("quiz-question-count-slider");
    const requestedCount = slider ? parseInt(slider.value, 10) : pool.length;

    const randomizedPool = shuffleArray(pool);
    const activeQuestions = randomizedPool.slice(0, Math.min(requestedCount, pool.length));

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

    // Disable options once selected
    buttons.forEach(btn => btn.disabled = true);

    // Track if user got it right
    if (selectedIdx === q.answer) {
        session.score++;
    }

    // Save user's selected choice for complete review on results page if needed
    if (!session.userAnswers) session.userAnswers = [];
    session.userAnswers[session.currentIdx] = selectedIdx;

    localStorage.setItem("activeQuizSession", JSON.stringify(session));

    const feedbackPanel = document.getElementById("feedback-panel");
    const nextBtn = document.getElementById("next-question-btn");

    if (session.mode === 'test') {
        // --- TEST MODE: HIDE ANSWERS & AUTOMATICALLY ADVANCE OR SHOW 'NEXT' ---
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
        // --- STUDY MODE: SHOW INSTANT FEEDBACK & EXPLANATION ---
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

export function finishQuiz() {
    const session = JSON.parse(localStorage.getItem("activeQuizSession"));
    if (!session) return;

    const total = session.activeQuestions.length;
    const pct = Math.round((session.score / total) * 100);
    const cleanName = sanitizeInput(session.activeName);

    // Calculate Points
    if (session.mode === 'test') {
        // 10 Points per correct answer
        const pointsEarned = session.score * 10;
        if (pointsEarned > 0) {
            awardPoints(pointsEarned, "Test Evaluation");
        }
    } else if (session.mode === 'study') {
        // 50 Points for completing a full study set
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
        saveScoreToDB({
            name: cleanName,
            branch: session.activeBranchKey,
            score: `${session.score}/${total}`,
            pct: pct,
            date: scoreResult.date
        }).then(() => {
            updateDashboardMetrics();
        });
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

    // Render itemized list of questions and graded options
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

export function exitQuizSession() {
    const sessionRaw = localStorage.getItem("activeQuizSession");
    if (!sessionRaw) {
        window.location.href = "setup.html";
        return;
    }

    const session = JSON.parse(sessionRaw);

    if (session.mode === 'test') {
        const confirmExit = confirm(
            "⚠️ WARNING: Exiting early will cancel your test!\n\nYour score will NOT be saved to the leaderboard until you complete all questions. Are you sure you want to exit?"
        );
        if (!confirmExit) return;
    }

    // Clean active session storage and return to setup page
    localStorage.removeItem("activeQuizSession");
    window.location.href = "setup.html";
}
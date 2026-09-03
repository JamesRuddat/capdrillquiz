import { state } from '../state.js';
import { sanitizeInput } from './navigation.js';
import { saveScoreToDB } from '../services/db-service.js';
import { updateDashboardMetrics } from './leaderboard.js';

// Fisher-Yates unbiased random shuffle helper
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Helper to reliably extract valid questions from sparse objects or arrays
function extractValidQuestions(rawQuestions) {
    if (!rawQuestions) return [];
    
    // Convert sparse arrays or objects into a flat array of values
    const rawItems = Array.isArray(rawQuestions) 
        ? rawQuestions 
        : Object.values(rawQuestions);

    // Filter out nulls, undefined, holes from deleted keys, and malformed entries
    return rawItems.filter(q => q && typeof q === 'object' && typeof q.q === 'string' && q.q.trim() !== '');
}

export function startQuiz() {
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

    // Safely extract questions, filtering out deleted/missing numeric keys
    const pool = extractValidQuestions(registryEntry.questions);

    if (pool.length === 0) {
        alert("This subject does not have any valid questions added yet!");
        return;
    }

    const slider = document.getElementById("quiz-question-count-slider");
    const requestedCount = slider ? parseInt(slider.value, 10) : pool.length;

    // Shuffle valid items and clamp selection count to real pool length
    const randomizedPool = shuffleArray(pool);
    const activeQuestions = randomizedPool.slice(0, Math.min(requestedCount, pool.length));

    // Save complete payload to localStorage
    const quizSession = {
        activeName,
        activeBranchKey,
        branchName: registryEntry.branchName || activeBranchKey,
        activeQuestions,
        currentIdx: 0,
        score: 0
    };

    localStorage.setItem("activeQuizSession", JSON.stringify(quizSession));

    // Redirect to Runner Page
    window.location.href = "quiz.html";
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

    // GUARD CLAUSE: Skip or redirect safely if question payload is somehow corrupt
    if (!q || !q.q) {
        console.error("Invalid question payload encountered at index:", session.currentIdx);
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

    if (badgeEl) badgeEl.innerText = `[MODULE: ${session.branchName}]`;
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
    const session = JSON.parse(localStorage.getItem("activeQuizSession"));
    const q = session.activeQuestions[session.currentIdx];
    const buttons = document.querySelectorAll("#options-container .option-btn");

    buttons.forEach(btn => btn.disabled = true);

    const feedbackPanel = document.getElementById("feedback-panel");
    if (feedbackPanel) feedbackPanel.classList.remove("hidden");

    if (selectedIdx === q.answer) {
        session.score++;
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

    localStorage.setItem("activeQuizSession", JSON.stringify(session));

    const nextBtn = document.getElementById("next-question-btn");
    if (nextBtn) nextBtn.classList.remove("hidden");
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

    const scoreResult = {
        cleanName,
        activeBranchKey: session.activeBranchKey,
        branchName: session.branchName,
        score: session.score,
        total,
        pct,
        date: new Date().toLocaleDateString()
    };

    localStorage.setItem("lastQuizResult", JSON.stringify(scoreResult));

    saveScoreToDB({
        name: cleanName,
        branch: session.activeBranchKey,
        score: `${session.score}/${total}`,
        pct: pct,
        date: scoreResult.date
    }).then(() => {
        updateDashboardMetrics();
    });

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

    if (!titleEl || !summaryEl) return;

    titleEl.innerText = `${res.cleanName} — Score: ${res.pct}%`;
    summaryEl.innerText = `Evaluatee scored ${res.score} out of ${res.total} correct under ${res.branchName || res.activeBranchKey} regulations.`;
}
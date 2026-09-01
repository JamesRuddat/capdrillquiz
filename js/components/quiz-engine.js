import { state } from '../state.js';
import { showView, sanitizeInput } from './navigation.js';
import { saveScoreToDB } from '../services/db-service.js';
import { updateDashboardMetrics } from './leaderboard.js';
import { showModal, showConfirm } from './modal.js';

// Fisher-Yates unbiased random shuffle helper
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function startQuiz() {
    const nameInput = document.getElementById("cadet-name").value.trim();
    state.activeName = nameInput || (state.currentUser ? state.currentUser.displayName : "Anonymous");
    
    const selectEl = document.getElementById("quiz-select");
    if (!selectEl || !selectEl.value) {
        alert("Please select a quiz module first!");
        return;
    }
    
    state.activeBranchKey = selectEl.value;
    const registryEntry = state.QUESTION_REGISTRY[state.activeBranchKey];

    if (!registryEntry || !registryEntry.questions) {
        alert("No questions found for this module in Firebase.");
        return;
    }

    const rawQuestions = registryEntry.questions;
    const pool = Array.isArray(rawQuestions) 
        ? [...rawQuestions] 
        : Object.values(rawQuestions);

    if (pool.length === 0) {
        alert("This module does not have any questions added yet!");
        return;
    }

    // 1. Read slider selection count
    const slider = document.getElementById("quiz-question-count-slider");
    const requestedCount = slider ? parseInt(slider.value, 10) : pool.length;

    // 2. Randomly shuffle the entire question pool
    const randomizedPool = shuffleArray(pool);

    // 3. Slice pool to requested slider count
    state.activeQuestions = randomizedPool.slice(0, requestedCount);

    state.currentIdx = 0;
    state.score = 0;

    document.getElementById("quiz-standard-badge").innerText = `[MODULE: ${state.activeBranchKey}]`;
    showView('quiz-view');
    loadQuestion();
}

export function loadQuestion() {
    const q = state.activeQuestions[state.currentIdx];
    document.getElementById("question-tracker").innerText = `Question ${state.currentIdx + 1} of ${state.activeQuestions.length}`;
    document.getElementById("question-text").innerText = q.q;

    const container = document.getElementById("options-container");
    container.innerHTML = "";

    const feedbackPanel = document.getElementById("feedback-panel");
    feedbackPanel.className = "hidden";
    document.getElementById("next-question-btn").classList.add("hidden");

    q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.innerText = `${idx + 1}. ${opt}`;
        btn.onclick = () => selectOption(idx);
        container.appendChild(btn);
    });
}

export function selectOption(selectedIdx) {
    const q = state.activeQuestions[state.currentIdx];
    const buttons = document.querySelectorAll("#options-container .option-btn");

    buttons.forEach(btn => btn.disabled = true);

    const feedbackPanel = document.getElementById("feedback-panel");
    feedbackPanel.classList.remove("hidden");

    if (selectedIdx === q.answer) {
        state.score++;
        buttons[selectedIdx].classList.add("correct");
        feedbackPanel.className = "correct-panel";
        feedbackPanel.innerHTML = `<strong>[CORRECT]</strong> ${q.explanation || ''}`;
    } else {
        buttons[selectedIdx].classList.add("incorrect");
        if (buttons[q.answer]) buttons[q.answer].classList.add("correct");
        feedbackPanel.className = "incorrect-panel";
        feedbackPanel.innerHTML = `<strong>[INCORRECT]</strong> ${q.explanation || ''}`;
    }

    document.getElementById("next-question-btn").classList.remove("hidden");
}

export function advanceQuestion() {
    state.currentIdx++;
    if (state.currentIdx < state.activeQuestions.length) {
        loadQuestion();
    } else {
        finishQuiz();
    }
}

export function finishQuiz() {
    const total = state.activeQuestions.length;
    const pct = Math.round((state.score / total) * 100);
    const cleanName = sanitizeInput(state.activeName);

    document.getElementById("results-title").innerText = `${cleanName} — Score: ${pct}%`;
    const branchName = state.QUESTION_REGISTRY[state.activeBranchKey] 
        ? state.QUESTION_REGISTRY[state.activeBranchKey].branchName 
        : state.activeBranchKey;
        
    document.getElementById("score-summary").innerText = `Evaluatee scored ${state.score} out of ${total} correct under ${branchName} regulations.`;

    saveScoreToDB({
        name: cleanName,
        branch: state.activeBranchKey,
        score: `${state.score}/${total}`,
        pct: pct,
        date: new Date().toLocaleDateString()
    }).then(() => {
        updateDashboardMetrics();
    });

    showView('results-view');
}
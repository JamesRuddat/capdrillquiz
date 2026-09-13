import { state } from '../state.js';
import { awardPoints, showToast } from '../services/user-service.js';

/**
 * Initializes and renders the Daily Knowledge Challenge widget
 */
export function initDailyChallenge() {
    const qTextEl = document.getElementById("daily-question-text");
    const containerEl = document.getElementById("daily-options-container");
    const feedbackEl = document.getElementById("daily-feedback");

    if (!qTextEl || !containerEl) return;

    // 1. Check if user already completed today's challenge
    const todayStr = new Date().toISOString().split('T')[0];
    const completedDate = localStorage.getItem("daily_challenge_completed");

    if (completedDate === todayStr) {
        qTextEl.innerText = "Daily Challenge Completed";
        containerEl.innerHTML = `
            <div class="text-dim text-sm padding-sm">
                You have already logged today's daily readiness check. Return tomorrow for your next evaluation drill!
            </div>
        `;
        if (feedbackEl) {
            feedbackEl.className = "daily-feedback-panel daily-feedback-success";
            feedbackEl.innerHTML = `<strong>✓ Completed for Today</strong>`;
            feedbackEl.classList.remove("hidden");
        }
        return;
    }

    // 2. Select a deterministic question based on today's date
    const question = getDailyQuestion(todayStr);

    if (!question) {
        qTextEl.innerText = "No subjects registered for today's challenge.";
        containerEl.innerHTML = "";
        return;
    }

    // 3. Render Question & Options
    qTextEl.innerText = question.q;
    containerEl.innerHTML = "";

    question.options.forEach((optText, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-tactical btn-daily-option width-full text-left";
        btn.innerText = optText;

        btn.addEventListener("click", () => {
            handleOptionSelection(btn, idx, question, todayStr);
        });

        containerEl.appendChild(btn);
    });
}

/**
 * Selects a daily question deterministically based on date string
 */
function getDailyQuestion(dateStr) {
    const subjects = Object.values(state.QUESTION_REGISTRY || {});
    if (subjects.length === 0) return null;

    let allQuestions = [];
    subjects.forEach(sub => {
        if (sub.questions) {
            const list = Array.isArray(sub.questions) ? sub.questions : Object.values(sub.questions);
            allQuestions.push(...list.filter(q => q && typeof q.q === 'string' && Array.isArray(q.options)));
        }
    });

    if (allQuestions.length === 0) return null;

    // Hash date string to get consistent question index for everyone today
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        hash = (hash << 5) - hash + dateStr.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % allQuestions.length;

    return allQuestions[index];
}

/**
 * Handles user option submission with immediate feedback
 */
function handleOptionSelection(clickedBtn, selectedIdx, question, dateStr) {
    const containerEl = document.getElementById("daily-options-container");
    const feedbackEl = document.getElementById("daily-feedback");
    if (!containerEl) return;

    // Correct answer index (supports 'ans', 'correct', or 'correctIndex')
    const correctIdx = Number(question.ans !== undefined ? question.ans : (question.correct || 0));
    const isCorrect = selectedIdx === correctIdx;

    // 1. Immediately highlight all option buttons and disable clicks
    const buttons = containerEl.querySelectorAll("button");
    buttons.forEach((btn, idx) => {
        btn.disabled = true;
        btn.style.pointerEvents = "none";

        if (idx === correctIdx) {
            btn.classList.add("btn-correct");
        } else if (idx === selectedIdx && !isCorrect) {
            btn.classList.add("btn-incorrect");
        }
    });

    // 2. Render feedback panel instantly
    if (feedbackEl) {
        feedbackEl.classList.remove("hidden");

        if (isCorrect) {
            feedbackEl.className = "daily-feedback-panel daily-feedback-success";
            feedbackEl.innerHTML = `<strong>Correct! +25 PTS Earned.</strong> ${question.exp || question.explanation || ''}`;
            awardPoints(25, "Daily Knowledge Challenge");
        } else {
            feedbackEl.className = "daily-feedback-panel daily-feedback-error";
            feedbackEl.innerHTML = `<strong>Incorrect.</strong> ${question.exp || question.explanation || ''}`;
            showToast("Incorrect answer for Daily Challenge.", "error");
        }
    }

    // 3. Mark completion in localStorage AT THE VERY END
    localStorage.setItem("daily_challenge_completed", dateStr);
}
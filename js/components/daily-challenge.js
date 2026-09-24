import { state } from '../state.js';
import { awardPoints, showToast } from '../services/user-service.js';
import { voteQuestion, toggleQuestionFlag } from '../services/db-service.js';

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
        // Jump straight into Question Vetting Mode
        renderQuestionVettingWidget(qTextEl, containerEl, feedbackEl);
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
 * Handles user option submission with immediate feedback and automatic transition
 */
function handleOptionSelection(clickedBtn, selectedIdx, question, dateStr) {
    const containerEl = document.getElementById("daily-options-container");
    const feedbackEl = document.getElementById("daily-feedback");
    const qTextEl = document.getElementById("daily-question-text");
    if (!containerEl) return;

    // Correct answer index
    const correctIdx = Number(question.answer !== undefined ? question.answer : (question.ans !== undefined ? question.ans : (question.correct || 0)));
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
            feedbackEl.innerHTML = `<strong>Correct! +25 PTS Earned.</strong> ${question.explanation || question.exp || ''}`;
            awardPoints(25, "Daily Knowledge Challenge");
        } else {
            feedbackEl.className = "daily-feedback-panel daily-feedback-error";
            feedbackEl.innerHTML = `<strong>Incorrect.</strong> ${question.explanation || question.exp || ''}`;
            showToast("Incorrect answer for Daily Challenge.", "error");
        }
    }

    // 3. Mark completion in localStorage
    localStorage.setItem("daily_challenge_completed", dateStr);

    // 4. Automatically jump right into Question Vetting Mode after 1.5s
    setTimeout(() => {
        renderQuestionVettingWidget(qTextEl, containerEl, feedbackEl);
    }, 1500);
}

/**
 * Question Vetting Mode: Places the question & citation info on top with action buttons below
 */
function renderQuestionVettingWidget(qTextEl, containerEl, feedbackEl) {
    const registry = state.QUESTION_REGISTRY || {};
    const unverifiedPool = [];

    // Gather unverified or flagged questions across all subjects
    Object.keys(registry).forEach(branchKey => {
        const subject = registry[branchKey];
        const qMap = subject.questions || {};
        const qList = Array.isArray(qMap) ? qMap.map((q, id) => ({ id, ...q })) : Object.keys(qMap).map(id => ({ id, ...qMap[id] }));

        qList.forEach(q => {
            if (q && q.q) {
                unverifiedPool.push({
                    branchKey,
                    branchName: subject.branchName || branchKey,
                    ...q
                });
            }
        });
    });

    if (unverifiedPool.length === 0) {
        qTextEl.innerText = "Question Vetting Complete!";
        containerEl.innerHTML = `
            <div class="subtext text-center padding-sm">
                All question banks are verified and up to date. Thank you for keeping CAP Test Prep accurate!
            </div>
        `;
        if (feedbackEl) feedbackEl.classList.add("hidden");
        return;
    }

    // Pick a random question card
    const targetQ = unverifiedPool[Math.floor(Math.random() * unverifiedPool.length)];
    const optionsArray = Array.isArray(targetQ.options) ? targetQ.options : Object.values(targetQ.options || []);
    const correctAnsText = optionsArray[targetQ.answer] || "Option 1";

    qTextEl.innerText = `from ${targetQ.branchName}`;

    // Hide feedbackEl and render question content directly inside containerEl so action buttons sit below it
    if (feedbackEl) {
        feedbackEl.classList.add("hidden");
    }

    const isLoggedIn = Boolean(state.currentUser);

    const questionCardHTML = `
        <div class="daily-feedback-panel margin-bottom-sm" style="background-color: rgba(0, 24, 113, 0.15); border: 1px solid var(--border-color);">
            <div class="margin-bottom-xs"><strong>Question:</strong> ${targetQ.q}</div>
            <div class="text-correct font-bold"><strong>Correct Answer:</strong> ${correctAnsText}</div>
            ${targetQ.explanation ? `<div class="subtext margin-top-xs"><em>Citation:</em> ${targetQ.explanation}</div>` : ''}
        </div>
    `;

    if (!isLoggedIn) {
        containerEl.innerHTML = `
            ${questionCardHTML}
            <div class="flex-col gap-xs width-full margin-top-xs text-center">
                <span class="subtext font-bold">Sign in to vote on question accuracy and earn points!</span>
                <button type="button" id="btn-vet-signin" class="btn-tactical btn-gold width-full margin-top-xs">
                    Sign In to Vote
                </button>
            </div>
        `;

        const signInBtn = document.getElementById("btn-vet-signin");
        if (signInBtn) {
            signInBtn.onclick = () => {
                import('../services/auth-service.js').then(m => m.triggerAuthFlow());
            };
        }
        return;
    }

    // Logged-in voting controls rendered strictly below the question box
    containerEl.innerHTML = `
        ${questionCardHTML}
        <div class="flex-col gap-xs width-full margin-top-xs">
            <span class="subtext font-bold">Is this question, answer choice, and citation accurate?</span>
            <div class="flex-row gap-xs">
                <button type="button" id="btn-vet-upvote" class="btn-tactical btn-blue flex-1">
                    👍 Accurately Formatted / Good
                </button>
                <button type="button" id="btn-vet-downvote" class="btn-tactical btn-clear flex-1">
                    👎 Poorly Worded / Flawed
                </button>
            </div>
            <button type="button" id="btn-vet-flag" class="btn-tactical btn-sm width-full margin-top-xs" style="opacity: 0.8;">
                🚩 Flag Incorrect Citation for Review
            </button>
        </div>
    `;

    // Bind Vetting Actions
    const upBtn = document.getElementById("btn-vet-upvote");
    const downBtn = document.getElementById("btn-vet-downvote");
    const flagBtn = document.getElementById("btn-vet-flag");

    if (upBtn) {
        upBtn.onclick = async () => {
            await voteQuestion(targetQ.branchKey, targetQ.id, "up");
            awardPoints(5, "Community Question Vetting");
            showToast("Upvote logged! Next question loading...", "success");
            renderQuestionVettingWidget(qTextEl, containerEl, feedbackEl);
        };
    }

    if (downBtn) {
        downBtn.onclick = async () => {
            await voteQuestion(targetQ.branchKey, targetQ.id, "down");
            showToast("Feedback logged for review. Next question loading...", "info");
            renderQuestionVettingWidget(qTextEl, containerEl, feedbackEl);
        };
    }

    if (flagBtn) {
        flagBtn.onclick = async () => {
            await toggleQuestionFlag(targetQ.branchKey, targetQ.id);
            showToast("Question flagged for moderator review.", "warning");
            renderQuestionVettingWidget(qTextEl, containerEl, feedbackEl);
        };
    }
}
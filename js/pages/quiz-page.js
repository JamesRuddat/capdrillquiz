import { state } from '../state.js';
import { sanitizeInput } from '../components/navigation.js';
import { saveScoreToDB } from '../services/db-service.js';
import { updateDashboardMetrics } from '../components/leaderboard.js';
import { awardPoints, showToast } from '../services/user-service.js';
import { showConfirm } from './modal.js';
import { checkAndAwardBadges } from '../services/badge-service.js';

let evalTimerInterval = null;

/**
 * Utility: Converts URLs in text to active links
 */
function formatTextWithLinks(text = "") {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-link">${url}</a>`;
    });
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

/**
 * Updates Question Count Slider AND Disables/Enables Mode Buttons when 0 questions exist
 */
export function updateSliderLimits() {
    const quizSelect = document.getElementById("quiz-select");
    const slider = document.getElementById("quiz-question-count-slider");
    const sliderLabel = document.getElementById("quiz-question-count-label");

    // Mode Buttons
    const btnTest = document.getElementById("btn-mode-test");
    const btnStudy = document.getElementById("btn-mode-study");
    const btnFlashcards = document.getElementById("btn-mode-flashcards");
    const modeButtons = [btnTest, btnStudy, btnFlashcards].filter(Boolean);

    if (!quizSelect || !slider) return;

    const selectedKey = quizSelect.value;
    const subjectData = state.QUESTION_REGISTRY ? state.QUESTION_REGISTRY[selectedKey] : null;

    const rawQs = subjectData ? subjectData.questions : null;
    const validQuestions = extractValidQuestions(rawQs);
    const totalQs = validQuestions.length;

    if (totalQs === 0) {
        // Zero Question State: Zero out slider & disable mode buttons
        slider.min = "0";
        slider.max = "0";
        slider.value = "0";
        slider.disabled = true;

        if (sliderLabel) {
            sliderLabel.innerText = "0 Questions Available (Max: 0)";
        }

        modeButtons.forEach(btn => {
            btn.disabled = true;
            btn.title = "No questions available for this subject.";
            btn.style.opacity = "0.45";
            btn.style.cursor = "not-allowed";
        });
        return;
    }

    // Normal Active Question State
    slider.disabled = false;
    slider.min = "1";
    slider.max = String(totalQs);
    slider.value = String(totalQs); // Max out slider by default

    if (sliderLabel) {
        sliderLabel.innerText = `${totalQs} ${totalQs === 1 ? 'Question' : 'Questions'} (Max: ${totalQs})`;
    }

    modeButtons.forEach(btn => {
        btn.disabled = false;
        btn.title = "";
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    });
}

/**
 * Sync Subject Banner, Render Dynamic Action Buttons, & Wire Edit Subject Button
 */
export function updateBannerImage() {
    const selectEl = document.getElementById("quiz-select");
    const bannerEl = document.getElementById("subject-banner");
    const bannerTitleEl = document.querySelector("#subject-banner .banner-title");
    const descEl = document.getElementById("subject-desc") || document.getElementById("subject-banner-desc");
    const editBtn = document.getElementById("btn-edit-subject");

    if (!selectEl || !bannerEl) return;

    // --- NEW: Read URL Query Parameter (?subject=KEY or ?branch=KEY) on initial load ---
    if (!selectEl.dataset.initialized) {
        selectEl.dataset.initialized = "true";
        const urlParams = new URLSearchParams(window.location.search);
        const incomingSubject = urlParams.get("subject") || urlParams.get("branch") || urlParams.get("quiz");

        if (incomingSubject) {
            const optionExists = Array.from(selectEl.options).some(opt => opt.value === incomingSubject);
            if (optionExists) {
                selectEl.value = incomingSubject;
            } else {
                console.warn(`Subject parameter "${incomingSubject}" not found in registry options.`);
            }
        }
    }

    const activeBranchKey = selectEl.value;
    const registryEntry = state.QUESTION_REGISTRY ? state.QUESTION_REGISTRY[activeBranchKey] : null;

    // --- Wire Edit Subject Button ---
    if (editBtn) {
        if (activeBranchKey) {
            editBtn.classList.remove("hidden");
            editBtn.onclick = () => {
                window.location.href = `hub.html?subject=${activeBranchKey}&edit=true`;
            };
        } else {
            editBtn.classList.add("hidden");
        }
    }

    const defaultImage = "https://www.gocivilairpatrol.com/media/photoalbums/67190384_2450135768383102_536700487_A2E9342E843CE.jpg?dimensions=950x633";

    const imageUrl = (registryEntry && registryEntry.imageUrl && registryEntry.imageUrl.trim() !== "")
        ? registryEntry.imageUrl
        : defaultImage;

    const subjectTitle = (registryEntry && registryEntry.branchName) ? registryEntry.branchName : "Subject Configuration";
    const rawDescription = (registryEntry && registryEntry.description) ? registryEntry.description : "";

    bannerEl.style.backgroundImage = `url('${imageUrl}')`;

    if (bannerTitleEl) {
        bannerTitleEl.innerText = subjectTitle;
    }

    // --- Render Description & Dynamic Resource Buttons ---
    if (descEl) {
        const dynamicLinks = (registryEntry && Array.isArray(registryEntry.links)) ? registryEntry.links : [];

        let descriptionHTML = rawDescription.trim() !== "" 
            ? `<div class="margin-bottom-sm">${formatTextWithLinks(rawDescription)}</div>`
            : "";

        let buttonsHTML = "";
        if (dynamicLinks.length > 0) {
            buttonsHTML = `
                <div class="setup-resource-links flex-col gap-xs margin-top-sm">
                    <strong class="text-sm font-bold">Study Resources & Practice Tools:</strong>
                    <div class="flex-row gap-sm flex-wrap">
                        ${dynamicLinks.map(link => {
                            const btnClass = link.type === 'quiz' ? 'btn-gold' : 'btn-blue';
                            return `
                                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="btn-tactical ${btnClass} flex-1">
                                    ${link.label || 'Open Resource'} ➔
                                </a>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        if (descriptionHTML || buttonsHTML) {
            descEl.innerHTML = descriptionHTML + buttonsHTML;
            descEl.classList.remove("hidden");
        } else {
            descEl.innerHTML = "";
            descEl.classList.add("hidden");
        }
    }

    // Always re-evaluate slider limits and mode button states on selection change
    updateSliderLimits();
}

/**
 * Controller: Quiz Page Runner
 */
export function initQuizPage() {
    loadQuestion();

    // Wire Exit Button
    const exitBtn = document.getElementById("btn-quiz-exit");
    if (exitBtn) {
        exitBtn.onclick = exitQuizSession;
    }

    // Wire Previous Button
    const prevBtn = document.getElementById("prev-question-btn");
    if (prevBtn) {
        prevBtn.onclick = () => {
            const session = JSON.parse(localStorage.getItem("activeQuizSession"));
            if (session && session.currentIdx > 0) {
                session.currentIdx--;
                localStorage.setItem("activeQuizSession", JSON.stringify(session));
                loadQuestion();
            }
        };
    }

    // Wire Next / Submit Button
    const nextBtn = document.getElementById("next-question-btn");
    if (nextBtn) {
        nextBtn.onclick = () => {
            const session = JSON.parse(localStorage.getItem("activeQuizSession"));
            if (!session) return;

            if (session.currentIdx < session.activeQuestions.length - 1) {
                session.currentIdx++;
                localStorage.setItem("activeQuizSession", JSON.stringify(session));
                loadQuestion();
            } else {
                finishQuiz();
            }
        };
    }
}

/**
 * Controller: Results Page
 */
export function initResultsPage() {
    renderResults();

    const anotherBtn = document.getElementById("btn-res-another");
    if (anotherBtn) anotherBtn.onclick = () => window.location.href = "setup.html";

    const leaderboardBtn = document.getElementById("btn-res-leaderboard");
    if (leaderboardBtn) leaderboardBtn.onclick = () => window.location.href = "leaderboard.html";

    const homeBtn = document.getElementById("btn-res-home");
    if (homeBtn) homeBtn.onclick = () => window.location.href = "index.html";
}

/**
 * Starts Quiz or Study Session
 */
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

    const nameInput = document.getElementById("name")?.value.trim();
    const activeName = state.userCallsign || nameInput || (state.currentUser ? state.currentUser.displayName : "Anonymous Cadet");

    const evalTimeSelect = document.getElementById("eval-time-select");
    const evalDuration = (mode === 'eval' && evalTimeSelect) ? parseInt(evalTimeSelect.value, 10) : null;

    const quizSession = {
        mode,
        activeName,
        activeBranchKey,
        branchName: registryEntry.branchName || activeBranchKey,
        activeQuestions,
        currentIdx: 0,
        score: 0,
        userAnswers: [],
        evalDurationMinutes: evalDuration
    };

    localStorage.setItem("activeQuizSession", JSON.stringify(quizSession));

    if (mode === 'flashcard') {
        window.location.href = "flashcards.html";
    } else {
        window.location.href = "quiz.html";
    }
}

/**
 * Renders Active Question into DOM
 */
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

    const currentIdx = session.currentIdx;
    const q = session.activeQuestions[currentIdx];

    if (!q || !q.q) {
        console.error("Invalid question payload at index:", currentIdx);
        window.location.href = "setup.html";
        return;
    }

    // Ensure Exit Button listener is cleanly bound every time a question loads
    const exitBtn = document.getElementById("btn-quiz-exit");
    if (exitBtn) {
        exitBtn.onclick = (e) => {
            e.preventDefault();
            exitQuizSession();
        };
    }

    // Timer setup for evaluation mode
    const evalBanner = document.getElementById("eval-timer-banner");
    if (session.mode === 'eval' && session.evalDurationMinutes) {
        if (evalBanner) evalBanner.classList.remove("hidden");
        if (!evalTimerInterval) {
            startEvaluationTimer(session.evalDurationMinutes);
        }
    } else {
        if (evalBanner) evalBanner.classList.add("hidden");
        if (evalTimerInterval) {
            clearInterval(evalTimerInterval);
            evalTimerInterval = null;
        }
    }

    const badgeEl = document.getElementById("quiz-standard-badge");
    const trackerEl = document.getElementById("question-tracker");
    const textEl = document.getElementById("question-text");
    const container = document.getElementById("options-container");
    const feedbackPanel = document.getElementById("feedback-panel");

    if (!textEl || !container) return;

    if (badgeEl) badgeEl.innerText = `${session.branchName} (${session.mode.toUpperCase()} MODE)`;
    if (trackerEl) trackerEl.innerText = `Question ${currentIdx + 1} of ${session.activeQuestions.length}`;
    if (textEl) textEl.innerText = q.q;

    // Render Visual Cue Image
    let imgEl = document.getElementById("question-visual-cue");
    if (q.imageUrl && q.imageUrl.trim() !== "") {
        if (!imgEl) {
            imgEl = document.createElement("img");
            imgEl.id = "question-visual-cue";
            imgEl.className = "question-visual-cue";
            textEl.parentNode.insertBefore(imgEl, container);
        }
        imgEl.src = q.imageUrl;
        imgEl.classList.remove("hidden");
    } else if (imgEl) {
        imgEl.classList.add("hidden");
    }

    container.innerHTML = "";
    if (feedbackPanel) {
        feedbackPanel.className = "hidden";
        feedbackPanel.innerHTML = "";
    }

    const hasAnswered = session.userAnswers && session.userAnswers[currentIdx] !== undefined;
    const selectedIdx = hasAnswered ? session.userAnswers[currentIdx] : null;

    // Render Answer Buttons
    q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.innerText = `${idx + 1}. ${opt}`;

        if (session.mode === 'study') {
            if (hasAnswered) {
                btn.disabled = true;
                if (idx === q.answer) btn.classList.add("correct");
                if (idx === selectedIdx && selectedIdx !== q.answer) btn.classList.add("incorrect");
            } else {
                btn.onclick = () => selectOption(idx);
            }
        } else {
            if (hasAnswered && idx === selectedIdx) {
                btn.classList.add("selected-option");
            }
            btn.onclick = () => selectOption(idx);
        }

        container.appendChild(btn);
    });

    // Render Explanation Panel for Study Mode
    if (hasAnswered && session.mode === 'study' && feedbackPanel) {
        feedbackPanel.classList.remove("hidden");
        if (selectedIdx === q.answer) {
            feedbackPanel.className = "correct-panel";
            feedbackPanel.innerHTML = `<strong>[CORRECT]</strong> ${q.explanation || ''}`;
        } else {
            feedbackPanel.className = "incorrect-panel";
            feedbackPanel.innerHTML = `<strong>[INCORRECT]</strong> ${q.explanation || ''}`;
        }
    }

    updateNavigationControls(session);
}

/**
 * Updates Jump Dropdown, Back, and Next Button States
 */
export function updateNavigationControls(session) {
    const jumpSelect = document.getElementById("question-jump-select");
    const prevBtn = document.getElementById("prev-question-btn");
    const nextBtn = document.getElementById("next-question-btn");

    if (!session || !session.activeQuestions) return;

    const total = session.activeQuestions.length;
    const currentIdx = session.currentIdx;

    if (jumpSelect) {
        let optionsHTML = "";
        session.activeQuestions.forEach((_, idx) => {
            const isAnswered = session.userAnswers && session.userAnswers[idx] !== undefined;
            const statusIcon = isAnswered ? "🟢" : "⚪";
            const selected = idx === currentIdx ? "selected" : "";
            optionsHTML += `<option value="${idx}" ${selected}>${statusIcon} ${idx + 1}</option>`;
        });
        jumpSelect.innerHTML = optionsHTML;

        jumpSelect.onchange = (e) => {
            const targetIdx = parseInt(e.target.value, 10);
            session.currentIdx = targetIdx;
            localStorage.setItem("activeQuizSession", JSON.stringify(session));
            loadQuestion();
        };
    }

    if (prevBtn) {
        prevBtn.disabled = currentIdx === 0;
    }

    if (nextBtn) {
        if (currentIdx === total - 1) {
            nextBtn.innerText = "Submit Exam";
            nextBtn.className = "btn-tactical btn-lg btn-gold";
        } else {
            nextBtn.innerText = "Next ▶";
            nextBtn.className = "btn-tactical btn-lg btn-blue";
        }
    }
}

/**
 * Handles Option Selection
 */
export function selectOption(selectedIdx) {
    const sessionRaw = localStorage.getItem("activeQuizSession");
    if (!sessionRaw) return;

    const session = JSON.parse(sessionRaw);
    const q = session.activeQuestions[session.currentIdx];
    const buttons = document.querySelectorAll("#options-container .option-btn");

    if (!session.userAnswers) session.userAnswers = [];
    session.userAnswers[session.currentIdx] = selectedIdx;

    localStorage.setItem("activeQuizSession", JSON.stringify(session));

    const feedbackPanel = document.getElementById("feedback-panel");

    if (session.mode === 'study') {
        buttons.forEach(btn => btn.disabled = true);
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
    } else {
        buttons.forEach((btn, idx) => {
            if (idx === selectedIdx) {
                btn.classList.add("selected-option");
            } else {
                btn.classList.remove("selected-option");
            }
        });
    }

    updateNavigationControls(session);
}

/**
 * Timer Controller for Evaluation Mode
 */
export function startEvaluationTimer(durationMinutes) {
    let totalSeconds = durationMinutes * 60;
    const timerDisplay = document.getElementById("quiz-countdown-timer");

    if (evalTimerInterval) clearInterval(evalTimerInterval);

    const updateTimer = () => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;

        if (timerDisplay) {
            timerDisplay.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            if (totalSeconds <= 120) {
                timerDisplay.classList.add("timer-critical");
            } else {
                timerDisplay.classList.remove("timer-critical");
            }
        }

        if (totalSeconds <= 0) {
            clearInterval(evalTimerInterval);
            showToast("Time expired! Submitting exam...", "error");
            finishQuiz();
        } else {
            totalSeconds--;
        }
    };

    updateTimer();
    evalTimerInterval = setInterval(updateTimer, 1000);
}

/**
 * Finalizes Quiz Session & Calculates Score
 */
export async function finishQuiz() {
    if (evalTimerInterval) {
        clearInterval(evalTimerInterval);
        evalTimerInterval = null;
    }

    const sessionRaw = localStorage.getItem("activeQuizSession");
    if (!sessionRaw) return;

    const session = JSON.parse(sessionRaw);
    const questions = session.activeQuestions || [];
    let correctCount = 0;

    questions.forEach((q, idx) => {
        const userChoice = session.userAnswers ? session.userAnswers[idx] : undefined;
        if (userChoice !== undefined && userChoice === q.answer) {
            correctCount++;
        }
    });

    const total = questions.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const cleanName = sanitizeInput(state.userCallsign || session.activeName);

    let pointsEarned = 0;

    if (session.mode === 'test' || session.mode === 'eval') {
        pointsEarned = correctCount * 10;
        if (pointsEarned > 0) {
            awardPoints(pointsEarned, session.mode === 'eval' ? "Timed Exam Evaluation" : "Test Evaluation");
        }
    } else if (session.mode === 'study') {
        pointsEarned = 50;
        awardPoints(pointsEarned, "Study Set Completion");
    }

    const scoreResult = {
        cleanName,
        activeBranchKey: session.activeBranchKey,
        branchName: session.branchName,
        score: `${correctCount}/${total}`,
        total,
        pct,
        mode: session.mode,
        questions,
        userAnswers: session.userAnswers || [],
        date: new Date().toLocaleDateString()
    };

    localStorage.setItem("lastQuizResult", JSON.stringify(scoreResult));

    if (session.mode === 'test' || session.mode === 'eval') {
        try {
            await saveScoreToDB({
                uid: state.currentUser ? state.currentUser.uid : null,
                callsign: state.userCallsign || cleanName,
                name: cleanName,
                branch: session.activeBranchKey,
                score: `${correctCount}/${total}`,
                pct: pct,
                date: scoreResult.date
            });
            updateDashboardMetrics();
        } catch (err) {
            console.error("Failed to save score to DB:", err);
        }
    }

    if (state.currentUser) {
        try {
            await checkAndAwardBadges({
                correctCount,
                pct,
                pointsEarned,
                mode: session.mode
            });
        } catch (err) {
            console.error("Failed to process achievement badges:", err);
        }
    }

    localStorage.removeItem("activeQuizSession");
    window.location.href = "results.html";
}

/**
 * Renders Results Breakdown
 */
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
        summaryEl.innerText = `Evaluatee scored ${res.score} correct under ${res.branchName || res.activeBranchKey} regulations (${(res.mode || 'test').toUpperCase()} MODE).`;
    }

    if (advisoryEl) {
        if (res.mode === 'test' || res.mode === 'eval') {
            advisoryEl.innerText = "[EVALUATION COMPLETE] Assessment recorded to leaderboard.";
        } else {
            advisoryEl.innerText = "[PRACTICE COMPLETE] Study evaluation results below.";
        }
    }

    if (breakdownEl && res.questions && res.questions.length > 0) {
        breakdownEl.innerHTML = `<h2 class="breakdown-title">Detailed Breakdown</h2>`;

        res.questions.forEach((q, idx) => {
            const userChoiceIdx = res.userAnswers ? res.userAnswers[idx] : undefined;
            const isCorrect = (userChoiceIdx !== undefined && userChoiceIdx === q.answer);

            const card = document.createElement("div");
            card.className = `col result-card ${isCorrect ? 'result-correct' : 'result-incorrect'}`;

            let optionsHtml = "";
            q.options.forEach((opt, optIdx) => {
                let badge = "";
                let optionClass = "result-option";

                if (optIdx === q.answer) {
                    optionClass += " result-option-correct";
                    badge = " ✓ [CORRECT ANSWER]";
                } else if (optIdx === userChoiceIdx && !isCorrect) {
                    optionClass += " result-option-incorrect";
                    badge = " ✗ [YOUR SELECTION]";
                } else {
                    optionClass += " result-option-dim";
                }

                optionsHtml += `<div class="${optionClass}">${optIdx + 1}. ${opt}${badge}</div>`;
            });

            const visualCueHtml = (q.imageUrl && q.imageUrl.trim() !== "")
                ? `<div class="result-visual-cue-container"><img src="${q.imageUrl}" alt="Visual Cue" class="result-visual-cue"></div>`
                : '';

            card.innerHTML = `
                <div class="result-item-header">
                    <span>${idx + 1}</span>
                    <span class="${isCorrect ? 'text-correct' : 'text-incorrect'}">
                        ${isCorrect ? '[CORRECT]' : userChoiceIdx === undefined ? '[UNANSWERED]' : '[INCORRECT]'}
                    </span>
                </div>
                <p class="result-item-question">${q.q}</p>
                ${visualCueHtml}
                <div>${optionsHtml}</div>
                ${q.explanation ? `<div class="result-item-explanation">Note: ${q.explanation}</div>` : ''}
            `;

            breakdownEl.appendChild(card);
        });
    }
}

/**
 * Quits Quiz Session Safely
 */
export async function exitQuizSession() {
    if (evalTimerInterval) {
        clearInterval(evalTimerInterval);
        evalTimerInterval = null;
    }

    const sessionRaw = localStorage.getItem("activeQuizSession");
    if (!sessionRaw) {
        window.location.href = "setup.html";
        return;
    }

    const session = JSON.parse(sessionRaw);

    let confirmed = true;
    if (session.mode === 'test' || session.mode === 'eval') {
        const modalOverlay = document.getElementById("custom-modal-overlay");
        if (modalOverlay) {
            confirmed = await showConfirm(
                "Exiting early will cancel your assessment and your score will NOT be saved. Exit session?",
                "Exit Assessment"
            );
        } else {
            confirmed = window.confirm("Exiting early will cancel your assessment and your score will NOT be saved. Exit session?");
        }
    }

    if (confirmed) {
        localStorage.removeItem("activeQuizSession");
        window.location.href = "setup.html";
    } else {
        if (session.mode === 'eval' && session.evalDurationMinutes) {
            startEvaluationTimer(session.evalDurationMinutes);
        }
    }
}
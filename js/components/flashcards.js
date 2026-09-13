import { awardPoints } from '../services/user-service.js';

export function initFlashcards() {
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

    let currentIndex = 0;
    let currentRotation = 0;
    const questions = session.activeQuestions;

    const cardEl = document.getElementById("flashcard");
    const badgeEl = document.getElementById("flashcard-subject-badge");
    const trackerEl = document.getElementById("flashcard-tracker");
    const questionTextEl = document.getElementById("flashcard-question-text");
    const answerTextEl = document.getElementById("flashcard-answer-text");
    const explanationTextEl = document.getElementById("flashcard-explanation-text");

    const btnPrev = document.getElementById("btn-fc-prev");
    const btnNext = document.getElementById("btn-fc-next");
    const btnFlip = document.getElementById("btn-fc-flip");
    const btnExit = document.getElementById("btn-fc-exit");

    if (badgeEl) badgeEl.innerText = `${session.branchName}`;

    function renderCard(index) {
        if (cardEl) {
            cardEl.classList.add("no-transition");
            currentRotation = 0;
            cardEl.style.transform = "rotateY(0deg)";

            void cardEl.offsetHeight; // Force browser repaint
            cardEl.classList.remove("no-transition");
        }

        const q = questions[index];
        if (!q) return;

        if (trackerEl) trackerEl.innerText = `Card ${index + 1} of ${questions.length}`;
        if (questionTextEl) questionTextEl.innerText = q.q;

        // Render Question Visual Cue Image if available
        const frontContainer = questionTextEl ? questionTextEl.parentNode : null;
        let imgEl = document.getElementById("flashcard-visual-cue");

        if (q.imageUrl && q.imageUrl.trim() !== "") {
            if (!imgEl && frontContainer) {
                imgEl = document.createElement("img");
                imgEl.id = "flashcard-visual-cue";
                imgEl.className = "flashcard-visual-cue";
                frontContainer.insertBefore(imgEl, questionTextEl.nextSibling);
            }
            if (imgEl) {
                imgEl.src = q.imageUrl;
                imgEl.classList.remove("hidden");
            }
        } else if (imgEl) {
            imgEl.classList.add("hidden");
        }

        let rawAnswer = (q.options && q.options[q.answer] !== undefined)
            ? q.options[q.answer]
            : "No correct answer defined.";

        const cleanAnswer = rawAnswer.replace(/^\d+[\.\)]\s*/, '');

        if (answerTextEl) answerTextEl.innerText = cleanAnswer;
        if (explanationTextEl) {
            explanationTextEl.innerText = q.explanation ? `Note: ${q.explanation}` : "";
        }

        if (btnPrev) btnPrev.disabled = (index === 0);
        if (btnNext) btnNext.disabled = (index === questions.length - 1);
    }

    function spinCard() {
        if (!cardEl) return;
        currentRotation += 180;
        cardEl.style.transform = `rotateY(${currentRotation}deg)`;
    }

    function handleKeydown(e) {
        if (e.code === "Space") {
            e.preventDefault();
            spinCard();
        } else if (e.code === "ArrowRight") {
            if (currentIndex < questions.length - 1) {
                currentIndex++;
                renderCard(currentIndex);
            }
        } else if (e.code === "ArrowLeft") {
            if (currentIndex > 0) {
                currentIndex--;
                renderCard(currentIndex);
            }
        }
    }

    function cleanupAndExit() {
        document.removeEventListener("keydown", handleKeydown);
        window.location.href = "setup.html";
    }

    if (cardEl) cardEl.addEventListener("click", spinCard);
    if (btnFlip) btnFlip.addEventListener("click", spinCard);

    if (btnPrev) {
        btnPrev.addEventListener("click", () => {
            if (currentIndex > 0) {
                currentIndex--;
                renderCard(currentIndex);
            }
        });
    }

    if (btnNext) {
        btnNext.addEventListener("click", () => {
            if (currentIndex < questions.length - 1) {
                currentIndex++;
                renderCard(currentIndex);

                if (currentIndex === questions.length - 1) {
                    awardPoints(50, "Flashcard Deck Completion");
                }
            }
        });
    }

    if (btnExit) {
        btnExit.addEventListener("click", cleanupAndExit);
    }

    // Attach keyboard events with explicit cleanup
    document.removeEventListener("keydown", handleKeydown);
    document.addEventListener("keydown", handleKeydown);

    renderCard(currentIndex);
}
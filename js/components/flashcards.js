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
    const badgeEl = document.getElementById("flashcard-module-badge");
    const trackerEl = document.getElementById("flashcard-tracker");
    const questionTextEl = document.getElementById("flashcard-question-text");
    const answerTextEl = document.getElementById("flashcard-answer-text");
    const explanationTextEl = document.getElementById("flashcard-explanation-text");

    const btnPrev = document.getElementById("btn-fc-prev");
    const btnNext = document.getElementById("btn-fc-next");
    const btnFlip = document.getElementById("btn-fc-flip");
    const btnExit = document.getElementById("btn-fc-exit");

    if (badgeEl) badgeEl.innerText = `[MODULE: ${session.branchName}]`;

    function renderCard(index) {
        // FIX 1: Instant zero-rotation reset without unwinding animation
        if (cardEl) {
            cardEl.style.transition = "none";
            currentRotation = 0;
            cardEl.style.transform = "rotateY(0deg)";
            
            // Force browser repaint before restoring smooth CSS transitions
            void cardEl.offsetHeight;
            cardEl.style.transition = "";
        }

        const q = questions[index];
        if (!q) return;

        if (trackerEl) trackerEl.innerText = `Card ${index + 1} of ${questions.length}`;
        if (questionTextEl) questionTextEl.innerText = q.q;

        // FIX 2: Display pure answer text without option numbers like "2. "
        let rawAnswer = (q.options && q.options[q.answer] !== undefined)
            ? q.options[q.answer]
            : "No correct answer defined.";

        // Strip leading numbers, dots, and spaces (e.g., "2. The left foot" -> "The left foot")
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

                // Award points upon completing the deck
                if (currentIndex === questions.length - 1) {
                    awardPoints(50, "Flashcard Deck Completion");
                }
            }
        });
    }

    if (btnExit) {
        btnExit.addEventListener("click", () => {
            window.location.href = "setup.html";
        });
    }

    document.addEventListener("keydown", (e) => {
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
    });

    renderCard(currentIndex);
}
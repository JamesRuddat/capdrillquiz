const QUESTION_REGISTRY = {
            USAF: {
                branchName: "US Air Force / Space Force",
                manual: "AFMAN 36-2203",
                questions: [
                    {
                        q: "What is the standard cadence rate for Quick Time in USAF drill?",
                        options: ["100 to 110 steps per minute", "100 to 120 steps per minute", "120 to 130 steps per minute", "180 steps per minute"],
                        answer: 1,
                        explanation: "AFMAN 36-2203 Ch. 1 defines Quick Time cadence as 100 to 120 steps per minute."
                    },
                    {
                        q: "In USAF drill, on which foot is the command 'TO THE REAR, MARCH' called?",
                        options: ["Left foot", "Right foot", "Either foot", "Standing position only"],
                        answer: 1,
                        explanation: "In AFMAN 36-2203, 'TO THE REAR, MARCH' is issued as the right foot strikes the ground."
                    },
                    {
                        q: "What is the standard step length for Quick Time marching in USAF drill?",
                        options: ["12 inches", "18 inches", "24 inches", "30 inches"],
                        answer: 2,
                        explanation: "Standard step length for USAF Quick Time is 24 inches (measured heel to heel)."
                    },
                    {
                        q: "Which command allows formation members to break position but remain in the immediate area?",
                        options: ["DISMISSED", "FALL OUT", "AT EASE", "REST"],
                        answer: 1,
                        explanation: "'FALL OUT' permits personnel to relax and leave their position while staying nearby."
                    },
                    {
                        q: "In a flight line formation, what is the distance between ranks?",
                        options: ["30 inches", "40 inches", "36 inches", "48 inches"],
                        answer: 1,
                        explanation: "Distance between ranks (measured from chest of rear airman to back of front airman) is 40 inches."
                    }
                ]
            },
            USA: {
                branchName: "US Army",
                manual: "TC 3-21.5",
                questions: [
                    {
                        q: "According to Army TC 3-21.5, what are the two main parts of a standard drill command?",
                        options: ["Action and Directives", "Preparatory command and Command of execution", "Warning and Execution", "Primary and Secondary"],
                        answer: 1,
                        explanation: "Commands consist of a Preparatory Command (what to do) and Command of Execution (when to do it)."
                    },
                    {
                        q: "In Army drill, on which foot is the command 'Rear, MARCH' given while marching?",
                        options: ["Left foot", "Right foot", "Either foot", "Both feet simultaneously"],
                        answer: 1,
                        explanation: "Under TC 3-21.5, 'Rear, MARCH' is called on the right foot."
                    },
                    {
                        q: "What is the march cadence rate for 'Double Time' in Army drill?",
                        options: ["120 steps/min", "140 steps/min", "180 steps/min", "200 steps/min"],
                        answer: 2,
                        explanation: "Army Double Time cadence is exactly 180 steps per minute."
                    },
                    {
                        q: "What is the step length taken during normal Quick Time in Army drill?",
                        options: ["15 inches", "24 inches", "30 inches", "36 inches"],
                        answer: 2,
                        explanation: "Army Quick Time step length is 30 inches."
                    },
                    {
                        q: "What is the correct position of hands at Attention under Army drill standards?",
                        options: ["Fists clenched firmly", "Cupped with thumbs along trouser seams", "Flat against thighs", "Relaxed open palm"],
                        answer: 1,
                        explanation: "Hands are cupped with thumbs along the trouser seam line."
                    }
                ]
            },
            USMC: {
                branchName: "US Marine Corps / US Navy",
                manual: "MCO 5060.2M",
                questions: [
                    {
                        q: "Under MCO 5060.2M, what distance is maintained between ranks in column formation?",
                        options: ["30 inches", "36 inches", "40 inches", "48 inches"],
                        answer: 2,
                        explanation: "Distance between ranks in USMC drill is 40 inches."
                    },
                    {
                        q: "What is the step length for Half Step in Marine Corps drill?",
                        options: ["12 inches", "15 inches", "18 inches", "20 inches"],
                        answer: 1,
                        explanation: "Half Step in Marine Corps drill is 15 inches."
                    },
                    {
                        q: "On which foot is the command for 'Right Flank, MARCH' given while marching?",
                        options: ["Right foot", "Left foot", "Either foot", "Command of Execution on both"],
                        answer: 1,
                        explanation: "Right flank execution commands are called on the left foot."
                    },
                    {
                        q: "What command aligns a Marine squad at normal interval?",
                        options: ["COVER", "DRESS RIGHT, DRESS", "ALIGNMENT, MARCH", "SQUAD, DRESS"],
                        answer: 1,
                        explanation: "'DRESS RIGHT, DRESS' aligns elements with left arm extended horizontally."
                    }
                ]
            },
            CAP: {
                branchName: "Civil Air Patrol",
                manual: "CAPP 60-33",
                questions: [
                    {
                        q: "Which official publication governs Civil Air Patrol Drill & Ceremonies?",
                        options: ["CAPR 52-16", "CAPP 60-33", "CAPM 39-1", "AFMAN 36-2203"],
                        answer: 1,
                        explanation: "CAPP 60-33 is the official Civil Air Patrol Drill and Ceremonies Pamphlet."
                    },
                    {
                        q: "What USAF manual does Civil Air Patrol drill primarily model its standards after?",
                        options: ["AFMAN 36-2203", "AFI 36-2903", "AFMAN 36-2606", "AFPAM 34-1202"],
                        answer: 0,
                        explanation: "CAP Drill standards mirror USAF AFMAN 36-2203."
                    },
                    {
                        q: "Which position of rest permits cadets to talk unless instructed otherwise?",
                        options: ["AT EASE", "REST", "PARADE REST", "FALL OUT"],
                        answer: 1,
                        explanation: "On 'REST', members may talk while keeping their right foot fixed in position."
                    }
                ]
            }
        };

        let activeBranchKey = "USAF";
        let activeName = "";
        let activeQuestions = [];
        let currentIdx = 0;
        let score = 0;

        document.addEventListener("DOMContentLoaded", () => {
            updateDashboardMetrics();
            renderLeaderboard();
            renderBankInspector();
        });

        function showView(viewId) {
            const views = ['home-view', 'setup-view', 'quiz-view', 'results-view', 'leaderboard-view', 'builder-view'];
            views.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.toggle('hidden', id !== viewId);
            });

            const navMap = {
                'home-view': 'nav-home',
                'setup-view': 'nav-setup',
                'leaderboard-view': 'nav-leaderboard',
                'builder-view': 'nav-builder'
            };

            document.querySelectorAll('#navbar a').forEach(a => a.classList.remove('active-nav'));
            if (navMap[viewId]) {
                const activeNavEl = document.getElementById(navMap[viewId]);
                if (activeNavEl) activeNavEl.classList.add('active-nav');
            }

            if (viewId === 'home-view') updateDashboardMetrics();
            if (viewId === 'leaderboard-view') renderLeaderboard();
            if (viewId === 'builder-view') renderBankInspector();
        }

        function toggleTheme() {
            const root = document.documentElement;
            const current = root.getAttribute("data-theme");
            root.setAttribute("data-theme", current === "dark" ? "light" : "dark");
        }

        function updateDashboardMetrics() {
            const logs = JSON.parse(localStorage.getItem("drill_eval_scores") || "[]");
            document.getElementById("stat-total").innerText = logs.length;

            const getTopScore = (branch) => {
                const branchLogs = logs.filter(l => l.branch === branch);
                if (branchLogs.length === 0) return "--";
                const maxPct = Math.max(...branchLogs.map(l => l.pct));
                return `${maxPct}%`;
            };

            document.getElementById("stat-usaf").innerText = getTopScore("USAF");
            document.getElementById("stat-usa").innerText = getTopScore("USA");
            document.getElementById("stat-usmc").innerText = getTopScore("USMC");
            document.getElementById("stat-cap").innerText = getTopScore("CAP");
        }

        function startQuiz() {
            const nameInput = document.getElementById("name").value.trim();
            activeName = nameInput || "Anonymous";
            activeBranchKey = document.getElementById("branch-select").value;

            const registryEntry = QUESTION_REGISTRY[activeBranchKey];
            if (!registryEntry) return;

            activeQuestions = [...registryEntry.questions];
            currentIdx = 0;
            score = 0;

            document.getElementById("quiz-standard-badge").innerText = `[STANDARD: ${activeBranchKey}]`;
            showView('quiz-view');
            loadQuestion();
        }

        function loadQuestion() {
            const q = activeQuestions[currentIdx];
            document.getElementById("question-tracker").innerText = `Question ${currentIdx + 1} of ${activeQuestions.length}`;
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

        function selectOption(selectedIdx) {
            const q = activeQuestions[currentIdx];
            const buttons = document.querySelectorAll("#options-container .option-btn");

            buttons.forEach(btn => btn.disabled = true);

            const feedbackPanel = document.getElementById("feedback-panel");
            feedbackPanel.classList.remove("hidden");

            if (selectedIdx === q.answer) {
                score++;
                buttons[selectedIdx].classList.add("correct");
                feedbackPanel.className = "correct-panel";
                feedbackPanel.innerHTML = `<strong>[CORRECT]</strong> ${q.explanation}`;
            } else {
                buttons[selectedIdx].classList.add("incorrect");
                buttons[q.answer].classList.add("correct");
                feedbackPanel.className = "incorrect-panel";
                feedbackPanel.innerHTML = `<strong>[INCORRECT]</strong> ${q.explanation}`;
            }

            document.getElementById("next-question-btn").classList.remove("hidden");
        }

        function advanceQuestion() {
            currentIdx++;
            if (currentIdx < activeQuestions.length) {
                loadQuestion();
            } else {
                finishQuiz();
            }
        }

        function finishQuiz() {
            const total = activeQuestions.length;
            const pct = Math.round((score / total) * 100);

            document.getElementById("results-title").innerText = `${activeName} — Score: ${pct}%`;
            document.getElementById("score-summary").innerText = `Evaluetee scored ${score} out of ${total} correct under ${QUESTION_REGISTRY[activeBranchKey].branchName} regulations.`;

            const logs = JSON.parse(localStorage.getItem("drill_eval_scores") || "[]");
            logs.push({
                name: activeName,
                branch: activeBranchKey,
                score: `${score}/${total}`,
                pct: pct,
                date: new Date().toLocaleDateString()
            });
            localStorage.setItem("drill_eval_scores", JSON.stringify(logs));

            showView('results-view');
        }

        function renderLeaderboard() {
            const filter = document.getElementById("filter-branch").value;
            const logs = JSON.parse(localStorage.getItem("drill_eval_scores") || "[]");
            const tbody = document.getElementById("leaderboard-body");
            tbody.innerHTML = "";

            const filtered = logs.filter(item => filter === "ALL" || item.branch === filter);
            filtered.sort((a, b) => b.pct - a.pct);

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--light-text-color);">No score logs found in browser memory.</td></tr>`;
                return;
            }

            filtered.forEach(entry => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>${entry.name}</strong></td>
                    <td style="color: var(--light-text-color);">${entry.branch}</td>
                    <td style="color: var(--alert-color); font-weight: bold;">${entry.score} (${entry.pct}%)</td>
                    <td style="color: var(--light-text-color);">${entry.date}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function clearScores() {
            if (confirm("Permanently clear score history log from this browser?")) {
                localStorage.removeItem("drill_eval_scores");
                renderLeaderboard();
                updateDashboardMetrics();
            }
        }

        function renderBankInspector() {
            const branch = document.getElementById("bank-inspect-select").value;
            const data = QUESTION_REGISTRY[branch];
            const container = document.getElementById("bank-inspector-list");

            if (!data || !container) return;

            container.innerHTML = data.questions.map((q, idx) => `
                <div style="padding: 0.6em; border-radius: 4px; margin-bottom: 0.5em; background: rgba(0,0,0,0.05); font-size: 0.8rem;">
                    <div style="font-weight: bold; margin-bottom: 0.2em;">Q${idx + 1}: ${q.q}</div>
                    <div style="color: var(--primary-color);">Answer: ${q.options[q.answer]}</div>
                    <div style="color: var(--light-text-color); font-size: 0.75rem; margin-top: 0.2em;">${q.explanation}</div>
                </div>
            `).join('');
        }

        function addCustomQuestion() {
            const branch = document.getElementById("bank-inspect-select").value;
            const prompt = document.getElementById("builder-q-prompt").value.trim();
            const opt0 = document.getElementById("builder-opt-0").value.trim();
            const opt1 = document.getElementById("builder-opt-1").value.trim();
            const opt2 = document.getElementById("builder-opt-2").value.trim();
            const opt3 = document.getElementById("builder-opt-3").value.trim();
            const explanation = document.getElementById("builder-explanation").value.trim();

            if (!prompt || !opt0 || !opt1) {
                alert("Please fill in at least the question prompt and Options 1 & 2.");
                return;
            }

            const options = [opt0, opt1];
            if (opt2) options.push(opt2);
            if (opt3) options.push(opt3);

            QUESTION_REGISTRY[branch].questions.push({
                q: prompt,
                options: options,
                answer: 0,
                explanation: explanation || "Custom user-added regulation question."
            });

            document.getElementById("builder-q-prompt").value = "";
            document.getElementById("builder-opt-0").value = "";
            document.getElementById("builder-opt-1").value = "";
            document.getElementById("builder-opt-2").value = "";
            document.getElementById("builder-opt-3").value = "";
            document.getElementById("builder-explanation").value = "";

            renderBankInspector();
            alert("Question added to session question bank!");
        }
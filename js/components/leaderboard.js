import { state } from '../state.js';
import { database } from '../config.js';
import { fetchScoresOnce } from '../services/db-service.js';

let currentSortCol = null;
let currentSortAsc = true;

/**
 * Page Initialization Entry Point for Leaderboard
 */
export function initLeaderboardPage() {
    const modeSelect = document.getElementById("leaderboard-mode-select");
    const subjectSelect = document.getElementById("filter-leaderboard");

    if (modeSelect) {
        modeSelect.addEventListener("change", (e) => {
            const subjectWrapper = document.getElementById("subject-filter-wrapper");
            if (subjectWrapper) {
                subjectWrapper.style.display = e.target.value === 'user-points' ? 'none' : 'block';
            }
            renderLeaderboard();
        });
    }

    if (subjectSelect) {
        subjectSelect.addEventListener("change", () => renderLeaderboard());
    }

    renderLeaderboard();
}

/**
 * Updates Dashboard Stat Counters (Home Page)
 */
export function updateDashboardMetrics() {
    // 1. Update active modules counter
    const modulesCountEl = document.getElementById("stat-modules-count");
    if (modulesCountEl) {
        modulesCountEl.innerText = Object.keys(state.QUESTION_REGISTRY || {}).length;
    }

    // 2. Fetch and render top 3 high scores for index page
    const homeTopBody = document.getElementById("home-top-scores-body");
    if (!homeTopBody) return;

    database.ref("scores").once("value").then(snapshot => {
        const scores = snapshot.val() || {};
        const scoreList = Object.values(scores);

        // Update total test evaluations counter on home page
        const totalEvalsEl = document.getElementById("stat-total-evals");
        if (totalEvalsEl) {
            totalEvalsEl.innerText = scoreList.length;
        }

        if (scoreList.length === 0) {
            homeTopBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--light-text-color);">No scores logged yet. Be the first!</td></tr>`;
            return;
        }

        // Sort by highest percentage score first
        scoreList.sort((a, b) => (b.pct || 0) - (a.pct || 0));

        // Take top 3 scores
        const top3 = scoreList.slice(0, 3);

        homeTopBody.innerHTML = top3.map((item, idx) => {
            let rankStyle = "";
            if (idx === 0) rankStyle = 'style="background-color: rgba(255, 205, 0, 0.15);"';
            else if (idx === 1) rankStyle = 'style="background-color: rgba(200, 200, 200, 0.15);"';
            else if (idx === 2) rankStyle = 'style="background-color: rgba(205, 127, 50, 0.15);"';

            const name = item.name || item.callsign || 'Anonymous';
            const isMe = state.userCallsign && name === state.userCallsign;
            const nameLabel = isMe 
                ? `<strong>${name}</strong> <span class="quiz-card-badge">YOU</span>` 
                : `<strong>${name}</strong>`;

            return `
                <tr ${rankStyle}>
                    <td>${nameLabel}</td>
                    <td>${item.branch || 'General'}</td>
                    <td style="font-weight: bold; color: var(--alert-color);">${item.score} (${item.pct}%)</td>
                    <td style="color: var(--light-text-color); font-size: 0.85rem;">${item.date || 'N/A'}</td>
                </tr>
            `;
        }).join('');
    }).catch(err => {
        console.error("Error loading top 3 preview scores:", err);
        homeTopBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--light-text-color);">Unable to load top scores preview.</td></tr>`;
    });
}

/**
 * Renders Full Leaderboard Table (Supports both 'scores' and 'user-points' modes)
 */
export async function renderLeaderboard() {
    const mainBody = document.getElementById("leaderboard-body");
    const homeBody = document.getElementById("home-top-scores-body");
    const tbody = mainBody || homeBody;
    const thead = document.getElementById("leaderboard-thead");

    if (!tbody || !thead) return;

    // Is this the home page preview card?
    const isHomePage = !mainBody && !!homeBody;
    const limitCount = isHomePage ? 3 : 50;

    const modeSelect = document.getElementById("leaderboard-mode-select");
    const subjectSelect = document.getElementById("filter-leaderboard");

    const mode = modeSelect ? modeSelect.value : 'test-scores';
    const selectedSubject = subjectSelect ? subjectSelect.value : 'ALL';
    const currentUserCallsign = state.userCallsign || null;

    // 1. RENDER: Lifetime Points Leaderboard (Pulls from /users)
    if (mode === 'user-points' && !isHomePage) {
        thead.innerHTML = `
            <tr>
                <th class="sortable" data-sort="name">Callsign <span class="sort-icon">↕</span></th>
                <th class="text-center sortable" data-sort="score">Lifetime Points <span class="sort-icon">↕</span></th>
            </tr>
        `;

        try {
            const snapshot = await database.ref("users").once("value");
            const users = snapshot.val() || {};

            const userList = Object.keys(users)
                .map(uid => ({
                    callsign: users[uid].callsign || "Anonymous",
                    points: users[uid].points || 0
                }))
                .filter(u => u.points > 0)
                .sort((a, b) => b.points - a.points);

            if (userList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="2" class="text-center" style="color: var(--light-text-color);">No points recorded yet. Complete quizzes to earn stars!</td></tr>`;
                initTableSorting("leaderboard-table");
                return;
            }

            tbody.innerHTML = userList.slice(0, limitCount).map(user => {
                const isMe = currentUserCallsign && user.callsign === currentUserCallsign;
                const highlightStyle = isMe ? 'style="background-color: rgba(255, 205, 0, 0.12);"' : '';
                const callsignLabel = isMe 
                    ? `<strong>${user.callsign}</strong> <span class="quiz-card-badge">YOU</span>` 
                    : `<strong>${user.callsign}</strong>`;

                return `
                    <tr ${highlightStyle}>
                        <td>${callsignLabel}</td>
                        <td class="text-center" style="font-weight: bold; color: var(--alert-color);">⭐ ${user.points} pts</td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            console.error("Error loading points leaderboard:", err);
            tbody.innerHTML = `<tr><td colspan="2" class="text-center" style="color: var(--light-text-color);">Unable to load user points.</td></tr>`;
        }

    // 2. RENDER: Top Test Scores (Pulls from /scores)
    } else {
        thead.innerHTML = `
            <tr>
                <th class="sortable" data-sort="name">Callsign <span class="sort-icon">↕</span></th>
                <th class="sortable" data-sort="module">Subject <span class="sort-icon">↕</span></th>
                <th class="sortable" data-sort="score">Score <span class="sort-icon">↕</span></th>
                <th class="sortable" data-sort="date">Date <span class="sort-icon">↕</span></th>
            </tr>
        `;

        try {
            const snapshot = await database.ref("scores").once("value");
            const scores = snapshot.val() || {};

            let scoreList = Object.values(scores);

            if (selectedSubject !== 'ALL') {
                scoreList = scoreList.filter(item => item.branch === selectedSubject || item.activeBranchKey === selectedSubject);
            }

            // Sort highest percentage score first
            scoreList.sort((a, b) => (b.pct || 0) - (a.pct || 0));

            if (scoreList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--light-text-color);">No test scores logged yet. Be the first to complete a quiz!</td></tr>`;
                initTableSorting("leaderboard-table");
                return;
            }

            tbody.innerHTML = scoreList.slice(0, limitCount).map((item, idx) => {
                const name = item.name || item.callsign || 'Anonymous';
                const isMe = currentUserCallsign && name === currentUserCallsign;
                
                // Gold / Silver / Bronze accent backgrounds for Home Preview top 3
                let rankBg = "";
                if (isHomePage) {
                    if (idx === 0) rankBg = 'background-color: rgba(255, 205, 0, 0.15);';
                    else if (idx === 1) rankBg = 'background-color: rgba(200, 200, 200, 0.15);';
                    else if (idx === 2) rankBg = 'background-color: rgba(205, 127, 50, 0.15);';
                } else if (isMe) {
                    rankBg = 'background-color: rgba(255, 205, 0, 0.12);';
                }

                const displayScore = `${item.score} (${item.pct}%)`;
                const nameLabel = isMe 
                    ? `<strong>${name}</strong> <span class="quiz-card-badge">YOU</span>` 
                    : `<strong>${name}</strong>`;

                return `
                    <tr style="${rankBg}">
                        <td>${nameLabel}</td>
                        <td>${item.branch || 'General'}</td>
                        <td style="font-weight: bold; color: var(--alert-color);">${displayScore}</td>
                        <td style="color: var(--light-text-color); font-size: 0.85rem;">${item.date || 'N/A'}</td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            console.error("Error loading scores:", err);
            tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--light-text-color);">Failed to load scores data.</td></tr>`;
        }
    }

    // Re-bind sort listeners to newly rendered DOM headers
    initTableSorting("leaderboard-table");
}

/**
 * In-memory client-side table column sorting
 */
export function initTableSorting(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const headers = table.querySelectorAll("th.sortable");
    headers.forEach((th, index) => {
        th.onclick = () => {
            const tbody = table.querySelector("tbody");
            if (!tbody) return;

            const rows = Array.from(tbody.querySelectorAll("tr"));
            if (rows.length === 1 && rows[0].querySelector("td[colspan]")) return;

            if (currentSortCol === index) {
                currentSortAsc = !currentSortAsc;
            } else {
                currentSortCol = index;
                const sortType = th.dataset.sort;
                currentSortAsc = !(sortType === "score" || sortType === "date");
            }

            headers.forEach(h => {
                const icon = h.querySelector(".sort-icon");
                if (icon) icon.innerText = "↕";
                h.classList.remove("sort-asc", "sort-desc");
            });

            const activeIcon = th.querySelector(".sort-icon");
            if (activeIcon) activeIcon.innerText = currentSortAsc ? "▲" : "▼";
            th.classList.add(currentSortAsc ? "sort-asc" : "sort-desc");

            const sortKey = th.dataset.sort || "text";

            rows.sort((a, b) => {
                const cellA = a.children[index]?.innerText.trim() || "";
                const cellB = b.children[index]?.innerText.trim() || "";

                if (sortKey === "score") {
                    const scoreA = parseScorePercentage(cellA);
                    const scoreB = parseScorePercentage(cellB);
                    return currentSortAsc ? scoreA - scoreB : scoreB - scoreA;
                }

                if (sortKey === "date") {
                    const dateA = new Date(cellA).getTime() || 0;
                    const dateB = new Date(cellB).getTime() || 0;
                    return currentSortAsc ? dateA - dateB : dateB - dateA;
                }

                const cleanA = cellA.replace(/\s*YOU$/, '');
                const cleanB = cellB.replace(/\s*YOU$/, '');
                return currentSortAsc
                    ? cleanA.localeCompare(cleanB, undefined, { sensitivity: 'base', numeric: true })
                    : cleanB.localeCompare(cleanA, undefined, { sensitivity: 'base', numeric: true });
            });

            rows.forEach(row => tbody.appendChild(row));
        };
    });
}

function parseScorePercentage(val) {
    const match = val.match(/\((\d+)%\)/) || val.match(/(\d+)%/);
    if (match) return parseFloat(match[1]);

    if (val.includes("pts")) {
        const parsedPts = parseFloat(val.replace(/[^\d.]/g, ''));
        return isNaN(parsedPts) ? 0 : parsedPts;
    }

    if (val.includes("/")) {
        const [num, denom] = val.split("/").map(v => parseFloat(v));
        return denom ? (num / denom) * 100 : 0;
    }

    const parsed = parseFloat(val.replace(/[^\d.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
}
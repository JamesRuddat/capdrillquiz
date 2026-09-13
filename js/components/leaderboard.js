import { state } from '../state.js';
import { database } from '../config.js';

let currentSortCol = null;
let currentSortAsc = true;

/**
 * Helper: Extracts raw correct count from score strings or properties.
 * E.g., "90/100" -> 90, "9/10" -> 9
 */
function parseCorrectCount(item) {
    if (!item) return 0;
    if (typeof item.correctCount === 'number') {
        return item.correctCount;
    }
    
    const scoreStr = String(item.score || item || '');
    if (scoreStr.includes('/')) {
        const parts = scoreStr.split('/');
        const parsed = parseInt(parts[0], 10);
        if (!isNaN(parsed)) return parsed;
    }
    
    const directNum = parseInt(scoreStr, 10);
    return isNaN(directNum) ? 0 : directNum;
}

/**
 * Helper: Formats callsign display with UID matching & legacy censorship support
 */
function formatCallsignDisplay(item, currentUid, currentUserCallsign) {
    const rawName = item.callsign || item.name || '';
    
    // Check if entry belongs to the logged-in user via UID or callsign fallback
    const isMe = (currentUid && item.uid && item.uid === currentUid) || 
                 (currentUserCallsign && rawName === currentUserCallsign);

    // If it's the current user, always display their active callsign + YOU badge
    if (isMe) {
        const activeName = currentUserCallsign || rawName || 'Active User';
        return `<strong>${activeName}</strong> <span class="quiz-card-badge">YOU</span>`;
    }

    // For other users: redact if entry lacks callsign/UID or is flagged legacy
    const isLegacy = (!item.callsign && !item.uid) || item.isLegacyName === true;

    if (isLegacy) {
        return `
            <span class="leaderboard-legacy-text" title="Recorded prior to callsign system update">
                [Limited]
            </span>
            <span class="quiz-card-badge leaderboard-legacy-badge">Legacy</span>
        `;
    }

    return `<strong>${rawName}</strong>`;
}

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
                if (e.target.value === 'user-points') {
                    subjectWrapper.classList.add("hidden");
                } else {
                    subjectWrapper.classList.remove("hidden");
                }
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
 * Updates Dashboard Stat Counters and Top 3 High Scores Preview (Index Page)
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
            homeTopBody.innerHTML = `<tr><td colspan="4" class="text-center text-dim">No scores logged yet. Be the first!</td></tr>`;
            return;
        }

        // SORT BY TOTAL CORRECT ANSWERS DESCENDING (90/100 beats 9/10)
        scoreList.sort((a, b) => {
            const correctA = parseCorrectCount(a);
            const correctB = parseCorrectCount(b);
            if (correctB !== correctA) {
                return correctB - correctA;
            }
            return (b.pct || 0) - (a.pct || 0); // Tie-breaker: higher %
        });

        // Take top 3 scores for index page
        const top3 = scoreList.slice(0, 3);
        const currentUid = (state.currentUser && state.currentUser.uid) || state.userUid || null;
        const currentUserCallsign = state.userCallsign || null;

        homeTopBody.innerHTML = top3.map((item, idx) => {
            let rankClass = "";
            if (idx === 0) rankClass = "rank-gold";
            else if (idx === 1) rankClass = "rank-silver";
            else if (idx === 2) rankClass = "rank-bronze";

            const nameLabel = formatCallsignDisplay(item, currentUid, currentUserCallsign);

            return `
                <tr class="${rankClass}">
                    <td>${nameLabel}</td>
                    <td>${item.branch || 'General'}</td>
                    <td class="font-bold text-alert">${item.score} (${item.pct}%)</td>
                    <td class="text-dim text-sm">${item.date || 'N/A'}</td>
                </tr>
            `;
        }).join('');
    }).catch(err => {
        console.error("Error loading top 3 preview scores:", err);
        homeTopBody.innerHTML = `<tr><td colspan="4" class="text-center text-dim">Unable to load top scores preview.</td></tr>`;
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
    
    const currentUid = (state.currentUser && state.currentUser.uid) || state.userUid || null;
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
                    uid: uid,
                    callsign: users[uid].callsign || null,
                    name: users[uid].name || null,
                    isLegacyName: users[uid].isLegacyName || false,
                    points: users[uid].points || 0
                }))
                .filter(u => u.points > 0)
                .sort((a, b) => b.points - a.points);

            if (userList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="2" class="text-center text-dim">No points recorded yet. Complete quizzes to earn stars!</td></tr>`;
                initTableSorting("leaderboard-table");
                return;
            }

            tbody.innerHTML = userList.slice(0, limitCount).map(user => {
                const isMe = (currentUid && user.uid === currentUid) || 
                             (currentUserCallsign && user.callsign === currentUserCallsign);
                const highlightClass = isMe ? 'rank-active-user' : '';
                const callsignLabel = formatCallsignDisplay(user, currentUid, currentUserCallsign);

                return `
                    <tr class="${highlightClass}">
                        <td>${callsignLabel}</td>
                        <td class="text-center font-bold text-alert">⭐ ${user.points} pts</td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            console.error("Error loading points leaderboard:", err);
            tbody.innerHTML = `<tr><td colspan="2" class="text-center text-dim">Unable to load user points.</td></tr>`;
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

            // SORT BY TOTAL CORRECT ANSWERS DESCENDING
            scoreList.sort((a, b) => {
                const correctA = parseCorrectCount(a);
                const correctB = parseCorrectCount(b);
                if (correctB !== correctA) {
                    return correctB - correctA;
                }
                return (b.pct || 0) - (a.pct || 0); // Tie-breaker: higher %
            });

            if (scoreList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-dim">No test scores logged yet. Be the first to complete a quiz!</td></tr>`;
                initTableSorting("leaderboard-table");
                return;
            }

            tbody.innerHTML = scoreList.slice(0, limitCount).map((item, idx) => {
                const rawName = item.callsign || item.name;
                const isMe = (currentUid && item.uid && item.uid === currentUid) || 
                             (currentUserCallsign && rawName === currentUserCallsign);
                
                // Gold / Silver / Bronze accent backgrounds for Home Preview top 3
                let rankClass = "";
                if (isHomePage) {
                    if (idx === 0) rankClass = "rank-gold";
                    else if (idx === 1) rankClass = "rank-silver";
                    else if (idx === 2) rankClass = "rank-bronze";
                } else if (isMe) {
                    rankClass = "rank-active-user";
                }

                const displayScore = `${item.score} (${item.pct}%)`;
                const nameLabel = formatCallsignDisplay(item, currentUid, currentUserCallsign);

                return `
                    <tr class="${rankClass}">
                        <td>${nameLabel}</td>
                        <td>${item.branch || 'General'}</td>
                        <td class="font-bold text-alert">${displayScore}</td>
                        <td class="text-dim text-sm">${item.date || 'N/A'}</td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            console.error("Error loading scores:", err);
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-dim">Failed to load scores data.</td></tr>`;
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
                    const countA = parseCorrectCount(cellA);
                    const countB = parseCorrectCount(cellB);
                    return currentSortAsc ? countA - countB : countB - countA;
                }

                if (sortKey === "date") {
                    const dateA = new Date(cellA).getTime() || 0;
                    const dateB = new Date(cellB).getTime() || 0;
                    return currentSortAsc ? dateA - dateB : dateB - dateA;
                }

                const cleanA = cellA.replace(/\s*YOU$/, '').replace(/\s*Legacy$/, '');
                const cleanB = cellB.replace(/\s*YOU$/, '').replace(/\s*Legacy$/, '');
                return currentSortAsc
                    ? cleanA.localeCompare(cleanB, undefined, { sensitivity: 'base', numeric: true })
                    : cleanB.localeCompare(cleanA, undefined, { sensitivity: 'base', numeric: true });
            });

            rows.forEach(row => tbody.appendChild(row));
        };
    });
}
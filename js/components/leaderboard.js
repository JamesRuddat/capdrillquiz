import { state } from '../state.js';
import { database } from '/js/config.js';
import { updateRankCardUI } from '../services/badge-service.js';
import { Cache } from '../services/storage-service.js';

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

    const isMe = (currentUid && item.uid && item.uid === currentUid) ||
        (currentUserCallsign && rawName === currentUserCallsign);

    if (isMe) {
        const activeName = currentUserCallsign || rawName || 'Active User';
        return `<strong>${activeName}</strong> <span class="quiz-card-badge">YOU</span>`;
    }

    const isLegacy = (!item.callsign && !item.uid) || item.isLegacyName === true;

    if (isLegacy) {
        return `
            <span class="leaderboard-legacy-text" title="Recorded prior to callsign system update">
                [Bata]
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
    updateRankCardUI();

    const subjectsCountEl = document.getElementById("stat-subjects-count") || document.getElementById("stat-modules-count");

    const renderCount = (count) => {
        if (subjectsCountEl) {
            subjectsCountEl.innerText = count;
        }
    };

    // 1. Check in-memory state store
    let registry = state.QUESTION_REGISTRY || {};
    let count = Object.keys(registry).length;

    // 2. Fallback to Cache service if state is empty at DOM load
    if (count === 0) {
        const cachedSubjects = Cache.getSubjects();
        const cachedCount = Object.keys(cachedSubjects).length;
        if (cachedCount > 0) {
            registry = cachedSubjects;
            state.QUESTION_REGISTRY = cachedSubjects; // Hydrate state
            count = cachedCount;
        }
    }

    if (count > 0) {
        renderCount(count);
    } else {
        // 3. Fallback to Firebase query
        database.ref("subjects").once("value").then(snapshot => {
            const freshRegistry = snapshot.val() || {};
            state.QUESTION_REGISTRY = freshRegistry;
            
            // Sync to local Storage Service Cache
            Cache.setSubjects(freshRegistry);
            
            const freshCount = Object.keys(freshRegistry).length;
            renderCount(freshCount);
        }).catch(err => {
            console.error("Error fetching subject registry from Firebase:", err);
        });
    }

    // 4. Fetch and render top 3 high scores for index page
    const dashboardTopBody = document.getElementById("dashboard-top-scores-body");
    if (!dashboardTopBody) return;

    database.ref("scores").once("value").then(snapshot => {
        const scores = snapshot.val() || {};
        const scoreList = Object.values(scores);

        const totalEvalsEl = document.getElementById("stat-total-evals");
        if (totalEvalsEl) {
            totalEvalsEl.innerText = scoreList.length;
        }

        if (scoreList.length === 0) {
            dashboardTopBody.innerHTML = `<tr><td colspan="4" class="text-center subtext">No scores logged yet. Be the first!</td></tr>`;
            return;
        }

        scoreList.sort((a, b) => {
            const correctA = parseCorrectCount(a);
            const correctB = parseCorrectCount(b);
            if (correctB !== correctA) return correctB - correctA;
            return (b.pct || 0) - (a.pct || 0);
        });

        const top3 = scoreList.slice(0, 3);
        const currentUid = state.userUid || (state.currentUser && state.currentUser.uid) || null;
        const currentUserCallsign = state.userCallsign || null;

        dashboardTopBody.innerHTML = top3.map((item, idx) => {
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
                    <td class="subtext text-sm">${item.date || 'N/A'}</td>
                </tr>
            `;
        }).join('');
    }).catch(err => {
        console.error("Error loading top 3 preview scores:", err);
        dashboardTopBody.innerHTML = `<tr><td colspan="4" class="text-center subtext">Unable to load top scores preview.</td></tr>`;
    });
}

/**
 * Renders Full Leaderboard Table
 */
export async function renderLeaderboard() {
    const mainBody = document.getElementById("leaderboard-body");
    const dashboardBody = document.getElementById("dashboard-top-scores-body");
    const tbody = mainBody || dashboardBody;
    const thead = document.getElementById("leaderboard-thead");

    if (!tbody || !thead) return;

    const isDashboardPage = !mainBody && !!dashboardBody;
    const limitCount = isDashboardPage ? 3 : 50;

    const modeSelect = document.getElementById("leaderboard-mode-select");
    const subjectSelect = document.getElementById("filter-leaderboard");

    const mode = modeSelect ? modeSelect.value : 'test-scores';
    const selectedSubject = subjectSelect ? subjectSelect.value : 'ALL';

    const currentUid = state.userUid || (state.currentUser && state.currentUser.uid) || null;
    const currentUserCallsign = state.userCallsign || null;

    if (mode === 'user-points' && !isDashboardPage) {
        thead.innerHTML = `
            <tr>
                <th class="sortable" data-sort="name">
                    Callsign <span class="arrow-icon arrow-sort"></span>
                </th>
                <th class="text-center sortable" data-sort="score">
                    Lifetime Points <span class="arrow-icon arrow-sort"></span>
                </th>
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
                tbody.innerHTML = `<tr><td colspan="2" class="text-center subtext">No points recorded yet. Complete quizzes to earn stars!</td></tr>`;
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
            tbody.innerHTML = `<tr><td colspan="2" class="text-center subtext">Unable to load user points.</td></tr>`;
        }
    } else {
        thead.innerHTML = `
            <tr>
                <th class="sortable" data-sort="name">
                    Callsign <span class="arrow-icon arrow-sort"></span>
                </th>
                <th class="sortable" data-sort="subject">
                    Subject <span class="arrow-icon arrow-sort"></span>
                </th>
                <th class="sortable" data-sort="score">
                    Score <span class="arrow-icon arrow-sort"></span>
                </th>
                <th class="sortable" data-sort="date">
                    Date <span class="arrow-icon arrow-sort"></span>
                </th>
            </tr>
        `;

        try {
            const snapshot = await database.ref("scores").once("value");
            const scores = snapshot.val() || {};

            let scoreList = Object.values(scores);

            if (selectedSubject !== 'ALL') {
                scoreList = scoreList.filter(item => item.branch === selectedSubject || item.activeBranchKey === selectedSubject);
            }

            scoreList.sort((a, b) => {
                const correctA = parseCorrectCount(a);
                const correctB = parseCorrectCount(b);
                if (correctB !== correctA) return correctB - correctA;
                return (b.pct || 0) - (a.pct || 0);
            });

            if (scoreList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center subtext">No test scores logged yet. Be the first to complete a quiz!</td></tr>`;
                initTableSorting("leaderboard-table");
                return;
            }

            tbody.innerHTML = scoreList.slice(0, limitCount).map((item, idx) => {
                const rawName = item.callsign || item.name;
                const isMe = (currentUid && item.uid && item.uid === currentUid) ||
                    (currentUserCallsign && rawName === currentUserCallsign);

                let rankClass = "";
                if (isDashboardPage) {
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
                        <td class="subtext text-sm">${item.date || 'N/A'}</td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            console.error("Error loading scores:", err);
            tbody.innerHTML = `<tr><td colspan="4" class="text-center subtext">Failed to load scores data.</td></tr>`;
        }
    }

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
                const icon = h.querySelector(".arrow-icon");
                if (icon) icon.className = "arrow-icon arrow-sort";
                h.classList.remove("sort-asc", "sort-desc");
            });

            const activeIcon = th.querySelector(".arrow-icon");
            if (activeIcon) {
                activeIcon.className = `arrow-icon ${currentSortAsc ? 'arrow-up' : 'arrow-down'}`;
            }
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
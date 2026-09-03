import { state } from '../state.js';
import { fetchScoresOnce, fetchScoresOrderedByPct } from '../services/db-service.js';

export function updateDashboardMetrics() {
    fetchScoresOnce(logs => {
        const totalEl = document.getElementById("stat-total-evals");
        if (totalEl) totalEl.innerText = logs.length;

        const modulesCountEl = document.getElementById("stat-modules-count");
        if (modulesCountEl) modulesCountEl.innerText = Object.keys(state.QUESTION_REGISTRY || {}).length;

        const homeTopBody = document.getElementById("home-top-scores-body");
        if (homeTopBody) {
            logs.sort((a, b) => {
                if (b.pct !== a.pct) {
                    return b.pct - a.pct;
                }
                return new Date(b.date) - new Date(a.date);
            });

            const topPerformers = logs.slice(0, 3);

            if (topPerformers.length === 0) {
                homeTopBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--light-text-color);">No scores logged yet. Be the first!</td></tr>`;
            } else {
                homeTopBody.innerHTML = topPerformers.map((entry, idx) => {
                    let rankStyle = "";
                    if (idx === 0) rankStyle = 'style="background-color: var(--gold-color);"';
                    else if (idx === 1) rankStyle = 'style="background-color: var(--silver-color);"';
                    else if (idx === 2) rankStyle = 'style="background-color: var(--bronze-color);"';

                    return `
                        <tr ${rankStyle}>
                            <td><strong>#${idx + 1} ${entry.name}</strong></td>
                            <td>${entry.branch}</td>
                            <td style="color: var(--text-color); font-weight: bold;">${entry.score} (${entry.pct}%)</td>
                            <td style="color: var(--light-text-color); font-size: 0.85rem;">${entry.date}</td>
                        </tr>
                    `;
                }).join('');
            }
        }
    });
}

export function renderLeaderboard() {
    const filterSelect = document.getElementById("filter-leaderboard");
    const filter = filterSelect ? filterSelect.value : "ALL";
    const tbody = document.getElementById("leaderboard-body");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" class="text-center">Loading universal scores from Firebase...</td></tr>`;

    fetchScoresOrderedByPct(logs => {
        tbody.innerHTML = "";

        logs.sort((a, b) => {
            if (b.pct !== a.pct) {
                return b.pct - a.pct;
            }
            return new Date(b.date) - new Date(a.date);
        });

        const filtered = logs.filter(item => filter === "ALL" || item.branch === filter);

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center">No scores logged yet for this filter.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map((entry, idx) => {
            let rowStyle = "";
            if (idx === 0) rowStyle = 'style="background-color: var(--gold-color);"';
            else if (idx === 1) rowStyle = 'style="background-color: var(--silver-color);"';
            else if (idx === 2) rowStyle = 'style="background-color: var(--bronze-color);"';
            else if (idx % 2 === 1) rowStyle = 'style="background-color: rgba(0, 0, 0, 0.04);"';

            return `
                <tr ${rowStyle}>
                    <td><strong>#${idx + 1} ${entry.name}</strong></td>
                    <td>${entry.branch}</td>
                    <td style="color: var(--text-color); font-weight: bold;">${entry.score} (${entry.pct}%)</td>
                    <td class="timestamp" style="color: var(--light-text-color); font-size: 0.85rem;">${entry.date}</td>
                </tr>
            `;
        }).join('');
    });
}

let currentSortCol = null;
let currentSortAsc = true;

export function initTableSorting(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const headers = table.querySelectorAll("th.sortable");
    headers.forEach((th, index) => {
        th.addEventListener("click", () => {
            const tbody = table.querySelector("tbody");
            const rows = Array.from(tbody.querySelectorAll("tr"));

            if (rows.length === 1 && rows[0].querySelector("td[colspan]")) return;

            if (currentSortCol === index) {
                currentSortAsc = !currentSortAsc;
            } else {
                currentSortCol = index;
                // Default to descending for Score/Date, ascending for Name/Module
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

                // Default string sorting for Name/Participant & Module
                const cleanA = cellA.replace(/^#\d+\s*/, ''); // Remove "#1 " prefix for ranking strings
                const cleanB = cellB.replace(/^#\d+\s*/, '');
                return currentSortAsc
                    ? cleanA.localeCompare(cleanB, undefined, { sensitivity: 'base', numeric: true })
                    : cleanB.localeCompare(cleanA, undefined, { sensitivity: 'base', numeric: true });
            });

            rows.forEach(row => tbody.appendChild(row));
        });
    });
}

// Extracts percentage from strings like "8/10 (80%)" or "80%"
function parseScorePercentage(val) {
    const match = val.match(/\((\d+)%\)/) || val.match(/(\d+)%/);
    if (match) return parseFloat(match[1]);

    if (val.includes("/")) {
        const [num, denom] = val.split("/").map(v => parseFloat(v));
        return denom ? (num / denom) * 100 : 0;
    }

    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
}
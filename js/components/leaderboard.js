import { state } from '../state.js';
import { fetchScoresOnce, fetchScoresOrderedByPct } from '../services/db-service.js';

export function updateDashboardMetrics() {
    fetchScoresOnce(logs => {
        const totalEl = document.getElementById("stat-total-evals");
        if (totalEl) totalEl.innerText = logs.length;

        const modulesCountEl = document.getElementById("stat-modules-count");
        if (modulesCountEl) modulesCountEl.innerText = Object.keys(state.QUESTION_REGISTRY).length;

        const homeTopBody = document.getElementById("home-top-scores-body");
        if (homeTopBody) {
            // Sort by percentage (descending), then by date (most recent first) for ties
            logs.sort((a, b) => {
                if (b.pct !== a.pct) {
                    return b.pct - a.pct;
                }
                return new Date(b.date) - new Date(a.date);
            });

            const topPerformers = logs.slice(0, 5);

            if (topPerformers.length === 0) {
                homeTopBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--light-text-color);">No scores logged yet. Be the first!</td></tr>`;
            } else {
                homeTopBody.innerHTML = topPerformers.map((entry, idx) => {
                    let rankStyle = "";
                    if (idx === 0) {
                        rankStyle = 'style="background-color: rgba(238, 255, 0, 0.56);"'; // Gold
                    } else if (idx === 1) {
                        rankStyle = 'style="background-color: rgba(192, 192, 192, 0.45);"'; // Silver
                    } else if (idx === 2) {
                        rankStyle = 'style="background-color: rgba(233, 138, 43, 0.37);"';  // Bronze
                    }

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

        // Sort ties by most recent date first
        logs.sort((a, b) => {
            if (b.pct !== a.pct) {
                return b.pct - a.pct;
            }
            return new Date(b.date) - new Date(a.date);
        });

        const filtered = logs.filter(item => filter === "ALL" || item.branch === filter);

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--light-text-color);">No scores logged yet for this filter.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map((entry, idx) => {
            let rowStyle = "";

            // 1. Assign Top 3 Podium Colors
            if (idx === 0) {
                rowStyle = 'style="background-color: rgba(238, 255, 0, 0.56);"'; // Gold
            } else if (idx === 1) {
                rowStyle = 'style="background-color: rgba(192, 192, 192, 0.45);"'; // Silver
            } else if (idx === 2) {
                rowStyle = 'style="background-color: rgba(233, 138, 43, 0.37);"';  // Bronze
            } 
            // 2. Alternating Grey Zebra Striping for Row 4+
            else if (idx % 2 === 1) {
                rowStyle = 'style="background-color: rgba(0, 0, 0, 0.04);"'; // Light grey tint
            }

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
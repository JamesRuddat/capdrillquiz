import { state } from '../state.js';
import { SUPER_UID } from '../config.js';

export class SiteHeader extends HTMLElement {
    connectedCallback() {
        this.renderShell();

        // 1. Listen for global reactive state changes (Auth/Profile updates)
        window.addEventListener("app:state-changed", (e) => {
            const { callsign, points, user } = e.detail;
            if (user) {
                this.renderUser(callsign, points);
            } else {
                this.renderGuest();
            }
        });

        // 2. Listen for targeted real-time point adjustments
        window.addEventListener("app:points-updated", (e) => {
            const ptsEl = this.querySelector("#nav-user-points");
            if (ptsEl && e.detail?.points !== undefined) {
                ptsEl.innerText = `⭐ ${e.detail.points} pts`;
            }
        });

        // 3. Instant Pre-Render: Synchronous local storage hydration (0ms latency)
        const activeUid = localStorage.getItem("active_uid");
        if (activeUid) {
            const cachedCallsign = localStorage.getItem(`callsign_${activeUid}`);
            const cachedPoints = localStorage.getItem(`points_${activeUid}`);
            if (cachedCallsign) {
                this.renderUser(cachedCallsign, parseInt(cachedPoints || "0", 10));
                return;
            }
        }

        this.renderGuest();
    }

    renderShell() {
        const currentPath = window.location.pathname;

        this.innerHTML = `
            <nav id="navbar">
                <button id="hamburger-btn" class="hamburger" aria-label="Toggle Navigation" type="button">
                    <span class="hamburger-bar"></span>
                    <span class="hamburger-bar"></span>
                    <span class="hamburger-bar"></span>
                </button>

                <div id="nav-drawer" class="nav-links">
                    <a href="index.html" class="${currentPath.endsWith("index.html") || currentPath === "/" ? "active-nav" : ""}">Dashboard</a>
                    <a href="setup.html" class="${currentPath.endsWith("setup.html") ? "active-nav" : ""}">Practice</a>
                    <a href="leaderboard.html" class="${currentPath.endsWith("leaderboard.html") ? "active-nav" : ""}">Leaderboard</a>
                </div>

                <!-- Embedded Search Bar -->
                <div class="nav-search-wrapper">
                    <input 
                        type="text" 
                        id="nav-quiz-search" 
                        placeholder="Search Subjects..." 
                        aria-label="Search Subjects"
                        class="nav-search-input"
                    />
                </div>

                <div id="user-controls" class="nav-controls">
                    <!-- Dynamic auth state renders here -->
                </div>
            </nav>
        `;

        this.bindMobileNav();
        this.bindSearchInput();
    }

    bindSearchInput() {
        const searchInput = this.querySelector("#nav-quiz-search");
        if (!searchInput) return;

        // Auto-fill and apply filter if arriving with a search query param
        const urlParams = new URLSearchParams(window.location.search);
        const urlQuery = urlParams.get("search");
        if (urlQuery) {
            searchInput.value = urlQuery;
            setTimeout(() => this.filterQuizCards(urlQuery), 100);
        }

        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            this.filterQuizCards(query);
        });

        // Redirect to setup.html if Enter is pressed on another page
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const query = searchInput.value.trim();
                const isSetupPage = window.location.pathname.endsWith("setup.html");

                if (!isSetupPage && query) {
                    window.location.href = `setup.html?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }

    filterQuizCards(searchTerm) {
        const gridContainer = document.querySelector(".cards-grid") || document.querySelector("#quiz-cards-container");
        const cards = document.querySelectorAll(".quiz-card");
        if (!gridContainer || cards.length === 0) return;

        let visibleCount = 0;

        cards.forEach(card => {
            if (card.id === "search-empty-state-card") return;

            const title = card.querySelector(".quiz-card-title")?.innerText.toLowerCase() || "";
            const badge = card.querySelector(".quiz-card-badge")?.innerText.toLowerCase() || "";
            const meta = card.querySelector(".quiz-card-meta")?.innerText.toLowerCase() || "";

            const isMatch = title.includes(searchTerm) ||
                badge.includes(searchTerm) ||
                meta.includes(searchTerm);

            if (isMatch) {
                card.classList.remove("hidden");
                visibleCount++;
            } else {
                card.classList.add("hidden");
            }
        });

        let emptyStateCard = document.getElementById("search-empty-state-card");

        if (visibleCount === 0 && searchTerm !== "") {
            if (!emptyStateCard) {
                emptyStateCard = document.createElement("div");
                emptyStateCard.id = "search-empty-state-card";
                emptyStateCard.className = "quiz-card empty-state-card text-center";

                emptyStateCard.innerHTML = `
                    <div class="empty-state-icon">🛸</div>
                    <h3 class="empty-state-title">No Subjects or Quizzes Found</h3>
                    <p class="subtext empty-state-desc">
                        No evaluations match "<strong>${searchTerm}</strong>".
                    </p>
                `;

                gridContainer.appendChild(emptyStateCard);
            } else {
                emptyStateCard.classList.remove("hidden");
                const queryText = emptyStateCard.querySelector("strong");
                if (queryText) queryText.innerText = searchTerm;
            }
        } else if (emptyStateCard) {
            emptyStateCard.remove();
        }
    }

    bindMobileNav() {
        const hamburgerBtn = this.querySelector("#hamburger-btn");
        const navDrawer = this.querySelector("#nav-drawer");

        if (hamburgerBtn && navDrawer) {
            hamburgerBtn.onclick = (e) => {
                e.stopPropagation();
                hamburgerBtn.classList.toggle("is-active");
                navDrawer.classList.toggle("is-open");
            };

            document.addEventListener("click", (e) => {
                if (!this.contains(e.target)) {
                    hamburgerBtn.classList.remove("is-active");
                    navDrawer.classList.remove("is-open");
                }
            });
        }
    }

    renderUser(callsign, points = 0) {
        const controls = this.querySelector("#user-controls");
        if (!controls) return;

        const initial = callsign ? callsign.charAt(0).toUpperCase() : "C";

        // Determine if user has Admin/Moderator privilege
        const userUid = state.currentUser ? state.currentUser.uid : localStorage.getItem("active_uid");
        const isSuper = userUid === SUPER_UID;
        const userRole = state.userRole || (isSuper ? "admin" : "user");
        const isModOrAdmin = isSuper || userRole === "admin" || userRole === "mod";

        controls.innerHTML = `
            <span id="nav-user-points" class="badge-status badge-verified nav-pts-badge">
                ⭐ ${points} pts
            </span>
            <div class="user-menu-wrapper">
                <button id="user-avatar-btn" class="user-avatar-btn" type="button" title="${callsign}">
                    ${initial}
                </button>
                <div id="user-dropdown" class="user-dropdown">
                    <div class="user-dropdown-header">${callsign}</div>
                    <a href="profile.html" class="user-dropdown-item">
                        Profile &amp; Badges
                    </a>
                    ${isModOrAdmin ? `
                        <a href="admin.html" class="user-dropdown-item text-gold font-bold">
                            Personnel Panel
                        </a>
                    ` : ''}
                    <div class="user-dropdown-divider"></div>
                    <button id="btn-signout" class="user-dropdown-item" type="button">
                        Sign Out
                    </button>
                </div>
            </div>
        `;

        this.bindUserEvents();
    }

    renderGuest() {
        const controls = this.querySelector("#user-controls");
        if (!controls) return;

        controls.innerHTML = `
            <button id="auth-signin-btn" class="btn-tactical btn-gold btn-sm" type="button">
                Sign In
            </button>
        `;

        const btn = controls.querySelector("#auth-signin-btn");
        if (btn) {
            btn.onclick = () => {
                import('../services/auth-service.js').then(m => m.triggerAuthFlow());
            };
        }
    }

    bindUserEvents() {
        const avatarBtn = this.querySelector("#user-avatar-btn");
        const dropdown = this.querySelector("#user-dropdown");
        const editBtn = this.querySelector("#btn-edit-callsign");
        const signoutBtn = this.querySelector("#btn-signout");

        if (avatarBtn && dropdown) {
            avatarBtn.onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.toggle("is-open");
            };

            // Close dropdown when clicking anywhere else on the document
            document.addEventListener("click", (e) => {
                if (!avatarBtn.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.remove("is-open");
                }
            });
        }

        if (editBtn) {
            editBtn.onclick = () => {
                if (dropdown) dropdown.classList.remove("is-open");
                import('../services/auth-service.js').then(m => m.editUserCallsign());
            };
        }

        if (signoutBtn) {
            signoutBtn.onclick = () => {
                if (dropdown) dropdown.classList.remove("is-open");
                import('../services/auth-service.js').then(m => m.handleSignOut());
            };
        }
    }
}

if (!customElements.get("site-header")) {
    customElements.define("site-header", SiteHeader);
}
class SiteHeader extends HTMLElement {
    connectedCallback() {
        this.renderShell();
        
        // Instant Pre-Render: Check session cache
        const activeUid = Object.keys(sessionStorage).find(k => k.startsWith("callsign_"))?.replace("callsign_", "");
        if (activeUid) {
            const cachedCallsign = sessionStorage.getItem(`callsign_${activeUid}`);
            const cachedPoints = sessionStorage.getItem(`points_${activeUid}`);
            if (cachedCallsign) {
                this.renderUser(cachedCallsign, parseInt(cachedPoints || "0", 10));
                return;
            }
        }

        this.renderGuest();
    }

    renderShell() {
        this.innerHTML = `
            <nav id="navbar">
                <button id="hamburger-btn" class="hamburger" aria-label="Toggle Navigation" type="button">
                    <span class="hamburger-bar"></span>
                    <span class="hamburger-bar"></span>
                    <span class="hamburger-bar"></span>
                </button>

                <div id="nav-drawer" class="nav-links">
                    <a href="index.html">Home</a>
                    <a href="setup.html">Practice</a>
                    <a href="hub.html">Subject Hub</a>
                    <a href="leaderboard.html">Leaderboard</a>
                </div>

                <!-- Embedded Search Bar -->
                <div class="nav-search-wrapper" style="position: relative; max-width: 220px; width: 100%; margin: 0 8px;">
                    <input 
                        type="text" 
                        id="nav-quiz-search" 
                        placeholder="Search Subjects..." 
                        aria-label="Search Subjects"
                        style="margin: 0; padding: 0.4em 0.7em; font-size: 0.85rem;"
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

        // Auto-fill and apply filter if arriving with a search param
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
                card.style.display = "";
                visibleCount++;
            } else {
                card.classList.add("hidden");
                card.style.display = "none";
            }
        });

        let emptyStateCard = document.getElementById("search-empty-state-card");

        if (visibleCount === 0 && searchTerm !== "") {
            if (!emptyStateCard) {
                emptyStateCard = document.createElement("div");
                emptyStateCard.id = "search-empty-state-card";
                emptyStateCard.className = "quiz-card empty-state-card";
                emptyStateCard.style.cssText = `
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 2.5em 1.5em;
                    background: var(--card-background, #1e222d);
                    border: 2px dashed var(--border-color, #3a3f50);
                    border-radius: 10px;
                    margin: 1em 0;
                `;

                emptyStateCard.innerHTML = `
                    <div style="font-size: 2.5rem; margin-bottom: 0.3em;">🛸</div>
                    <h3 style="margin-bottom: 0.4em; font-size: 1.2rem;">No Subjects or Quizzes Found</h3>
                    <p style="color: var(--light-text-color, #8b949e); font-size: 0.9rem; margin-bottom: 1.2em;">
                        No evaluations match "<strong>${searchTerm}</strong>". Want to generate a custom practice session instead?
                    </p>
                    <a href="hub.html" class="btn-tactical btn-gold" style="display: inline-block; text-decoration: none; padding: 0.6em 1.2em; font-size: 0.9rem;">
                        Configure Custom subject
                    </a>
                `;

                gridContainer.appendChild(emptyStateCard);
            } else {
                emptyStateCard.style.display = "";
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

        controls.innerHTML = `
            <span class="badge badge-gold" style="font-size: 0.8rem; font-weight: bold; margin-right: 4px;">
                ⭐ ${points} pts
            </span>
            <div class="user-menu-wrapper">
                <button id="user-avatar-btn" class="user-avatar-btn" type="button" title="${callsign}">
                    ${initial}
                </button>
                <div id="user-dropdown" class="user-dropdown">
                    <div class="user-dropdown-header">${callsign}</div>
                    <a href="profile.html" class="user-dropdown-item">
                        View Profile & Badges
                    </a>
                    <button id="btn-edit-callsign" class="user-dropdown-item" type="button">
                        Edit Callsign
                    </button>
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
        }

        if (editBtn) {
            editBtn.onclick = () => {
                import('../services/auth-service.js').then(m => m.editUserCallsign());
            };
        }

        if (signoutBtn) {
            signoutBtn.onclick = () => {
                import('../services/auth-service.js').then(m => m.handleSignOut());
            };
        }
    }
}

customElements.define("site-header", SiteHeader);
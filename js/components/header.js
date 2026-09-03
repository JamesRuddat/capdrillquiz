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

                <div id="user-controls" class="nav-controls">
                    <!-- Dynamic auth state renders here -->
                </div>
            </nav>
        `;

        this.bindMobileNav();
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

            // Close drawer when clicking outside
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
            <button id="google-auth-btn" class="btn-tactical btn-gold btn-sm" type="button">
                Sign In with Google
            </button>
        `;

        const btn = controls.querySelector("#google-auth-btn");
        if (btn) {
            btn.onclick = () => {
                import('../services/auth-service.js').then(m => m.handleGoogleAuth());
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
                import('../services/auth-service.js').then(m => m.handleGoogleAuth());
            };
        }
    }
}

customElements.define("site-header", SiteHeader);
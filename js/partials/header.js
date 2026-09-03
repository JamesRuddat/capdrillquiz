import { toggleTheme } from '../components/navigation.js';
import { handleGoogleAuth } from '../services/auth-service.js';

export class SiteHeader extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <header>
                <div id="navbar">
                    <!-- HAMBURGER BUTTON (MOBILE ONLY) -->
                    <button id="hamburger-btn" aria-label="Toggle Navigation Menu">
                        <span class="hamburger-bar"></span>
                        <span class="hamburger-bar"></span>
                        <span class="hamburger-bar"></span>
                    </button>

                    <!-- NAVIGATION LINKS CONTAINER -->
                    <div id="nav-drawer" class="nav-links">
                        <a href="index.html" id="nav-home">Home</a>
                        <a href="setup.html" id="nav-setup">Start Quiz</a>
                        <a href="leaderboard.html" id="nav-leaderboard">Leaderboard</a>
                        <a href="hub.html" id="nav-hub">Quiz Hub</a>
                    </div>

                    <!-- CONTROL BUTTONS & USER AVATAR -->
                    <div class="nav-controls">
                        <!-- SIGN IN BUTTON (VISIBLE WHEN LOGGED OUT) -->
                        <button id="google-auth-btn" class="btn-tactical btn-sm btn-outline">Sign in</button>

                        <!-- USER AVATAR & DROPDOWN (VISIBLE WHEN LOGGED IN) -->
                        <div id="user-menu-wrapper" class="user-menu-wrapper hidden">
                            <button id="user-avatar-btn" class="user-avatar-btn" aria-label="User Profile">--</button>
                            
                            <div id="user-dropdown" class="user-dropdown">
                                <div id="user-dropdown-name" class="user-dropdown-header">User Profile</div>
                                <button id="menu-theme-toggle" class="user-dropdown-item">
                                    <span>Theme</span>
                                    <span id="theme-status-label">Light</span>
                                </button>
                                <div class="user-dropdown-divider"></div>
                                <button id="menu-signout-btn" class="user-dropdown-item" style="color: var(--alt-color);">
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <h1>Prop - Study Guide</h1>
                <br>
            </header>
        `;

        this.initHeaderEvents();
    }

    initHeaderEvents() {
        // 1. Highlight Active Nav Link
        const currentPath = window.location.pathname.split("/").pop() || "index.html";
        this.querySelectorAll(".nav-links a").forEach(link => {
            if (link.getAttribute("href") === currentPath) {
                link.classList.add("active-nav");
            }
        });

        // 2. Hamburger Mobile Menu Toggle
        const hamburgerBtn = this.querySelector("#hamburger-btn");
        const navDrawer = this.querySelector("#nav-drawer");
        if (hamburgerBtn && navDrawer) {
            hamburgerBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const isOpen = navDrawer.classList.toggle("is-open");
                hamburgerBtn.classList.toggle("is-active", isOpen);
            });
        }

        // 3. Avatar Menu Dropdown Toggle
        const avatarBtn = this.querySelector("#user-avatar-btn");
        const dropdown = this.querySelector("#user-dropdown");
        if (avatarBtn && dropdown) {
            avatarBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                dropdown.classList.toggle("is-open");
            });
        }

        // 4. Sign In & Sign Out Handlers
        const signinBtn = this.querySelector("#google-auth-btn");
        const signoutBtn = this.querySelector("#menu-signout-btn");

        if (signinBtn) signinBtn.addEventListener("click", handleGoogleAuth);
        if (signoutBtn) signoutBtn.addEventListener("click", handleGoogleAuth);

        // 5. Theme Toggle Handler & Status Sync
        const themeBtn = this.querySelector("#menu-theme-toggle");
        if (themeBtn) {
            themeBtn.addEventListener("click", () => {
                toggleTheme();
                this.updateThemeLabel();
            });
        }
        this.updateThemeLabel();

        // 6. Dismiss Menus on Outside Click
        document.addEventListener("click", (e) => {
            if (dropdown && !dropdown.contains(e.target) && !avatarBtn.contains(e.target)) {
                dropdown.classList.remove("is-open");
            }
            if (navDrawer && !navDrawer.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                navDrawer.classList.remove("is-open");
                hamburgerBtn.classList.remove("is-active");
            }
        });
    }

    updateThemeLabel() {
        const themeLabel = this.querySelector("#theme-status-label");
        const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
        if (themeLabel) {
            themeLabel.innerText = currentTheme === "dark" ? "Dark" : "Light";
        }
    }
}

customElements.define('site-header', SiteHeader);
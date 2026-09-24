import { showModal } from '/js/services/modal-service.js'; // Adjust path if needed

export class SiteFooter extends HTMLElement {
    connectedCallback() {
        const currentYear = new Date().getFullYear();

        this.innerHTML = `
            <footer class="site-footer">
                <div class="footer-content">
                    
                    <!-- Left: Build Version -->
                    <div class="text-left">
                        <p class="margin-none text-sm">
                            <strong>Build:</strong> <code>v4.1.4 (Shadowfox)</code>
                        </p>
                    </div>

                    <!-- Center: Copyright, Disclaimers & Legal Modals -->
                    <div class="footer-center-ref">
                        <div class="footer-copyright">
                            <p><strong>Site:</strong> &copy; ${currentYear} capdrillquiz. All platform rights reserved.</p>
                        </div>

                        <p class="subtext text-sm margin-none">
                            Reference for educational purposes only. Always consult official guidance.
                        </p>

                        <!-- Legal Modal Trigger Links -->
                        <div class="flex-row-center gap-sm text-sm" style="margin-top: 0.5em;">
                            <button type="button" id="footer-btn-terms" class="text-link btn-link" style="background:none; border:none; padding:0; cursor:pointer;">
                                Terms of Use
                            </button>
                            <span class="subtext">•</span>
                            <button type="button" id="footer-btn-privacy" class="text-link btn-link" style="background:none; border:none; padding:0; cursor:pointer;">
                                Privacy Policy
                            </button>
                            <span class="subtext">•</span>
                            <button type="button" id="footer-btn-disclaimer" class="text-link btn-link" style="background:none; border:none; padding:0; cursor:pointer;">
                                Disclaimer
                            </button>
                        </div>
                    </div>

                    <!-- Right: Developer Credit -->
                    <div class="text-right">
                        <p class="footer-dev-title margin-none">
                            Developed by <span class="footer-accent-text"><a href="https://github.com/JamesRuddat/capdrillquiz/commits/main/" 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               class="text-link font-bold">Mr. Ruddat</a></span>
                        </p>
                        <p class="footer-subtext subtext">
                            Full-Stack Developer &amp; Domain SME
                        </p>
                    </div>

                </div>
            </footer>
        `;

        this.bindModalEvents();
    }

    bindModalEvents() {
        // 1. Terms of Use Modal
        const termsBtn = this.querySelector("#footer-btn-terms");
        if (termsBtn) {
            termsBtn.onclick = () => {
                const content = document.createElement("div");
                content.className = "flex-col gap-sm text-left text-sm";
                content.innerHTML = `
                    <span><strong>1. Ownership:</strong> You retain all ownership rights and copyright to any original quiz questions, options, explanations, comments, or other text ("User Content") you submit or post to our website.</span>
                    <span><strong>2. License to Us:</strong> By submitting User Content, you grant capdrillquiz a worldwide, non-exclusive, royalty-free, perpetual, and transferable license to host, store, display, reproduce, modify, format, and distribute your content across our platform and associated services.</span>
                    <span><strong>3. Content Representations &amp; Warranties:</strong> You represent and warrant that your content is your original creation, does not infringe on third-party intellectual property, and complies with applicable laws.</span>
                    <span><strong>4. Moderation &amp; Responsibility:</strong> We reserve the right to review, edit, or remove User Content. You are solely responsible for content you post.</span>
                    <span><strong>5. Governing Law:</strong> These terms are governed by the laws of the State of Wisconsin.</span>
                `;
                showModal(content, "User-Generated Content & Ownership Terms");
            };
        }

        // 2. Privacy Policy Modal
        const privacyBtn = this.querySelector("#footer-btn-privacy");
        if (privacyBtn) {
            privacyBtn.onclick = () => {
                const content = document.createElement("div");
                content.className = "flex-col gap-sm text-left text-sm";
                content.innerHTML = `
                    <span>This study site does not require an account and does not intentionally request or transmit your name, email address, CAPID, or quiz answers to a site database.</span>
                    <span>Your quiz progress and selected answers may be stored locally in your web browser using <code>localStorage</code> so you can resume a test. You can remove that information by using "Restart Test" or clearing this site's browser storage.</span>
                    <span>The website may be hosted by a third-party hosting provider such as Netlify, which may process standard technical information such as IP addresses and request logs under its own policies. External links, including Civil Air Patrol donation pages, are governed by the privacy practices of those external sites.</span>
                    <span>No advertising trackers or third-party analytics scripts are included in this package.</span>
                `;
                showModal(content, "Privacy Policy");
            };
        }

        // 3. Disclaimer Modal
        const disclaimerBtn = this.querySelector("#footer-btn-disclaimer");
        if (disclaimerBtn) {
            disclaimerBtn.onclick = () => {
                const content = document.createElement("div");
                content.className = "flex-col gap-sm text-left text-sm";
                content.innerHTML = `
                    <span>This website is an unofficial supplemental study aid and is not an official publication, product, endorsement, or examination of Civil Air Patrol, the United States Air Force, or the United States Government.</span>
                    <span>The practice questions are provided for education and review. They do not reproduce, predict, or guarantee questions on any official CAP examination, and successful performance on these practice tests does not guarantee a passing score on an official assessment.</span>
                    <span>Cadets should use the current official Civil Air Patrol curriculum, regulations, and testing guidance as the authoritative sources. If this site conflicts with current official CAP material, the official material controls.</span>
                `;
                showModal(content, "Official Disclaimer");
            };
        }
    }
}

if (!customElements.get('site-footer')) {
    customElements.define('site-footer', SiteFooter);
}
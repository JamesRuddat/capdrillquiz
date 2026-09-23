export class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <footer class="site-footer">
                <div class="footer-content">
                    
                    <!-- Left: Version & Repository Status -->
                    <div class="text-left">
                        <p class="margin-none">
                            <strong>Build:</strong> <code>v4.0.3 (Shadowfox)</code>
                        </p>
                    </div>

                    <!-- Middle: Reference Disclaimer Text -->
                    <div class="footer-center-ref">
                        <div class="footer-copyright">
                            <p><strong>Site:</strong> &copy; 2026 capdrillquiz. All platform rights reserved.</p>
                        </div>

                        Reference for educational purposes only. Always consult official guidance.

                        <details class="footer-terms-accordion">
                            <summary class="footer-terms-summary">User-Generated Content &amp; Ownership Terms</summary>
                            <div class="footer-terms-body">
                                <p><strong>1. Ownership:</strong> You retain all ownership rights and copyright to any original quiz questions, options, explanations, comments, or other text ("User Content") you submit or post to our website.</p>
                                <p><strong>2. License to Us:</strong> By submitting User Content, you grant capdrillquiz a worldwide, non-exclusive, royalty-free, perpetual, and transferable license to host, store, display, reproduce, modify, format, and distribute your content across our platform and associated services.</p>
                                <p><strong>3. Content Representations &amp; Warranties:</strong> You represent and warrant that:</p>
                                <ul>
                                    <li>Your User Content is your own original creation or that you have acquired all necessary permissions, licenses, and rights to submit it.</li>
                                    <li>Your User Content does not infringe upon the intellectual property, privacy, or proprietary rights of any third party.</li>
                                    <li>Your User Content complies with all applicable laws and does not contain unlawful, defamatory, or abusive material.</li>
                                </ul>
                                <p><strong>4. Monitoring &amp; Moderation:</strong> We reserve the right, but have no obligation, to review, edit, reject, or remove any User Content at our sole discretion for any reason, including content that violates these Terms or our community guidelines.</p>
                                <p><strong>5. Responsibility:</strong> You are solely responsible for the content you post. capdrillquiz assumes no liability for any User Content posted by you or any third party.</p>
                                <p><strong>6. Governing Law:</strong> These terms are governed by the laws of the State of Wisconsin.</p>
                            </div>
                        </details>
                    </div>
                    <!-- Right: Developer Credit & Expertise -->
                    <div class="text-right">
                        <p class="footer-dev-title">
                            Developed by <span class="footer-accent-text"><a href="https://github.com/JamesRuddat/capdrillquiz/commits/main/" 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               class="text-link font-bold">Mr. Ruddat</a></span>
                        </p>
                        <p class="footer-subtext">
                            Full-Stack Developer &amp; Domain SME
                        </p>
                    </div>

                </div>

                <!-- Legal & User-Generated Content Section -->
                <div class="footer-legal-container">
                    <p class="footer-third-party">
                </div>
            </footer>
        `;
    }
}

if (!customElements.get('site-footer')) {
    customElements.define('site-footer', SiteFooter);
}

/*
<!-- (Optional Placeholder) -->
<div class="ad-container">
    <ins class="adsbygoogle"
         data-ad-client="ca-pub-1864969470317711"
         data-ad-slot="1234567890"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>
        (adsbygoogle = window.adsbygoogle || []).push({});
    </script>
</div>
*/
export class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <footer class="site-footer">
                <div class="footer-content">
                    
                    <!-- Left: Version & Repository Status -->
                    <div class="text-left">
                        <p class="margin-none">
                            <strong>Build:</strong> <code>v4.0.1 (Shadowfox)</code>
                        </p>
                        <p class="footer-subtext">
                            <a href="https://github.com/JamesRuddat/capdrillquiz/commits/main/" 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               class="text-link font-bold">
                            GitHub
                            </a>
                        </p>
                    </div>

                    <!-- Middle: Reference Disclaimer Text -->
                    <div class="footer-center-ref">
                        Reference for educational purposes only. Always consult official guidance.
                    </div>

                    <!-- Right: Developer Credit & Expertise -->
                    <div class="text-right">
                        <p class="footer-dev-title">
                            Architected &amp; Developed by <span class="footer-accent-text">Mr. Ruddat</span>
                        </p>
                        <p class="footer-subtext">
                            Full-Stack Developer &amp; Domain SME
                        </p>
                    </div>

                </div>
            </footer>
        `;
    }
}

if (!customElements.get('site-footer')) {
    customElements.define('site-footer', SiteFooter);
}

/*
<!-- Clean AdSense Container (Optional Placeholder) -->
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
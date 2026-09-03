export class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <footer>
                <p>Made by Mr. Ruddat - v3.7.1 (Foxcore)</p>
                <div class="ad-container" style="margin: 1.5em 0; text-align: center; min-height: 90px; background: rgba(0,0,0,0.02); border: 1px dashed var(--border-color);">
                    <ins class="adsbygoogle"
                         style="display:block"
                         data-ad-client="ca-pub-1864969470317711"
                         data-ad-slot="1234567890"
                         data-ad-format="auto"
                         data-full-width-responsive="true"></ins>
                    <script>
                        (adsbygoogle = window.adsbygoogle || []).push({});
                    </script>
                </div>
            </footer>
        `;
    }
}

customElements.define('site-footer', SiteFooter);
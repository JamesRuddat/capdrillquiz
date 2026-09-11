class CustomModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div id="custom-modal-overlay" class="modal-overlay hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999;">
                <div class="quiz-card" style="max-width: 420px; width: 90%; padding: 1.5em; background: var(--card-bg, #fff); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
                    <h3 id="modal-title" style="margin-top: 0; margin-bottom: 0.5em; font-size: 1.2rem;">Notice</h3>
                    <p id="modal-message" style="font-size: 0.9rem; color: var(--text-color, #333); margin-bottom: 1em; line-height: 1.4;"></p>

                    <div id="modal-input-group" class="hidden" style="margin-bottom: 1em;">
                        <div style="display: flex; gap: 0.5em;">
                            <input type="text" id="modal-input" style="flex: 1; padding: 0.5em; border: 1px solid var(--border-color, #ccc); border-radius: 4px;">
                            <button type="button" id="modal-btn-random" class="btn-tactical btn-gold btn-sm">🎲 Random</button>
                        </div>
                        <div id="modal-error-msg" class="hidden" style="color: #f85149; font-size: 0.8rem; margin-top: 0.4em; font-weight: bold;"></div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 0.5em; margin-top: 1em;">
                        <button id="modal-btn-cancel" class="btn-tactical btn-clear hidden" type="button">Cancel</button>
                        <button id="modal-btn-confirm" class="btn-tactical btn-gold" type="button">Confirm</button>
                    </div>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('custom-modal')) {
    customElements.define('custom-modal', CustomModal);
}
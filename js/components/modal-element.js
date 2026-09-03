export class CustomModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div id="custom-modal-overlay" class="modal-overlay hidden">
                <div class="modal-card">
                    <div class="modal-header">
                        <span class="modal-badge">[SECURITY PROTOCOL]</span>
                        <h2 id="modal-title">Notice</h2>
                    </div>
                    <div class="modal-body">
                        <p id="modal-message"></p>
                        
                        <div id="modal-input-group" class="hidden" style="margin-top: 1em;">
                            <div style="display: flex; gap: 0.5em; align-items: center;">
                                <input type="text" id="modal-input" class="width-full" placeholder="e.g. Patrol-42" maxlength="20" autocomplete="off" />
                                <button id="modal-btn-random" type="button" class="btn-tactical btn-gold btn-sm" style="white-space: nowrap;">
                                    🎲
                                </button>
                            </div>
                            <div id="modal-error-msg" class="modal-error hidden"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="modal-btn-cancel" class="btn-tactical btn-red btn-sm" type="button">Cancel</button>
                        <button id="modal-btn-confirm" class="btn-tactical btn-blue btn-sm" type="button">OK</button>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('custom-modal', CustomModal);
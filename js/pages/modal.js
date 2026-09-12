/**
 * Custom Promise-based Alert / Content Popup
 */
export function showModal(message, title = "Notice") {
    return new Promise((resolve) => {
        const overlay = document.getElementById("custom-modal-overlay");
        const titleEl = document.getElementById("modal-title");
        const messageEl = document.getElementById("modal-message");
        const confirmBtn = document.getElementById("modal-btn-confirm");
        const cancelBtn = document.getElementById("modal-btn-cancel");
        const inputGroup = document.getElementById("modal-input-group");

        if (!overlay) return resolve();

        titleEl.innerText = title;
        
        // Support both string HTML and appended DOM Nodes
        if (typeof message === 'string') {
            messageEl.innerHTML = message;
        } else if (message instanceof HTMLElement) {
            messageEl.innerHTML = "";
            messageEl.appendChild(message);
        } else {
            messageEl.innerText = String(message);
        }

        if (cancelBtn) cancelBtn.classList.add("hidden");
        if (inputGroup) inputGroup.classList.add("hidden");
        if (confirmBtn) confirmBtn.innerText = "OK";

        overlay.classList.remove("hidden");

        const cleanup = () => {
            overlay.classList.add("hidden");
            confirmBtn.removeEventListener("click", onConfirm);
            resolve();
        };

        const onConfirm = () => cleanup();
        confirmBtn.addEventListener("click", onConfirm);
    });
}

/**
 * Custom Promise-based Confirm Dialog
 */
export function showConfirm(message, title = "Confirm Action") {
    return new Promise((resolve) => {
        const overlay = document.getElementById("custom-modal-overlay");
        const titleEl = document.getElementById("modal-title");
        const messageEl = document.getElementById("modal-message");
        const confirmBtn = document.getElementById("modal-btn-confirm");
        const cancelBtn = document.getElementById("modal-btn-cancel");
        const inputGroup = document.getElementById("modal-input-group");

        if (!overlay) return resolve(false);

        titleEl.innerText = title;
        
        if (typeof message === 'string') {
            messageEl.innerHTML = message;
        } else if (message instanceof HTMLElement) {
            messageEl.innerHTML = "";
            messageEl.appendChild(message);
        } else {
            messageEl.innerText = String(message);
        }

        if (confirmBtn) confirmBtn.innerText = "Confirm";
        if (cancelBtn) cancelBtn.classList.remove("hidden");
        if (inputGroup) inputGroup.classList.add("hidden");

        overlay.classList.remove("hidden");

        const cleanup = (result) => {
            overlay.classList.add("hidden");
            confirmBtn.removeEventListener("click", onConfirm);
            cancelBtn.removeEventListener("click", onCancel);
            resolve(result);
        };

        const onConfirm = () => cleanup(true);
        const onCancel = () => cleanup(false);

        confirmBtn.addEventListener("click", onConfirm);
        cancelBtn.addEventListener("click", onCancel);
    });
}

/**
 * Custom Promise-based Prompt Dialog with PII Validation & Callsign Randomizer
 */
export function showPrompt(message, defaultValue = "", title = "Enter Callsign") {
    return new Promise((resolve) => {
        const overlay = document.getElementById("custom-modal-overlay");
        const titleEl = document.getElementById("modal-title");
        const messageEl = document.getElementById("modal-message");
        const confirmBtn = document.getElementById("modal-btn-confirm");
        const cancelBtn = document.getElementById("modal-btn-cancel");
        
        const inputGroup = document.getElementById("modal-input-group");
        const inputEl = document.getElementById("modal-input");
        const randomBtn = document.getElementById("modal-btn-random");
        const errorEl = document.getElementById("modal-error-msg");

        if (!overlay) return resolve(null);

        titleEl.innerText = title;
        
        if (typeof message === 'string') {
            messageEl.innerHTML = message;
        } else if (message instanceof HTMLElement) {
            messageEl.innerHTML = "";
            messageEl.appendChild(message);
        } else {
            messageEl.innerText = String(message);
        }

        if (confirmBtn) confirmBtn.innerText = "Confirm";
        if (cancelBtn) cancelBtn.classList.remove("hidden");
        
        if (inputGroup) inputGroup.classList.remove("hidden");
        if (inputEl) {
            inputEl.value = defaultValue;
            setTimeout(() => inputEl.focus(), 100);
        }
        if (errorEl) {
            errorEl.innerText = "";
            errorEl.classList.add("hidden");
        }

        overlay.classList.remove("hidden");

        const validate = (val) => {
            const trimmed = val.trim();
            if (trimmed.length < 3) return "Callsign must be at least 3 characters.";
            if (trimmed.includes("@") || trimmed.includes(".com")) return "PII Warning: Email formats blocked.";
            if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(trimmed)) return "PII Warning: Real full names are blocked. Use a tactical handle.";
            return null;
        };

        const onRandomize = () => {
            const CALLSIGNS = ["Patrol", "Patroller", "Falcon", "Viper", "Stratus", "Maverick", "Skyhawk", "Apex", "Eagle", "Ghost", "Stealth", "Vector"];
            const call = CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)];
            const num = Math.floor(10 + Math.random() * 89);
            if (inputEl) inputEl.value = `${call}-${num}`;
            if (errorEl) errorEl.classList.add("hidden");
        };

        const cleanup = (result) => {
            overlay.classList.add("hidden");
            confirmBtn.removeEventListener("click", onConfirm);
            cancelBtn.removeEventListener("click", onCancel);
            if (randomBtn) randomBtn.removeEventListener("click", onRandomize);
            if (inputEl) inputEl.removeEventListener("keydown", onKeyDown);
            resolve(result);
        };

        const onConfirm = () => {
            const val = inputEl ? inputEl.value : "";
            const err = validate(val);

            if (err) {
                if (errorEl) {
                    errorEl.innerText = err;
                    errorEl.classList.remove("hidden");
                }
                return;
            }

            cleanup(val.trim());
        };

        const onCancel = () => cleanup(null);

        const onKeyDown = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                onConfirm();
            } else if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
            }
        };

        confirmBtn.addEventListener("click", onConfirm);
        cancelBtn.addEventListener("click", onCancel);
        if (randomBtn) randomBtn.addEventListener("click", onRandomize);
        if (inputEl) inputEl.addEventListener("keydown", onKeyDown);
    });
}
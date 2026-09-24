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

/**
 * Direction Finding (DF) Homing & Single-Steer Target Localizer Modal
 * Replaces legacy window.open('DFsearch.html') calls.
 */
export function showDFHelpModal() {
    let currentMode = 2; // Default to Signal Strength

    const dfContent = document.createElement("div");
    dfContent.className = "flex-col gap-sm width-full";

    dfContent.innerHTML = `
        <!-- DF-88 Receiver Instrument Display -->
        <div class="card margin-none" style="border-left: 4px solid var(--primary-color); padding: 1em;">
            <div class="flex-row-between" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.5em; margin-bottom: 0.8em;">
                <span class="font-bold text-sm">DF-88 SIGNAL RECEIVER</span>
            </div>

            <!-- Canvas Meter Needle -->
            <div class="flex-center" style="margin-bottom: 0.8em;">
                <canvas id="DFmeter"
                    style="border: 2px solid var(--border-color); border-radius: 6px; background-color: var(--input-bg);"
                    height="40" width="200"></canvas>
            </div>

            <!-- Receiver Mode Radios -->
            <div class="flex-row-between text-sm">
                <label class="font-bold subtext">Receiver Mode:</label>
                <div>
                    <label><input name="MeterMode" id="Dbut" type="radio" value="1"> DF Homing</label>
                    &nbsp;
                    <label><input name="MeterMode" id="Sbut" type="radio" value="2" checked> Signal</label>
                </div>
            </div>
        </div>

        <!-- Instructional Guidance -->
        <div class="col margin-none" style="padding: 0.8em; margin-top: 0.8em;">
            <p class="text-dim text-sm margin-none" style="line-height: 1.5;">
                Rotate the heading line until signal strength peaks, then stretch the single-steer vector forward to locate the target.
            </p>
        </div>
    `;

    // Open via your custom promise modal wrapper
    const modalPromise = showModal(dfContent, "DF Search Instructions");

    // Initialize Canvas & Radio Controls
    setTimeout(() => {
        const canvas = dfContent.querySelector("#DFmeter");
        const rDbut = dfContent.querySelector("#Dbut");
        const rSbut = dfContent.querySelector("#Sbut");

        const renderMeter = (val) => {
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = "#0d1117";
            ctx.fillRect(0, 0, w, h);

            if (currentMode === 1) {
                // DF Homing Needle (Center Line)
                ctx.strokeStyle = "#daae00";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(w / 2, 4); ctx.lineTo(w / 2, h - 4);
                ctx.stroke();

                ctx.fillStyle = "#8a8b8b";
                ctx.font = "bold 10px monospace";
                ctx.fillText("L", 12, h / 2 + 3);
                ctx.fillText("R", w - 18, h / 2 + 3);

                // Slight needle offset sample
                const needleX = w / 2 + (val * (w / 2 - 25));
                ctx.strokeStyle = "#f85149";
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(needleX, h - 4); ctx.lineTo(needleX, 6);
                ctx.stroke();
            } else {
                // Signal Strength Meter
                ctx.strokeStyle = "#1e4bb8";
                ctx.lineWidth = 1;
                for (let i = 20; i <= w - 20; i += (w - 40) / 5) {
                    ctx.beginPath();
                    ctx.moveTo(i, h - 6); ctx.lineTo(i, h - 14);
                    ctx.stroke();
                }

                ctx.fillStyle = "#8a8b8b";
                ctx.font = "bold 10px monospace";
                ctx.fillText("SIG", 8, 14);
                ctx.fillText("85%", w - 32, 14);

                const needleX = 20 + (0.85 * (w - 40));
                ctx.strokeStyle = "#daae00";
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(20, h - 6); ctx.lineTo(needleX, 8);
                ctx.stroke();
            }
        };

        if (rDbut) {
            rDbut.onchange = () => {
                currentMode = 1;
                renderMeter(-0.2); // Center-left deflection
            };
        }
        if (rSbut) {
            rSbut.onchange = () => {
                currentMode = 2;
                renderMeter(0.85); // 85% signal strength
            };
        }

        renderMeter(0.85);
    }, 50);

    return modalPromise;
}

// Global Help Override
window.HelpPage = showDFHelpModal;
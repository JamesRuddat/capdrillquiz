/**
 * Custom Promise-based Alert Popup
 * @param {string} message - Text or message to display
 * @param {string} title - Modal heading title
 * @returns {Promise<void>}
 */
export function showModal(message, title = "Notice") {
    return new Promise((resolve) => {
        const overlay = document.getElementById("custom-modal-overlay");
        const titleEl = document.getElementById("modal-title");
        const messageEl = document.getElementById("modal-message");
        const confirmBtn = document.getElementById("modal-btn-confirm");
        const cancelBtn = document.getElementById("modal-btn-cancel");

        titleEl.innerText = title;
        messageEl.innerText = message;
        cancelBtn.classList.add("hidden");
        confirmBtn.innerText = "OK";

        overlay.classList.remove("hidden");

        const handleConfirm = () => {
            overlay.classList.add("hidden");
            confirmBtn.removeEventListener("click", handleConfirm);
            resolve();
        };

        confirmBtn.addEventListener("click", handleConfirm);
    });
}

/**
 * Custom Promise-based Confirm Dialog (Replaces confirm())
 * @param {string} message - Confirmation message
 * @param {string} title - Heading title
 * @returns {Promise<boolean>} Resolves true if confirmed, false if canceled
 */
export function showConfirm(message, title = "Confirm Action") {
    return new Promise((resolve) => {
        const overlay = document.getElementById("custom-modal-overlay");
        const titleEl = document.getElementById("modal-title");
        const messageEl = document.getElementById("modal-message");
        const confirmBtn = document.getElementById("modal-btn-confirm");
        const cancelBtn = document.getElementById("modal-btn-cancel");

        titleEl.innerText = title;
        messageEl.innerText = message;
        confirmBtn.innerText = "Confirm";
        cancelBtn.classList.remove("hidden");

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
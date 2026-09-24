import { state } from '../state.js';

// Static Interactive Tools / Simulators with direct publication links
const STATIC_INTERACTIVE_TOOLS = [
    {
        id: "DRILL_SIM",
        branchName: "Drill & Ceremonies Simulator",
        category: "Simulator",
        publication: "Simulator",
        pdfUrl: "",
        description: "Master flight formations, Open Ranks staggers, position symbol identification, and dynamic grid building.",
        type: "simulator",
        url: "/pages/drill.html",
        badge: "Simulator",
        imageUrl: "/assets/images/CAP/Drill.PNG"
    },
    {
        id: "ELT_DF_SIM",
        branchName: "ELT Direction Finding Simulator",
        category: "Simulator",
        publication: "Simulator",
        pdfUrl: "",
        description: "Practice emergency locator transmitter (ELT) search missions with DF-88 needle tracking, audio signal strength, and VOR/DME navigation.",
        type: "simulator",
        url: "/pages/df-search.html",
        badge: "Simulator",
        imageUrl: "/assets/images/CAP/Airplane.jpg"
    }
];

/**
 * Utility: Sanitizes input string against XSS
 */
export function sanitizeInput(str = "") {
    if (typeof str !== "string") return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Populates subject dropdown selects on setup and quiz views
 */
export function populateBranchDropdowns() {
    const selects = [
        document.getElementById("quiz-select"),
        document.getElementById("bank-inspect-select")
    ].filter(Boolean);

    if (selects.length === 0) return;

    const registry = state.QUESTION_REGISTRY || {};
    const keys = Object.keys(registry);

    let optionsHTML = `<option value="">-- Select a Subject --</option>`;

    // Add Firebase subjects
    keys.forEach(key => {
        const item = registry[key];
        const label = item?.branchName || key;
        optionsHTML += `<option value="${key}">${label}</option>`;
    });

    // Add static interactive tools to dropdown if not present
    STATIC_INTERACTIVE_TOOLS.forEach(tool => {
        if (!registry[tool.id]) {
            optionsHTML += `<option value="${tool.id}">${tool.branchName}</option>`;
        }
    });

    selects.forEach(select => {
        const currentVal = select.value;
        select.innerHTML = optionsHTML;
        if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
            select.value = currentVal;
        }
    });
}

/**
 * Renders subject list for hub/inspector views
 */
export function renderSubjectList() {
    const container = document.getElementById("subject-list-container");
    if (!container) return;

    const registry = state.QUESTION_REGISTRY || {};
    const keys = Object.keys(registry);

    if (keys.length === 0) {
        container.innerHTML = `<p class="subtext">No database subjects found.</p>`;
        return;
    }

    container.innerHTML = keys.map(key => {
        const item = registry[key];
        return `
            <div class="subject-item-row flex-row-between" data-key="${key}">
                <span><strong>${item.branchName || key}</strong> (${item.category || 'General'})</span>
                <span class="subtext">${item.publication || ''}</span>
            </div>
        `;
    }).join('');
}

/**
 * Renders practice subject cards on dashboard dashboard grid.
 * Features a top-right 3-dots menu (⋮) for editing actions.
 * Zero-question & zero-link subjects are automatically pushed to the bottom and grayed out.
 */
export function renderSubjectCards() {
    const container = document.getElementById("quiz-cards-grid");
    if (!container) return;

    const registry = state.QUESTION_REGISTRY || {};

    const dbSubjects = Object.keys(registry).map(key => ({
        id: key,
        ...registry[key]
    }));

    const combinedSubjects = [...STATIC_INTERACTIVE_TOOLS];
    dbSubjects.forEach(dbSub => {
        if (!combinedSubjects.some(item => item.id === dbSub.id)) {
            combinedSubjects.push(dbSub);
        }
    });

    if (combinedSubjects.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card text-center">
                <div class="empty-state-icon">🛰️</div>
                <h3 class="empty-state-title">No Practice Subjects Found</h3>
            </div>`;
        return;
    }

    // Sort: Active cards first; Zero-question & zero-link cards pushed to bottom
    combinedSubjects.sort((a, b) => {
        const rawQsA = a.questions || {};
        const countA = Array.isArray(rawQsA) ? rawQsA.length : Object.keys(rawQsA).length;
        const linksA = (a.links || []).length;
        const customUrlA = a.url || (a.id === "DRILL_SIM" ? "/pages/drill.html" : a.id === "ELT_DF_SIM" ? "/pages/df-search.html" : null);
        const hasContentA = countA > 0 || linksA > 0 || Boolean(customUrlA);

        const rawQsB = b.questions || {};
        const countB = Array.isArray(rawQsB) ? rawQsB.length : Object.keys(rawQsB).length;
        const linksB = (b.links || []).length;
        const customUrlB = b.url || (b.id === "DRILL_SIM" ? "/pages/drill.html" : b.id === "ELT_DF_SIM" ? "/pages/df-search.html" : null);
        const hasContentB = countB > 0 || linksB > 0 || Boolean(customUrlB);

        if (hasContentA && !hasContentB) return -1;
        if (!hasContentA && hasContentB) return 1;
        return 0;
    });

    container.innerHTML = combinedSubjects.map(subject => {
        const pubLabel = subject.publication || subject.badge || "CAP Regulation";
        const bgImage = subject.imageUrl || subject.bgImage;

        // Safely count questions
        const rawQs = subject.questions || {};
        const totalQs = Array.isArray(rawQs) ? rawQs.length : Object.keys(rawQs).length;
        const linkList = subject.links || [];

        const customUrl = subject.url || (subject.id === "DRILL_SIM" ? "/pages/drill.html" : subject.id === "ELT_DF_SIM" ? "/pages/df-search.html" : null);
        const isSimulator = subject.type === "interactive" || subject.type === "simulator" || Boolean(customUrl);

        const hasPlayableContent = totalQs > 0 || linkList.length > 0 || isSimulator;

        // Visual Dimming for 0-Question & 0-Link Subjects
        const cardDisabledClass = hasPlayableContent ? '' : 'quiz-card-disabled';
        const bgClass = bgImage ? 'quiz-card-custom-bg' : '';
        const bgStyleAttr = bgImage
            ? `style="background-image: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 100%), url('${bgImage}');"`
            : '';

        // Render Dynamic Publication Link Badge
        const mainPdfUrl = subject.pdfUrl || (linkList.find(l => l.type === 'pdf')?.url);
        const badgeHTML = mainPdfUrl
            ? `<a href="${mainPdfUrl}" target="_blank" rel="noopener noreferrer" class="quiz-card-badge badge-status badge-verified" title="Open Handbook">${pubLabel}</a>`
            : `<span class="quiz-card-badge badge-status badge-verified">${pubLabel}</span>`;

        // Render Dynamic Multi-Button Footer
        let buttonsHTML = '';

        if (linkList.length > 0) {
            buttonsHTML = linkList.map(link => {
                const isPrimary = link.type === 'simulator' || link.primary;
                const btnClass = isPrimary ? 'btn-gold' : 'btn-blue';
                return `
                    <a href="${link.url}" ${link.url.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="btn-tactical ${btnClass} flex-1">
                        ${link.label || 'Launch'}
                    </a>
                `;
            }).join('');
        } else if (isSimulator || totalQs > 0) {
            const btnClass = isSimulator ? "btn-gold" : "btn-blue";
            const btnText = isSimulator ? "Launch Simulator ➔" : "Start Evaluation ➔";
            const btnHref = isSimulator && customUrl ? customUrl : `setup.html?subject=${subject.id}`;

            buttonsHTML = `<a href="${btnHref}" class="btn-tactical ${btnClass} width-full">${btnText}</a>`;
        } else {
            // Disabled State Indicator for Zero-Content Cards
            buttonsHTML = `<span class="badge-status subtext width-full text-center" style="opacity: 0.7;">Overview / Reference Only</span>`;
        }

        // Top-right 3-dots menu button & dropdown
        const menuHTML = `
            <div class="card-menu-wrapper" style="position: relative;">
                <button type="button" class="card-menu-trigger" aria-label="Card Options" onclick="window.toggleCardMenu(event, '${subject.id}')">
                    &#8285;
                </button>
                <div id="card-menu-${subject.id}" class="card-menu-dropdown hidden">
                    <a href="hub.html?subject=${subject.id}&edit=true" class="card-menu-item">
                        Edit Subject
                    </a>
                </div>
            </div>
        `;

        return `
            <div class="quiz-card ${bgClass} ${cardDisabledClass}" ${bgStyleAttr}>
                <div class="quiz-card-header flex-row-between align-center">
                    ${badgeHTML}
                    ${menuHTML}
                </div>
                <h3 class="quiz-card-title margin-top-xs">${subject.branchName || subject.title || subject.id}</h3>
                <p class="quiz-card-meta">
                    ${subject.description || 'No description provided.'}
                </p>
                <div class="quiz-card-footer flex-wrap gap-sm">
                    ${buttonsHTML}
                </div>
            </div>
        `;
    }).join('');

    // Global listener to close dropdowns when clicking outside
    if (!window.cardMenuListenerAttached) {
        document.addEventListener("click", () => {
            document.querySelectorAll(".card-menu-dropdown").forEach(el => el.classList.add("hidden"));
        });
        window.cardMenuListenerAttached = true;
    }
}

/**
 * Toggles the 3-dots dropdown menu for a specific card
 */
window.toggleCardMenu = function (e, id) {
    e.stopPropagation();
    const targetMenu = document.getElementById(`card-menu-${id}`);
    const isClosed = targetMenu ? targetMenu.classList.contains("hidden") : false;

    // Close all open card menus first
    document.querySelectorAll(".card-menu-dropdown").forEach(el => el.classList.add("hidden"));

    if (targetMenu && isClosed) {
        targetMenu.classList.remove("hidden");
    }
};

/**
 * Updates question count slider limits on setup page based on selected subject.
 */
export function updateSliderLimits() {
    const quizSelect = document.getElementById("quiz-select");
    const slider = document.getElementById("quiz-question-count-slider");
    const sliderLabel = document.getElementById("quiz-question-count-label");
    const startBtn = document.getElementById("btn-start-evaluation");

    if (!quizSelect || !slider) return;

    const selectedKey = quizSelect.value;
    const subjectData = state.QUESTION_REGISTRY ? state.QUESTION_REGISTRY[selectedKey] : null;

    if (!subjectData || !subjectData.questions) {
        slider.min = "0";
        slider.max = "0";
        slider.value = "0";
        slider.disabled = true;
        if (sliderLabel) sliderLabel.innerText = "0 Questions Available (Max: 0)";
        if (startBtn) startBtn.disabled = true;
        return;
    }

    const rawQs = subjectData.questions;
    const totalQs = Array.isArray(rawQs) ? rawQs.length : Object.keys(rawQs).length;

    if (totalQs === 0) {
        slider.min = "0";
        slider.max = "0";
        slider.value = "0";
        slider.disabled = true;
        if (sliderLabel) sliderLabel.innerText = "0 Questions Available (Max: 0)";
        if (startBtn) startBtn.disabled = true;
        return;
    }

    slider.disabled = false;
    if (startBtn) startBtn.disabled = false;

    slider.min = "1";
    slider.max = String(totalQs);
    slider.value = String(totalQs);

    if (sliderLabel) {
        sliderLabel.innerText = `${totalQs} ${totalQs === 1 ? 'Question' : 'Questions'} (Max: ${totalQs})`;
    }
}
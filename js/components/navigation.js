import { state } from '../state.js';

// Static Interactive Tools / Simulators with direct publication links
const STATIC_INTERACTIVE_TOOLS = [
    {
        id: "DRILL_36_2203",
        branchName: "Drill & Ceremonies Simulator",
        category: "Simulator",
        publication: "Simulator",
        pdfUrl: "",
        description: "Master flight formations, Open Ranks staggers, position symbol identification, and dynamic grid building.",
        type: "simulator",
        url: "/pages/drill.html",
        badge: "Simulator",
        imageUrl: "/assets/images/banners/drill-banner.jpg"
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
        imageUrl: "/assets/images/banners/elt-banner.jpg"
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
 * Renders practice subject cards on home dashboard grid with dynamic link support
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

    container.innerHTML = combinedSubjects.map(subject => {
        const pubLabel = subject.publication || subject.badge || "CAP Regulation";
        const bgImage = subject.imageUrl || subject.bgImage;
        const bgClass = bgImage ? 'quiz-card-custom-bg' : '';
        const bgStyleAttr = bgImage
            ? `style="background-image: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 100%), url('${bgImage}');"`
            : '';

        // Safely count questions
        const rawQs = subject.questions || {};
        const totalQs = Array.isArray(rawQs) ? rawQs.length : Object.keys(rawQs).length;

        // Render Dynamic Publication Link Badge
        const mainPdfUrl = subject.pdfUrl || (subject.links && subject.links.find(l => l.type === 'pdf')?.url);
        const badgeHTML = mainPdfUrl
            ? `<a href="${mainPdfUrl}" target="_blank" rel="noopener noreferrer" class="quiz-card-badge badge-status badge-verified" title="Open Handbook">${pubLabel}</a>`
            : `<span class="quiz-card-badge badge-status badge-verified">${pubLabel}</span>`;

        // Render Dynamic Multi-Button Footer
        let buttonsHTML = '';
        const linkList = subject.links || [];

        if (linkList.length > 0) {
            // Render a button for each custom link added by user/admin
            buttonsHTML = linkList.map(link => {
                const isPrimary = link.type === 'simulator' || link.primary;
                const btnClass = isPrimary ? 'btn-gold' : 'btn-blue';
                return `
                    <a href="${link.url}" ${link.url.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="btn-tactical ${btnClass} flex-1">
                        ${link.label || 'Launch'}
                    </a>
                `;
            }).join('');
        } else {
            // Default Fallback: Only render button IF questions exist OR if it is an interactive simulator
            const customUrl = subject.url || (subject.id === "DRILL_36_2203" ? "/pages/drill.html" : subject.id === "ELT_DF_SIM" ? "/pages/df-search.html" : null);
            const isSimulator = subject.type === "interactive" || subject.type === "simulator" || Boolean(customUrl);
            
            if (isSimulator || totalQs > 0) {
                const btnClass = isSimulator ? "btn-gold" : "btn-blue";
                const btnText = isSimulator ? "Launch Simulator ➔" : "Start Evaluation ➔";
                const btnHref = isSimulator && customUrl ? customUrl : `setup.html?subject=${subject.id}`;

                buttonsHTML = `<a href="${btnHref}" class="btn-tactical ${btnClass} width-full">${btnText}</a>`;
            }
        }

        return `
            <div class="quiz-card ${bgClass}" ${bgStyleAttr}>
                <div class="quiz-card-header">
                    ${badgeHTML}
                    <h3 class="quiz-card-title">${subject.branchName || subject.title || subject.id}</h3>
                </div>
                <p class="quiz-card-meta">
                    ${subject.description || 'No description provided.'}
                </p>
                <div class="quiz-card-footer flex-wrap gap-sm">
                    ${buttonsHTML}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Updates question count slider limits on setup page based on selected subject.
 * Automatically maxes out the slider value to match total available questions.
 */
export function updateSliderLimits() {
    const quizSelect = document.getElementById("quiz-select");
    const slider = document.getElementById("quiz-question-count-slider");
    const sliderLabel = document.getElementById("quiz-question-count-label");

    if (!quizSelect || !slider) return;

    const selectedKey = quizSelect.value;
    const subjectData = state.QUESTION_REGISTRY ? state.QUESTION_REGISTRY[selectedKey] : null;

    if (!subjectData || !subjectData.questions) {
        slider.min = "1";
        slider.max = "10";
        slider.value = "10";
        if (sliderLabel) sliderLabel.innerText = "10 Questions (Max: 10)";
        return;
    }

    const rawQs = subjectData.questions;
    const totalQs = Array.isArray(rawQs) ? rawQs.length : Object.keys(rawQs).length;
    const maxVal = Math.max(1, totalQs);

    slider.min = "1";
    slider.max = String(maxVal);
    slider.value = String(maxVal); // Automatically set slider to maximum available questions

    if (sliderLabel) {
        sliderLabel.innerText = `${maxVal} ${maxVal === 1 ? 'Question' : 'Questions'} (Max: ${maxVal})`;
    }
}
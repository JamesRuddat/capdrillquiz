import { state } from '../state.js';
import { awardPoints, showToast } from '../services/user-service.js';
import { saveScoreToDB } from '../services/db-service.js';
import { checkAndAwardBadges } from '../services/badge-service.js';
import {
    SYMBOL_LEGEND,
    DRILL_COMMANDS,
    generateFlight,
    gradeFormation,
    iconPath
} from '../library/drill-formations.js';

const DRILL_BRANCH_KEY = "DRILL_36_2203";
const DRILL_BRANCH_NAME = "Drill & Ceremonies (DAFPAM 34-1203)";

const FORMATION_CONFIG = { elementCount: 3, perElement: 4, formationType: "line" };
const SEQUENCE = ["FALL_IN", "OPEN_RANKS", "CLOSE_RANKS"];

// ---------------------------------------------------------------------------
// Module State
// ---------------------------------------------------------------------------
let mode = null;               // "symbol" | "formation" | "custom"
let symbolQueue = [];
let symbolIdx = 0;
let symbolScore = 0;
const SYMBOL_QUESTION_COUNT = 8;

let sequenceIdx = 0;
let formationScore = { correct: 0, total: 0 };
let placedCells = [];          // { col, row, role }
let selectedRole = null;
let trayRemaining = {};        // role -> count left to place

// Drag & Touch Tracking
let activeTouchRole = null;
let touchDragAvatar = null;

export function initDrillPage() {
    const modeSelect = document.getElementById("drill-mode-select");
    if (modeSelect) {
        modeSelect.onchange = () => startMode(modeSelect.value);
    }

    const container = document.getElementById("drill-view-container");
    if (container && !container.dataset.bound) {
        container.dataset.bound = "true";
        container.addEventListener("click", handleContainerClick);
        setupDragAndDropEvents(container);
    }

    startMode(modeSelect ? modeSelect.value : "symbol");
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function startMode(nextMode) {
    mode = nextMode;
    if (mode === "symbol") {
        symbolQueue = shuffle(Object.keys(SYMBOL_LEGEND)).slice(0, SYMBOL_QUESTION_COUNT);
        symbolIdx = 0;
        symbolScore = 0;
        renderSymbolQuestion();
    } else if (mode === "custom") {
        renderCustomBuilder();
    } else {
        sequenceIdx = 0;
        formationScore = { correct: 0, total: 0 };
        renderFormationCommand();
    }
}

// ---------------------------------------------------------------------------
// SYMBOL ID MODE
// ---------------------------------------------------------------------------
function renderSymbolQuestion() {
    const container = document.getElementById("drill-view-container");
    if (!container) return;

    if (symbolIdx >= symbolQueue.length) {
        finishSymbolSession();
        return;
    }

    const roleKey = symbolQueue[symbolIdx];
    const correct = SYMBOL_LEGEND[roleKey] || { label: roleKey, desc: "" };

    const distractorKeys = shuffle(
        Object.keys(SYMBOL_LEGEND).filter(k => k !== roleKey)
    ).slice(0, 3);
    const options = shuffle([roleKey, ...distractorKeys]);

    container.innerHTML = `
        <div class="quiz-card drill-symbol-card">
            <div class="drill-progress-row">
                <span>Symbol ${symbolIdx + 1} of ${symbolQueue.length}</span>
                <span>Score: ${symbolScore}</span>
            </div>
            <div class="drill-symbol-stage">
                <img src="${iconPath(roleKey)}" alt="Drill symbol" class="drill-symbol-img">
            </div>
            <p class="drill-question-prompt">What position does this symbol represent?</p>
            <div id="drill-symbol-options" class="drill-options-stack">
                ${options.map(k => `
                    <button type="button" class="btn-tactical btn-daily-option width-full text-left"
                        data-drill-action="answer-symbol" data-role="${k}">
                        ${SYMBOL_LEGEND[k]?.label || k}
                    </button>
                `).join('')}
            </div>
            <div id="drill-symbol-feedback" class="daily-feedback-panel hidden"></div>
        </div>
    `;
}

function answerSymbol(chosenRole) {
    const roleKey = symbolQueue[symbolIdx];
    const correct = SYMBOL_LEGEND[roleKey] || { label: roleKey, desc: "" };
    const isCorrect = chosenRole === roleKey;

    const buttons = document.querySelectorAll('[data-drill-action="answer-symbol"]');
    buttons.forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.role === roleKey) btn.classList.add("btn-correct");
        else if (btn.dataset.role === chosenRole) btn.classList.add("btn-incorrect");
    });

    const feedback = document.getElementById("drill-symbol-feedback");
    if (feedback) {
        feedback.classList.remove("hidden");
        feedback.className = isCorrect ? "daily-feedback-panel daily-feedback-success" : "daily-feedback-panel daily-feedback-error";
        feedback.innerHTML = `<strong>${isCorrect ? 'Correct.' : 'Incorrect.'}</strong> ${correct.label} — ${correct.desc}`;
    }

    if (isCorrect) symbolScore++;

    setTimeout(() => {
        symbolIdx++;
        renderSymbolQuestion();
    }, 1400);
}

async function finishSymbolSession() {
    const container = document.getElementById("drill-view-container");
    const pct = Math.round((symbolScore / symbolQueue.length) * 100);
    const pointsEarned = symbolScore * 10;

    if (container) {
        container.innerHTML = `
            <div class="quiz-card text-center">
                <h3>Symbol ID Complete</h3>
                <p>${symbolScore} / ${symbolQueue.length} correct (${pct}%)</p>
                <button type="button" class="btn-tactical btn-gold" data-drill-action="restart-symbol">
                    Practice Again
                </button>
            </div>
        `;
    }

    if (pointsEarned > 0) {
        awardPoints(pointsEarned, "Drill Symbol Identification");
    }

    await recordDrillCompletion({
        score: `${symbolScore}/${symbolQueue.length}`,
        pct,
        pointsEarned
    });
}

// ---------------------------------------------------------------------------
// FORMATION BUILDER MODE (WITH GHOST HINTS)
// ---------------------------------------------------------------------------
function currentCommandDef() {
    return DRILL_COMMANDS[SEQUENCE[sequenceIdx]];
}

function buildTray(correctFlight) {
    const counts = {};
    correctFlight.positions.forEach(p => {
        counts[p.role] = (counts[p.role] || 0) + 1;
    });
    return counts;
}

function renderFormationCommand() {
    const container = document.getElementById("drill-view-container");
    if (!container) return;

    if (sequenceIdx >= SEQUENCE.length) {
        finishFormationSession();
        return;
    }

    const cmd = currentCommandDef();
    const correctFlight = cmd.buildFlight(FORMATION_CONFIG);

    placedCells = [];
    selectedRole = null;
    trayRemaining = buildTray(correctFlight);

    renderFormationDOM(cmd, correctFlight);
}

function renderFormationDOM(cmd, correctFlight) {
    const container = document.getElementById("drill-view-container");
    if (!container) return;

    const rowShift = correctFlight.rowShift || 4;
    const totalRows = correctFlight.gridRows;
    const totalCols = correctFlight.gridCols;

    // Create lookup map for ghost icons
    const targetMap = new Map();
    correctFlight.positions.forEach(p => {
        targetMap.set(`${p.col},${p.row}`, p.role);
    });

    let gridHTML = "";
    for (let r = 0; r < totalRows; r++) {
        for (let c = 0; c < totalCols; c++) {
            const actualRow = r - rowShift;
            const targetRole = targetMap.get(`${c},${actualRow}`);

            // Injects ghost icon overlay if this cell requires a target symbol
            const ghostHTML = targetRole
                ? `<img src="${iconPath(targetRole)}" class="drill-cell-ghost" alt="Hint Target">`
                : "";

            gridHTML += `
                <div class="drill-cell" data-drill-action="place" data-col="${c}" data-row="${actualRow}">
                    ${ghostHTML}
                </div>`;
        }
    }

    const trayHTML = Object.entries(trayRemaining).map(([role, count]) => {
        const itemDef = SYMBOL_LEGEND[role] || { label: role };
        return `
            <button type="button" class="drill-tray-item ${selectedRole === role ? 'drill-tray-item-selected' : ''}"
                draggable="${count > 0 ? 'true' : 'false'}"
                data-drill-action="select-role" data-role="${role}" ${count === 0 ? 'disabled' : ''}>
                <img src="${iconPath(role)}" alt="${itemDef.label}">
                <span>${itemDef.label} <strong>x${count}</strong></span>
            </button>
        `;
    }).join('');

    container.innerHTML = `
        <div class="quiz-card drill-formation-card">
            <div class="drill-progress-row">
                <span>Command ${sequenceIdx + 1} of ${SEQUENCE.length}</span>
                <span>Score: ${formationScore.correct} / ${formationScore.total}</span>
            </div>
            <h3 class="drill-command-title">${cmd.command}</h3>
            <p class="text-dim">${cmd.description}</p>
            <p class="drill-citation">${cmd.citation}</p>

            <div class="drill-builder-layout">
                <div id="drill-tray" class="drill-tray">
                    ${trayHTML}
                </div>
                <div id="drill-grid" class="drill-grid"
                    style="--drill-grid-cols: ${totalCols}; --drill-grid-rows: ${totalRows};">
                    ${gridHTML}
                </div>
            </div>

            <div class="drill-builder-actions">
                <button type="button" class="btn-tactical btn-clear" data-drill-action="reset-formation">
                    Clear
                </button>
                <button type="button" class="btn-tactical btn-gold" data-drill-action="check-formation">
                    Check Formation
                </button>
            </div>
            <div id="drill-formation-feedback" class="daily-feedback-panel hidden"></div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// CUSTOM SANDBOX FORMATION BUILDER MODE
// ---------------------------------------------------------------------------
function renderCustomBuilder() {
    const container = document.getElementById("drill-view-container");
    if (!container) return;

    placedCells = [];
    selectedRole = null;
    trayRemaining = {};

    // Unlimited Sandbox Tray
    Object.keys(SYMBOL_LEGEND).forEach(role => {
        trayRemaining[role] = 99;
    });

    const totalCols = 5;
    const totalRows = 8;
    const rowShift = 4;

    let gridHTML = "";
    for (let r = 0; r < totalRows; r++) {
        for (let c = 0; c < totalCols; c++) {
            const actualRow = r - rowShift;
            gridHTML += `<div class="drill-cell" data-drill-action="place" data-col="${c}" data-row="${actualRow}"></div>`;
        }
    }

    const trayHTML = Object.keys(SYMBOL_LEGEND).map(role => {
        const itemDef = SYMBOL_LEGEND[role];
        return `
            <button type="button" class="drill-tray-item ${selectedRole === role ? 'drill-tray-item-selected' : ''}"
                draggable="true" data-drill-action="select-role" data-role="${role}">
                <img src="${iconPath(role)}" alt="${itemDef.label}">
                <span>${itemDef.label}</span>
            </button>
        `;
    }).join('');

    container.innerHTML = `
        <div class="quiz-card drill-formation-card">
            <div class="drill-progress-row">
                <span>Custom Sandbox Mode</span>
                <span>Free Placement Grid</span>
            </div>
            <h3 class="drill-command-title">Custom Formation Canvas</h3>
            <p class="text-dim">Place, rearrange, and experiment with drill symbols to design your own custom flight diagrams.</p>

            <div class="drill-builder-layout">
                <div id="drill-tray" class="drill-tray">
                    ${trayHTML}
                </div>
                <div id="drill-grid" class="drill-grid"
                    style="--drill-grid-cols: ${totalCols}; --drill-grid-rows: ${totalRows};">
                    ${gridHTML}
                </div>
            </div>

            <div class="drill-builder-actions">
                <button type="button" class="btn-tactical btn-clear" data-drill-action="clear-custom">
                    Clear Grid
                </button>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// TRAY & GRID INTERACTION LOGIC
// ---------------------------------------------------------------------------
function selectRole(role) {
    if (mode !== "custom" && (!trayRemaining[role] || trayRemaining[role] <= 0)) return;
    selectedRole = selectedRole === role ? null : role;
    document.querySelectorAll('[data-drill-action="select-role"]').forEach(btn => {
        btn.classList.toggle("drill-tray-item-selected", btn.dataset.role === selectedRole);
    });
}

function placeAt(col, row, cellEl, forcedRole = null) {
    // 1. Return placed icon to tray
    if (cellEl.dataset.filled === "true" && !forcedRole) {
        const role = cellEl.dataset.role;
        cellEl.removeAttribute("data-filled");
        cellEl.removeAttribute("data-role");

        // Remove active placed image element, leave ghost intact if present
        const activeImg = cellEl.querySelector("img:not(.drill-cell-ghost)");
        if (activeImg) activeImg.remove();

        placedCells = placedCells.filter(p => !(p.col === col && p.row === row));
        if (mode !== "custom" && role && trayRemaining[role] !== undefined) {
            trayRemaining[role]++;
        }
        refreshTrayCounts();
        return;
    }

    // 2. Safety check for active role
    const roleToPlace = forcedRole || selectedRole;
    if (!roleToPlace || !SYMBOL_LEGEND[roleToPlace]) return;
    if (mode !== "custom" && (trayRemaining[roleToPlace] || 0) <= 0) return;

    // 3. Handle cell overwrite
    if (cellEl.dataset.filled === "true") {
        const oldRole = cellEl.dataset.role;
        placedCells = placedCells.filter(p => !(p.col === col && p.row === row));
        if (mode !== "custom" && oldRole && trayRemaining[oldRole] !== undefined) {
            trayRemaining[oldRole]++;
        }
        const activeImg = cellEl.querySelector("img:not(.drill-cell-ghost)");
        if (activeImg) activeImg.remove();
    }

    // 4. Place new icon overlay
    const label = SYMBOL_LEGEND[roleToPlace]?.label || roleToPlace;
    cellEl.dataset.filled = "true";
    cellEl.dataset.role = roleToPlace;

    const placedImg = document.createElement("img");
    placedImg.src = iconPath(roleToPlace);
    placedImg.alt = label;
    placedImg.className = "drill-cell-icon";
    cellEl.appendChild(placedImg);

    placedCells.push({ col, row, role: roleToPlace });

    // 5. Decrement tray count
    if (mode !== "custom") {
        trayRemaining[roleToPlace]--;
        if (trayRemaining[roleToPlace] <= 0 && selectedRole === roleToPlace) {
            selectedRole = null;
        }
    }
    refreshTrayCounts();
}

function refreshTrayCounts() {
    if (mode === "custom") return;
    document.querySelectorAll('[data-drill-action="select-role"]').forEach(btn => {
        const role = btn.dataset.role;
        const count = trayRemaining[role] || 0;
        const badge = btn.querySelector("strong");
        if (badge) badge.textContent = `x${count}`;
        btn.disabled = count === 0;
        btn.setAttribute("draggable", count > 0 ? "true" : "false");
        btn.classList.toggle("drill-tray-item-selected", role === selectedRole);
    });
}

function resetFormation() {
    renderFormationDOM(currentCommandDef(), currentCommandDef().buildFlight(FORMATION_CONFIG));
}

function checkFormation() {
    const cmd = currentCommandDef();
    const correctFlight = cmd.buildFlight(FORMATION_CONFIG);
    const result = gradeFormation(placedCells, correctFlight);

    formationScore.correct += result.correctCount;
    formationScore.total += result.total;

    const feedback = document.getElementById("drill-formation-feedback");
    const allCorrect = result.correctCount === result.total && placedCells.length === result.total;

    if (feedback) {
        feedback.classList.remove("hidden");
        feedback.className = allCorrect ? "daily-feedback-panel daily-feedback-success" : "daily-feedback-panel daily-feedback-error";
        feedback.innerHTML = allCorrect
            ? `<strong>Correct.</strong> ${cmd.command} formed correctly.`
            : `<strong>${result.correctCount} / ${result.total} positions correct.</strong> Review the citation above and try again, or move on.`;
    }

    if (allCorrect) {
        setTimeout(() => {
            sequenceIdx++;
            renderFormationCommand();
        }, 1200);
    }
}

async function finishFormationSession() {
    const container = document.getElementById("drill-view-container");
    const pct = formationScore.total > 0
        ? Math.round((formationScore.correct / formationScore.total) * 100)
        : 0;
    const pointsEarned = formationScore.correct * 5;

    if (container) {
        container.innerHTML = `
            <div class="quiz-card text-center">
                <h3>Formation Builder Complete</h3>
                <p>${formationScore.correct} / ${formationScore.total} positions correct (${pct}%)</p>
                <button type="button" class="btn-tactical btn-gold" data-drill-action="restart-formation">
                    Practice Again
                </button>
            </div>
        `;
    }

    if (pointsEarned > 0) {
        awardPoints(pointsEarned, "Drill Formation Builder");
    }

    await recordDrillCompletion({
        score: `${formationScore.correct}/${formationScore.total}`,
        pct,
        pointsEarned
    });
}

async function recordDrillCompletion({ score, pct }) {
    if (!state.currentUser) return;

    try {
        await saveScoreToDB({
            branch: DRILL_BRANCH_KEY,
            branchName: DRILL_BRANCH_NAME,
            score,
            pct,
            date: new Date().toLocaleDateString()
        });
        await checkAndAwardBadges({
            branch: DRILL_BRANCH_KEY,
            pct,
            correctCount: 0
        });
    } catch (err) {
        console.error("Failed to record drill session:", err);
    }
}

// ---------------------------------------------------------------------------
// DRAG AND DROP & TOUCH CONTROLLERS
// ---------------------------------------------------------------------------
function setupDragAndDropEvents(container) {
    container.addEventListener("dragstart", (e) => {
        const trayItem = e.target.closest('[data-drill-action="select-role"]');
        if (!trayItem || trayItem.disabled) return;

        e.dataTransfer.setData("text/plain", trayItem.dataset.role);
        e.dataTransfer.effectAllowed = "copy";
    });

    container.addEventListener("dragover", (e) => {
        const cell = e.target.closest('[data-drill-action="place"]');
        if (cell) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            cell.classList.add("drill-cell-hover");
        }
    });

    container.addEventListener("dragleave", (e) => {
        const cell = e.target.closest('[data-drill-action="place"]');
        if (cell) {
            cell.classList.remove("drill-cell-hover");
        }
    });

    container.addEventListener("drop", (e) => {
        const cell = e.target.closest('[data-drill-action="place"]');
        if (!cell) return;

        e.preventDefault();
        cell.classList.remove("drill-cell-hover");
        const role = e.dataTransfer.getData("text/plain");
        if (role) {
            const col = parseInt(cell.dataset.col, 10);
            const row = parseInt(cell.dataset.row, 10);
            placeAt(col, row, cell, role);
        }
    });

    container.addEventListener("touchstart", (e) => {
        const trayItem = e.target.closest('[data-drill-action="select-role"]');
        if (!trayItem || trayItem.disabled) return;

        const touch = e.touches[0];
        activeTouchRole = trayItem.dataset.role;

        touchDragAvatar = document.createElement("img");
        touchDragAvatar.src = iconPath(activeTouchRole);
        touchDragAvatar.className = "drill-touch-avatar";
        touchDragAvatar.style.left = `${touch.clientX - 24}px`;
        touchDragAvatar.style.top = `${touch.clientY - 24}px`;
        document.body.appendChild(touchDragAvatar);
    }, { passive: true });

    container.addEventListener("touchmove", (e) => {
        if (!touchDragAvatar) return;

        const touch = e.touches[0];
        touchDragAvatar.style.left = `${touch.clientX - 24}px`;
        touchDragAvatar.style.top = `${touch.clientY - 24}px`;

        const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
        document.querySelectorAll(".drill-cell-hover").forEach(c => c.classList.remove("drill-cell-hover"));

        if (targetEl) {
            const cell = targetEl.closest('[data-drill-action="place"]');
            if (cell) cell.classList.add("drill-cell-hover");
        }
    }, { passive: true });

    container.addEventListener("touchend", (e) => {
        if (!touchDragAvatar || !activeTouchRole) return;

        const touch = e.changedTouches[0];
        const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);

        if (targetEl) {
            const cell = targetEl.closest('[data-drill-action="place"]');
            if (cell) {
                const col = parseInt(cell.dataset.col, 10);
                const row = parseInt(cell.dataset.row, 10);
                placeAt(col, row, cell, activeTouchRole);
            }
        }

        document.querySelectorAll(".drill-cell-hover").forEach(c => c.classList.remove("drill-cell-hover"));
        if (touchDragAvatar) {
            touchDragAvatar.remove();
            touchDragAvatar = null;
        }
        activeTouchRole = null;
    });
}

// ---------------------------------------------------------------------------
// EVENT DELEGATION
// ---------------------------------------------------------------------------
function handleContainerClick(e) {
    const answerBtn = e.target.closest('[data-drill-action="answer-symbol"]');
    if (answerBtn) return answerSymbol(answerBtn.dataset.role);

    const restartSymbol = e.target.closest('[data-drill-action="restart-symbol"]');
    if (restartSymbol) return startMode("symbol");

    const restartFormation = e.target.closest('[data-drill-action="restart-formation"]');
    if (restartFormation) return startMode("formation");

    const clearCustom = e.target.closest('[data-drill-action="clear-custom"]');
    if (clearCustom) return renderCustomBuilder();

    const roleBtn = e.target.closest('[data-drill-action="select-role"]');
    if (roleBtn) return selectRole(roleBtn.dataset.role);

    const resetBtn = e.target.closest('[data-drill-action="reset-formation"]');
    if (resetBtn) return resetFormation();

    const checkBtn = e.target.closest('[data-drill-action="check-formation"]');
    if (checkBtn) return checkFormation();

    const cell = e.target.closest('[data-drill-action="place"]');
    if (cell) {
        const col = parseInt(cell.dataset.col, 10);
        const row = parseInt(cell.dataset.row, 10);
        return placeAt(col, row, cell);
    }
}
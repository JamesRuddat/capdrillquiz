/**
 * DRILL FORMATIONS LIBRARY
 * Reference: DAFPAM 34-1203 (13 Sept 2022) & CAP Pamphlets
 * Chapters 4 (Flight Drill), 5 (Squadron Drill), 6 (Group/Wing Ceremonies)
 *
 * Pure data + pure evaluation logic — zero DOM dependencies.
 */

export const SYMBOL_LEGEND = {
    AIRMAN: {
        icon: "airman",
        label: "Airman",
        desc: "An open square. The basic symbol for any member of the flight in ranks."
    },
    ASSISTANT_ELEMENT_LEADER: {
        icon: "assistant_element_leader",
        label: "Assistant Element Leader",
        desc: "An open square with a single diagonal line corner to corner."
    },
    ELEMENT_LEADER: {
        icon: "element_leader",
        label: "Element Leader",
        desc: "An open square with both diagonals drawn (an X)."
    },
    GUIDE: {
        icon: "guide",
        label: "Guide",
        desc: "An open square with an X and a small circle at its center."
    },
    GUIDON_BEARER: {
        icon: "guidon_bearer",
        label: "Guidon Bearer",
        desc: "An open square with a guidon (pennant) mark rising from the center."
    },
    COLORS: {
        icon: "colors",
        label: "Colors",
        desc: "An open square with a color/flag mark rising from the center."
    },
    FLIGHT_SERGEANT: {
        icon: "flight_sergeant",
        label: "Flight Sergeant",
        desc: "An open square with an X and a single horizontal bar above center."
    },
    FIRST_SERGEANT: {
        icon: "first_sergeant",
        label: "First Sergeant",
        desc: "An open square with an X and two horizontal bars above center."
    },
    FLIGHT_COMMANDER: {
        icon: "flight_commander",
        label: "Flight Commander",
        desc: "A filled circle with a single horizontal bar above it."
    },
    SQUADRON_COMMANDER: {
        icon: "squadron_commander",
        label: "Squadron Commander",
        desc: "A filled circle with two horizontal bars above it."
    },
    GROUP_COMMANDER: {
        icon: "group_commander",
        label: "Group Commander",
        desc: "A filled circle with three horizontal bars above it."
    },
    COMMANDER_OF_TROOPS: {
        icon: "commander_of_troops",
        label: "Commander of Troops",
        desc: "A filled circle with four horizontal bars above it."
    },
    ADJUTANT: {
        icon: "adjutant",
        label: "Adjutant",
        desc: "An open triangle."
    },
    STAFF_OFFICER: {
        icon: "staff_officer",
        label: "Staff Officer",
        desc: "An open diamond."
    }
};

export function iconPath(role) {
    if (!role || !SYMBOL_LEGEND[role]) {
        return '/assets/drill/airman.svg';
    }
    return `/assets/drill/${SYMBOL_LEGEND[role].icon}.svg`;
}

// ---------------------------------------------------------------------------
// VERIFIED FORMATION DATASETS (PIR & SQUADRON EVALUATIONS)
// ---------------------------------------------------------------------------
export const VERIFIED_PIR_DATASET = {
    SQUADRON_COLUMN: {
        id: "SQUADRON_COLUMN",
        command: "Squadron in Column",
        citation: "DAFPAM 34-1203, Para 5.3",
        description: "Squadron formed in a column of flights. Squadron Commander leads 6 paces in front with Guidon Bearer.",
        gridCols: 12,
        gridRows: 12,
        rowShift: 6,
        positions: [
            { col: 9, row: -2, role: "ELEMENT_LEADER" },
            { col: 10, row: -2, role: "ELEMENT_LEADER" },
            { col: 9, row: -6, role: "SQUADRON_COMMANDER" },
            { col: 8, row: -5, role: "GUIDON_BEARER" },
            { col: 10, row: -3, role: "GUIDE" },
            { col: 8, row: -3, role: "FLIGHT_COMMANDER" },
            { col: 8, row: -2, role: "ELEMENT_LEADER" },
            { col: 10, row: -1, role: "AIRMAN" },
            { col: 9, row: -1, role: "AIRMAN" },
            { col: 8, row: -1, role: "AIRMAN" },
            { col: 8, row: 2, role: "FLIGHT_COMMANDER" },
            { col: 8, row: 3, role: "ELEMENT_LEADER" },
            { col: 10, row: 3, role: "ELEMENT_LEADER" },
            { col: 9, row: 3, role: "ELEMENT_LEADER" },
            { col: 8, row: 0, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 9, row: 0, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 10, row: 0, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 8, row: 5, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 9, row: 5, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 10, row: 5, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 8, row: 4, role: "AIRMAN" },
            { col: 9, row: 4, role: "AIRMAN" },
            { col: 10, row: 4, role: "AIRMAN" },
            { col: 10, row: 2, role: "GUIDE" },
            { col: 11, row: 5, role: "FIRST_SERGEANT" },
            { col: 10, row: 1, role: "FLIGHT_SERGEANT" }
        ]
    },
    FLIGHT_COLUMN: {
        id: "FLIGHT_COLUMN",
        command: "Flight in Column",
        citation: "DAFPAM 34-1203, Para 4.3.3 & Figure 4.3",
        description: "Flight in column formation. Element Leaders in front rank, Guide abreast of far-right element leader.",
        gridCols: 12,
        gridRows: 12,
        rowShift: 6,
        positions: [
            { col: 4, row: -6, role: "FLIGHT_COMMANDER" },
            { col: 4, row: -5, role: "ELEMENT_LEADER" },
            { col: 5, row: -5, role: "ELEMENT_LEADER" },
            { col: 6, row: -5, role: "ELEMENT_LEADER" },
            { col: 6, row: -6, role: "GUIDE" },
            { col: 4, row: -4, role: "AIRMAN" },
            { col: 4, row: -3, role: "AIRMAN" },
            { col: 4, row: -2, role: "AIRMAN" },
            { col: 5, row: -2, role: "AIRMAN" },
            { col: 5, row: -3, role: "AIRMAN" },
            { col: 5, row: -4, role: "AIRMAN" },
            { col: 6, row: -4, role: "AIRMAN" },
            { col: 6, row: -3, role: "AIRMAN" },
            { col: 6, row: -2, role: "AIRMAN" },
            { col: 6, row: -1, role: "AIRMAN" },
            { col: 4, row: -1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 5, row: -1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 6, row: 0, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 6, row: 1, role: "FLIGHT_SERGEANT" }
        ]
    },
    SQUADRON_LINE_OFFICERS: {
        id: "SQUADRON_LINE_OFFICERS",
        command: "Squadron in Line (Officers Front)",
        citation: "DAFPAM 34-1203, Figure 5.1",
        description: "Squadron in line with officers taking post 3 paces in front of their flights.",
        gridCols: 12,
        gridRows: 12,
        rowShift: 6,
        positions: [
            { col: 11, row: -1, role: "GUIDE" },
            { col: 10, row: -1, role: "ELEMENT_LEADER" },
            { col: 10, row: 0, role: "ELEMENT_LEADER" },
            { col: 10, row: 1, role: "ELEMENT_LEADER" },
            { col: 4, row: -1, role: "ELEMENT_LEADER" },
            { col: 4, row: 0, role: "ELEMENT_LEADER" },
            { col: 4, row: 1, role: "ELEMENT_LEADER" },
            { col: 1, row: 2, role: "FIRST_SERGEANT" },
            { col: 0, row: 1, role: "FLIGHT_SERGEANT" },
            { col: 6, row: 1, role: "FLIGHT_SERGEANT" },
            { col: 7, row: 1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 7, row: 0, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 7, row: -1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 1, row: 1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 1, row: 0, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 1, row: -1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 2, row: -1, role: "AIRMAN" },
            { col: 3, row: -1, role: "AIRMAN" },
            { col: 3, row: 0, role: "AIRMAN" },
            { col: 2, row: 0, role: "AIRMAN" },
            { col: 2, row: 1, role: "AIRMAN" },
            { col: 3, row: 1, role: "AIRMAN" },
            { col: 8, row: 1, role: "AIRMAN" },
            { col: 9, row: 1, role: "AIRMAN" },
            { col: 9, row: 0, role: "AIRMAN" },
            { col: 8, row: 0, role: "AIRMAN" },
            { col: 8, row: -1, role: "AIRMAN" },
            { col: 9, row: -1, role: "AIRMAN" },
            { col: 5, row: -1, role: "GUIDE" },
            { col: 3, row: -4, role: "FLIGHT_COMMANDER" },
            { col: 9, row: -4, role: "FLIGHT_COMMANDER" },
            { col: 6, row: -6, role: "SQUADRON_COMMANDER" },
            { col: 5, row: -5, role: "GUIDON_BEARER" }
        ]
    },
    SQUADRON_LINE_NCOS: {
        id: "SQUADRON_LINE_NCOS",
        command: "Squadron in Line (NCOs Front)",
        citation: "DAFPAM 34-1203, Figure 5.2",
        description: "Squadron in line with Flight Sergeants posted in front of flights.",
        gridCols: 12,
        gridRows: 12,
        rowShift: 6,
        positions: [
            { col: 11, row: -1, role: "GUIDE" },
            { col: 10, row: -1, role: "ELEMENT_LEADER" },
            { col: 10, row: 0, role: "ELEMENT_LEADER" },
            { col: 10, row: 1, role: "ELEMENT_LEADER" },
            { col: 4, row: -1, role: "ELEMENT_LEADER" },
            { col: 4, row: 0, role: "ELEMENT_LEADER" },
            { col: 4, row: 1, role: "ELEMENT_LEADER" },
            { col: 7, row: 1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 7, row: 0, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 7, row: -1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 1, row: 1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 1, row: 0, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 1, row: -1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 2, row: -1, role: "AIRMAN" },
            { col: 3, row: -1, role: "AIRMAN" },
            { col: 3, row: 0, role: "AIRMAN" },
            { col: 2, row: 0, role: "AIRMAN" },
            { col: 2, row: 1, role: "AIRMAN" },
            { col: 3, row: 1, role: "AIRMAN" },
            { col: 8, row: 1, role: "AIRMAN" },
            { col: 9, row: 1, role: "AIRMAN" },
            { col: 9, row: 0, role: "AIRMAN" },
            { col: 8, row: 0, role: "AIRMAN" },
            { col: 8, row: -1, role: "AIRMAN" },
            { col: 9, row: -1, role: "AIRMAN" },
            { col: 5, row: -1, role: "GUIDE" },
            { col: 6, row: -6, role: "FIRST_SERGEANT" },
            { col: 9, row: -4, role: "FLIGHT_SERGEANT" },
            { col: 3, row: -4, role: "FLIGHT_SERGEANT" }
        ]
    },
    SQUADRON_MASS: {
        id: "SQUADRON_MASS",
        command: "Squadron in Mass",
        citation: "DAFPAM 34-1203, Para 5.4 & Figure 5.3",
        description: "Flights arranged side by side at close interval forming a consolidated block.",
        gridCols: 12,
        gridRows: 12,
        rowShift: 6,
        positions: [
            { col: 4, row: -6, role: "FLIGHT_COMMANDER" },
            { col: 4, row: -5, role: "ELEMENT_LEADER" },
            { col: 5, row: -5, role: "ELEMENT_LEADER" },
            { col: 6, row: -5, role: "ELEMENT_LEADER" },
            { col: 6, row: -6, role: "GUIDE" },
            { col: 4, row: -4, role: "AIRMAN" },
            { col: 4, row: -3, role: "AIRMAN" },
            { col: 4, row: -2, role: "AIRMAN" },
            { col: 5, row: -2, role: "AIRMAN" },
            { col: 5, row: -3, role: "AIRMAN" },
            { col: 5, row: -4, role: "AIRMAN" },
            { col: 6, row: -4, role: "AIRMAN" },
            { col: 6, row: -3, role: "AIRMAN" },
            { col: 6, row: -2, role: "AIRMAN" },
            { col: 6, row: -1, role: "AIRMAN" },
            { col: 4, row: -1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 5, row: -1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 6, row: 0, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 6, row: 1, role: "FLIGHT_SERGEANT" },
            { col: 7, row: -6, role: "FLIGHT_COMMANDER" },
            { col: 9, row: -6, role: "GUIDE" },
            { col: 7, row: -5, role: "ELEMENT_LEADER" },
            { col: 8, row: -5, role: "ELEMENT_LEADER" },
            { col: 9, row: -5, role: "ELEMENT_LEADER" },
            { col: 7, row: -1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 8, row: -1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 9, row: -1, role: "ASSISTANT_ELEMENT_LEADER" },
            { col: 7, row: -4, role: "AIRMAN" },
            { col: 7, row: -3, role: "AIRMAN" },
            { col: 7, row: -2, role: "AIRMAN" },
            { col: 8, row: -2, role: "AIRMAN" },
            { col: 8, row: -3, role: "AIRMAN" },
            { col: 8, row: -4, role: "AIRMAN" },
            { col: 9, row: -4, role: "AIRMAN" },
            { col: 9, row: -3, role: "AIRMAN" },
            { col: 9, row: -2, role: "AIRMAN" },
            { col: 9, row: 0, role: "FLIGHT_SERGEANT" }
        ]
    }
};

// ---------------------------------------------------------------------------
// DYNAMIC FLIGHT GENERATOR (DAFPAM 34-1203 Para 4.3)
// ---------------------------------------------------------------------------
export function generateFlight(config = {}) {
    const {
        elementCount = 4,
        perElement = 4,
        useGuidonBearer = false,
        rankState = "closed",
        formationType = "line"
    } = config;

    const positions = [];

    if (formationType === "line") {
        const totalCols = perElement + 1;
        const guideCol = totalCols - 1;

        positions.push({
            id: "guide",
            role: useGuidonBearer ? "GUIDON_BEARER" : "GUIDE",
            col: guideCol,
            row: 0
        });

        for (let e = 0; e < elementCount; e++) {
            let openRanksPaces = 0;
            if (rankState === "open") {
                openRanksPaces = Math.max(0, elementCount - 1 - e);
            }

            const row = e - openRanksPaces;
            const leaderCol = guideCol - 1;

            positions.push({
                id: `e${e + 1}-leader`,
                role: "ELEMENT_LEADER",
                col: leaderCol,
                row: row
            });

            for (let m = 1; m < perElement; m++) {
                const isRear = (m === perElement - 1);
                const memberCol = leaderCol - m;

                positions.push({
                    id: `e${e + 1}-m${m}`,
                    role: isRear ? "ASSISTANT_ELEMENT_LEADER" : "AIRMAN",
                    col: memberCol,
                    row: row
                });
            }
        }

        const centerCol = Math.floor(totalCols / 2);
        const leaderRow = -4;

        positions.push({
            id: "fsgt",
            role: "FLIGHT_SERGEANT",
            col: centerCol,
            row: leaderRow,
            fixed: true
        });

        const rowShift = Math.abs(leaderRow);
        const totalRows = rowShift + elementCount + (rankState === "open" ? elementCount : 0);

        return {
            positions,
            gridCols: totalCols,
            gridRows: totalRows,
            rowShift: rowShift,
            meta: { elementCount, perElement, rankState, formationType }
        };

    } else {
        positions.push({
            id: "guide",
            role: useGuidonBearer ? "GUIDON_BEARER" : "GUIDE",
            col: elementCount - 1,
            row: -1
        });

        for (let e = 0; e < elementCount; e++) {
            positions.push({
                id: `e${e + 1}-leader`,
                role: "ELEMENT_LEADER",
                col: e,
                row: 0
            });

            for (let m = 1; m < perElement; m++) {
                const isRear = (m === perElement - 1);
                positions.push({
                    id: `e${e + 1}-m${m}`,
                    role: isRear ? "ASSISTANT_ELEMENT_LEADER" : "AIRMAN",
                    col: e,
                    row: m
                });
            }
        }

        const leaderRow = -4;
        positions.push({
            id: "fsgt",
            role: "FLIGHT_SERGEANT",
            col: Math.floor(elementCount / 2),
            row: leaderRow,
            fixed: true
        });

        const totalCols = elementCount;
        const rowShift = Math.abs(leaderRow);
        const totalRows = rowShift + perElement;

        return {
            positions,
            gridCols: totalCols,
            gridRows: totalRows,
            rowShift: rowShift,
            meta: { elementCount, perElement, rankState, formationType }
        };
    }
}

// ---------------------------------------------------------------------------
// FORMATION EVALUATION & GRADING
// ---------------------------------------------------------------------------
export function gradeFormation(placed = [], correct) {
    const cellKey = (col, row) => `${col},${row}`;
    const targetCells = new Map();

    const targetPositions = correct.positions || [];
    targetPositions.forEach(p => targetCells.set(cellKey(p.col, p.row), p.role));

    const remaining = new Map(targetCells);
    let correctCount = 0;

    placed.forEach(p => {
        const key = cellKey(p.col, p.row);
        if (remaining.get(key) === p.role) {
            correctCount++;
            remaining.delete(key);
        }
    });

    const missingCells = Array.from(remaining.entries()).map(([key, role]) => {
        const [col, row] = key.split(",").map(Number);
        return { col, row, role };
    });

    return { correctCount, total: targetCells.size, missingCells };
}

// ---------------------------------------------------------------------------
// COMMAND REGISTRY
// ---------------------------------------------------------------------------
export const DRILL_COMMANDS = {
    FALL_IN: {
        id: "FALL_IN",
        command: "Fall In",
        citation: "DAFPAM 34-1203, Para 4.3.1",
        description: "Forms the flight in line formation. Guide takes position 3 paces facing Flight Sergeant on the far right.",
        buildFlight: (opts) => generateFlight({ ...opts, rankState: "closed", formationType: "line" })
    },
    OPEN_RANKS: {
        id: "OPEN_RANKS",
        command: "Open Ranks, March",
        citation: "DAFPAM 34-1203, Para 4.3.5",
        description: "1st element takes 3 steps forward, 2nd element 2 steps, 3rd element 1 step, 4th element stands fast.",
        buildFlight: (opts) => generateFlight({ ...opts, rankState: "open", formationType: "line" })
    },
    CLOSE_RANKS: {
        id: "CLOSE_RANKS",
        command: "Close Ranks, March",
        citation: "DAFPAM 34-1203, Para 4.3.5",
        description: "Restores normal 40-inch distance between ranks after Open Ranks inspection.",
        buildFlight: (opts) => generateFlight({ ...opts, rankState: "closed", formationType: "line" })
    },
    SQUADRON_COLUMN: {
        id: "SQUADRON_COLUMN",
        command: "Squadron in Column",
        citation: "DAFPAM 34-1203, Para 5.3",
        description: "Squadron formed in a column of flights.",
        buildFlight: () => VERIFIED_PIR_DATASET.SQUADRON_COLUMN
    },
    SQUADRON_LINE_OFFICERS: {
        id: "SQUADRON_LINE_OFFICERS",
        command: "Squadron in Line (Officers Front)",
        citation: "DAFPAM 34-1203, Figure 5.1",
        description: "Squadron in line with officers posted 3 paces in front.",
        buildFlight: () => VERIFIED_PIR_DATASET.SQUADRON_LINE_OFFICERS
    },
    SQUADRON_MASS: {
        id: "SQUADRON_MASS",
        command: "Squadron in Mass",
        citation: "DAFPAM 34-1203, Figure 5.3",
        description: "Flights abreast at close interval forming a single solid formation.",
        buildFlight: () => VERIFIED_PIR_DATASET.SQUADRON_MASS
    }
};

/**
 * Quiz Challenge Generator: Turns PIR Formations into quiz questions with visual cues
 */
export function generateDrillQuizQuestions() {
    return Object.values(VERIFIED_PIR_DATASET).map(design => {
        return {
            id: `drill_q_${design.id}`,
            type: "formation_id",
            question: `Which DAFPAM 34-1203 formation configuration is represented in this diagram layout?`,
            formationId: design.id,
            correctAnswer: design.command,
            options: [
                design.command,
                "Squadron in Line (NCOs Front)",
                "Group in Column of Squadrons",
                "Wing Mass Formation"
            ],
            explanation: `${design.command} (${design.citation}): ${design.description}`
        };
    });
}
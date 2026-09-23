/**
 * DRILL FORMATIONS LIBRARY
 * Reference: DAFPAM 34-1203 (13 Sept 2022), Chapter 4 (Drill of the Flight),
 * Paras 4.3.1 - 4.3.4 & Figures 4.1 - 4.4.
 *
 * Pure data + pure functions — no DOM dependencies.
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

/**
 * Generates exact coordinate positions based on DAFPAM 34-1203 Para 4.3.1.
 */
export function generateFlight(config = {}) {
    const {
        elementCount = 4,        // Number of elements (2 to 4)
        perElement = 4,          // Members per element file
        useGuidonBearer = false,
        rankState = "closed",    // "closed" or "open"
        formationType = "line"   // "line" or "column"
    } = config;

    const positions = [];

    if (formationType === "line") {
        // --- LINE FORMATION (DAFPAM 34-1203 Figure 4.1) ---
        // Width = perElement + 1 (for Guide). Depth = elementCount ranks.
        const totalCols = perElement + 1;
        const guideCol = totalCols - 1; // Guide on far right

        // 1. Guide Anchor (Far Right, Front Rank)
        positions.push({
            id: "guide",
            role: useGuidonBearer ? "GUIDON_BEARER" : "GUIDE",
            col: guideCol,
            row: 0
        });

        // 2. Elements (Ranks 0..elementCount - 1)
        for (let e = 0; e < elementCount; e++) {
            // Open Ranks Pace Offsets (Para 4.3.5)
            let openRanksPaces = 0;
            if (rankState === "open") {
                openRanksPaces = Math.max(0, elementCount - 1 - e);
            }

            const row = e - openRanksPaces;

            // Element Leader (Front of file, adjacent to Guide column)
            const leaderCol = guideCol - 1;
            positions.push({
                id: `e${e + 1}-leader`,
                role: "ELEMENT_LEADER",
                col: leaderCol,
                row: row
            });

            // Followers extending leftward in the rank
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

        // 3. Flight Commander / Sergeant (3 Paces in front, centered)
        const centerCol = Math.floor(totalCols / 2);
        const pacesAhead = 3;
        const leaderRow = -1 - pacesAhead; // Row -4

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
        // --- COLUMN FORMATION (DAFPAM 34-1203 Figure 4.3) ---
        // Width = elementCount columns. Depth = perElement rows.

        // 1. Guide Anchor (Front-Right: Col = elementCount - 1, Row = -1)
        positions.push({
            id: "guide",
            role: useGuidonBearer ? "GUIDON_BEARER" : "GUIDE",
            col: elementCount - 1,
            row: -1
        });

        // 2. Element Columns (Columns 0..elementCount - 1)
        for (let e = 0; e < elementCount; e++) {
            // Element Leader (Front rank of column)
            positions.push({
                id: `e${e + 1}-leader`,
                role: "ELEMENT_LEADER",
                col: e,
                row: 0
            });

            // Followers extending back in column file
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

        // 3. Flight Sergeant (3 Paces in front of column)
        const pacesAhead = 3;
        const leaderRow = -1 - pacesAhead; // Row -4

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

export function gradeFormation(placed = [], correct) {
    const cellKey = (col, row) => `${col},${row}`;
    const targetCells = new Map();

    correct.positions.forEach(p => targetCells.set(cellKey(p.col, p.row), p.role));

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

export const DRILL_COMMANDS = {
    FALL_IN: {
        id: "FALL_IN",
        command: "Fall In",
        citation: "DAFPAM 34-1203, Para 4.3.1",
        description: "Forms the flight in line formation. The Guide takes position 3 paces facing the Flight Sergeant on the far right. Element leaders fall in directly to the left of the Guide.",
        buildFlight: (opts) => generateFlight({ ...opts, rankState: "closed", formationType: "line" })
    },
    OPEN_RANKS: {
        id: "OPEN_RANKS",
        command: "Open Ranks, March",
        citation: "DAFPAM 34-1203, Para 4.3.5",
        description: "1st element takes 3 steps forward, 2nd element takes 2 steps, 3rd element takes 1 step, 4th element stands fast to create inspection alleys.",
        buildFlight: (opts) => generateFlight({ ...opts, rankState: "open", formationType: "line" })
    },
    CLOSE_RANKS: {
        id: "CLOSE_RANKS",
        command: "Close Ranks, March",
        citation: "DAFPAM 34-1203, Para 4.3.5",
        description: "Restores normal 40-inch distance between ranks after Open Ranks inspection.",
        buildFlight: (opts) => generateFlight({ ...opts, rankState: "closed", formationType: "line" })
    }
};
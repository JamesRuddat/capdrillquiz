export const state = {
    QUESTION_REGISTRY: {},
    activeBranchKey: "",
    activeName: "",
    userCallsign: null, // Stores active cadet callsign (e.g. "Patrol-42")
    userPoints: 0,
    activeQuestions: [],
    currentIdx: 0,
    score: 0,
    currentUser: null,
    activeModuleListenerRef: null,
    editingModuleKey: null, // Tracks inline card editing in Hub
    isCreatingNewModule: false, // Tracks inline card creation in Hub
    VOTE_COOLDOWNS: {},
    ACTIVE_INTERVALS: {},
    COOLDOWN_SECONDS: 5
};
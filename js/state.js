export const state = {
    QUESTION_REGISTRY: {},
    activeBranchKey: "",
    activeName: "",
    userCallsign: null,      // Stores active callsign (e.g. "Viper-01")
    userUid: null,           // Stores Firebase Auth UID for persistent tracking across callsign updates
    userPoints: 0,
    activeQuestions: [],
    currentIdx: 0,
    score: 0,
    currentUser: null,
    activeModuleListenerRef: null,
    editingModuleKey: null,   // Tracks inline card editing in Hub
    isCreatingNewModule: false, // Tracks inline card creation in Hub
    VOTE_COOLDOWNS: {},
    ACTIVE_INTERVALS: {},
    COOLDOWN_SECONDS: 5
};
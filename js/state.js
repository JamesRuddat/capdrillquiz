/**
 * Global Reactive State Store
 */
export const state = {
    // Session & User Identity
    currentUser: null,
    userUid: null,
    userCallsign: null,
    userPoints: 0,
    userRole: "guest",
    authInitialized: false,

    // Subject Registry & Navigation
    QUESTION_REGISTRY: {},
    activeBranchKey: "",
    selectedCategory: "ALL", // Category filter for cards grid

    // Subject Hub UI State
    isCreatingNewSubject: false,
    editingSubjectKey: null,
    activeSubjectListenerRef: null,

    // Active Quiz Session State
    activeQuestions: [],
    currentIdx: 0,
    score: 0,

    /**
     * Initializes user identity synchronously from local cache
     */
    initCachedUser() {
        const cachedUid = localStorage.getItem("active_uid");
        if (cachedUid) {
            this.userUid = cachedUid;
            this.userCallsign = localStorage.getItem(`callsign_${cachedUid}`) || null;
            this.userPoints = parseInt(localStorage.getItem(`points_${cachedUid}`) || "0", 10);
        }
    },

    /**
     * Updates user identity state & syncs with persistent cache
     */
    setUser(user, callsign = null, points = 0) {
        this.currentUser = user;
        this.userUid = user ? user.uid : null;
        this.userCallsign = callsign;
        this.userPoints = points;

        if (user) {
            localStorage.setItem("active_uid", user.uid);
            if (callsign) localStorage.setItem(`callsign_${user.uid}`, callsign);
            localStorage.setItem(`points_${user.uid}`, points);
        } else {
            localStorage.removeItem("active_uid");
        }

        this.broadcastStateChange();
    },

    /**
     * Updates the global question registry and broadcasts an event to subscribers
     */
    setQuestionRegistry(newRegistry) {
        this.QUESTION_REGISTRY = newRegistry || {};
        window.dispatchEvent(new CustomEvent("app:registry-updated", {
            detail: { registry: this.QUESTION_REGISTRY, count: this.getSubjectCount() }
        }));
    },

    /**
     * Helper: Returns total count of dynamic subjects in registry
     */
    getSubjectCount() {
        return Object.keys(this.QUESTION_REGISTRY || {}).length;
    },

    /**
     * Helper: Returns array of all subject objects
     */
    getAllSubjects() {
        return Object.values(this.QUESTION_REGISTRY || {});
    },

    /**
     * Updates user points in real-time and broadcasts to site-header and profile
     */
    updatePoints(newPoints) {
        this.userPoints = newPoints;
        if (this.userUid) {
            localStorage.setItem(`points_${this.userUid}`, newPoints);
        }

        window.dispatchEvent(new CustomEvent("app:points-updated", {
            detail: { points: newPoints, uid: this.userUid }
        }));

        this.broadcastStateChange();
    },

    /**
     * Helper: Returns a subject object safely from registry by key
     */
    getSubject(branchKey) {
        return this.QUESTION_REGISTRY ? this.QUESTION_REGISTRY[branchKey] : null;
    },

    /**
     * Helper: Returns all dynamic practice links for a subject
     */
    getSubjectLinks(branchKey) {
        const subject = this.getSubject(branchKey);
        if (subject && Array.isArray(subject.links) && subject.links.length > 0) {
            return subject.links;
        }
        return [];
    },

    /**
     * Helper: Checks if a subject is a standalone simulator or custom tool
     */
    isSimulatorSubject(branchKey) {
        const subject = this.getSubject(branchKey);
        if (!subject) {
            return branchKey === "DRILL_36_2203" || branchKey === "ELT_DF_SIM";
        }
        return subject.type === "interactive" || subject.type === "simulator" || Boolean(subject.url);
    },

    /**
     * Helper: Gets the target launcher URL or defaults to setup.html
     */
    getSubjectLaunchHref(branchKey) {
        const subject = this.getSubject(branchKey);
        if (subject && subject.url) return subject.url;

        if (branchKey === "DRILL_36_2203") return "/pages/drill.html";
        if (branchKey === "ELT_DF_SIM" || branchKey === "DF_SEARCH_SIM") return "/pages/df-search.html";

        return `setup.html?subject=${branchKey}`;
    },

    /**
     * Dispatches global custom event when auth state or user profile changes
     */
    broadcastStateChange() {
        window.dispatchEvent(new CustomEvent("app:state-changed", {
            detail: {
                user: this.currentUser,
                uid: this.userUid,
                callsign: this.userCallsign,
                points: this.userPoints,
                role: this.userRole
            }
        }));
    }
};

// Auto-run synchronous cache hydration on script load
state.initCachedUser();
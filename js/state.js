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
// js/services/storage-service.js

export const Cache = {
    // User Session Data
    get ActiveUid() {
        return localStorage.getItem("active_uid");
    },

    getUserData(uid) {
        if (!uid) return null;
        return {
            callsign: localStorage.getItem(`callsign_${uid}`) || "Cadet",
            points: parseInt(localStorage.getItem(`points_${uid}`) || "0", 10),
            role: localStorage.getItem(`role_${uid}`) || "user"
        };
    },

    setUserData(uid, callsign, points, role) {
        if (!uid) return;
        localStorage.setItem("active_uid", uid);
        if (callsign) localStorage.setItem(`callsign_${uid}`, callsign);
        if (points !== undefined) localStorage.setItem(`points_${uid}`, points);
        if (role) localStorage.setItem(`role_${uid}`, role);
    },

    clearUserData(uid) {
        if (uid) {
            localStorage.removeItem(`callsign_${uid}`);
            localStorage.removeItem(`points_${uid}`);
            localStorage.removeItem(`role_${uid}`);
        }
        localStorage.removeItem("active_uid");
    },

    // Subject & Question Data Caching
    getSubjects() {
        try {
            return JSON.parse(localStorage.getItem("cached_subjects") || "{}");
        } catch {
            return {};
        }
    },

    setSubjects(subjects) {
        localStorage.setItem("cached_subjects", JSON.stringify(subjects));
    }
};
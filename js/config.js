// Firebase initialized via compat SDKs loaded in index.html
const firebaseConfig = {
    apiKey: "AIzaSyBr9AkWSSW7_qesMsj3nBwluLWjfjOULVY",
    authDomain: "cap-evaluator.firebaseapp.com",
    databaseURL: "https://cap-evaluator-default-rtdb.firebaseio.com",
    projectId: "cap-evaluator",
    storageBucket: "cap-evaluator.firebasestorage.app",
    messagingSenderId: "320253213583",
    appId: "1:320253213583:web:4ade28e5e88f8f3b03e9fa",
    measurementId: "G-RZDRVYD6TC"
};

firebase.initializeApp(firebaseConfig);

export const database = firebase.database();
export const auth = firebase.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();
export const SUPER_UID = 'e8cCmxtEqMN4pr9i3DCkl2yo2iz2';

// List of Firebase UIDs authorized to manage
export const ADMIN_UIDS = [
    "p8X1Y9zQ23A4bC5dE6fG7hI8jK9l",
    "m0N1O2p3Q4r5S6t7U8v9W0x1Y2z3"
];
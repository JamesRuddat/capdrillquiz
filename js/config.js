// Add Microsoft Provider export
export const microsoftProvider = new firebase.auth.OAuthProvider('microsoft.com');
export const googleProvider = new firebase.auth.GoogleAuthProvider();

// Set custom parameters to force account prompts or specify tenant handling
microsoftProvider.setCustomParameters({
    prompt: 'select_account',
    authority: 'https://login.microsoftonline.com/consumers',
    tenant: 'consumers'
});

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
export const SUPER_UID = 'e8cCmxtEqMN4pr9i3DCkl2yo2iz2';

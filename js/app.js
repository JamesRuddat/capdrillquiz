import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Attach button click listener directly in JS (safer than inline onclick)
document.getElementById("google-login-btn").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Logged in user:", result.user);
  } catch (error) {
    console.error("Auth error:", error);
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  signOut(auth);
});

// Track auth state automatically on load
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User active:", user.displayName);
  } else {
    console.log("No user logged in");
  }
});
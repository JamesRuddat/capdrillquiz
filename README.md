# Evaluator (v3.0)

A lightweight, student-focused, free-to-use study and assessment platform designed to help cadets and service members master official marching regulations, command structures, and ceremony procedures.

Built using plain JavaScript (ES Modules), HTML5, CSS3, and Firebase Realtime Database.

---

## Features

* **100% Free & Open Access:** No paywalls, subscription tiers, or hidden charges.
* **Modular ES Architecture:** Clean, maintainable codebase separated into state, services, and UI component modules.
* **Community Quiz Engine:** Select any registered study module, choose how many randomized questions to evaluate, and practice recall.
* **Author & Reputation System:** Community members can add questions, receive community upvotes/downvotes, and build their profile score.
* **Dynamic Leaderboard:** Automated scoring leaderboard with gold, silver, and bronze podium styling, tie-breaker sorting by date, and zebra-striped rows.
* **Admin & Creator Inspector:** Dedicated management panel for creating quiz modules, appending citation-backed questions, and updating records.

---

## Tech Stack & Hosted Platforms

The application relies on three core cloud services:

1. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com/))
   * Handles Google OAuth 2.0 authentication credentials and authorized JavaScript origins/redirect URIs.
2. **Firebase Console** ([console.firebase.google.com](https://console.firebase.google.com/))
   * Controls the **Firebase Realtime Database** for storing modules, user-submitted questions, scores, and star transactions.
   * Manages database security rules and Google Authentication user logs.
3. **Netlify** ([app.netlify.com](https://app.netlify.com/))
   * Provides continuous deployment and free production web hosting directly connected to the repository.

---

## ⚙️ How the Application Works

### 1. Client-Side ES Modules Architecture

The frontend runs natively in the browser without build tools or bundlers. The entry point is `js/app.js` loaded via `<script type="module">`.

* `js/config.js` — Initializes Firebase SDK instances and global constants.
* `js/state.js` — Holds mutable global state (e.g., loaded modules, active session score, current user).
* `js/services/` — Contains database and auth handlers (`auth-service.js`, `db-service.js`).
* `js/components/` — Isolated UI logic for views (`navigation.js`, `quiz-engine.js`, `leaderboard.js`, `hub.js`).

### 2. Quiz Evaluation Flow

1. **Setup:** The user selects a target module. The dynamic slider automatically reads the module size and updates its `max` bounds.
2. **Execution:** The quiz engine uses a Fisher-Yates shuffle algorithm to randomly order the question set and slices it to match the requested slider count.
3. **Scoring:** Answers are checked in real-time with citation feedback. Completed scores are saved directly to Firebase (`/scores`) and automatically update the honor roll.

### 3. Community Question Voting & Author Stars

* Community members can vote on questions in the Quiz Hub.
* Double-transactions increment/decrement question upvotes and award or deduct stars from the question author's profile in Firebase (`/users/$user_id/stars`).
* Built-in 10-second button timers throttle repeated votes on the client side.

---

## Deployment Guide

### Setting up Firebase & Google Cloud

1. Create a project in [Firebase Console](https://console.firebase.google.com/).
2. Enable **Realtime Database** and set up your security rules.
3. Enable **Google Auth** under Authentication > Sign-in Method.
4. Go to [Google Cloud Console](https://console.cloud.google.com/), select your Firebase project, navigate to **APIs & Services > Credentials**, and add your domain URL under **Authorized JavaScript Origins**.

### Deploying to Netlify

1. Log into [Netlify Console](https://app.netlify.com/).
2. Click **Add new site** > **Import an existing project**.
3. Connect your Git repository (GitHub/GitLab).
4. Leave the build command blank (vanilla JS) and set the publish directory to `.` (or `/`).
5. Click **Deploy Site**. Add your generated Netlify domain (e.g., `https://your-site.netlify.app`) to your Firebase/Google Cloud OAuth authorized origins list.

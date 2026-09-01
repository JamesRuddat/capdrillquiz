import { database } from '../config.js';

export function saveScoreToDB(scoreData) {
    return database.ref("scores").push(scoreData);
}

export function fetchScoresOnce(callback) {
    database.ref("scores").once("value", snapshot => {
        let logs = [];
        snapshot.forEach(child => { logs.push(child.val()); });
        callback(logs);
    });
}

export function fetchScoresOrderedByPct(callback) {
    database.ref("scores").orderByChild("pct").once("value", snapshot => {
        let logs = [];
        snapshot.forEach(child => { logs.push(child.val()); });
        logs.reverse();
        callback(logs);
    });
}
// ============================================================================
// ELT DIRECTION FINDING SIMULATOR (df-sim.js)
// Author: Bruce Bream / Civil Air Patrol
// ============================================================================

// Global Simulation Variables
var pscale = 6;       // Pixels per nm
var Maph = 620;       // Map height in pixels
var Mapw = 620;       // Map width in pixels
var VORx;             // VOR location X
var VORy;             // VOR location Y
var sVOR = 10 * pscale; // Size of VOR circle (10 nm)
var sDME = 16;        // Size of DME box
var ELTx;             // ELT Location X
var ELTy;             // ELT Location Y
var ACx;              // Aircraft Location X
var ACy;              // Aircraft Location Y
var APx;              // Departure airport location X
var APy;              // Departure airport location Y
var Ch = 50;          // Compass height
var Cw = 200;         // Compass width
var DFh = 40;         // DF meter height
var DFw = 200;        // DF meter width
var ACsize = 24;      // Size of aircraft fuselage
var ACdistpx;         // Distance travelled in pixels
var DFdist;           // Distance to ELT when signal heard in nm
var ACstart;          // AC distance when signal first heard in nm
var InitDist;         // Initial distance from ELT in pixels
var Spd = 6;          // Number of pixels to move per step
var Hdg = 90;         // Aircraft heading in degrees
var DFmode = 2;       // DF meter mode (DF = 1, Signal = 2)
var ELTdme;           // Distance to ELT
var ELTrad;           // Radial from ELT
var ELTshow = false;  // Boolean to reveal ELT on map
var score = 0;        // Game score
var FindDist = 2;     // Proximity to ELT for a find (in nm)
var ScoreWin = null;  // Score results window object
var HelpWin;          // Help window handle
var bScoreWin = false; // Prevents duplicate score windows

// ============================================================================
// AUDIO ENGINE (HTML5 Audio Loop)
// ============================================================================
var eltAudio = new Audio('/assets/sound/elt_beacon.wav'); // Path to audio asset
eltAudio.loop = true;
var audioInitialized = false;

function initAudio() {
    if (!audioInitialized) {
        eltAudio.volume = 0; // Start silent
        eltAudio.play().then(function () {
            audioInitialized = true;
        }).catch(function (e) {
            console.log("Waiting for user gesture to play audio:", e);
        });
    } else if (eltAudio.paused) {
        eltAudio.play();
    }
}

function updateELTAudio(sigStr) {
    if (!eltAudio) return;

    var muteCheckbox = document.getElementById("MuteAudio");
    var audioMuted = muteCheckbox ? muteCheckbox.checked : false;

    if (audioMuted || sigStr <= 0.05) {
        eltAudio.volume = 0;
    } else {
        var vol = Math.min(1.0, sigStr);
        eltAudio.volume = vol;
    }
}

// ============================================================================
// NAVIGATION & MOVEMENT CONTROLLERS
// ============================================================================

window.R = function () { // Right turn (+30 deg)
    initAudio();
    Hdg += 30;
    if (Hdg > 359) { Hdg -= 360; }
    Move();
};

window.F = function () { // Forward
    initAudio();
    Move();
};

window.L = function () { // Left turn (-30 deg)
    initAudio();
    Hdg -= 30;
    if (Hdg < 0) { Hdg += 360; }
    Move();
};

function Move() {
    DrawCompass();

    var dx = Spd * Math.sin(Hdg * Math.PI / 180);
    var dy = Spd * Math.cos(Hdg * Math.PI / 180);
    ACy -= dy;
    ACx += dx;
    ACdistpx += Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

    if (ACx < 0) { ACx = 5; }
    if (ACx > Mapw) { ACx = Mapw - 5; }
    if (ACy < 0) { ACy = 5; }
    if (ACy > Maph) { ACy = Maph - 5; }

    var sDtravEl = document.getElementById('sDtrav');
    if (sDtravEl) sDtravEl.innerHTML = Math.round(ACdistpx / pscale);

    VORDME();

    var DFvar = DA(ACx, ACy, ELTx, ELTy, pscale);
    ELTdme = DFvar[0];
    ELTrad = DFvar[1];
    if (InitDist == 0) { InitDist = ELTdme * pscale; }

    Draw88();

    if (ELTdme < FindDist) { Results(); }

    DrawMap();
}

// ============================================================================
// GAME RESET & HELP
// ============================================================================

window.Reset = function () {
    ELTx = 20 + Math.random() * (Mapw - 80);
    ELTy = 20 + Math.random() * (Maph - 80);
    ACx = 20 + Math.random() * (Mapw - 80);
    ACy = 20 + Math.random() * (Maph - 80);
    APx = ACx;
    APy = ACy;
    VORx = 40 + Math.random() * (Mapw - 80);
    VORy = 40 + Math.random() * (Maph - 80);

    ACdistpx = 0;
    DFdist = 0;
    ACstart = 0;
    InitDist = 0;
    Spd = 6;
    Hdg = 90;
    DFmode = 2;
    ELTshow = false;
    score = 0;

    var revEl = document.getElementById("Reveal");
    if (revEl) revEl.checked = false;

    var sButEl = document.getElementById("Sbut");
    if (sButEl) sButEl.checked = true;

    var spdCEl = document.getElementById("SpdC");
    if (spdCEl) spdCEl.checked = true;

    DrawMap();
    Draw88();
    DrawCompass();
    VORDME();

    bScoreWin = false;
    ScoreClose();
};

window.HelpPage = function () {
    HelpWin = window.open('DFsearch.html', '', '_self location=yes menubar=yes toolbar=yes resizable=yes status=yes');
};

function Results() {
    if (bScoreWin == false) {
        var ACdistNM = ACdistpx / pscale;
        var Eda = DA(ACx, ACy, ELTx, ELTy, pscale);
        var Quad;
        if (Eda[1] > 0) { Quad = "NE"; }
        if (Eda[1] > 90) { Quad = "SE"; }
        if (Eda[1] > 180) { Quad = "SW"; }
        if (Eda[1] > 270) { Quad = "NW"; }
        var ELTb = Eda[1] - Hdg;

        if (ELTshow == true) { score = 50; }
        ELTshow = true;
        score += Math.round(ACdistNM - ACstart - DFdist + 3 * ELTdme);

        var tScore = "<div style='font-weight:normal;background:#ffff66;text-align:center;'>";
        if (Eda[0] <= FindDist) {
            tScore += "<p>You found it!<br>Your Score: " + score;
        } else {
            tScore += "Good try!";
        }
        tScore += "<br>Distance Flown: " + Math.round(ACdistNM) + " nm";
        tScore += "<br>ELT heard after " + Math.round(ACstart) + " nm of searching.";
        tScore += "<br>You flew ";
        if (ACdistNM < DFdist) {
            tScore += ACdistNM;
        } else {
            tScore += Math.round(ACdistNM - DFdist);
        }
        tScore += " nm after signal acquisition.";
        if (Eda[0] != 0) {
            tScore += "<br>The ELT is on a bearing of " + ELTb + "&ordm;";
            tScore += " at " + Eda[0] + " nm , " + Quad + " of your location, ";
        } else {
            tScore += "<br>You are right over the ELT!!";
        }

        var Vda = DA(VORx, VORy, ELTx, ELTy, pscale);
        tScore += " at " + Math.round(Vda[0]) + " nm DME on the " + Vda[1] + "&ordm; radial of the VOR.";

        tScore += "<br>";
        if (Eda[0] <= FindDist + 1) { tScore += "You should be able to see this one out the window."; }
        if (Eda[0] > FindDist + 1 && Eda[0] <= FindDist + 2) { tScore += "A little more work and you'll trip over it."; }
        if (Eda[0] > FindDist + 2 && Eda[0] <= FindDist + 4) { tScore += "Getting closer, but you still need more practice."; }
        if (Eda[0] > FindDist + 4 && Eda[0] <= FindDist + 6) { tScore += "Its more than a stone's throw away!"; }
        if (Eda[0] > FindDist + 6 && Eda[0] <= FindDist + 8) { tScore += "At this range, you need to call in the ground team to find it."; }
        if (Eda[0] > FindDist + 8) { tScore += "Maybe you should head back to base and let a real pilot find it."; }

        tScore += "<br>";
        if (ACdistNM < 20) { tScore += "That was a quick one!"; }
        if (ACdistNM >= 20 && ACdistNM < 30) { tScore += "You did'nt go very far that time!"; }
        if (ACdistNM >= 30 && ACdistNM < 60) { tScore += "You're getting pretty good at this!"; }
        if (ACdistNM >= 60 && ACdistNM < 80) { tScore += "You'll could zero in on it faster!"; }
        if (ACdistNM >= 80 && ACdistNM < 100) { tScore += "You've been over almost every inch of that map!"; }
        if (ACdistNM >= 100) { tScore += "With all this flight time are you sure you still have any gas?!"; }

        if (ACdistpx == 0) { score = 200; }
        if (score < 0) { score = 0; }

        tScore += "<br>Your Rating: ";
        if (score <= 5) { tScore += "Command Pilot"; }
        if (score > 5 && score <= 10) { tScore += "Mission Pilot"; }
        if (score > 10 && score <= 40) { tScore += "Observer"; }
        if (score > 40 && score <= 60) { tScore += "Weekend Wonder"; }
        if (score > 60) { tScore += "* * Are you ready for one yet? * *"; }

        tScore += "<br><input type='button' name='Close' value='Close' style='height:30px; background-color:red; color:yellow;' onClick='window.close()'></p>";
        tScore += "</div>";

        ScorePop(tScore);
        bScoreWin = true;
    }
}

function ScorePop(msg) {
    ScoreWin = window.open('', 'Results', 'toolbar=no,status=no,location=no,width=300,height=400');
    if (ScoreWin) {
        ScoreWin.document.write(msg);
    }
}

function ScoreClose() {
    if (ScoreWin != null && !ScoreWin.closed) {
        ScoreWin.close();
    }
}

// ============================================================================
// CALCULATIONS & CANVAS DRAWING
// ============================================================================

window.VORDME = function () {
    var DistRad = DA(VORx, VORy, ACx, ACy, pscale);
    dDME = DistRad[0];
    rVOR = DistRad[1];
    var rEl = document.getElementById('sRadial');
    var dEl = document.getElementById('sDME');
    if (rEl) rEl.innerHTML = rVOR;
    if (dEl) dEl.innerHTML = dDME;
};

function DA(a1, b1, a2, b2, dscale) {
    var x1 = a1;
    var y1 = b1;
    var x2 = a2;
    var y2 = b2;
    var dist = (Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2))) / dscale;

    if (x2 - x1 == 0) { x2 = x2 + 0.001; }
    var brg = 90 + ((180 / 3.14) * Math.atan((y2 - y1) / (x2 - x1)));
    if ((x2 - x1) < 0) { brg = brg + 180; }
    if (brg < 0) { brg = brg + 360; }

    dist = Math.round(dist);
    brg = Math.round(brg);
    return [dist, brg];
}

window.DrawMap = function () {
    var c = document.getElementById("myMap");
    if (!c) return;
    var ctx = c.getContext("2d");
    c.height = Maph;
    c.width = Mapw;

    ctx.clearRect(0, 0, Mapw, Maph);

    // VOR Center Box
    ctx.fillStyle = "white";
    ctx.fillRect(VORx - sDME / 2, VORy - sDME / 2, sDME, sDME);
    ctx.strokeStyle = "#666666";
    ctx.fillStyle = "#666666";
    ctx.strokeRect(VORx - sDME / 2, VORy - sDME / 2, sDME, sDME);
    ctx.fillRect(VORx - 1, VORy - 1, 2, 2);
    ctx.beginPath();
    ctx.moveTo(VORx - 2, VORy + sDME / 2);
    ctx.lineTo(VORx - sDME / 2, VORy + 2);
    ctx.moveTo(VORx - sDME / 2, VORy - 2);
    ctx.lineTo(VORx - 2, VORy - sDME / 2);
    ctx.moveTo(VORx + 2, VORy - sDME / 2);
    ctx.lineTo(VORx + sDME / 2, VORy - 2);
    ctx.moveTo(VORx + sDME / 2, VORy + 2);
    ctx.lineTo(VORx + 2, VORy + sDME / 2);
    ctx.stroke();

    // VOR Ring
    ctx.strokeStyle = "#4444ff";
    ctx.beginPath();
    ctx.arc(VORx, VORy, sVOR, 0, 2 * Math.PI);
    for (var i = 0; i <= 2 * Math.PI; i += Math.PI / 6) {
        ctx.moveTo(VORx + Math.cos(i) * sVOR, VORy + Math.sin(i) * sVOR);
        ctx.lineTo(VORx + Math.cos(i) * sVOR * .9, VORy + Math.sin(i) * sVOR * .9);
    }
    ctx.moveTo(VORx, VORy - sDME / 2);
    ctx.lineTo(VORx, VORy - sVOR);
    ctx.lineTo(VORx - 2, VORy - sVOR + 6);
    ctx.moveTo(VORx, VORy - sVOR);
    ctx.lineTo(VORx + 2, VORy - sVOR + 6);
    ctx.stroke();

    // Aircraft Rendering
    var HdgRf = ((Hdg) * Math.PI / 180) - Math.PI / 2;
    var HdgRw = (Hdg) * Math.PI / 180;
    var ACw = ACsize * .45;
    var ACf = ACsize;
    var ACt = ACsize * .2;

    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ACx - ACw * Math.cos(HdgRw), ACy - ACw * Math.sin(HdgRw));
    ctx.lineTo(ACx + ACw * Math.cos(HdgRw), ACy + ACw * Math.sin(HdgRw));

    ctx.moveTo(ACx + (ACf * .3 * Math.cos(HdgRf)), ACy + ACf * .3 * Math.sin(HdgRf));
    ctx.lineTo(ACx - (ACf * .7 * Math.cos(HdgRf)), ACy - ACf * .7 * Math.sin(HdgRf));

    ctx.moveTo((ACx - .5 * ACsize * Math.sin(HdgRw)) - ACt * Math.cos(HdgRw), (ACy + .5 * ACsize * Math.cos(HdgRw)) - ACt * Math.sin(HdgRw));
    ctx.lineTo((ACx - .5 * ACsize * Math.sin(HdgRw)) + ACt * Math.cos(HdgRw), (ACy + .5 * ACsize * Math.cos(HdgRw)) + ACt * Math.sin(HdgRw));
    ctx.stroke();

    // ELT Target Marker
    if (ELTshow == true) {
        ctx.fillStyle = "yellow";
        ctx.strokeStyle = "black";
        ctx.fillRect(ELTx - 4, ELTy - 4, 8, 8);
        ctx.fillStyle = "red";
        ctx.strokeRect(ELTx - 4, ELTy - 4, 8, 8);
        ctx.fillRect(ELTx - 1, ELTy - 1, 2, 2);
        ctx.strokeStyle = "#ffffcc";
        ctx.beginPath();
        ctx.arc(ELTx, ELTy, 20, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ELTx, ELTy, 40, 0, 2 * Math.PI);
        ctx.stroke();
    }
};

window.DrawCompass = function () {
    var cmps = document.getElementById("Compass");
    var hdgTextEl = document.getElementById("sHdgVal");
    if (hdgTextEl) hdgTextEl.innerHTML = Hdg + "°";

    if (!cmps) return;
    var cpx = cmps.getContext("2d");
    cmps.height = Ch;
    cmps.width = Cw;

    cpx.strokeStyle = "#ffffff";
    cpx.lineWidth = 2;
    cpx.beginPath();
    cpx.moveTo(Cw / 2, Ch);
    cpx.lineTo(Cw / 2, Ch - 15);
    cpx.moveTo(Cw / 4, Ch);
    cpx.lineTo(Cw / 4, Ch - 15);
    cpx.moveTo(3 * Cw / 4, Ch);
    cpx.lineTo(3 * Cw / 4, Ch - 15);

    cpx.moveTo(Cw / 8, Ch);
    cpx.lineTo(Cw / 8, Ch - 8);
    cpx.moveTo(3 * Cw / 8, Ch);
    cpx.lineTo(3 * Cw / 8, Ch - 8);
    cpx.moveTo(5 * Cw / 8, Ch);
    cpx.lineTo(5 * Cw / 8, Ch - 8);
    cpx.moveTo(7 * Cw / 8, Ch);
    cpx.lineTo(7 * Cw / 8, Ch - 8);

    cpx.stroke();
    cpx.font = "24px Arial";
    cpx.fillStyle = "#ffffff";
    cpx.textAlign = "center";
    cpx.fillText(Hdg, Cw / 2, Ch / 2 + 1);
};

window.Draw88 = function () {
    var cmdf = document.getElementById("DFmeter");
    if (!cmdf) return;
    var cdf = cmdf.getContext("2d");
    cmdf.height = DFh;
    cmdf.width = DFw;

    var DF88brg = DA(ACx, ACy, ELTx, ELTy, pscale);
    var ELTd = DF88brg[0];
    var ELTa = DF88brg[1];
    var ELTb = -ELTa + Hdg;

    if (ELTb < 0) { ELTb = ELTb + 360; }
    if (ELTb > 180) { ELTb = ELTb - 360; }

    var SigStr = Math.exp(-ELTd / 20);

    updateELTAudio(SigStr);

    if (SigStr > .1) { cdf.fillStyle = "red"; }
    else { cdf.fillStyle = "black"; }
    cdf.fillRect(DFw - 10, 0, 10, 10);

    if (DFmode == 1) {
        var Ndlb = (Math.exp(-ELTd / 20) * Math.sin(3.14 * ELTb / 180)) * 0.90;
        cdf.fillStyle = "blue";
        cdf.fillRect(DFw / 2 - 8, 0, 16, DFh);

        cdf.strokeStyle = "red";
        cdf.lineWidth = 4;
        cdf.beginPath();
        cdf.moveTo(DFw / 2 - DFw * Ndlb / 2, DFh);
        cdf.lineTo(DFw / 2 - DFw * Ndlb / 2, 0);
        cdf.stroke();
    }

    if (DFmode == 2) {
        cdf.strokeStyle = "black";
        cdf.lineWidth = 1;
        cdf.beginPath();
        cdf.moveTo(0, DFh / 2);
        cdf.lineTo(DFw, 0);
        cdf.moveTo(0, DFh / 2);
        cdf.lineTo(DFw, DFh);
        cdf.stroke();

        cdf.beginPath();
        cdf.lineWidth = 4;
        cdf.strokeStyle = "red";
        cdf.moveTo(SigStr * DFw, 0);
        cdf.lineTo(SigStr * DFw, DFh);
        cdf.stroke();
    }

    if (SigStr > 0.1) {
        if (ACstart == 0) { ACstart = ACdistpx / pscale; }
        if (DFdist == 0) { DFdist = ELTd; }
    }
};

window.setDFMode = function (mode) {
    DFmode = mode;
    Draw88();
};

window.setSpeed = function (spd) {
    Spd = spd;
};
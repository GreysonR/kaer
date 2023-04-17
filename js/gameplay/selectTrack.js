"use strict";
var modeName = "";
var trackName = "";
var homeOpen = true;

function openHome() {
	document.getElementById("homeWrapper").classList.add("active");
	document.getElementById("modeSelect").classList.add("active");
	document.getElementById("trackSelect").classList.remove("active");
	homeOpen = true;
}
function closeHome() {
	document.getElementById("homeWrapper").classList.remove("active");
	homeOpen = false;
}
function selectMode(newMode) {
	document.getElementById("modeSelect").classList.remove("active");
	let modeId = newMode === "time" || newMode === "drift" ? "track" : newMode;
	document.getElementById(modeId + "Select").classList.add("active");

	modeName = newMode;
}
function selectTrack(newTrack) {
	let newMode = modeName;

	laps = 0;
	raceStarted = false;
	lapStartTime = 0;

	closeHome();
	unloadMap();
	
	modeName = newMode;
	trackName = newTrack;

	document.getElementById("overhead").className = newMode;
	document.body.classList.remove("rally");

	let bestTimeElem = document.getElementById("bestTime");
	let timerElem = document.getElementById("timer");
	if (modeName === "time") {
		bestTimeElem.innerHTML = "Best: 0:00";
		timerElem.innerHTML = "0:00";
	}
	else if (modeName === "drift") {
		bestTimeElem.innerHTML = "Best: 0.0";
		timerElem.innerHTML = "0.0";
	}

	if (newTrack.includes("chase")) {
		loadMap(chaseTracks[newTrack], trackName);
	}
	else if (newTrack.includes("rally")) {
		document.body.classList.add("rally");
		loadRally(newTrack);
		modeName = "rally";
		trackName = "rally";
	}
	else {
		loadMap(timedTracks[newTrack], trackName);
	}
}

window.addEventListener("load", () => {
	// selectTrack("chase2");
	// modeName = "chase";
	// trackName = "chase2";
});
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
	document.getElementById("trackSelect").classList.add("active");

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

	loadMap(timedTracks[newTrack]);
}
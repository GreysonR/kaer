"use strict";

function selectRally(rallyName) {
	let newMode = modeName;

	laps = 0;
	raceStarted = false;
	lapStartTime = 0;

	closeHome();
	unloadMap();
	
	modeName = newMode;
	trackName = rallyName;
	document.getElementById("overhead").className = newMode;

	document.body.classList.add("rally");
	loadRally(rallyName);
	modeName = "rally";
	trackName = "rally";
}
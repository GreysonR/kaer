"use strict";

function loadMap() {
	let numRally = 1;
	let mapElem = document.getElementById("map");
	let height = 0;

	for (let i = numRally; i >= 1; i--) {
		let rallyName = "rally" + i;
		let stages = rallyStages[rallyName];
		let curHeight = stages.height / stages.width * 100;

		let rallyElem = createElement("div", {
			class: "rally",
			"background-image": `url("../img/map/map${ i }.png")`,
			parent: mapElem,
			style: {
				height: (height + curHeight) + "vw",
			}
		});

		for (let stageNum = 0; stageNum < stages.homePoints.length; stageNum++) {
			let point = stages.homePoints[stageNum];
			let elem = createElement("div", {
				class: "homePoint",
				parent: rallyElem,
				style: {
					top: (point.y / stages.width * 100) + "vw",
					left: (point.x / stages.width * 100) + "vw",
				}
			});

			elem.addEventListener("click", () => {
				console.log(rallyName, stageNum);
				openStageInfo(rallyName, stageNum);
			});
		}

		height += curHeight;
	}

	mapElem.scrollTo(0, mapElem.scrollHeight);
}
// window.addEventListener("load", loadMap);

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
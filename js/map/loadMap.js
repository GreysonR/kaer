"use strict";

let mapBodies = {
	env: {
		wall: function({ x, y, vertices }) {
			for (let i = 0; i < vertices.length; i++) {
				vertices[i] = new vec(vertices[i]);
			}
			let obj = Bodies.fromVertices(vertices, new vec(x, y), {
				static: true,
				hasCollisions: true,

				render: {
					background: "#ffffff",
					round: 10,
				}
			});
			return obj;
		},
		checkpoint: function({ x, y, vertices, index }) {
			for (let i = 0; i < vertices.length; i++) {
				vertices[i] = new vec(vertices[i]);
			}
			let obj = Bodies.fromVertices(vertices, new vec(x, y), {
				static: true,
				hasCollisions: true,
				isSensor: true,
				index: index,

				render: {
					visible: false,
					background: "#5E9555",
					layer: -1
				}
			});
			obj.on("collisionEnd", handleCheckpointCollision);
			checkpoints[index] = obj;

			if (index === 0) {
				obj.render.visible = true;
			}

			return obj;
		},
		spawn: function({ x, y, angle }) {
			car.setAngle(angle);
			car.setPosition(new vec(x, y));
			lastFov.length = 0;
			lastPos.length = 0;

			curMap.spawn.position = new vec(x, y);
			curMap.spawn.angle = angle;
		}
	}
}
let timedTracks = {};
var curMap = {
	spawn: {
		position: new vec(0, 0),
		angle: 0,
	},
	objs: []
}


function loadMap(map) {
	checkpoints.length = 0;
	for (let categoryName of Object.keys(map)) {
		if (!mapBodies[categoryName]) continue;
	
		let category = map[categoryName];
		for (let typeName of Object.keys(category)) {
			let objFunc = mapBodies[categoryName][typeName];
			if (!objFunc) continue;
			let types = category[typeName];
	
			for (let options of types) {
				let obj = objFunc(options);
				if (obj) {
					curMap.objs.push(obj);
				}
			}
		}
	}
}
function unloadMap() {
	for (let obj of curMap.objs) {
		obj.delete();
	}
	curMap.objs.length = 0;
	trackName = "";
	modeName = "";

	checkpoints.length = 0;
	curCheckpoint = -1;
	laps = 0;
	raceStarted = false;
	lapStartTime = 0;
	bestLapTime = Infinity;
	driftScore = 0;
	bestDriftScore = 0;

	Render.off("beforeRender", updateRaceTimer);
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
}

function resetCar() {
	let { position, angle } = curMap.spawn;
	car.setPosition(new vec(position));
	car.setAngle(angle);
	
	curCheckpoint = -1;
	laps = 0;
	raceStarted = false;
	lapStartTime = 0;
	driftScore = 0;

	Render.off("beforeRender", updateRaceTimer);
	let timerElem = document.getElementById("timer");
	if (modeName === "time") {
		timerElem.innerHTML = "0:00";
	}
	else if (modeName === "drift") {
		timerElem.innerHTML = "0.0";
	}
}
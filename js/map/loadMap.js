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
					visible: true,
					background: "#5E9555",
					layer: -1
				}
			});

			return obj;
		},
		spawn: function({ x, y, angle }) {
			car.setAngle(angle);
			car.setPosition(new vec(x, y));
			lastFov.length = 0;
			lastPos.length = 0;

			curMap.spawn.position = new vec(x, y);
			curMap.spawn.angle = angle;
		},
		path: function({ x, y, vertices }) {
			let { path } = curMap;
			let pos = new vec(x, y);
			for (let v of vertices) {
				path.push((new vec(v)));
			}
		}
	}
}
let timedTracks = {};
var curMap = {
	spawn: {
		position: new vec(0, 0),
		angle: 0,
	},
	objs: [],
	path: [],
	completePercent: 0,
	maxLapPercent: 0,
}


function loadMap(map) {
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
	curMap.path.length = 0;
	curMap.maxLapPercent = 0;
	trackName = "";
	modeName = "";

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

function getPercentComplete() {
	let { path } = curMap;
	let len = path.length;
	if (len <= 1) return 0;

	let carPos = car.position;
	let minDist = Infinity;
	let curLen = 0;
	let totalLen = 0;
	let percent = 0;
	
	for (let i = 0; i < len; i++) {
		let cur = path[i];
		let next = path[(i + 1) % len];
		totalLen += cur.sub(next).length;
	}

	for (let i = 0; i < len; i++) {
		let cur = path[i];
		let next = path[(i + 1) % len];
		let diff = next.sub(cur);
		let carDiff = carPos.sub(cur);
		let norm = diff.normalize();
		let perp = norm.normal();

		let normDot = carDiff.dot(norm);
		let perpDot = carDiff.dot(perp);
		let dist = Math.sqrt((normDot - diff.length/2) ** 2 + perpDot ** 2);

		if (dist < minDist) {
			minDist = dist;
			percent = curLen / totalLen + normDot / totalLen;

		}
		curLen += diff.length;
	}

	return percent;
}

Render.on("beforeRender", () => {
	let completeElem = document.getElementById("complete");
	let completePercent = curMap.maxLapPercent;

	completeElem.style.width = completePercent * 100 + "%";
});
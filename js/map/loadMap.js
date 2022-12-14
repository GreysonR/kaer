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
				restitution: 0,

				render: {
					visible: false,
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
					background: "#FC9473",
					layer: -2,
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
	},
}
let timedTracks = {};
let allMaps = {
	track1: {
		objs: [
			{ // walls
				sprite: "track1/walls",
				width: 7295.91,
				height: 5624,
				position: new vec(7295.91/2 + 10, 5624/2 - 25),
				layer: 1,
			},
			{ // track
				sprite: "track1/track",
				width: 7295.91,
				height: 5624,
				position: new vec(7295.91/2 + 10, 5624/2 - 25),
				layer: -3,
			},
			{ // track outline
				sprite: "track1/trackOutline",
				width: 7295.91,
				height: 5624,
				position: new vec(7295.91/2 + 10, 5624/2 - 25),
				layer: -1,
			},
			{ // environment background
				sprite: "track1/envBackground",
				width:  9827.5,
				height: 8963.5,
				position: new vec(9827.5/2 - 1220, 8963.5/2 - 1580),
				layer: -4,
			},
		]
	},
	track2: {
		objs: [
			{ // walls
				sprite: "track2/walls",
				width: 8527,
				height: 6776,
				position: new vec(8527/2 + 45, 6776/2 - 55),
				layer: 1,
			},
			{ // track
				sprite: "track2/track",
				width:  8527,
				height: 6776,
				position: new vec(8527/2 + 45, 6776/2 - 55),
				layer: -3,
			},
			{ // track outline
				sprite: "track2/trackOutline",
				width:  8527,
				height: 6776,
				position: new vec(8527/2 + 45, 6776/2 - 55),
				layer: -1,
			},
			{ // environment background
				sprite: "track2/envBackground",
				width:  10803,
				height: 9255,
				position: new vec(10803/2 - 1110, 9255/2 - 1450),
				layer: -4,
			},
		]
	},
	track3: {
		objs: [
			{ // walls
				sprite: "track3/walls",
				width: 6194.5,
				height: 6207.26,
				position: new vec(6194.5/2 - 25, 6207.26/2 - 30),
				layer: 1,
			},
			{ // track
				sprite: "track3/track",
				width:  6197,
				height: 6211,
				position: new vec(6197/2 - 25, 6211/2 - 22),
				layer: -3,
			},
			{ // track outline
				sprite: "track3/trackOutline",
				width:  6197,
				height: 6211,
				position: new vec(6197/2 - 25, 6211/2 - 22),
				layer: -1,
			},
			{ // environment background
				sprite: "track3/envBackground",
				width:  9806,
				height: 8956,
				position: new vec(9806/2 - 1830, 8956/2 - 1230),
				layer: -4,
			},
		]
	}
}
var curMap = {
	spawn: {
		position: new vec(0, 0),
		angle: 0,
	},
	visual: {
		walls: [],
	},
	objs: [],
	path: [],
	completePercent: 0,
	maxLapPercent: 0,
}


function loadMap(map, name) {
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

	// add extra visual stuff
	let { objs } = allMaps[name];
	for (let obj of objs) {
		let { width, height, position, sprite, layer } = obj;
		let body = Bodies.rectangle(width, height, position, {
			static: true,
			hasCollisions: false,
	
			render: {
				visible: true,
				background: "#5E9555",
				sprite: sprite,
				layer: layer,
				opacity: 1,
			}
		});
		
		curMap.objs.push(body);
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

	curMap.visual.walls.length = 0;
	
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
	curMap.maxLapPercent = 0;
	curMap.percent = 0;

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
		let normDist = Math.max(0, Math.abs(normDot - diff.length/2) - diff.length / 2);
		let dist = Math.sqrt(perpDot ** 2 + normDist ** 2);

		if (dist < minDist) {
			minDist = dist;
			percent = curLen / totalLen + normDot / totalLen;

		}
		curLen += diff.length;
	}

	return percent;
}

Render.on("afterRender", () => {
	let completeElem = document.getElementById("complete");
	let completePercent = curMap.maxLapPercent;

	completeElem.style.width = completePercent * 100 + "%";

	/*
	// visualize progress path
	ctx.beginPath();
	let i = 0;
	for (let pt of curMap.path) {
		if (i === 0) {
			ctx.moveTo(pt.x, pt.y);
		}
		else {
			ctx.lineTo(pt.x, pt.y);
		}
		
		i++;
	}

	ctx.strokeStyle = "cyan";
	ctx.lineWidth = 10;
	ctx.stroke();*/
});
"use strict";

let mapBodies = {
	env: {
		wall: function({ x, y, position, vertices }) {
			for (let i = 0; i < vertices.length; i++) {
				vertices[i] = new vec(vertices[i]);
			}
			if (position) {
				x = position.x;
				y = position.y;
			}
			let obj = Bodies.fromVertices(vertices, new vec(x, y), {
				isStatic: true,
				hasCollisions: true,
				restitution: 0,

				render: {
					visible: false,
					background: "#ffffff",
					round: 0,
				}
			});
			return obj;
		},
		checkpoint: function({ x, y, vertices, index }) {
			for (let i = 0; i < vertices.length; i++) {
				vertices[i] = new vec(vertices[i]);
			}
			let obj = Bodies.fromVertices(vertices, new vec(x, y), {
				isStatic: true,
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
			lastFov.length = 0;
			lastPos.length = 0;

			curMap.spawn.position = new vec(x, y);
			curMap.spawn.angle = angle;

			resetCar();
		},
		path: function({ vertices }) {
			let { path } = curMap;
			for (let v of vertices) {
				path.push((new vec(v)));
			}
		},
		policeSpawns: function({ vertices }) {
			for (let v of vertices) {
				let pos = new vec(v);
				curMap.policeSpawnPoints.push(pos);
				policeSpawnPoints.addBody(pos);
			}
		},
		tree: function({ x, y }) {
			let obj = Bodies.circle(70, new vec(x, y), {
				numSides: 6,
				isStatic: true,
				hasCollisions: true,

				render: {
					visible: false,
					background: "#592B21",
					layer: 0,
				}
			});
			return obj;
		},
		roadHitbox: function({ x, y, position, vertices }) {
			for (let i = 0; i < vertices.length; i++) {
				vertices[i] = new vec(vertices[i]);
			}
			if (position) {
				x = position.x;
				y = position.y;
			}
			let obj = Bodies.fromVertices(vertices, new vec(x, y), {
				material: "road",
				hasCollisions: false,
				isStatic: true,

				render: {
					visible: true,
					background: "#42515560",
					layer: -1,
				}
			});
			obj.delete();
			SurfaceGrid.addBody(obj);

			return obj;
		},
		innerHitbox: function({ x, y, position, vertices }) {
			for (let i = 0; i < vertices.length; i++) {
				vertices[i] = new vec(vertices[i]);
			}
			if (position) {
				x = position.x;
				y = position.y;
			}
			let obj = Bodies.fromVertices(vertices, new vec(x, y), {
				hasCollisions: false,
				isStatic: true,

				render: {
					visible: true,
					background: "#FA5F3D60",
					layer: -1,
				}
			});
			obj.delete();
			innerHitboxGrid.addBody(obj);

			return obj;
		},
		road: function(path) {
			curMap.road.push(...path);
		},
		dirtHitbox: function({ x, y, position, vertices }) {
			for (let i = 0; i < vertices.length; i++) {
				vertices[i] = new vec(vertices[i]);
			}
			if (position) {
				x = position.x;
				y = position.y;
			}
			let obj = Bodies.fromVertices(vertices, new vec(x, y), {
				material: "dirt",
				hasCollisions: false,
				isStatic: true,

				render: {
					visible: false,
					background: "#42515590",
					layer: -1,
				}
			});
			obj.delete();
			SurfaceGrid.addBody(obj);

			return obj;
		},
		coin: function({ x, y }) {
			let obj = Bodies.circle(50, new vec(x, y), {
				numSides: 4,
				isStatic: true,
				hasCollisions: true,
				isSensor: true,

				render: {
					visible: true,
					background: "#FF7D1E",
					border: "#8B6955",
					borderWidth: 10,

					sprite: "coin",
					spriteWidth: 40,
					spriteHeight: 40,

					layer: -1,
				}
			});

			obj.on("collisionActive", event => {
				let { bodyA, bodyB, depth } = event;
				let otherBody = bodyA === obj ? bodyB : bodyA;
				
				if (otherBody === car) {
					obj.render.sprite = "coinClaimed";
					obj.setCollisions(false);
				}
			});
			return obj;
		},
		job: function({ vertices }) {
			let [ start, end ] = vertices;

			let startObj = Bodies.circle(300, new vec(start), {
				numSides: 8,
				isStatic: true,
				isSensor: true,
				collisionStartTime: 0,
				jobTaken: false,

				render: {
					layer: -1,
					background: "#29BCFB30",
					border: "#4DAED890",
					borderWidth: 30,
				}
			});
			curMap.jobStarts.push(startObj);
			curMap.objs.push(startObj);

			let collisionDuration = 600;
			function renderTimerBar() {
				let obj = startObj.jobTaken ? endObj : startObj;
				let w = 150;
				let h = 30;
				let pos = obj.position;
				let p = (Performance.lastUpdate - obj.collisionStartTime) / collisionDuration

				// bg
				ctx.beginPath();
				ctx.rect(pos.x - w/2, pos.y, w, h);
				ctx.fillStyle = "#2B2B2B40";
				ctx.fill();

				// bar
				ctx.beginPath();
				ctx.rect(pos.x - w/2, pos.y, w * p, h);
				ctx.fillStyle = startObj.jobTaken ? "#F9AE78" : "#4DAED8";
				ctx.fill();
			}
			function renderEndArrow() {
				let diff = car.position.sub(endObj.position);
				if (diff.length > 600) {
					let angle = diff.angle - Math.PI/2;
					let vertices = [{"x":19,"y":0},{"x":37,"y":37},{"x":19,"y":32},{"x":0,"y":37}];
					vertices = vertices.map(v => new vec(v).sub2({ x: 37/2, y: 27/2 }).mult2(0.7).add2({ x: 0, y: -150}).rotate2(angle).add(car.position));
	
					ctx.beginPath();
					Render.roundedPolygon(vertices, 5);
					ctx.fillStyle = "#F9A568";
					ctx.fill();
				}
			}
			
			startObj.on("collisionStart", event => {
				let { bodyA, bodyB } = event;
				let otherBody = bodyA === startObj ? bodyB : bodyA;

				if (otherBody === car) {
					startObj.collisionStartTime = Performance.lastUpdate;
					Render.on("beforeLayer0", renderTimerBar);
				}
			});
			startObj.on("collisionEnd", event => {
				let { bodyA, bodyB } = event;
				let otherBody = bodyA === startObj ? bodyB : bodyA;

				if (otherBody === car) {
					Render.off("beforeLayer0", renderTimerBar);
				}
			});
				
			startObj.on("collisionActive", event => {
				let { bodyA, bodyB } = event;
				let otherBody = bodyA === startObj ? bodyB : bodyA;
				
				if (otherBody === car && Performance.lastUpdate - startObj.collisionStartTime >= collisionDuration) {
					startObj.delete();
					startObj.jobTaken = true;
					curMap.curJob = startObj;
					Render.on("afterRender", renderEndArrow);

					for (let obj of curMap.jobStarts) {
						if (!obj.removed) {
							obj.delete();
						}
						endObj.add();
						curMap.jobsStarted++;
					}
				}
			});

			
			let endObj = Bodies.circle(300, new vec(end), {
				numSides: 8,
				isStatic: true,
				isSensor: true,
				collisionStartTime: 0,
				jobTaken: false,

				render: {
					layer: -1,
					background: "#FB812930",
					border: "#D8874D90",
					borderWidth: 30,
				}
			});
			endObj.delete();
			curMap.objs.push(endObj);
			endObj.on("delete", () => {
				Render.off("afterRender", renderEndArrow);
			});
			endObj.on("collisionStart", event => {
				let { bodyA, bodyB } = event;
				let otherBody = bodyA === endObj ? bodyB : bodyA;

				if (otherBody === car) {
					endObj.collisionStartTime = Performance.lastUpdate;
					Render.on("beforeLayer0", renderTimerBar);
				}
			});
			endObj.on("collisionEnd", event => {
				let { bodyA, bodyB } = event;
				let otherBody = bodyA === endObj ? bodyB : bodyA;

				if (otherBody === car) {
					Render.off("beforeLayer0", renderTimerBar);
				}
			});
			endObj.on("collisionActive", event => {
				let { bodyA, bodyB } = event;
				let otherBody = bodyA === endObj ? bodyB : bodyA;
				
				if (otherBody === car && Performance.lastUpdate - endObj.collisionStartTime >= collisionDuration) {
					endObj.delete();
					endObj.jobComplete = true;
					curMap.curJob = null;
					curMap.jobsCompleted++;
					Render.off("afterRender", renderEndArrow);

					for (let obj of curMap.jobStarts) {
						if (!obj.jobTaken) {
							obj.add();
						}
					}
				}
			});
		},
		trafficCone: function({ x, y, angle }) {
			let obj = Bodies.rectangle(49, 49, new vec(x, y), {
				isStatic: false,
				frictionAngular: 0.05,
				frictionAir: 0.08,
				mass: 0.6,
				hasCollisions: true,
				render: {
					visible: true,
					background: "#E35F26",
					sprite: "roadBlock/trafficCone.png",
					layer: 0,
				}
			});
			obj.setAngle(angle);
			return obj;
		},
	},
}
let timedTracks = {};
let chaseTracks = {};
let rallyTracks = {
	rally1: [],
};
let allMaps = {
	track1: {
		objs: [
			{ // walls
				sprite: "track1/walls",
				width: 9806,
				height: 8964,
				position: new vec(9806/2, 8964/2),
				layer: 1,
			},
			{ // track
				sprite: "track1/track",
				width: 9806,
				height: 8964,
				position: new vec(9806/2, 8964/2),
				layer: -3,
			},
			{ // track outline
				sprite: "track1/trackOutline",
				width: 9806,
				height: 8964,
				position: new vec(9806/2, 8964/2),
				layer: -1,
			},
			{ // environment background
				sprite: "track1/envBackground",
				width: 9806,
				height: 8964,
				position: new vec(9806/2, 8964/2),
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
	},

	chase1: {
		objs: [
			{ // foreground
				sprite: "chase1/envForeground",
				width:  7762,
				height: 5600,
				position: new vec(7762/2, 5600/2),
				layer: 2,
			},
			{ // background
				sprite: "chase1/envBackground",
				width:  7762,
				height: 5600,
				position: new vec(7762/2, 5600/2),
				layer: -4,
			},
		]
	},
	chase2: { objs: [] },
	rally1S1: { objs: [
		{
			sprite: "rally1/section1/rally1S1FG.png",
			width:  13918,
			height: 15768,
			position: new vec(13918/2, 15768/2),
			layer: 2,
		},
		{
			sprite: "rally1/section1/rally1S1BG.png",
			width:  13918,
			height: 15768,
			position: new vec(13918/2, 15768/2),
			layer: -4,
		},
	] },
	rally1S2: { objs: [
		{
			sprite: "rally1/section2/rally1S2FG.png",
			width:  13918,
			height: 15768,
			position: new vec(13918/2, 15768/2),
			layer: 2,
		},
		{
			sprite: "rally1/section2/rally1S2BG.png",
			width:  13918,
			height: 15768,
			position: new vec(13918/2, 15768/2),
			layer: -4,
		},
	] },
	rally1S3: { objs: [
		{
			sprite: "rally1/section3/rally1S3FG.png",
			width:  13918,
			height: 15768,
			position: new vec(13918/2, 15768/2),
			layer: 2,
		},
		{
			sprite: "rally1/section3/rally1S3BG.png",
			width:  13918,
			height: 15768,
			position: new vec(13918/2, 15768/2),
			layer: -4,
		},
	] },
	rally1S4: { objs: [
		{
			sprite: "rally1/section4/rally1S4FG.png",
			width:  13918,
			height: 15768,
			position: new vec(13918/2, 15768/2),
			layer: 2,
		},
		{
			sprite: "rally1/section4/rally1S4BG.png",
			width:  13918,
			height: 15768,
			position: new vec(13918/2, 15768/2),
			layer: -4,
		},
	] },
	rally1Start: { objs: [
		{
			sprite: "rally1/start/rally1StartFG.png",
			width:  11781,
			height: 2232,
			position: new vec(11781/2, 2232/2),
			layer: 2,
		},
		{
			sprite: "rally1/start/rally1StartBG.png",
			width:  11781,
			height: 2232,
			position: new vec(11781/2, 2232/2),
			layer: -4,
		},
	] },
	rally1End: { objs: [
		{
			sprite: "rally1/end/rally1EndFG.png",
			width:  11781,
			height: 2232,
			position: new vec(11781/2, 2232/2),
			layer: 2,
		},
		{
			sprite: "rally1/end/rally1EndBG.png",
			width:  11781,
			height: 2232,
			position: new vec(11781/2, 2232/2),
			layer: -4,
		},
	] },
}

// load chase 2 objs
for (let x = 0; x < 7; x++) {
	let w = 2000;
	let h = 2000;
	for (let y = 0; y < 7; y++) {
		// background
		allMaps.chase2.objs.push(
			{
				sprite: `chase2/background-${x}-${y}.png`,
				width:  w,
				height: h,
				position: new vec((w - 0.4) * x + w/2, (h - 0.4) * y + h/2),
				layer: -4,
			}
		)
		
		// foreground
		allMaps.chase2.objs.push(
			{
				sprite: `chase2/foreground-${x}-${y}.png`,
				width:  w,
				height: h,
				position: new vec((w - 0.4) * x + w/2, (h - 0.4) * y + h/2),
				layer: 2,
			}
		)
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
	road: [],
	coins: [],
	policeSpawnPoints: [],

	jobStarts: [],
	curJob: null,
	jobsCompleted: 0,
	jobsStarted: 0,

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

			if (typeName === "road") {
				objFunc(types);
			}
			else {
				for (let options of types) {
					let obj = objFunc(options);
					if (obj) {
						curMap.objs.push(obj);
					}
				}
			}
		}
	}

	// reset skid marks
	for (let skid of Skid.all) {
		Skid.all.delete(skid);
	}
	// reset smoke
	for (let smoke of Smoke.all) {
		Smoke.all.delete(smoke);
	}

	// add extra visual stuff
	let objs = allMaps[name] ? allMaps[name].objs : [];
	for (let obj of objs) {
		let { width, height, position, sprite, layer } = obj;
		let body = Bodies.rectangle(width, height, position, {
			isStatic: true,
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

	// add event listeners
	if (modeName === "chase") {
		Render.on("afterRender", renderJobArrows);
		Render.on("afterRender", spawnEnemies);
	}
}
function unloadMap() {
	// Remove bodies from grids + world
	for (let obj of curMap.objs) {
		if (obj._Grids && obj._Grids[SurfaceGrid.id] !== undefined) {
			SurfaceGrid.removeBody(obj);
		}
		if (obj._Grids && obj._Grids[innerHitboxGrid.id] !== undefined) {
			innerHitboxGrid.removeBody(obj);
		}
		if (!obj.removed) {
			obj.delete();
		}
	}
	for (let obj of curMap.policeSpawnPoints) {
		policeSpawnPoints.removeBody(obj);
	}

	// reset cur map
	curMap.objs.length = 0;
	curMap.path.length = 0;
	curMap.coins.length = 0;
	curMap.policeSpawnPoints.length = 0;
	curMap.jobStarts.length = 0;
	curMap.maxLapPercent = 0;
	curMap.visual.walls.length = 0;
	curMap.road.length = 0;

	curMap.curJob = null;
	curMap.jobsCompleted = 0;
	curMap.jobsStarted = 0;
	
	// reset other vars
	laps = 0;
	raceStarted = false;
	lapStartTime = 0;
	bestLapTime = Infinity;
	driftScore = 0;
	bestDriftScore = 0;
	lastEnemyDeaths.length = 0;
	lastEnemySpawn = -25000;
	car.health = car.maxHealth;
	updateHealthUI()

	// remove enemies
	for (let obj of Enemy.all) {
		if (!obj.removed) {
			obj.delete();
		}
	}
	if (car.removed) {
		car.add();
	}

	// reset timer
	document.getElementById("overhead").className = "";
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

	// event listeners
	if (modeName === "chase") {
		Render.off("afterRender", renderJobArrows);
		Render.off("afterRender", spawnEnemies);
	}
	Render.off("beforeRender", updateRaceTimer);
	
	trackName = "";
	modeName = "";

	window.dispatchEvent(new CustomEvent("unloadMap"));
}

function resetCar() {
	if (modeName === "drift" || modeName === "time") {
		let { position, angle } = curMap.spawn;
		car.setAngle(angle);
		car.setPosition(new vec(position));

		car.angularVelocity = 0;
		car.velocity.set({x: 0, y: 0});
		
		laps = 0;
		raceStarted = false;
		lapStartTime = 0;
		driftScore = 0;
		curMap.maxLapPercent = 0;
		curMap.percent = 0;
		car.health = car.maxHealth;
		updateHealthUI();
	
		Render.off("beforeRender", updateRaceTimer);
		let timerElem = document.getElementById("timer");
		if (modeName === "time") {
			timerElem.innerHTML = "0:00";
		}
		else if (modeName === "drift") {
			timerElem.innerHTML = "0.0";
		}
	}
	else {
		let { position, angle } = curMap.spawn;
		car.setAngle(angle);
		car.setPosition(new vec(position));

		car.angularVelocity = 0;
		car.velocity.set({x: 0, y: 0});
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
		if (diff.length === 0) continue;
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
	ctx.stroke();/**/
});
"use strict";

var rallyStages = {
	rally1: {
		homePoints: [{"x":1007,"y":1254},{"x":1260,"y":937},{"x":910,"y":746},{"x":1060,"y":447},{"x":872,"y":221}],
		width: 2000,
		height: 1378,
		stages: [ // arrays with what section numbers are in each stage 
			[1],
			[2],
			[3,1],
			[4,2],
			[3,1,2],
		]
	}
}

var innerHitboxGrid = new Grid();
function getCarOnRally() {
	let pointA = car.position;
	let pointB = car.position.add({ x: Math.cos(car.angle) * 40, y: Math.sin(car.angle) * 40 });
	let bounds = innerHitboxGrid.getBounds(car);
	
	for (let x = bounds.min.x; x <= bounds.max.x; x++) {
		for (let y = bounds.min.y; y <= bounds.max.y; y++) {
			let n = innerHitboxGrid.pair(new vec(x, y));
			let node = innerHitboxGrid.grid[n];
			if (!node) continue;

			for (let body of node) {
				if (body.containsPoint(pointA) || body.containsPoint(pointB)) {
					return true;
				}
			}
		}
	}

	return false;
}

function loadRally(name, sections = []) {
	car.locked = true; // lock car so you can't move

	// - create map
	let finalTrack = [];
	let tracks = rallyTracks[name];

	if (sections.length > 0) {
		finalTrack = sections;
	}
	else {
		for (let i = 0; i < tracks.length; i++) {
			let track = tracks[i];
			track.name = name + "S" + (i + 1);
			let n = Math.floor(Math.random() * (finalTrack.length + 1));
			finalTrack.splice(n, 0, track);
		}
	
		finalTrack.length = 0;
		finalTrack.push(tracks[0]);
	}

	if (tracks.start) {
		tracks.start.name = "Start";
		finalTrack.unshift(tracks.start);
	}
	if (tracks.end) {
		tracks.end.name = "End";
		finalTrack.push(tracks.end);
	}
	

	// - load map
	let trackPosition = new vec(0, 0);
	let madeSpawn = false;
	let objsLoaded = 0;
	let objsTotal = finalTrack.reduce((total, cur, i, arr, ) => { // get number of objects (images) to load
		let objs = cur.name === "Start" || cur.name === "End" ? allMaps[name + cur.name].objs : allMaps[name + "S" + (rallyTracks[name].indexOf(cur) + 1)] ? allMaps[name + "S" + (rallyTracks[name].indexOf(cur) + 1)].objs : [];
		return total + objs.length;
	}, 0);

	for (let i = 0; i < finalTrack.length; i++) {
		let map = finalTrack[i];
		let start = new vec(map.road[0].a);
		let end = new vec(map.road[map.road.length - 1].d);
		let offset = start.mult(-1);
		trackPosition.add2(offset);
		// console.log(rallyTracks[name].indexOf(map) + 1);

		// add extra visual stuff
		let objs = map.name === "Start" || map.name === "End" ? allMaps[name + map.name].objs : allMaps[name + "S" + (rallyTracks[name].indexOf(map) + 1)] ? allMaps[name + "S" + (rallyTracks[name].indexOf(map) + 1)].objs : [];
		for (let obj of objs) {
			let { width, height, position, sprite, layer } = obj;
			let body = Bodies.rectangle(width, height, trackPosition.add(position), {
				isStatic: true,
				hasCollisions: false,
		
				render: {
					visible: true,
					alwaysRender: false,
					background: "transparent",
					border: "transparent",
					sprite: sprite,
					useBuffer: true,
					layer: layer,
					opacity: 1,
				}
			});


			// keep object in view so it doesn't load out
			// let realPosition = new vec(body.position);
			body.render.sprite.on("load", () => {
				console.log(body.render.sprite.src + " loaded");
				objsLoaded++;

				// let image = body.render.sprite.image;
				// document.body.appendChild(image);
				// image.id = image.src + "-image";
				// image.style.position = "absolute";
				// image.style.top =  "0px";
				// image.style.left = "0px";
				// image.style.opacity = 0.001;

				// body.on("beforeUpdate", () => {
				// 	let { bounds: cameraBounds } = camera;
				// 	let bounds = {
				// 		min: realPosition.sub({ x: width/2, y: height/2 }),
				// 		max: realPosition.add({ x: width/2, y: height/2 }),
				// 	}
				// 	if (cameraBounds.min.y > bounds.max.y || cameraBounds.max.y < bounds.min.y || cameraBounds.min.x > bounds.max.x || cameraBounds.max.x < bounds.min.x) {
				// 		body.setPosition(cameraBounds.max.add(bounds.max.sub(bounds.min).mult(0.5)).sub(100));
				// 	}
				// 	else if (!body.position.equals(realPosition)) {
				// 		body.setPosition(new vec(realPosition));
				// 	}
				// });
			});
			
			curMap.objs.push(body);
		}

		for (let typeName of Object.keys(map)) {
			if (typeName === "spawn") {
				if (madeSpawn) continue;
				madeSpawn = true;
			}

			let objFunc = mapBodies[typeName];
			if (!objFunc) continue;
			let types = map[typeName];
	
			if (typeName === "road") {
				let newTypes = [];
				for (let options of types) {
					newTypes.push(new Bezier(trackPosition.add(options.a), trackPosition.add(options.b), trackPosition.add(options.c), trackPosition.add(options.d)));
				}
				objFunc(newTypes);
			}
			else {
				for (let options of types) {
					let newOptions = { ...options };
					if (options.position) {
						newOptions.position = new vec(options.position).add(trackPosition);
					}
					else if (options.x && options.y) {
						newOptions.x += trackPosition.x;
						newOptions.y += trackPosition.y;
					}
					let obj = objFunc(newOptions);
					if (obj) {
						curMap.objs.push(obj);
					}
				}
			}
		}

		trackPosition.sub2(offset);
		trackPosition.add2(new vec(0, 20).add2(end.sub(start)));
	}

	// add checkpoints
	let lastCheckpoint = null;
	for (let bezier of curMap.road) {
		let pt = bezier.a;
		let dx = bezier.getDxAtT(0).normalize();
		let angle = dx.angle;

		let obj = Bodies.rectangle(70, 850, new vec(pt), {
			isStatic: true,
			isSensor: true,
			isCheckpoint: true,
			render: {
				background: "red",
				visible: false,
			}
		});
		obj.setAngle(angle);
		curMap.objs.push(obj);

		if (!lastCheckpoint) {
			lastCheckpoint = 1;
		}
		else if (lastCheckpoint === 1) {
			lastCheckpoint = obj;
		}

		obj.on("collisionStart", event => {
			let otherBody = event.bodyA === obj ? event.bodyB : event.bodyA;

			if (otherBody === car) {
				lastCheckpoint = obj;
			}
		});
	}


	// reset skid marks
	for (let skid of Skid.all) {
		Skid.all.delete(skid);
	}
	// reset smoke
	for (let smoke of Smoke.all) {
		Smoke.all.delete(smoke);
	}
	resetCar();

	// - Get track times for cars in rally
	let trackTimes = {}
	for (let track of finalTrack) {
		let trackName = track.name;
		if (trackName !== "Start" && trackName !== "End") {
			if (!trackTimes[trackName]) trackTimes[trackName] = {};
			
			for (let driver of Driver.all) {
				let carName = driver.car;
				if (!trackTimes[trackName][carName]) {
					let lowTime = getTrackTime(track, carName);
					let highTime = lowTime * 2;
					trackTimes[trackName][carName] = [lowTime, highTime];
				}
			}
		}
	}

	// - Get track times for drivers
	for (let driver of Driver.all) {
		let car = driver.car;
		let variation = driver.variation * gaussianRandom(0, 1);
		let performance = 1 - Math.min(1, Math.max(0, driver.skill + variation));
		if (performance === 1) performance -= Math.random() * 0.05;
		if (performance === 0) performance += Math.random() * 0.05;
		let time = 0;

		for (let track of finalTrack) {
			let trackName = track.name;
			if (trackName !== "Start" && trackName !== "End") {
				let times = trackTimes[trackName][car];
				time += times[0] + (times[1] - times[0]) * performance;
			}
		}
		driver.time = time + 1512 + 1000 * performance;
	}

	function renderLoadingBar() {
		let width = 100;
		let height = 15;
		let p = objsLoaded / objsTotal;
		let position = new vec(canv.width/2, canv.height/2);

		if (p >= 1) {
			Render.off("afterRestore", renderLoadingBar);
			startCountdown();
		}

		ctx.beginPath();
		ctx.strokeStyle = "white";
		ctx.fillStyle = "white";
		ctx.lineWidth = 2;
		ctx.strokeRect(position.x - width/2, position.y - height/2, width, height);
		ctx.beginPath();
		ctx.fillRect(position.x - width/2, position.y - height/2, width * p, height);

		ctx.beginPath();
		ctx.textAlign = "center";
		ctx.font = "16px sans-serif";
		ctx.fillText("Loading", position.x, position.y + height/2 + 15);
	}
	Render.on("afterRestore", renderLoadingBar);

	function checkToResetCar() {
		let onRally = getCarOnRally();

		if (!onRally) {
			// reset car
			car.setPosition(new vec(lastCheckpoint.position));
			car.velocity.set(new vec(0, 0));
			car.setAngle(lastCheckpoint.angle);
			car.angularVelocity = 0;
		}
	}
	Render.on("afterRestore", checkToResetCar);

	let startTime = 0;
	let unloaded = false;
	function startCountdown() {
		let rallyOverhead = document.getElementById("rallyOverhead");
		let rallyCountdown = document.getElementById("rallyCountdown");

		rallyOverhead.classList.add("active");
		rallyCountdown.classList.add("active");
		car.locked = true;
		
		// let t = 3;
		let t = 1;
		rallyCountdown.innerHTML = t;
		function count() {
			if (unloaded) return;
			t--;
			if (t) {
				rallyCountdown.innerHTML = t;
				setTimeout(count, 1000);
			}
			else {
				rallyCountdown.innerHTML = "GO";
				car.locked = false;
				startTime = World.time;

				setTimeout(() => {
					if (!unloaded) {
						rallyCountdown.classList.remove("active");
					}
				}, 1500);
			}
		}
		setTimeout(count, 1000);
	}

	window.addEventListener("unloadMap", function unloadRally() {
		Render.off("afterRestore", checkToResetCar);
		window.removeEventListener("unloadMap", unloadRally);
		window.removeEventListener("finishRally", finishRally);
		rallyCountdown.classList.remove("active");

		car.locked = false;

		// unload image cache
		for (let obj of curMap.objs) {
			if (obj.render.sprite && obj.render.sprite.useBuffer) {
				let sprite = obj.render.sprite;
				sprite.deleteCache();
			}
		}

		unloaded = true;
	});
	window.addEventListener("finishRally", finishRally);
	function finishRally() {
		Render.off("afterRestore", checkToResetCar);
		window.removeEventListener("finishRally", finishRally);

		let rallyFinish = document.getElementById("rallyFinish");
		let rallyFinishText = document.getElementById("rallyFinishText");
		let rallyFinishTime = document.getElementById("rallyFinishTime");
		let leaderboardWrap = document.getElementById("leaderboardWrap");
		let canvWrapper = document.getElementById("canvWrapper");

		let lapTime = World.time - startTime;

		rallyFinish.classList.add("active");
		rallyFinishText.classList.add("active");

		let minutes = (Math.floor(lapTime % 3600000 / 60000) / 100).toFixed(2).replace("0.", "");
		let seconds = (Math.floor(lapTime % 60000 / 1000) / 100).toFixed(2).replace("0.", "");
		let ms = ((lapTime % 60000 % 1000) / 1000).toFixed(3).replace("0.", "");
		
		rallyFinishTime.innerHTML = `${ minutes }:${ seconds }.${ ms }`;
		car.locked = true;
		car.handbrake = true;

		window.addEventListener("leaderboardContinue", leaderboardContinue);
		function leaderboardContinue() {
			window.removeEventListener("leaderboardContinue", leaderboardContinue);
			rallyFinish.classList.remove("active");
			rallyFinishText.classList.remove("active");
			leaderboardWrap.classList.remove("active");
			canvWrapper.classList.remove("leaderboardZoom");
			car.locked = false;
			car.handbrake = false;
			openHome();
			unloadMap();
		}

		setTimeout(() => {
			leaderboardWrap.classList.add("active");

			canvWrapper.style.width =  window.innerWidth + "px";
			canvWrapper.style.height = window.innerHeight + "px";
			canvWrapper.classList.add("leaderboardZoom");

			document.getElementById("leaderboardData").innerHTML = "";
			let data = ([...Driver.all, {
				name: "You",
				isPlayer: true,
				car: car.name,
				time: lapTime,
			}]).sort((a, b) => a.time - b.time);

			let leaderboardData = document.getElementById("leaderboardData");
			for (let i = 0; i < data.length; i++) {
				let val = data[i];
				let lapTime = val.time;
				let minutes = (Math.floor(lapTime % 3600000 / 60000) / 100).toFixed(2).replace("0.", "");
				let seconds = (Math.floor(lapTime % 60000 / 1000) / 100).toFixed(2).replace("0.", "");
				let ms = ((lapTime % 60000 % 1000) / 1000).toFixed(3).replace("0.", "");

				let leaderboardItem = createElement("div", {
					class: "leaderboardItem" + (val.isPlayer ? " player" : ""),
					parent: leaderboardData,
				});
				let leaderboardItemValues = createElement("div", {
					class: "leaderboardItemValues",
					parent: leaderboardItem,
				});
				let leaderboardNumber = createElement("div", {
					class: "leaderboardNumber",
					parent: leaderboardItemValues,
					innerHTML: ((i + 1) / 100).toFixed(2).replace("0.", ""),
				});
				let leaderboardName = createElement("div", {
					class: "leaderboardName",
					parent: leaderboardItemValues,
					innerHTML: val.name,
				});
				let leaderboardCar = createElement("div", {
					class: "leaderboardCar",
					parent: leaderboardItemValues,
					innerHTML: val.car,
				});
				let leaderboardTime = createElement("div", {
					class: "leaderboardTime",
					parent: leaderboardItemValues,
					innerHTML: `${ minutes }:${ seconds }.${ ms }`,
				});
			}
		}, 2900);
		setTimeout(() => {
			// rallyFinish.classList.remove("active");
			rallyFinishText.classList.remove("active");
			// car.locked = false;
			// car.handbrake = false;
		}, 3200);
	}
}

// car.acceleration *= 3;
// car.maxSpeed *= 3;
// car.setCollisions(false);
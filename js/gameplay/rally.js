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

function pxToKm(px) {
	return px / 20000;
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

function loadRally(name) {
	car.locked = true; // lock car so you can't move

	// - create map
	let tracks = rallyTracks[name];

	Object.keys(tracks).forEach(trackName => {
		if (!isNaN(Number(trackName))) trackName = Number(trackName);
		tracks[trackName].name = trackName;
	});

	let sectionBodies = [];
	let sectionSegments =  {};
	let sectionDistances = {};
	function getNextSectionOrder() {
		let finalTrack = [];
		for (let i = 0; i < tracks.length; i++) { // for (let i = 0; i < 1; i++) { change
			let track = tracks[i];
			let n = Math.floor(Math.random() * (finalTrack.length + 1));
			finalTrack.splice(n, 0, track);
		}
		// return [tracks[5]];
		return finalTrack;
	}
	let finalTrack = getNextSectionOrder();

	// finalTrack.length = 0;
	// finalTrack.push(tracks[0]);

	if (tracks.start) {
		finalTrack.unshift(tracks.start);
	}
	if (tracks.end && false) {
		finalTrack.push(tracks.end);
	}
	

	// - load map
	// ~ load section sprites
	let trackPosition = new vec(0, 0);
	let madeSpawn = false;
	let lastCheckpoint = null;
	let sectionsLoaded = 0;
	let curSection = 0;
	let bufferedSprites = [];
	let sectionTrackPositions = [];
	let splitDistances = [-1146]; // the starting position of the car is at 1146
	let driverSectionTimes = {};
	let loadedSection = 0;
	let sectionsTotal = finalTrack.reduce((total, cur, i, arr, ) => { // get number of objects (images) to load
		let objs = cur.name === "start" || cur.name === "end" ? allMaps[name + cur.name.toCapital()] : allMaps[name + "S" + (rallyTracks[name].indexOf(cur) + 1)];
		return total + objs.length;
	}, 0);
	for (let i = 0; i < finalTrack.length; i++) {
		let map = finalTrack[i];
		if (map.name === undefined) continue;
		let objs = map.name === "start" || map.name === "end" ? allMaps[name + map.name.toCapital()] : allMaps[name + "S" + (rallyTracks[name].indexOf(map) + 1)] ? allMaps[name + "S" + (rallyTracks[name].indexOf(map) + 1)] : [];
		for (let obj of objs) {
			let { width, height, position, sprite, layer } = obj;
			let body = Bodies.rectangle(width, height, new vec(0, 0), {
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

			body.render.sprite.on("load", () => {
				// console.log(body.render.sprite.src + " loaded");
				sectionsLoaded++;
				body.delete();
				bufferedSprites.push(body.render.sprite);
			});
		}
	}

	// ~ create segments for finding where you are on the track
	for (let track of finalTrack) {
		let segments = [];
		let distances = [0];
		let lastPt = new vec(track.road[0].a);

		segments.push(lastPt);
		for (let bezier of track.road) {
			bezier = new Bezier(bezier);
			let n = 1;
			for (let i = 1; i <= n + 1; i++) {
				let curPt = bezier.getAtT(i / (n + 1));
				segments.push(curPt);
				distances.push(curPt.sub(lastPt).length + distances[distances.length - 1]);
				lastPt = curPt;
			}
		}

		let n = track.name;
		sectionDistances[n] = distances;
		sectionSegments[n] = segments;
	}

	function unloadSection(sectionIndex) {
		let bodies = sectionBodies[sectionIndex];
		for (let body of bodies) {
			if (body._Grids && body._Grids[SurfaceGrid.id] !== undefined) {
				SurfaceGrid.removeBody(body);
			}
			if (body._Grids && body._Grids[innerHitboxGrid.id] !== undefined) {
				innerHitboxGrid.removeBody(body);
			}
			if (!body.removed) {
				body.delete();
			}
		}
		delete sectionBodies[sectionIndex];
		delete sectionTrackPositions[sectionIndex];
		// delete finalTrack[sectionIndex - 2];
		// delete splitDistances[sectionIndex - 2];

		let minSection = (() => {
			let min = curSection;
			for (let driver of Driver.all) {
				min = Math.min(min, driver.section);
			}
			return min;
		})();
		Object.keys(finalTrack).forEach(section => {
			if (section < minSection) {
				delete finalTrack[section];
				delete splitDistances[section];
				// console.log("deleted " + section);
			}
		});
	}
	function loadNextSection(section) {
		let map = section;
		let curSectionIndex = loadedSection;
		let curSectionBodies = [];
		let start = new vec(map.road[0].a);
		let end = new vec(map.road[map.road.length - 1].d);
		let offset = start.mult(-1);
		trackPosition.add2(offset);
		sectionTrackPositions[curSectionIndex] = new vec(trackPosition);

		getDriverTimes(curSectionIndex);

		let distances = sectionDistances[map.name];
		splitDistances.push(splitDistances[splitDistances.length - 1] + distances[distances.length - 1]);

		// load bg + fg sprites
		let objs = map.name === "start" || map.name === "end" ? allMaps[name + map.name.toCapital()] : allMaps[name + "S" + (rallyTracks[name].indexOf(map) + 1)];
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
			curSectionBodies.push(body);
		}

		// load section bodies
		for (let typeName of Object.keys(map)) {
			if (typeName === "spawn") {
				if (madeSpawn) continue;
				madeSpawn = true;
			}

			let objFunc = mapBodies[typeName];
			if (!objFunc) continue;
			let types = map[typeName];
	
			if (typeName === "road") {
				let beziers = [];
				for (let options of types) {
					beziers.push(new Bezier(trackPosition.add(options.a), trackPosition.add(options.b), trackPosition.add(options.c), trackPosition.add(options.d)));
				}

				// add checkpoints
				for (let i = 0; i < beziers.length; i++) {
					let bezier = beziers[i];
					let pt = bezier.a;
					let dx = bezier.getDxAtT(0).normalize();
					let angle = dx.angle;
			
					let obj = Bodies.rectangle(70, 850, new vec(pt), {
						isStatic: true,
						isSensor: true,
						isCheckpoint: true,
						taken: false,
						isTransition: i === 0,
						render: {
							background: "red",
							visible: false,
						}
					});
					obj.setAngle(angle);
					curSectionBodies.push(obj);
			
					if (!lastCheckpoint) {
						lastCheckpoint = 1;
					}
					else if (lastCheckpoint === 1) {
						lastCheckpoint = obj;
					}
					
					obj.on("collisionStart", event => {
						let otherBody = event.bodyA === obj ? event.bodyB : event.bodyA;
			
						if (otherBody === car) {
							if (!obj.taken && obj.isTransition) { // trigger area load
								curSection = curSectionIndex;
								
								if (!finalTrack[curSectionIndex + 1]) {
									finalTrack.push(...getNextSectionOrder());
								}
								loadNextSection(finalTrack[curSectionIndex + 1]);

								if (curSectionIndex >= 2) {
									unloadSection(curSectionIndex - 2);
								}
							}

							lastCheckpoint = obj;
							obj.taken = true;
						}
					});
				}
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
						curSectionBodies.push(obj);
					}
				}
			}
		}

		trackPosition.sub2(offset);
		trackPosition.add2(new vec(0, 20).add2(end.sub(start)));
		loadedSection++;
		sectionBodies.push(curSectionBodies);
	}

	let lastCarDistance = 0;
	function getCarDistance() {
		let splitNames = [];
		let finalTrackIndexes = [];
		for (let i = Math.max(0, curSection - 1); i <= curSection + 1; i++) {
			if (!finalTrack[i]) continue;
			splitNames.push(finalTrack[i].name);
			finalTrackIndexes.push(i);
		}

		// get what split car is in
		for (let i = 0; i < splitNames.length; i++) {
			let splitName = splitNames[i];
			let finalTrackIndex = finalTrackIndexes[i];
			let road = tracks[splitName].road;
			let start = new vec(road[0].a);
			let diff = new vec(road[road.length - 1].d).sub(start);
			let nDiff = diff.normalize();
			let relPos = car.position.sub(sectionTrackPositions[finalTrackIndex].add(start));
			let relPosStart = relPos.add(start);
			let dist = nDiff.dot(relPos);
			
			if (dist >= -20 && dist <= diff.length) { // you're inside this split, get how far along this split you are
				let baseDist = splitDistances[finalTrackIndex]; // distance up to this point
				
				// check if between points
				let segments = sectionSegments[splitName];
				let distances = sectionDistances[splitName];
				let maxNormal = 500;
				for (let i = 0; i < segments.length - 1; i++) {
					let start = segments[i];
					let end = segments[i + 1];
					let diffA = end.sub(start);
					let nDiffA = diffA.normalize();
					let diffB = relPosStart.sub(start);
					let dist = nDiffA.dot(diffB);
					if (dist > 0 && dist < diffA.length) {
						let normDist = nDiffA.cross(diffB);
						if (Math.abs(normDist) < maxNormal) { // between the points, not including normal distance
							lastCarDistance = [distances[i] + dist + baseDist, distances[distances.length - 1] + baseDist];
							return lastCarDistance;
						}
					}
				}
				// not between points, check if inside "dead" region of intersection outside points
				for (let i = 0; i < segments.length - 2; i++) {
					let a = segments[i];
					let b = segments[i + 1];
					let c = segments[i + 2];
					let diffA = b.sub(a);
					let diffB = c.sub(b);
					let nDiffA = diffA.normalize();
					let nDiffB = diffB.normalize();
					
					let sign = Math.sign(diffA.cross(diffB));
					let vertices = [
						b,
						b.add(nDiffA.normal().mult(maxNormal * sign)),
						b.add(nDiffB.normal().mult(maxNormal * sign)),
					];

					// render shape
					// ctx.beginPath();
					// let offset = sectionTrackPositions[finalTrackIndex];
					// ctx.moveTo(vertices[0].x + offset.x, vertices[0].y + offset.y);
					// for (let i = 1; i < vertices.length; i++) {
					// 	ctx.lineTo(vertices[i].x + offset.x, vertices[i].y + offset.y);
					// }
					// ctx.closePath();
					// ctx.strokeStyle = "#ff0000a0";
					// ctx.lineWidth = 3;
					// ctx.stroke();

					// check if you are inside the shape
					let insideBody = (() => {
						for (let j = 0; j < vertices.length; j++) {
							let curVertice = vertices[j];
							let nextVertice = vertices[(j + 1) % vertices.length];
							
							if (((relPosStart.x - curVertice.x) * (nextVertice.y - curVertice.y) + (relPosStart.y - curVertice.y) * (curVertice.x - nextVertice.x)) * sign >= 0) {
								return false;
							}
						}
						return true;
					})();
					if (insideBody) {
						// use point b for distance
						lastCarDistance = [distances[i + 1] + baseDist, distances[distances.length - 1] + baseDist];
						return lastCarDistance;
					}
					
				}
				break;
			}
		}
		
		return lastCarDistance;
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
	for (let trackName of Object.keys(tracks)) {
		let track = tracks[trackName];
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

	function getDriverTimes(sectionIndex) {
		let curTimes = {};
		for (let driver of Driver.all) {
			curTimes[driver.name] = getDriverTime(driver, sectionIndex);
		}
		driverSectionTimes[sectionIndex] = curTimes;

		return driverSectionTimes;
	}
	function getDriverTime(driver, sectionIndex) {
		if (!finalTrack[sectionIndex]) {
			finalTrack.push(...getNextSectionOrder());
		}
		let section = finalTrack[sectionIndex];
		
		let car = driver.car;
		let variation = driver.variation * gaussianRandom(0, 1);
		let skill = 0.85; // driver.skill
		let performance = 1 - Math.min(1, Math.max(0, skill + variation));
		if (performance === 1) performance -= Math.random() * 0.05;
		if (performance === 0) performance += Math.random() * 0.05;

		let times = trackTimes[section.name][car];
		let time = times[0] + (times[1] - times[0]) * performance;
		if (driver.time === undefined) driver.time = 0;
		driver.time += time;

		return time;
	}

	let driverAnimations = [];
	function animateDriver(driver, section = 0) {
		let time = driverSectionTimes[section][driver.name];
		let prevSectionDist = splitDistances[section] || 0;
		let distances = sectionDistances[finalTrack[section].name];
		let sectionLength = distances[distances.length - 1];

		let maxDist = sectionLength + prevSectionDist;

		if (driver.distance === undefined) driver.distance = 1146;
		driver.section = section;

		let animation = animations.create({
			duration: time,
			curve: ease.linear,
			callback: p => {
				driver.distance = (maxDist - prevSectionDist) * p + prevSectionDist;
			},
			onend: () => {
				console.log(driver.name + " finished " + section);
				section++;
				driverAnimations.delete(animation);
				if (!driverSectionTimes[section]) driverSectionTimes[section] = {};
				driverSectionTimes[section][driver.name] = getDriverTime(driver, section);
				animateDriver(driver, section);

			},
		});
		driverAnimations.push(animation);
	}

	function renderLoadingBar() {
		let width = 100;
		let height = 15;
		let p = sectionsLoaded / sectionsTotal;
		let position = new vec(canv.width/2, canv.height/2);

		if (p >= 1) {
			Render.off("afterRestore", renderLoadingBar);

			loadNextSection(finalTrack[0]);
			loadNextSection(finalTrack[1]);
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

		if (!onRally && lastCheckpoint && !car.isSensor) {
			// reset car
			car.setPosition(new vec(lastCheckpoint.position));
			car.velocity.set(new vec(0, 0));
			car.setAngle(lastCheckpoint.angle);
			car.angularVelocity = 0;
		}
	}
	Render.on("afterRestore", checkToResetCar);

	function updateSplitView() {
		let dist = getCarDistance();
		let distKm = pxToKm(dist[0]);

		let view = 2; // view size, in km
		let min = Math.max(0, distKm - view/2);
		function toBounds(dist) { // converts distance to percent, where it is in the view
			return (dist - min) / view;
		}
		let carPos = Math.max(0, toBounds(distKm));
		document.getElementById("playerMarker").style.top = (100 - carPos * 100) + "%";

		let splitsElem = document.getElementById("splits");
		let splitBounds = [];

		for (let i = Math.max(0, curSection - 1); i <= curSection + 1; i++) {
			let splitEnd = toBounds(pxToKm(splitDistances[i + 1]));
			let elem = document.getElementById("split" + i);
			if (splitEnd >= 0 && splitEnd <= 1) {
				splitBounds.push({ position: splitEnd, id: i });
			}
			else if (elem) {
				elem.parentNode.removeChild(elem);
			}
		}
		splitBounds.push({ position: carPos, id: "Complete" });
		splitBounds.push({ position: 1, id: curSection + 2 });
		splitBounds.sort((a, b) => a.position - b.position);

		for (let i = 0; i < splitBounds.length; i++) {
			let bounds = splitBounds[i];
			let splitEnd = bounds.position;
			let lastEnd = splitBounds[i - 1] ? splitBounds[i - 1].position : 0;
			let height = splitEnd - lastEnd;
			let id = bounds.id;

			let elem = document.getElementById("split" + id);
			if (!elem) {
				elem = createElement("div", {
					class: "split" + (id === "Complete" ? " complete" : ""),
					parent: splitsElem,
					id: "split" + id,
				});
			}
			if (splitEnd === 1) {
				elem.classList.add("top");
			}
			else {
				elem.classList.remove("top");
			}
			if (curSection > id) {
				elem.classList.add("good");
			}
			elem.style.top = ((1 - splitEnd) * 100) + "%";
			elem.style.height = height * 100 + "%";
		}

		for (let j = 0; j < Driver.all.length; j++) {
			// update icon for opponent
			let driver = Driver.all[j];
			let marker = document.getElementById("opponentMarker" + j);
			let percent = toBounds(pxToKm(driver.distance));
			if (percent < 0 || percent > 1) {
				marker.classList.add("hidden");
			}
			else {
				marker.classList.remove("hidden");
				marker.style.top = (100 - percent * 100) + "%";
			}
		}

	}

	let startTime = 0;
	let unloaded = false;
	function startCountdown() {
		let rallyOverhead = document.getElementById("rallyOverhead");
		let rallyCountdown = document.getElementById("rallyCountdown");
		let keypressOverhead = document.getElementById("keypressOverhead");

		keypressOverhead.classList.add("active");
		rallyOverhead.classList.add("active");

		window.addEventListener("keydown", function startCounting() {
			window.removeEventListener("keydown", startCounting);
			rallyCountdown.classList.add("active");
			keypressOverhead.classList.remove("active");
			car.locked = true;
			
			let t = 1; // change
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

					Render.on("afterRender", updateSplitView);

					for (let driver of Driver.all) {
						animateDriver(driver);
					}
	
					setTimeout(() => {
						if (!unloaded) {
							rallyCountdown.classList.remove("active");
						}
					}, 1500);
				}
			}
			setTimeout(count, 1000);
		});
	}

	window.addEventListener("unloadMap", function unloadRally() {
		Render.off("afterRestore", checkToResetCar);
		window.removeEventListener("unloadMap", unloadRally);
		window.removeEventListener("finishRally", finishRally);
		rallyCountdown.classList.remove("active");

		car.locked = false;

		// unload image cache
		for (let sprite of bufferedSprites) {
			sprite.deleteCache();
		}
		// unload map sections
		for (let i = Math.max(0, curSection - 1); i <= curSection + 1; i++) {
			unloadSection(i);
		}

		// unload driver animations
		for (let anim of driverAnimations) {
			anim.stop();
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
// car.isSensor = true;

"use strict";

var innerHitboxGrid = new Grid();
function getCarOnRally() {
	let point = car.position;
	let bounds = innerHitboxGrid.getBounds(car);
	
	for (let x = bounds.min.x; x <= bounds.max.x; x++) {
		for (let y = bounds.min.y; y <= bounds.max.y; y++) {
			let n = innerHitboxGrid.pair(new vec(x, y));
			let node = innerHitboxGrid.grid[n];
			if (!node) continue;

			for (let body of node) {
				if (body.containsPoint(point)) {
					return true;
				}
			}
		}
	}

	return false;
}

function loadRally(name) {
	// - create map
	let finalTrack = [];
	let tracks = rallyTracks[name];

	for (let i = 0; i < tracks.length; i++) {
		let track = tracks[i];
		let n = Math.floor(Math.random() * (finalTrack.length + 1));
		finalTrack.splice(n, 0, track);
	}

	finalTrack.length = 4;

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
	let objsTotal = finalTrack.reduce((total, cur, i, arr, ) => {
		let objs = cur.name ? allMaps[name + cur.name].objs : allMaps[name + "S" + (rallyTracks[name].indexOf(cur) + 1)] ? allMaps[name + "S" + (rallyTracks[name].indexOf(cur) + 1)].objs : [];
		return total + objs.length;
	}, 0);

	for (let i = 0; i < finalTrack.length; i++) {
		let map = finalTrack[i];
		let start = new vec(map.env.road[0].a);
		let end = new vec(map.env.road[map.env.road.length - 1].d);
		let offset = start.mult(-1);
		trackPosition.add2(offset);
		// console.log(rallyTracks[name].indexOf(map) + 1);

		// add extra visual stuff
		let objs = map.name ? allMaps[name + map.name].objs : allMaps[name + "S" + (rallyTracks[name].indexOf(map) + 1)] ? allMaps[name + "S" + (rallyTracks[name].indexOf(map) + 1)].objs : [];
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
			let realPosition = new vec(body.position);
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

		for (let categoryName of Object.keys(map)) {
			if (!mapBodies[categoryName]) continue;
		
			let category = map[categoryName];
			for (let typeName of Object.keys(category)) {
				if (typeName === "spawn") {
					if (madeSpawn) continue;
					madeSpawn = true;
				}
				let objFunc = mapBodies[categoryName][typeName];
				if (!objFunc) continue;
				let types = category[typeName];
		
				if (typeName === "road") {
					let newTypes = [];
					for (let options of types) {
						newTypes.push(new Bezier(trackPosition.add(options.a), trackPosition.add(options.b), trackPosition.add(options.c), trackPosition.add(options.d)));
					}
					objFunc(types);
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
		}

		trackPosition.sub2(offset);
		trackPosition.add2(new vec(0, 20).add2(end.sub(start)));
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

	function renderLoadingBar() {
		let width = 100;
		let height = 15;
		let p = objsLoaded / objsTotal;
		let position = new vec(canv.width/2, canv.height/2);

		if (p >= 1) {
			Render.off("afterRestore", renderLoadingBar);
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
}

// car.acceleration *= 3;
// car.maxSpeed *= 3;
// car.setCollisions(false);
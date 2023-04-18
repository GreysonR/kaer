"use strict";

function loadRally(name) {
	// - create map
	let finalTrack = [];
	let tracks = rallyTracks[name];

	for (let i = 0; i < tracks.length; i++) {
		let track = tracks[i];
		finalTrack.splice(Math.floor(Math.random() * (finalTrack.length + 1)), 0, track);
	}
	

	// - load map
	let trackPosition = new vec(0, 0);
	let madeSpawn = false;
	for (let i = 0; i < finalTrack.length; i++) {
		let map = finalTrack[i];
		let start = new vec(map.env.road[0].a);
		let end = new vec(map.env.road[map.env.road.length - 1].d);
		let offset = start.mult(-1);
		trackPosition.add2(offset);

		console.log(rallyTracks[name].indexOf(map) + 1);

		// add extra visual stuff
		let objs = allMaps[name + "S" + (rallyTracks[name].indexOf(map) + 1)] ? allMaps[name + "S" + (rallyTracks[name].indexOf(map) + 1)].objs : [];
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
					useBuffer: false,
					layer: layer,
					opacity: 1,
				}
			});

			// keep object in view so it doesn't load out
			setTimeout(() => {
				let realPosition = new vec(body.position);
				body.on("beforeUpdate", () => {
					let { bounds: cameraBounds } = camera;
					let bounds = {
						min: realPosition.sub({ x: width/2, y: height/2 }),
						max: realPosition.add({ x: width/2, y: height/2 }),
					}
					if (cameraBounds.min.y > bounds.max.y || cameraBounds.max.y < bounds.min.y || cameraBounds.min.x > bounds.max.x || cameraBounds.max.x < bounds.min.x) {
						body.setPosition(cameraBounds.max.add(bounds.max.sub(bounds.min).mult(0.5)).sub(20));
					}
					else if (!body.position.equals(realPosition)) {
						body.setPosition(new vec(realPosition));
					}
				});
			}, 1000);
			
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
}

// car.acceleration *= 3;
// car.maxSpeed *= 3;
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
	for (let map of finalTrack) {
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
		
				for (let options of types) {
					if (options.position) {
						options = { ...options, position: new vec(options.position).add(trackPosition) };
					}
					else if (options.x && options.y) {
						options = {
							...options,
							x: options.x + trackPosition.x,
							y: options.y + trackPosition.y,
						}
					}
					let obj = objFunc(options);
					if (obj) {
						curMap.objs.push(obj);
					}
				}
			}
		}
		// add extra visual stuff
		let objs = allMaps[name + "S" + (rallyTracks[name].indexOf(map) + 1)] ? allMaps[name + "S" + (rallyTracks[name].indexOf(map) + 1)].objs : [];
		for (let obj of objs) {
			let { width, height, position, sprite, layer } = obj;
			let body = Bodies.rectangle(width, height, trackPosition.add(position), {
				isStatic: true,
				hasCollisions: false,
		
				render: {
					visible: true,
					alwaysVisible: true,
					background: "#5E9555",
					sprite: sprite,
					layer: layer,
					opacity: 1,
				}
			});
			
			curMap.objs.push(body);
		}

		trackPosition.add2(map.env.road[map.env.road.length - 1].d).sub2(map.env.road[0].a).add2({ x: 0, y: 20 });
	}
	// reset skid marks
	for (let skid of Skid.all) {
		Skid.all.delete(skid);
	}
	// reset smoke
	for (let smoke of Smoke.all) {
		Smoke.all.delete(smoke);
	}
}
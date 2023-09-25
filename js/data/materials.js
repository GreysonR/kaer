"use strict";

let SurfaceGrid = new Grid(2000);

let Materials = {
	road: {
		tireGrip: 1,
		slidingGrip: 1,
		steeringWeight: 1,
		turnSpeed: 1,
		acceleration: 1,
		maxSpeed: 1,
		maxReverseSpeed: 1,
		power: 1,
		hasTireSmoke: true,
	},
	dirt: {
		tireGrip: 0.6,
		slidingGrip: 0.6,
		steeringWeight: 1.3,
		turnSpeed: 1,
		acceleration: 1,
		maxSpeed: 1,
		maxReverseSpeed: 1,
		power: 1.7,
		hasTireSmoke: false,
	},
	grass: {
		tireGrip: 0.75,
		slidingGrip: 0.6,
		steeringWeight: 3,
		turnSpeed: 0.9,
		acceleration: 0.6,
		maxSpeed: 1,
		maxReverseSpeed: 1,
		power: 1,
		hasTireSmoke: false,
	},
}

function getCarMaterial(body) {
	let point = body.position.add(new vec(-30, 0).rotate(body.angle));
	let bounds = SurfaceGrid.getBounds(body);
	let materials = new Set();
	
	for (let x = bounds.min.x; x <= bounds.max.x; x++) {
		for (let y = bounds.min.y; y <= bounds.max.y; y++) {
			let n = SurfaceGrid.pair(new vec(x, y));
			let node = SurfaceGrid.grid[n];
			if (!node) continue;

			for (let body of node) {
				if (body.containsPoint(point)) {
					if (!body.material) {
						console.warn("body has no material", body);
						continue;
					}
					
					materials.add(body.material);
				}
			}
		}
	}

	if (materials.has("dirt")) return "dirt";
	if (materials.has("road")) return "road";
	return "grass"; // "grass";
}
function getMaterial(point) {
	let bounds = SurfaceGrid.getBounds(point);
	let materials = new Set();
	
	for (let x = bounds.min.x; x <= bounds.max.x; x++) {
		for (let y = bounds.min.y; y <= bounds.max.y; y++) {
			let n = SurfaceGrid.pair(new vec(x, y));
			let node = SurfaceGrid.grid[n];
			if (!node) continue;

			for (let body of node) {
				if (body.containsPoint(point)) {
					if (!body.material) {
						console.warn("body has no material", body);
						continue;
					}
					
					materials.add(body.material);
				}
			}
		}
	}

	if (materials.has("dirt")) return "dirt";
	if (materials.has("road")) return "road";
	return "grass"; // "grass";
}

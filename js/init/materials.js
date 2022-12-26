"use strict";

let SurfaceGrid = {
	grid: {},
	gridSize: 2000,
	pair: function(pos) {
		let x = pos.x >= 0 ? pos.x * 2 : pos.x * -2 - 1;
		let y = pos.y >= 0 ? pos.y * 2 : pos.y * -2 - 1;
		return (x >= y) ? (x * x + x + y) : (y * y + x);
	},
	unpair: function(n) {
		let sqrtz = Math.floor(Math.sqrt(n));
		let sqz = sqrtz * sqrtz;
		let result1 = ((n - sqz) >= sqrtz) ? new vec(sqrtz, n - sqz - sqrtz) : new vec(n - sqz, sqrtz);
		let x = result1.x % 2 === 0 ? result1.x / 2 : (result1.x + 1) / -2;
		let y = result1.y % 2 === 0 ? result1.y / 2 : (result1.y + 1) / -2;
		return new vec(x, y);
	},
	getBounds(body) {
		let size = SurfaceGrid.gridSize;
		return {
			min: body.bounds.min.div(size).floor2(),
			max: body.bounds.max.div(size).floor2(),
		}
	},

	addBody: function(body) {
		let bounds = SurfaceGrid.getBounds(body);

		if (!body._SurfaceGrids) body._SurfaceGrids = new Set();

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = SurfaceGrid.pair(new vec(x, y));
				body._SurfaceGrids.add(n);
				
				if (!SurfaceGrid.grid[n]) SurfaceGrid.grid[n] = new Set();
				SurfaceGrid.grid[n].add(body);
			}
		}
	},
	removeBody(body) {
		for (let n of body._SurfaceGrids) {
			let node = SurfaceGrid.grid[n];
			
			node.delete(body);
			if (node.size === 0) delete SurfaceGrid.grid[n];
		}
	},
}

let Materials = {
	road: {
		tireGrip: 1,
		slide: 1,
		turnSpeed: 1,
		acceleration: 1,
		maxSpeed: 1,
		maxReverseSpeed: 1,
		driftAcceleration: 1,
		hasTireSmoke: true,
	},
	dirt: {
		tireGrip: 0.5,
		slide: 1.3,
		turnSpeed: 1,
		acceleration: 0.8,
		maxSpeed: 1,
		maxReverseSpeed: 1,
		driftAcceleration: 1.5,
		hasTireSmoke: false,
	},
	grass: {
		tireGrip: 0.7,
		slide: 3,
		turnSpeed: 0.9,
		acceleration: 0.65,
		maxSpeed: 1,
		maxReverseSpeed: 1,
		driftAcceleration: 1,
		hasTireSmoke: false,
	},
}
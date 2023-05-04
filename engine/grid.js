"use strict";

class Grid {
	static id = 0;
	grid = {};
	gridIds = new Set();
	gridSize = 2000;
	constructor(size = 2000) {
		this.gridSize = size;
		this.id = Grid.id++;
	}
	pair = function(pos) {
		let x = pos.x >= 0 ? pos.x * 2 : pos.x * -2 - 1;
		let y = pos.y >= 0 ? pos.y * 2 : pos.y * -2 - 1;
		return (x >= y) ? (x * x + x + y) : (y * y + x);
	}
	unpair = function(n) {
		let sqrtz = Math.floor(Math.sqrt(n));
		let sqz = sqrtz * sqrtz;
		let result1 = ((n - sqz) >= sqrtz) ? new vec(sqrtz, n - sqz - sqrtz) : new vec(n - sqz, sqrtz);
		let x = result1.x % 2 === 0 ? result1.x / 2 : (result1.x + 1) / -2;
		let y = result1.y % 2 === 0 ? result1.y / 2 : (result1.y + 1) / -2;
		return new vec(x, y);
	}
	getBounds = function(body) {
		let size = this.gridSize;
		if (typeof body.bounds === "object") {
			return {
				min: body.bounds.min.div(size).floor2(),
				max: body.bounds.max.div(size).floor2(),
			}
		}
		else if (body.x !== undefined && body.y !== undefined) {
			let x = Math.floor(body.x / size);
			let y = Math.floor(body.y / size);
			return {
				min: new vec(x, y),
				max: new vec(x, y),
			}
		}
	}

	addBody = function(body) {
		let bounds = this.getBounds(body);

		if (!body._Grids) body._Grids = {};
		if (!body._Grids[this.id]) body._Grids[this.id] = [];
		else return;

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = this.pair(new vec(x, y));

				body._Grids[this.id].push(n);
				if (!this.grid[n]) {
					this.grid[n] = [];
					this.gridIds.add(n);
				}
				this.grid[n].push(body);
			}
		}
	}
	getBucketIds = function(bounds) {
		let ids = [];
		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = this.pair(new vec(x, y));

				if (this.grid[n]) {
					ids.push(n);
				}
			}
		}

		return ids;
	}
	removeBody = function(body) {
		for (let n of body._Grids[this.id]) {
			let node = this.grid[n];
			if (node) {
				node.delete(body);
				if (node.length === 0) {
					delete this.grid[n];
					this.gridIds.delete(n);
				}
			}
		}
		body._Grids[this.id].length = 0;
		console.log(body._Grids[this.id]);
	};
	updateBody = function(body) {
		let curNodes = body._Grids[this.id];
		let oldNodes = new Set(curNodes);
		let bounds = this.getBounds(body);

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = this.pair(new vec(x, y));

				if (!oldNodes.has(n)) {
					curNodes.push(n);
					if (!this.grid[n]) {
						this.grid[n] = [];
						this.gridIds.add(n);
					}
					this.grid[n].push(body);
				}
				else {
					oldNodes.delete(n);
				}
			}
		}

		for (let n of oldNodes) {
			let node = this.grid[n];
			curNodes.delete(n);
			if (!node) continue;
			node.delete(body);
			if (node.length === 0) {
				delete this.grid[n];
				this.gridIds.delete(n);
			}
		}
	}
}
"use strict";

// implement boid class as add on to ter so you can just add / remove this file and it will work well with ter either way

class Boid {
	// have boid avoid walls using (min cross product of direction and edge) * (min dot product of direction and edge)
	// boid uses world grid to get walls
	static all = new Set();
	static grid = new Grid(1000);
	static id = 0;
	static update() {
		let boidGrid = Boid.grid;
		let worldGrid = ter.World.dynamicGrid;
		let angleDiff = ter.Common.angleDiff;
		let delta = ter.Engine.delta;

		for (let boid of Boid.all) {
			let { position, angle, direction, speed, range, separation, alignment, cohesion, maxTurnRate } = boid;
			let boidGridBounds = boidGrid.getBounds(boid);
			let boidNodeIds = boidGrid.getBucketIds(boidGridBounds);
			let neighbors = [];


			// get neighbors
			for (let nodeId of boidNodeIds) {
				let node = boidGrid.grid[nodeId];

				for (let body of node) {
					if (body !== boid && body.position.sub(position).length < range) {
						neighbors.push(body);
					}
				}
			}

			let w = 0; // angular velocity, omega

			// change angle based on neighbors
			if (neighbors.length > 0) {
				let neighborPos = new vec(0, 0);
				for (let neighbor of neighbors) {
					neighborPos.add2(neighbor.position);

					// separation
					let dist = Math.max(10, position.sub(neighbor.position).length);
					let turnDir = Math.sign(position.sub(neighbor.position).cross(direction)) || 1;
					w -= Math.min((5 / dist) ** 2 * separation, maxTurnRate) * turnDir;

					// alignment
					w -= angleDiff(angle, neighbor.angle) / (dist ** 1.5) * alignment;
				}
				neighborPos.div2(neighbors.length);
				let neighborOffset = neighborPos.sub(position);

				// cohesion
				let neighborDistance = Math.max(40, neighborOffset.length);
				let cohesionTurnDir = Math.sign(neighborOffset.cross(direction)) || 1;
				w -= (1 / neighborDistance) ** 0.5 * cohesion * cohesionTurnDir * 0.2;
			}

			// get nearby bodies
			let bodies = [];
			let raycast = ter.Common.raycast;
			let worldGridBounds = worldGrid.getBounds(boid);
			let worldNodeIds = worldGrid.getBucketIds(worldGridBounds);
			for (let nodeId of worldNodeIds) { // get all possible bodies
				let node = worldGrid.grid[nodeId];

				for (let body of node) {
					while (body.parent) {
						body = body.parent;
					}
					if (!body.hasCollisions || body.isSensor) continue;
					if (!bodies.includes(body)) {
						bodies.push(body);
					}
				}
			}
			for (let body of bodies) {
				// get closest point from body that is in sight
				let minDist = Infinity;
				let minPoint = null;
				for (let i = 0; i < body.vertices.length; i++) {
					let cur = body.vertices[i];
					let next = body.vertices[(i + 1) % body.vertices.length];
					let diffA = next.sub(cur);
					let diffB = position.sub(cur);
					let projected = diffB.project(diffA, true);
					let dist = projected.sub(diffB).length;
					
					if (dist < minDist && dist < range * 0.2) {
						minDist = dist;
						/*let ray = raycast(cur.add(diffA.normalize()), position, bodies);

						if (!ray.collision || ray.body === body) {
							minPoint = projected.add(cur);
						}/* */
						minPoint = projected.add(cur);
					}
				}

				if (minPoint) {
					// move away from point
					let diff = position.sub(minPoint);
					let dist = diff.length;
					let turnDir = Math.sign(diff.cross(direction)) || 1;
					w -= (7 / dist) ** 1.7 * turnDir * 2;
				}
			}
			

			// apply forces
			w = Math.min(maxTurnRate, Math.abs(w)) * Math.sign(w);
			boid.setDirection(boid.angle + w * delta);
			boid.position.add2(boid.direction.mult(speed * delta));
		}
	}
	constructor(position, direction, options = {}) {
		ter.Common.merge(this, options);

		this.id = Boid.id++;
		this.position = position;
		this.setDirection(direction);

		this.add();
	}
	speed = 3;

	separation = 1;
	alignment =  1;
	cohesion =   2;
	maxTurnRate = 3.14;
	range = 200;

	removed = true;
	delete() {
		Boid.all.delete(this);
		this.removed = true;
		Boid.grid.removeBody(this);
	}
	add() {
		Boid.all.add(this);
		this.removed = false;
		Boid.grid.addBody(this);
	}
	get bounds() {
		let { position, range } = this;
		return {
			min: position.sub(range),
			max: position.add(range),
		}
	}
	setDirection(direction) {
		if (typeof direction === "number") { // angle
			this.direction = new vec(Math.cos(direction), Math.sin(direction));
			this.angle = direction;
		}
		else { // vector (assumes it's normalized)
			this.direction = direction;
			this.angle = direction.angle;
		}
	}
}

ter.Render.boids = function() {
	ctx.beginPath();
	for (let boid of Boid.all) {
		ctx.moveTo(boid.position.x, boid.position.y);
		ctx.lineTo(boid.position.x + boid.direction.x * boid.speed * 3, boid.position.y + boid.direction.y * boid.speed * 3);
	}
	ctx.lineWidth = 4;
	ctx.strokeStyle = "red";
	ctx.stroke();
}

/*
ter.Render.on("afterRender", () => {
	Boid.update();
	ter.Render.boids();
});/**/

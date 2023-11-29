"use strict";

class World {
	gravity = new vec(0, 0);
	timescale = 1;
	time = 0;

	bodies = [];
	dynamicGrid;
	staticGrid; // bucket size MUST be the same as dynamicGrid
	constraints = [];
	pairs = {};
	
	constructor(gravity = new vec(0, 0), gridSize = 2000) {
		this.dynamicGrid = new Grid(gridSize);
		this.staticGrid = new Grid(gridSize);
		this.gravity = new vec(gravity);
	}
	
	getPairs(bodies) {
		let pairs = [];
		let canCollide = ter.Bodies.canCollide;

		for (let i = 0; i < bodies.length - 1; i++) {
			let bodyA = bodies[i];
			if (bodyA.removed) {
				if (bodyA.isStatic) {
					this.staticGrid.removeBody(bodyA);
				}
				else {
					this.dynamicGrid.removeBody(bodyA);
				}
				continue;
			}
			if (!bodyA.hasCollisions || bodyA.children.length > 0)
				continue;
			
			for (let j = i + 1; j < bodies.length; j++) {
				// Do AABB collision test
				let bodyB = bodies[j];

				if (bodyB.removed) {
					if (bodyB.isStatic) {
						this.staticGrid.removeBody(bodyB);
					}
					else {
						this.dynamicGrid.removeBody(bodyB);
					}
					continue;
				}
				if (!bodyB.hasCollisions || bodyA.parent && bodyA.parent === bodyB.parent)
					continue;
				if (!canCollide(bodyA.collisionFilter, bodyB.collisionFilter))
					continue;
				

				const boundsA = bodyA.bounds;
				const boundsB = bodyB.bounds;

				if (boundsA.min.x <= boundsB.max.x &&
					boundsA.max.x >= boundsB.min.x &&
					boundsA.min.y <= boundsB.max.y &&
					boundsA.max.y >= boundsB.min.y) {
					pairs.push([ bodyA, bodyB ]);
				}
			}
		}

		return pairs;
	}
	get collisionPairs() {
		let canCollide = ter.Bodies.canCollide;
		let dynamicGrid = this.dynamicGrid;
		let staticGrid = this.staticGrid;
		let pair = ter.Common.pairCommon;
		let getPairs = this.getPairs;
		let pairIds = new Set();
		let pairs = [];

		let dynamicBuckets = dynamicGrid.grid;
		let staticBuckets = staticGrid.grid;
		let bucketIds = dynamicGrid.gridIds;

		for (let id of bucketIds) {
			let curDynamicBucket = dynamicBuckets[id];
			let curStaticBucket = staticBuckets[id];
			let curPairs = getPairs(curDynamicBucket); // pair dynamic bodies

			// add static bodies
			if (curStaticBucket) {
				for (let j = 0; j < curDynamicBucket.length; j++) {
					let bodyA = curDynamicBucket[j];
					if (!bodyA.hasCollisions || bodyA.children.length > 0)
						continue;
					for (let k = 0; k < curStaticBucket.length; k++) {
						let bodyB = curStaticBucket[k];

						if (!bodyB.hasCollisions || bodyA.isStatic && bodyB.isStatic || bodyA.parent && bodyA.parent === bodyB.parent)
							continue;
						if (!canCollide(bodyA.collisionFilter, bodyB.collisionFilter))
							continue;
	
	
						const boundsA = bodyA.bounds;
						const boundsB = bodyB.bounds;
						
						if (boundsA.min.x <= boundsB.max.x &&
							boundsA.max.x >= boundsB.min.x &&
							boundsA.min.y <= boundsB.max.y &&
							boundsA.max.y >= boundsB.min.y) {
							curPairs.push([ bodyA, bodyB ]);
						}
					}
				}
			}

			for (let j = 0; j < curPairs.length; j++) {
				let curPair = curPairs[j];
				let n = pair(curPair[0].id, curPair[1].id);
				if (!pairIds.has(n)) {
					pairIds.add(n);
					pairs.push(curPair);
				}
			}
		}

		return pairs;
	}
}

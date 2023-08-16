"use strict";

var navmesh;

var MapBodies = {
	wall: function({ x, y, position, vertices }) {
		for (let i = 0; i < vertices.length; i++) {
			vertices[i] = new vec(vertices[i]);
		}
		if (position) {
			x = position.x;
			y = position.y;
		}
		let obj = Bodies.fromVertices(vertices, new vec(x, y), {
			isStatic: true,
			hasCollisions: true,
			restitution: 0,

			render: {
				visible: false,
				background: "#ffffff",
				round: 0,
			}
		});
		return obj;
	},
	spawn: function({ x, y, angle }) {
		// curMap.spawn.position = new vec(x, y);
		// curMap.spawn.angle = angle;

		player.body.setPosition(new vec(x, y));
		player.body.setAngle(angle);
		
		lastFov.length = 0;
		lastPos.length = 0;
		// resetCar();
	},
	tree: function({ x, y }) {
		let obj = Bodies.circle(70, new vec(x, y), {
			numSides: 6,
			isStatic: true,
			hasCollisions: true,

			render: {
				visible: false,
				background: "#592B21",
				layer: 0,
			}
		});
		return obj;
	},
	road: function(vertices, scene) {
		for (let i = 0; i < vertices.length; i++) {
			vertices[i] = new vec(vertices[i]);
		}

		let offset = 150;
		let points = [];
		let edgeGrid = new Grid(2000);
		let normals = [];
		for (let i = 0; i < vertices.length; i++) {
			let prev = vertices[i - 1];
			let cur = vertices[i];
			let next = vertices[i + 1];
			let normal;
			
			if (prev && next) normal = next.sub(cur).normalize().add(cur.sub(prev).normalize());
			else if (next) normal = next.sub(cur);
			else normal = cur.sub(prev);
			normal.normalize2().normal2();

			normals.push(normal);
			
			let center = cur;
			let sideA = cur.add(normal.mult(offset));
			let sideB = cur.add(normal.mult(-offset));
			points.push(new NavmeshNode(center), new NavmeshNode(sideA), new NavmeshNode(sideB));
			// navmesh.addNode(center);
			// navmesh.addNode(sideA);
			// navmesh.addNode(sideB);
		}

		let edges = [];
		for (let i = 0; i < vertices.length - 1; i++) {
			let cur = vertices[i];
			let next = vertices[i + 1];
			let curNormal = normals[i];
			let nextNormal = normals[i + 1];

			let offset = 300;
			function addEdge(offset) {
				let start = cur.add(curNormal.mult(offset));
				let end = next.add(nextNormal.mult(offset));
				let edge = {
					vertices: [start, end],
					bounds: {
						min: start.min(end),
						max: start.max(end),
					}
				}
				edges.push(edge);
				edgeGrid.addBody(edge);
			}
			addEdge(offset);
			addEdge(-offset);
		}

		/*
		Render.on("afterRender", () => {
			ctx.beginPath();

			for (let edge of edges) {
				ctx.moveTo(edge.vertices[0].x, edge.vertices[0].y);
				ctx.lineTo(edge.vertices[1].x, edge.vertices[1].y);
			}

			ctx.strokeStyle = "red";
			ctx.lineWidth = 2 / camera.scale;
			ctx.stroke();
		});/* */
		

		scene.on("afterAdd", () => {
			navmesh.addExistingStaticBodies();
			
			for (let point of points) {
				point.isRoad = true;
				navmesh.addNode(point);
				// console.log(point);
			}

			const lineIntersects = Common.lineIntersects;
			const scaledPairs = new Set();
			const pairCommon = Common.pairCommon;
			for (let point of points) {
				for (let i = 0; i < point.neighborDistances.length; i++) {
					let neighbor = point.neighbors[i];
					if (neighbor.isRoad) {
						let pairId = pairCommon(point.id, neighbor.id);
						if (scaledPairs.has(pairId)) continue;
						scaledPairs.add(pairId);
						
						// check for edge collision
						let edgeCollision = false;
						let bounds = {
							min: neighbor.position.min(point.position).div2(edgeGrid.gridSize).floor2(),
							max: neighbor.position.max(point.position).div2(edgeGrid.gridSize).floor2(),
						}
						let bucketIds = edgeGrid.getBucketIds(bounds);
						for (let bucketId of bucketIds) {
							let bucket = edgeGrid.grid[bucketId];
							for (let edge of bucket) {
								let intersection = lineIntersects(edge.vertices[0], edge.vertices[1], point.position, neighbor.position);
								if (intersection) {
									edgeCollision = true;
									break;
								}
							}
							if (edgeCollision) break;
						}

						if (!edgeCollision) {
							point.neighborDistances[i] *= 0.4;
							neighbor.neighborDistances[neighbor.neighbors.indexOf(point)] *= 0.4;
						}
						else {
							point.removeNeighbor(neighbor);
							neighbor.removeNeighbor(point);
						}
					}
				}
			}
		});
	},
	roadHitbox: function({ x, y, position, vertices }) {
		for (let i = 0; i < vertices.length; i++) {
			vertices[i] = new vec(vertices[i]);
		}
		if (position) {
			x = position.x;
			y = position.y;
		}
		let obj = Bodies.fromVertices(vertices, new vec(x, y), {
			material: "road",
			hasCollisions: false,
			isStatic: true,

			render: {
				visible: true,
				// background: "#42515560",
				background: "transparent",
				layer: -1,
			}
		});
		obj.delete();
		SurfaceGrid.addBody(obj);

		return obj;
	},
	dirtHitbox: function({ x, y, position, vertices }) {
		for (let i = 0; i < vertices.length; i++) {
			vertices[i] = new vec(vertices[i]);
		}
		if (position) {
			x = position.x;
			y = position.y;
		}
		let obj = Bodies.fromVertices(vertices, new vec(x, y), {
			material: "dirt",
			hasCollisions: false,
			isStatic: true,

			render: {
				visible: true,
				background: "#42515590",
				layer: -1,
			}
		});
		obj.delete();
		SurfaceGrid.addBody(obj);

		return obj;
	},
	trafficCone: function({ x, y, angle }) {
		let obj = Bodies.rectangle(49, 49, new vec(x, y), {
			isStatic: false,
			frictionAngular: 0.05,
			frictionAir: 0.04,
			mass: 0.6,
			hasCollisions: true,
			render: {
				visible: true,
				background: "#E35F26",
				sprite: "roadBlock/trafficCone.png",
				layer: 0,
			}
		});
		obj.setAngle(angle);
		return obj;
	},
}

function createMap(mapData) {
	let scene = new Scene();
	
	for (let typeName of Object.keys(mapData)) {
		let objFunc = MapBodies[typeName]; // creator function of for this object type
		if (!objFunc) {
			console.warn("no map function for type " + typeName);
			continue;
		}
		let types = mapData[typeName]; // array of options for objects of this type

		for (let options of types) {
			let obj = objFunc(options, scene);
			if (obj) {
				obj.delete();
				scene.addBody(obj);
			}
		}
	}

	// scene.addBody(body);

	scene.on("beforeAdd", () => {
		navmesh = new Navmesh();
	});

	return scene;
}


// - testMap
let testMap = createMap(testMapData);
(() => { // add fg + bg to testMap
	let bg = Bodies.rectangle(16000, 16000, new vec(8000, 8000), {
		isStatic: true,
		hasCollisions: false,
		removed: true,
		render: {
			sprite: "testMap/bg.png",
			useBuffer: true,
			layer: -4,
		}
	});
	testMap.addBody(bg);
	
	let fg = Bodies.rectangle(16000, 16000, new vec(8000, 8000), {
		isStatic: true,
		hasCollisions: false,
		removed: true,
		render: {
			sprite: "testMap/fg.png",
			useBuffer: true,
			layer: 4,
		}
	});
	testMap.addBody(fg);
})();
testMap.add();

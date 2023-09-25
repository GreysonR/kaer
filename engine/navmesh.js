"use strict";

class NavmeshNode {
	static id = 0;
	constructor(position) {
		this.position = position;
		this.neighbors = [];
		this.neighborDistances = [];

		this.g = 0;
		this.f = 0;
		this.parent = null;
		this.id = NavmeshNode.id++;
	}
	updateF(endPoint) {
		this.f = this.g + this.position.sub(endPoint).length;
	}
	addNeighbor(neighbor) {
		let neighbors = this.neighbors;
		if (!neighbors.includes(neighbor)) {
			neighbors.push(neighbor);
			this.neighborDistances.push(this.position.sub(neighbor.position).length);
		}
	}
	removeNeighbor(neighbor) {
		let i = this.neighbors.indexOf(neighbor);
		if (i > -1) {
			this.neighbors.splice(i, 1);
			this.neighborDistances.splice(i, 1);
		}
	}
	delete() {
		for (let neighbor of this.neighbors) {
			neighbor.removeNeighbor(this);
		}
	}
	reset() {
		this.g = 0;
		this.f = 0;
		this.parent = null;
	}
}

class Navmesh {
	constructor(size = 500) {
		this.nodeIds = new Set();
		this.polygons = [];
		this.nodes = {};
		this.grid = new Grid(size);
		this.polygonGrid = new Grid(this.grid.gridSize);

		// add existing static bodies to grid
		this.addExistingStaticBodies();

		
		Render.on("afterRender", () => {
			return;
			// console.time();
			for (let i = 0; i < 50; i++) {
				this.getPath(new vec(player.body.position), new vec({x: 3330, y: 1410}));
			}
			let path = this.getPath(new vec(player.body.position), new vec({x: 3330, y: 1410}), Render.navmeshArrows);
			// console.timeEnd();
			if (Render.navmeshArrows) {
				this.renderPolygons();
				this.render(path ?? []);
			}
		});/**/
	}
	addNode(node, permanent = true) {
		const { nodeIds, nodes, grid } = this;
		let id = node.id
		if (!nodeIds.has(id)) {
			nodes[id] = node;
			nodeIds.add(id);
			grid.addPoint(node);
			this.connectNode(node, permanent);
		}
	}
	deleteNode(node) {
		let id = node.id;
		this.nodeIds.delete(id);
		delete this.nodes[id];
		this.grid.removePoint(node);
		node.delete();
	}
	addBody(body) {
		this.polygonGrid.addBody(body)
		this.polygons.push(body);

		let vertices = body.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let vertice = vertices[i];

			let nextVertice = vertices[(i + 1) % vertices.length];
			let prevVertice = vertices[(i - 1 + vertices.length) % vertices.length];
			let prevDiff = vertice.sub(prevVertice).normalize();
			let nextDiff = vertice.sub(nextVertice).normalize();
			let normal = prevDiff.add(nextDiff).normalize2().mult2(50);
			if (prevDiff.cross(nextDiff) > 0) normal.mult2(-1);

			let node = new NavmeshNode(vertice.add(normal));
			this.addNode(node);
		}
	}
	addExistingStaticBodies() {
		let grid = World.staticGrid;
		let gridIds = grid.gridIds;

		for (let gridId of gridIds) {
			let bucket = grid.grid[gridId];
			for (let body of bucket) {
				this.addBody(body);
			}
		}
	}
	connectNode(node) {
		const raycast = Common.raycastSimple;
		const { grid, polygonGrid } = this;
		let vertice = node.position;
		let bucketPos = node.position.div(grid.gridSize).floor2();
		let polygonBucketIds = polygonGrid.getBucketIds({
			min: bucketPos.sub(1),
			max: bucketPos.add(1),
		});
		let polygons = [];
		for (let bucketId of polygonBucketIds) {
			let bucket = polygonGrid.grid[bucketId];
			polygons.push(...bucket);
		}
		
		let bucketIds = grid.getBucketIds({
			min: bucketPos.sub(1),
			max: bucketPos.add(1),
		});
		for (let bucketId of bucketIds) {
			let bucket = grid.grid[bucketId];

			for (let nodeB of bucket) {
				if (nodeB === node) continue;
				let dist = nodeB.position.sub(node.position).length;
				if (node.isRoad && nodeB.isRoad && dist >= 500 || dist >= 800) continue;
				let collision = raycast(vertice, nodeB.position, polygons);			
				if (!collision) {
					node.addNeighbor(nodeB);
					nodeB.addNeighbor(node);
				}
			}
		}
		// connect with vertices in line of sight
	}
	getNeighbors(node, endPoint) { // g = path length, f = length to end
		let nodes = [];

		for (let i = 0; i < node.neighbors.length; i++) {
			let neighbor = node.neighbors[i];
			let g = node.g + node.neighborDistances[i];
			if (!neighbor.parent || g < neighbor.g) {
				neighbor.g = g;
				neighbor.parent = node;
				neighbor.updateF(endPoint);
	
				nodes.push(neighbor);
			}
		}

		return nodes;
	}
	constructPath(node, startNode) {
		let path = [];
		while (node.parent && node !== startNode) {
			path.push(node.position);
			node = node.parent;
		}
		path.push(node.position);
		return path.reverse();
	}
	getPath(start, end, render = false) { // A*
		const { getNeighbors, constructPath, nodes, nodeIds } = this;
		let open = [];
		let openIds = [];
		let closed = new Set();
		let closedNodes = [];

		// add start node
		let startNode = new NavmeshNode(start);
		this.addNode(startNode, false);

		if (startNode.neighbors.length === 0) {
			this.deleteNode(startNode);
			return [];
		}
		
		// add end node
		let endNode = new NavmeshNode(end);
		this.addNode(endNode, false);

		let startMaterial = getMaterial(start);
		if (startMaterial === "road" || startMaterial === "dirt") {
			startNode.isRoad = true;
			for (let i = 0; i < startNode.neighbors.length; i++) {
				let neighbor = startNode.neighbors[i];
				if (neighbor.isRoad) {
					startNode.neighborDistances[i] *= 0.1;
					neighbor.neighborDistances[neighbor.neighbors.indexOf(startNode)] *= 0.1;
				}
			}
		}
		let endMaterial = getMaterial(end);
		if (endMaterial === "road" || endMaterial === "dirt") {
			endNode.isRoad = true;
			for (let i = 0; i < endNode.neighbors.length; i++) {
				let neighbor = endNode.neighbors[i];
				if (neighbor.isRoad) {
					endNode.neighborDistances[i] *= 0.1;
					neighbor.neighborDistances[neighbor.neighbors.indexOf(endNode)] *= 0.1;
				}
			}
		}

		if (render) this.renderNodes();

		// add start to open
		open.push(startNode);

		let n = 0;
		while (open.length > 0 && n < 10000) {
			n++;
			
			let curNode = open.pop();
			let cid = curNode.id;
			closed.add(cid);
			closedNodes.push(curNode);
			openIds.delete(cid);

			if (curNode === endNode) { // found path
				closedNodes.push(curNode);

				// Render.on("beforeLayer0", () => {
				// 	ctx.beginPath();
				// 	for (let j = 0; j < closedNodes.length; j++) {
				// 		let vertice = closedNodes[j].position;
				// 		ctx.moveTo(vertice.x, vertice.y);
				// 		ctx.arc(vertice.x, vertice.y, 6, 0, Math.PI*2);
				// 	}
				// 	ctx.fillStyle = "red";
				// 	ctx.fill();
				// });

				let path = constructPath(curNode, startNode);

				// reset nodes to default
				for (let id of nodeIds) {
					let node = nodes[id];

					if (node) {
						node.reset();
					}
				}
				this.deleteNode(startNode);
				this.deleteNode(endNode);

				return path;
			}

			// update neighbors
			let neighbors = getNeighbors(curNode, end);

			for (let n = 0; n < neighbors.length; n++) {
				let neighbor = neighbors[n];
				let nid = neighbor.id;

				if (closed.has(nid)) {
					continue;
				}

				if (!openIds.includes(nid)) {
					open.push(neighbor);
					openIds.push(nid);
				}
				else {
					// get existing neighbor
					let existingNeighbor = nodes[nid];

					if (existingNeighbor) {
						if (neighbor.g < existingNeighbor.g) { // this is a better path, update existing node
							existingNeighbor.g = neighbor.g;
							existingNeighbor.parent = curNode;
							existingNeighbor.polygon = neighbor.polygon;
						}
					}
					else { // it shouldn't get here
						console.warn("missing nid: " + nid, neighbor);
						openIds.delete(nid);
					}
				}
			}
			
			open.sort((a, b) => b.f - a.f);
		}

		// reset nodes to default
		for (let node of closedNodes) {
			node.reset();
		}
		for (let id of openIds) {
			let node = nodes[id];
			if (node) {
				node.reset();
			}
		}
		this.deleteNode(startNode);
		this.deleteNode(endNode);

		return [];
	}
	renderPolygons() {
		let polygons = this.polygons;

		// polygons
		ctx.beginPath();
		for (let polygon of polygons) {
			Render.vertices(polygon.vertices);

			for (let j = 0; j < polygon.vertices.length; j++) {
				let vertice = polygon.vertices[j];
				ctx.moveTo(vertice.x, vertice.y);
				ctx.arc(vertice.x, vertice.y, 3, 0, Math.PI*2);
			}
			ctx.closePath();
		}
		ctx.setLineDash([]);
		ctx.strokeStyle = "#83ABD0";
		ctx.lineWidth = 3;
		ctx.stroke();
	}
	renderNodes() {
		let nodes = Object.values(this.nodes);

		ctx.lineWidth = 2;
		ctx.strokeStyle = "#98A54C";
		ctx.beginPath();
		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];
			let pos = node.position;

			// node
			ctx.moveTo(pos.x, pos.y);
			ctx.arc(pos.x, pos.y, 5, 0, Math.PI*2);
			
			// arrows between neighbors
			if (Render.navmeshArrows) {
				for (let i = 0; i < node.neighbors.length; i++) {
					let neighbor = node.neighbors[i];
					let dir = neighbor.position.sub(node.position).normalize().mult(node.neighborDistances[i] * 0.5);
					dir.sub2(dir.normalize().mult(5));
					Render.arrow(node.position, dir, 10);
				}
			}
		}
		ctx.stroke();
	}
	render(path) {
		if (path.length > 0) {
			// line
			ctx.beginPath();
			ctx.moveTo(path[0].x, path[0].y);
			for (let j = 1; j < path.length; j++) {
				let vertice = path[j];
				ctx.lineTo(vertice.x, vertice.y);
			}
			ctx.lineWidth = 8 / camera.scale;
			ctx.strokeStyle = "#AA5E87ff";
			ctx.stroke();

			// points
			ctx.beginPath();
			for (let j = 0; j < path.length; j++) {
				let vertice = path[j];
				ctx.moveTo(vertice.x, vertice.y);
				ctx.arc(vertice.x, vertice.y, 5, 0, Math.PI*2);
			}
			ctx.strokeStyle = "#D27AAA";
			ctx.stroke();
		}
	}
}

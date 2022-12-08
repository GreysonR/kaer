"use strict";

class Tree {
	nodes = {
		bodies: new Set(),
		depth: 0,
	}
	nodeSize = 2000;
	getNode(position, log) { // Gets node at position
		position = new vec(position);
		let size = this.nodeSize;
		let { pair, pairNeg } = this;
		if (log) console.log(position);
		function nextNode(node, depth) {
			let curPos = position.div(size).floor();
			let id = depth === 0 ? pairNeg(curPos) : pair(curPos.abs());

			if (depth === 0) {
				position.sub2(curPos.mult(size));
			}
			if (log) console.log(curPos, node[id]);

			if (node[id]) {
				position.mod2(size);
				size /= 2;
				return nextNode(node[id], depth + 1);
			}
			else {
				return node;
			}
		}
		return nextNode(this.nodes, 0);
	}
	getNodes(body, log) { // Gets node at position
		let bounds = body.bounds;
		let ogSize = this.nodeSize;
		let { pair, pairNeg } = this;
		let inNodes = new Set();

		function nextNode(node, position, depth) {
			let pairing = depth === 0 ? pairNeg : pair;
			let size = ogSize / (2 ** depth);
			let stretchBounds = {
				min: bounds.min.sub(position).div2(size).floor2(),
				max: bounds.max.sub(position).div2(size).floor2(),
			}

			if (depth > 0) {
				if (stretchBounds.min.x > 1 || stretchBounds.min.y > 1 || stretchBounds.max.x < 0 || stretchBounds.max.y < 0) {
					return;
				}
				stretchBounds.min.clamp2(new vec(0, 0), new vec(1, 1));
				stretchBounds.max.clamp2(new vec(0, 0), new vec(1, 1));
			}
			if (log) console.warn(stretchBounds);

			for (let x = stretchBounds.min.x; x <= stretchBounds.max.x; x++) {
				for (let y = stretchBounds.min.y; y <= stretchBounds.max.y; y++) {
					let curPos = new vec(x, y);
					let id = pairing(curPos);

					if (log && depth > 0) console.log(id, curPos, node[id]);

					if (node[id]) {
						nextNode(node[id], position.add(curPos.mult(size)), depth + 1);
					}
					else {
						inNodes.add(node);
					}
				}
			}
		}
		nextNode(this.nodes, new vec(0, 0), 0);
		if (log) console.log(inNodes);
		return inNodes;
	}
	getNodeBounds(position) { // Gets position + size of node at position
		position = new vec(position);
		let size = this.nodeSize;
		let pair = this.pair;
		function nextNode(node) {
			let curPos = position.div(size).floor();
			let id = pair(curPos);

			if (node[id]) {
				position.mod2(size);
				size /= 2;
				return nextNode(node[id]);
			}
			else {
				return { position: position, size: size };
			}
		}
		return nextNode(this.nodes);
	}
	pair(pos) { // Uses elegant pairing (http://szudzik.com/ElegantPairing.pdf) to get id of node from position
		if (pos.y > pos.x)
			return pos.y * pos.y + pos.x;
		return pos.x * pos.x + pos.x + pos.y;
	}
	unpair(n) { // Takes id and returns vec that created it
		let sqrt = Math.floor(Math.sqrt(n));
		if (n - sqrt * sqrt < sqrt)
			return new vec(n - sqrt * sqrt, sqrt);
		return new vec(sqrt, n - sqrt * sqrt - sqrt);
	}
	pairNeg(pos) { // https://gist.github.com/TheGreatRambler/048f4b38ca561e6566e0e0f6e71b7739
		// elegant pairing, but doubled + odd numbers are reserved for negative numbers
		let x = pos.x >= 0 ? pos.x * 2 : pos.x * -2 - 1;
		let y = pos.y >= 0 ? pos.y * 2 : pos.y * -2 - 1;
		return (x >= y) ? (x * x + x + y) : (y * y + x);
	}
	unpairNeg(n) { // Takes id and returns vec that created it
		let sqrtz = Math.floor(Math.sqrt(n));
		let sqz = sqrtz * sqrtz;
		let result1 = ((n - sqz) >= sqrtz) ? new vec(sqrtz, n - sqz - sqrtz) : new vec(n - sqz, sqrtz);
		let x = result1.x % 2 === 0 ? result1.x / 2 : (result1.x + 1) / -2;
		let y = result1.y % 2 === 0 ? result1.y / 2 : (result1.y + 1) / -2;
		return new vec(x, y);
	}
}
class quadtree {
	tree;
	maxDepth = 2;
	maxBodies = 6;
	constructor() {
		this.tree = new Tree();
	}
	addBody(body) {
		let parents = this.tree.getNodes(body);
		body._parentNodes = new Set();

		for (let parent of parents) {
			this.addBodyToNode(body, parent);
		}
	}
	splitNode(parent) {
		let size = parent.bodies.size;
		if (size > this.maxBodies && parent.depth < this.maxDepth) {
			// Split node
			if (parent.depth === 0) { // can split the 1st node into more than 4 + can be negative
				for (let body of parent.bodies) {
					let bounds = body.bounds;
					let stretchBounds = {
						min: bounds.min.div(this.tree.nodeSize).floor2(),
						max: bounds.max.div(this.tree.nodeSize).floor2(),
					}

					for (let x = stretchBounds.min.x; x <= stretchBounds.max.x; x++) {
						for (let y = stretchBounds.min.y; y <= stretchBounds.max.y; y++) {
							let id = this.tree.pairNeg(new vec(x, y));
							if (!parent[id]) {
								parent[id] = {
									id: id,
									bodies: new Set(),
									depth: parent.depth + 1,
									parent: parent,
								}
							}
						}
					}
				}
			}
			else { // all other nodes are split into 4
				for (let i = 4; i--;) {
					if (!parent[i]) {
						parent[i] = {
							id: i,
							bodies: new Set(),
							depth: parent.depth + 1,
							parent: parent,
						}
					}
				}
			}

			for (let body of parent.bodies) {
				let newParents = this.tree.getNodes(body);

				body._parentNodes.delete(parent);
				
				for (let newParent of newParents) {
					newParent.bodies.add(body);
					body._parentNodes.add(newParent);
				}
			}
			if (parent.depth === 0) {
				Object.keys(parent).forEach(nodeId => {
					nodeId = Number(nodeId);
					if (!isNaN(nodeId)) {
						this.splitNode(parent[nodeId]);
					}
				});
			}
			else {
				for (let i = 4; i--;) {
					this.splitNode(parent[i]);
				}
			}
		}
	}
	addBodyToNode(body, node) {
		node.bodies.add(body);
		body._parentNodes.add(node);
		

		if (node.parent) {
			let curNode = node;
			while (curNode.parent) {
				curNode = curNode.parent;

				if (!curNode.bodies.has(body)) {
					curNode.bodies.add(body);
				}
				else {
					break;
				}
			}
		}

		if (node.bodies.size > this.maxBodies) {
			this.splitNode(node);
		}
	}
	removeBodyFromNode(body, node) {
		if (node) {
			let parentNodes = body._parentNodes;
			node.bodies.delete(body);
			parentNodes.delete(node);

			
			if (node.parent) {
				let curNode = node;
				while (curNode.parent) {
					curNode = curNode.parent;
					if (curNode.bodies.has(body)) {
						curNode.bodies.delete(body);
					}
					else {
						break;
					}
				}
				
				this.trimNode(node);
				/* */
			}
			
		}
		else {
			console.log(body, node);
		}
	}
	trimNode(node) {
		if (node.parent) {
			let maxBodies = this.maxBodies;
			let trimNode = node;
			while (trimNode.parent && trimNode.bodies.size <= maxBodies) {
				for (let i = 0; i < 4; i++) {
					delete trimNode[i];
				}
				trimNode = trimNode.parent;
			}
			if (trimNode !== node) {
				for (let body of trimNode.bodies) {
					body._parentNodes = this.tree.getNodes(body);
				}
			}
		}
	}
	removeBody(body) {
		let nodes = body._parentNodes;
		for (let node of nodes) {
			this.removeBodyFromNode(body, node);
		}
	}
	updateBody(body) {
		let newParents = this.tree.getNodes(body);
		let lastParents = new Set(body._parentNodes);
		
		for (let lastParent of lastParents) {
			if (!newParents.has(lastParent)) {
				this.removeBodyFromNode(body, lastParent);
			}
		}
		for (let parent of newParents) {
			if (!lastParents.has(parent)) {
				this.addBodyToNode(body, parent);
			}
		}

		for (let node of body._parentNodes) {
			if (!node.bodies.has(body)) {
				node.bodies.add(body);
				this.splitNode(node);
			}
		}
	}
	getNode(position) {
		return this.tree.getNode(position);
	}
}
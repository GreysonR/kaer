"use strict";

class Node {
	constructor(position, connections = new Set()) {
		this.position = position;
		this.connections = connections;
	}
	connect(node) {
		this.connections.add(node);
		node.connections.add(this);
	}
}

class NodeTree {
	constructor() {
		this.nodes = new Set();
	}
	add(node) {
		this.nodes.add(node);
	}
	clear() {
		this.nodes = new Set();
	}
	getSupport(position, direction) {
		
	}
}
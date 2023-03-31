"use strict"

Array.prototype.delete = function(val) {
	let index = this.indexOf(val);
	if (index !== -1) {
		this.splice(index, 1);
	}
}
Array.prototype.choose = function() {
	return this[Math.floor(Math.random() * this.length)];
}

class Body {
	constructor(type, options, vertices, position) {
		this.type = type;
		this.id = ter.Bodies.uniqueId;

		if (!options.render) options.render = {};
		if (!options.render.background) {
			let colors = [ "#1AD465", "#FEC64F", "#4FB8FE", "#FF4F4F", "#AD59FF" ];
			options.render.background = colors[Math.floor(Math.random() * colors.length)];
		}

		ter.Common.merge(this, options);

		this.vertices = vertices.map(v => new vec(v));
		this.removeDuplicatesVertices();

		
		this.resetVertices();

		if (!this.isConvex() && (!Array.isArray(options.children) || options.children.length === 0)) {
			options.children = [];

			let decompVerts = this.vertices.map(v => [v.x, v.y]);
			decomp.makeCCW(decompVerts);
			let concaveVertices = decomp.quickDecomp(decompVerts);
			let parentCenter = this.getCenterOfMass();
			for (let i = 0; i < concaveVertices.length; i++) {
				let vertices = concaveVertices[i].map(v => new vec(v[0], v[1]));
				let center = this.getCenterOfMass(vertices);
				let body = new fromVertices(vertices, position.add(center).sub(parentCenter));
				body.resetVertices(true);
				body.makeConvex();

				body.isSensor = this.isSensor;
				body.isStatic = this.isStatic;
				body.hasCollisions = this.hasCollisions;
				
				options.children.push(body);
			}
		}

		let children = options.children;
		this.children = [];
		if (Array.isArray(children)) {
			for (let i = 0; i < children.length; i++) {
				let child = children[i];
				child.delete();
				child.parent = this;
				this.children.push(child);
			}
		}

		this.resetVertices();
		this.updateBounds();
		this.updateAxes();
		this.updateInertia();

		if (typeof options.render.sprite === "string") {
			if (options.render.sprite.indexOf(".") === -1) {
				options.render.sprite += ".png";
			}
			this.render.sprite = new Sprite({
				src: options.render.sprite,
			});
		}

		if (options.angle) {
			this.setAngle(-options.angle);
		}
	}
	removeDuplicatesVertices(minDist = 0.1) { // remove vertices that are the same
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let curVert = vertices[i];
			
			for (let j = 0; j < vertices.length; j++) {
				if (j === i) continue;
				let nextVert = vertices[j];
				let dist = curVert.sub(nextVert);

				if (Math.abs(dist.x) + Math.abs(dist.y) < minDist) { // just use manhattan dist because it doesn't really matter
					vertices.splice(i, 1);
					i--;
					break;
				}
			}
		}
	}
	isConvex() {
		let vertices = this.vertices;
		let len = vertices.length;

		let last = vertices[0].sub(vertices[1]);
		for (let i = 1; i < len; i++) {
			let cur = vertices[i].sub(vertices[(i + 1) % len]);

			if (cur.cross(last) > 0) {
				return false;
			}
			last = cur;
		}

		return true;
	}
	makeConvex() {
		if (!this.isConvex()) {
			let removed = this.removed;
			this.delete();
			
			let { vertices, position } = this;
			this.children = [];
			let verts = vertices.map(v => [v.x, v.y]);
			decomp.removeCollinearPoints(verts, 0.4);
			let concaveVertices = decomp.quickDecomp(verts);
			let parentCenter = this.getCenterOfMass();

			for (let i = 0; i < concaveVertices.length; i++) {
				let vertices = concaveVertices[i].map(v => new vec(v[0], v[1]));
				let center = this.getCenterOfMass(vertices);
				let body = new fromVertices(vertices, position.add(center).sub(parentCenter));
				body.delete();
				body.parent = this;
				this.children.push(body);
			}

			if (!removed) {
				this.add();
			}
		}
	}
	updateInertia() {
		if (this.isStatic) {
			this.mass = Infinity;
			this.inverseMass = 0;
		}
		else {
			this.inertia = this.getInertia();
			this.inverseInertia = 1 / this.inertia;
		}
	}
	getInertia() {
		let children = this.children;
		if (children.length === 0) {
			const { vertices, mass } = this;
			
			let numerator = 0;
			let denominator = 0;
	
			for (var i = 0; i < vertices.length; i++) {
				let j = (i + 1) % vertices.length;
				let cross = Math.abs(vertices[j].cross(vertices[i]));
				numerator += cross * (vertices[j].dot(vertices[j]) + vertices[j].dot(vertices[i]) + vertices[i].dot(vertices[i]));
				denominator += cross;
			}
	
			return 2 * (mass / 6) * (numerator / denominator);
		}
		else {
			let inertia = 0;

			for (let i = 0; i < children.length; i++) {
				let child = children[i];
				inertia += child.inertia;
			}

			return inertia;
		}
	}
	getArea() {
		let area = 0;
		let vertices = this.vertices;
		let len = vertices.length;
		for (let i = 0; i < len; i++) {
			area += vertices[i].cross(vertices[(i + 1) % len]);
		}
		return area * 0.5;
	}

	id = 0;

	velocity = new vec(0, 0);
	position = new vec(0, 0);
	center = new vec(0, 0);
	force = new vec(0, 0);
	impulse = new vec(0, 0);
	angle = 0;
	rotationPoint = new vec(0, 0);
	angularVelocity = 0;
	torque = 0;

	vertices = [];
	children = [];
	parent = null;
	axes = [];
	buckets = [];

	restitution = 0.2;
	frictionAir = 0.05;
	frictionAngular = 0.01;
	friction = 0.01;

	mass = 1;
	inverseMass = 1;
	inertia = 1;
	inverseInertia = 0.000015;
	
	isStatic = false;
	isSensor = false;
	hasCollisions = true;


	checkedPairs = [];
	pairs = [];
	lastSeparations = {};
	numContacts = 0;
	sink = 0.001;

	bounds = {
		min: new vec({ x: 0, y: 0 }),
		max: new vec({ x: 1, y: 1 })
	}
	render = {
		background: "#1AD465",
		border: "transparent",
		borderWidth: 3,
		borderType: "miter",
		lineDash: false,
		lineCap: "butt",
		visible: true,
		opacity: 1,
		layer: 0,
		spriteScale: new vec(1, 1),
	}
	collisionFilter = {
		category: 0,
		mask: 0,
	}

	delete() {
		let { World, Render } = ter;
		if (!this.parent) {
			Render.bodies[this.render.layer].delete(this);
		}
		if (World.bodies.includes(this)) {
			this.trigger("delete");
			this.removed = true;

			World.bodies.delete(this);
			if (this.children.length === 0) {
				World.tree.removeBody(this);
			}

			for (let i = 0; i < this.pairs.length; i++) {
				ter.Bodies.cleansePair(this.pairs[i]);
			}
		}

		for (let i = 0; i < this.children.length; i++) {
			this.children[i].delete();
		}

		return this;
	}
	add() {
		let { World, Render} = ter;
		if (!World.bodies.includes(this)) {
			this.removed = false;
			
			World.bodies.push(this);

			if (this.children.length === 0) {
				World.tree.addBody(this);
			}

			if (!this.parent) {
				if (!Render.bodies[this.render.layer]) {
					Render.bodies[this.render.layer] = new Set();
				}
				Render.bodies[this.render.layer].add(this);
			}

			for (let i = 0; i < this.children.length; i++) {
				this.children[i].add();
			}
		}

		return this;
	}
	centerSprite(sprite = this.render.sprite) {
		let options = this;
		if (sprite) {
			if (!(sprite.width && sprite.height)) {
				if (options.width) sprite.width = options.width;
				if (options.height) sprite.height = options.height;
				if (options.radius) {
					sprite.width = options.radius * 2;
					sprite.height = options.radius * 2;
				}
			}
			if (sprite.position === undefined) {
				sprite.position = new vec(0, 0);
				if (options.width && options.height) {
					sprite.position.x = -options.width/2;
					sprite.position.y = -options.height/2;
				}
				if (options.radius) {
					sprite.position.x = -sprite.width  / 2;
					sprite.position.y = -sprite.height / 2;
				}
			}
		}

		return sprite;
	}
	resetVertices(forceCCW = false) {
		this.makeCCW(forceCCW);
		this.area = this.getArea();
		this.recenterVertices();
		this.updateBounds();
		this.updateAxes();
	}
	makeCCW(force = false) { // makes vertices go counterclockwise if they're clockwise
		if (force) { // reorders vertices by angle from center - can change order of vertices
			let vertices = this.vertices;
			let center = this.position;
			let mapped = vertices.map(v => [v, v.sub(center).angle]);
			mapped.sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
			this.vertices = mapped.map(v => v[0]);
		}
		else { // reverses vertices if the 1st and 2nd are going wrong direction - never changes order of vertices
			let vertices = this.vertices;
			let center = this.position;
	
			let mapped = vertices.map(v => v.sub(center).angle);
			if (ter.Common.angleDiff(mapped[0], mapped[1]) > 0) {
				this.vertices.reverse();
			}
		}
	}
	getCenterOfMass(vertices = this.vertices) {
		let centroid = new vec(0, 0);
		let children = this.children;

		if (children.length > 0 && false) {
			let totalArea = 0;
			for (let i = 0; i < children.length; i++) {
				let child = children[i];
				totalArea += child.area;
				centroid.add2(child.position.mult(child.area));
			}
			centroid.div2(totalArea);
		}
		else { /* https://bell0bytes.eu/centroid-convex/ */
			let det = 0;
			let tempDet = 0;
			let numVertices = vertices.length;
	
			for (let i = 0; i < vertices.length; i++) {
				let curVert = vertices[i];
				let nextVert = vertices[(i + 1) % numVertices];
	
				tempDet = curVert.x * nextVert.y - nextVert.x * curVert.y;
				det += tempDet;
	
				centroid.add2({ x: (curVert.x + nextVert.x) * tempDet, y: (curVert.y + nextVert.y) * tempDet });
			}
	
			centroid.div2(3 * det);
		}

		return centroid;
	}
	recenterVertices() {
		let center = this.getCenterOfMass();
		let position = this.position;
		this.center = center;
		center.sub2(position);
		
		for (let i = 0; i < this.vertices.length; i++) {
			this.vertices[i].sub2(center);
		}
	}
	updateBounds() {
		const vertices = this.vertices;
		let minX = Infinity, minY = Infinity;
		let maxX = -Infinity, maxY = -Infinity;

		for (let i = 0; i < vertices.length; i++) {
			let v = vertices[i];

			if (v.x < minX) minX = v.x;
			if (v.x > maxX) maxX = v.x;
			if (v.y < minY) minY = v.y;
			if (v.y > maxY) maxY = v.y;
		}

		this.bounds.min.x = minX;
		this.bounds.min.y = minY;
		this.bounds.max.x = maxX;
		this.bounds.max.y = maxY;

		return this;
	}
	updateAxes() {
		let verts = this.vertices;
		let axes = [];

		for (let i = 0; i < verts.length; i++) {
			let curVert = verts[i];
			let nextVert = verts[(i + 1) % verts.length];

			if (i >= verts.length / 2) { // Prevents duplicate axes
				let axis = curVert.sub(nextVert);
				let dupe = false;
				
				for (let j = 0; j < axes.length; j++) {
					if (axes[j].x === axis.y && axes[j].y === axis.x || axes[j].x === -axis.y && axes[j].y === -axis.x) {
						dupe = true;
						break;
					}
				}
				if (!dupe) {
					axes.push(axis);
				}
			}
			else {
				axes.push(nextVert.sub(curVert));
			}
		}
		for (let i = 0; i < axes.length; i++) {
			axes[i] = axes[i].normal().normalize2();
		}

		this.axes = axes;
	}
	setPosition(position, ignoreChildren = false) {
		if (position.isNaN()) return;
		let last = this.position;
		let delta = position.sub(last);

		this.translate(delta, true, ignoreChildren);

		this.position.x = position.x;
		this.position.y = position.y;

		this.updateBounds();
	}
	setAngle(angle) {
		if (isNaN(angle)) return;
		if (angle !== this.angle) {
			let delta = ter.Common.angleDiff(angle, this.angle);
			
			this.translateAngle(delta, true);
			
			this.angle = angle;
		}

		return this;
	}
	translate(delta, silent = false, ignoreChildren = false) {
		if (delta.isNaN()) return;
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			vertices[i].add2(delta);
		}

		if (!silent) {
			this.position.add2(delta);
		}
		this.updateBounds();

		let tree = ter.World.tree;
		if (this._Grids && this._Grids[tree.id]) {
			tree.updateBody(this);
		}

		if (!ignoreChildren) {
			let children = this.children;
			for (let i = 0; i < children.length; i++) {
				let child = children[i];
				child.translate(delta, silent);
			}
		}
	}
	translateAngle(angle, silent = false) {
			if (isNaN(angle)) return;
			let vertices = this.vertices;
			let position = this.position;
			let rotationPoint = this.rotationPoint.rotate(this.angle + angle);
			if (this.parent) {
				rotationPoint.add2(this.position.sub(this.parent.position));
			}
			let sin = Math.sin(angle);
			let cos = Math.cos(angle);

			for (let i = vertices.length; i-- > 0;) {
				let vert = vertices[i];
				let dist = vert.sub(position);
				vert.x = position.x + (dist.x * cos - dist.y * sin);
				vert.y = position.y + (dist.x * sin + dist.y * cos);
			}

			let posOffset = rotationPoint.sub(rotationPoint.rotate(angle));
			this.translate(posOffset);
			if (!silent) {
				this.angle += angle;
			}

			this.updateBounds();
			this.updateAxes();

			let children = this.children;
			for (let i = 0; i < children.length; i++) {
				let child = children[i];
				child.translateAngle(angle, silent);
			}

		return this;
	}
	getSupport(vector, position=this.position) {
		let vertices = this.vertices;
		let bestDist = 0;
		let bestVert;
		for (let i = 0; i < vertices.length; i++) {
			let dist = vector.dot(vertices[i].sub(position));

			if (dist > bestDist) {
				bestDist = dist;
				bestVert = i;
			}
		}

		return [ bestVert, bestDist ];
	}
	containsPoint(point) {
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let curVertice = vertices[i];
			let nextVertice = vertices[(i + 1) % vertices.length];
			
			if ((point.x - curVertice.x) * (nextVertice.y - curVertice.y) + (point.y - curVertice.y) * (curVertice.x - nextVertice.x) >= 0) {
				return false;
			}
		}
		return true;
	}
	applyForce(force, delta = Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (force.isNaN()) return;
		if (this.isStatic) return this;

		
		this.force.add2(force.mult(delta));
		
		return this;
	}
	applyTorque(force, delta = Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (isNaN(force)) return;
		this.torque += force * delta;
		return this;
	}

	events = {
		collisionStart: [],
		collisionActive: [],
		collisionEnd: [],
		beforeUpdate: [], // apply forces to current body
		duringUpdate: [], // clear forces from current body
		afterUpdate: [], // apply forces to current + other bodies
		delete: [],
	}
	on(event, callback) {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(callback);
	}
	off(event, callback) {
		event = this.events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	trigger(event, arg1, arg2) {
		this.events[event].forEach(callback => {
			callback(arg1, arg2);
		});

		if (this.parent) {
			this.parent.trigger(event, arg1, arg2);
		}

		return this;
	}
}
class rectangle extends Body {
	constructor(width, height, position, options={}) {
		super("rectangle", options, [
			new vec(-width/2, -height/2),
			new vec( width/2, -height/2),
			new vec( width/2,  height/2),
			new vec(-width/2,  height/2),
		], position);

		this.width = width;
		this.height = height;
		this.centerSprite();

		this.setPosition(position, true);
		this.add();
	}
}
class polygon extends Body {
	constructor(radius, numSides, position, options={}) {
		super("polygon", options, (() => {
			let vertices = [];
			let angle = Math.PI * 2 / numSides;
			for (let i = 0; i < numSides; i++) {
				vertices.push(new vec(Math.cos(angle * i) * radius, Math.sin(angle * i) * radius));
			}
			return vertices;
		})(), position);


		this.radius = radius;
		this.numSides = numSides;
		this.centerSprite();

		this.setPosition(position, true);
		this.add();
	}
}
class circle extends Body {
	constructor(radius, position, options={}) {
		super("circle", options, (() => {
			let vertices = [];
			let numSides = options.numSides || Math.round(Math.pow(radius, 1/3) * 2.8);
			let angle = Math.PI * 2 / numSides;
			for (let i = 0; i < numSides; i++) {
				vertices.push(new vec(Math.cos(angle * i + angle / 2) * radius, Math.sin(angle * i + angle / 2) * radius));
			}
			return vertices;
		})(), position);

		this.radius = radius;
		this.updateInertia();
		this.centerSprite();

		this.setPosition(position, true);
		this.add();
	}
}
class fromVertices extends Body {
	constructor(vertices, position, options={}) {
		super("polygon", options, vertices, position);

		this.setPosition(position, true);
		this.centerSprite();
		this.add();
	}
}
"use strict"

Array.prototype.delete = function(val) {
	if (this.includes(val)) {
		this.splice(this.indexOf(val), 1);
	}
}
Array.prototype.choose = function() {
	return this[Math.floor(Math.random() * this.length)];
}

class Body {
	constructor(type, options, vertices) {
		this.type = type;
		this.id = ter.Bodies.uniqueId;

		if (!options.render) options.render = {};
		if (!options.render.background) {
			let colors = [ "#1AD465", "#FEC64F", "#4FB8FE", "#FF4F4F", "#AD59FF" ];
			options.render.background = colors[Math.floor(Math.random() * colors.length)];
		}

		this.vertices = vertices;
		this.resetVertices();
		this.updateBounds();
		this.updateAxes();
		this.updateInertia();

		if (options.render.sprite && !Render.images[options.render.sprite]) {
			if (options.render.sprite.indexOf(".") === -1) {
				options.render.sprite += ".png";
			}
			Render.loadImg(options.render.sprite);
		}

		if (options.angle) {
			this.setAngle(-options.angle);
			this.last.angle = options.angle;
		}
		ter.Common.merge(this, options);
	}
	updateInertia() {
		if (this.isStatic) {
			this.mass = Infinity;
			this.inverseMass = 0;
		}
		else {
			this.inertia = ter.Bodies.getInertia(this);
			this.inverseInertia = 1 / this.inertia;
		}
	}

	id = 0;

	velocity = new vec(0, 0);
	position = new vec(0, 0);
	force = new vec(0, 0);
	impulse = new vec(0, 0);
	angle = 0;
	rotationPoint = new vec(0, 0);
	angularVelocity = 0;
	torque = 0;

	vertices = [];
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

	last = {
		angle: 0,
		position: new vec(0, 0),
	}
	bounds = {
		min: new vec({ x: 0, y: 0 }),
		max: new vec({ x: 1, y: 1 })
	}
	render = {
		background: "#1AD465",
		border: "transparent",
		borderWidth: 3,
		borderType: "round",
		lineDash: false,
		visible: true,
		opacity: 1,
		layer: 0,
	}
	collisionFilter = {
		category: 0,
		mask: 0,
	}

	delete() {
		let { World, Render } = ter;
		if (World.bodies.includes(this)) {
			this.trigger("delete");
			this.removed = true;

			World.bodies.delete(this);
			Render.bodies[this.render.layer].delete(this);
			World.tree.removeBody(this);

			for (let i = 0; i < this.pairs.length; i++) {
				ter.Bodies.cleansePair(this.pairs[i]);
			}
		}
		else {
			console.error("Couldn't find body");
		}

		return this;
	}
	add() {
		let { World, Render} = ter;
		if (!World.bodies.includes(this)) {
			this.removed = false;
			World.bodies.push(this);
			World.tree.addBody(this);
			
			if (!Render.bodies[this.render.layer]) {
				Render.bodies[this.render.layer] = new Set();
			}
			Render.bodies[this.render.layer].add(this);
		}

		return this;
	}
	centerSprite() {
		let options = this;
		if (options.render.sprite) {
			if (!(options.render.spriteWidth && options.render.spriteHeight)) {
				if (options.width) options.render.spriteWidth = options.width;
				if (options.height) options.render.spriteHeight = options.height;
				if (options.radius) {
					options.render.spriteWidth =  options.radius * 2;
					options.render.spriteHeight = options.radius * 2;
				}
			}
			if (options.render.spriteX === undefined || options.render.spriteY === undefined) {
				if (options.width && options.render.spriteX === undefined) options.render.spriteX = -options.width/2;
				if (options.height && options.render.spriteY === undefined) options.render.spriteY = -options.height/2;
				if (options.radius) {
					if (options.render.spriteX === undefined) options.render.spriteX = -options.render.spriteWidth  / 2;
					if (options.render.spriteY === undefined) options.render.spriteY = -options.render.spriteHeight / 2;
				}
			}
		}
	}
	resetVertices() {
		this.recenterVertices();
		this.updateBounds();
		this.updateAxes();
	}
	getCenterOfMass() { /* https://bell0bytes.eu/centroid-convex/ */
		let vertices = this.vertices;
		let centroid = new vec(0, 0);
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

		return centroid;
	}
	recenterVertices() {
		let center =  this.getCenterOfMass();
		center.sub2(this.position);
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
	setAngle(angle) {
		if (angle !== this.last.angle) {
			let vertices = this.vertices;
			let position = this.position;
			let rotationPoint = this.rotationPoint.rotate(angle);
			let delta = -(this.last.angle - angle);
			let sin = Math.sin(delta);
			let cos = Math.cos(delta);

			for (let i = vertices.length; i-- > 0;) {
				let vert = vertices[i];
				let dist = vert.sub(position);
				vert.x = position.x + (dist.x * cos - dist.y * sin);
				vert.y = position.y + (dist.x * sin + dist.y * cos);
			}

			let posOffset = this.rotationPoint.rotate(this.last.angle).sub(rotationPoint);
			this.translate(posOffset);

			this.translateAngle(-this.angularVelocity);
			
			this.angle = angle;
			this.last.angle = angle;
		}

		return this;
	}
	translateAngle(angle, silent = false) {
			let vertices = this.vertices;
			let position = this.position;
			let rotationPoint = this.rotationPoint.rotate(this.angle + angle);
			let sin = Math.sin(angle);
			let cos = Math.cos(angle);

			for (let i = vertices.length; i-- > 0;) {
				let vert = vertices[i];
				let dist = vert.sub(position);
				vert.x = position.x + (dist.x * cos - dist.y * sin);
				vert.y = position.y + (dist.x * sin + dist.y * cos);
			}

			let posOffset = this.rotationPoint.rotate(this.angle).sub(rotationPoint);
			this.translate(posOffset);
			this.last.position.add2(posOffset);

			if (!silent) {
				this.angle += angle;
			}
			this.updateBounds();
			this.updateAxes();

		return this;
	}
	setPosition(position, silent = false) {
		let last = this.position;
		if (position.x !== last.x || position.y !== last.y) {
			let delta = position.sub(last);
			let vertices = this.vertices;
			for (let i = 0; i < vertices.length; i++) {
				vertices[i].add2(delta);
			}

			if (!silent) {
				this.last.position.x = position.x;
				this.last.position.y = position.y;
			}

			this.position.x = position.x;
			this.position.y = position.y;

			this.updateBounds();
		}
	}
	translate(delta, silent = false) {
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			vertices[i].add2(delta);
		}

		if (!silent) {
			this.position.add2(delta);
		}
		this.updateBounds();
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
			
			if ((point.x - curVertice.x) * (nextVertice.y - curVertice.y) + (point.y - curVertice.y) * (curVertice.x - nextVertice.x) > 0) {
				return false;
			}
		}
		return true;
	}
	applyForce(force) {
		let { Performance: timing, World } = ter;
		const timescale = World.timescale * (timing.delta / 16.667);
		if (this.isStatic) return this;

		this.last.position.x -= force.x * timescale;
		this.last.position.y -= force.y * timescale;
		this.velocity.add2(force.mult(timescale));
		return this;
	}
	applyTorque(force) {
		this.last.angle -= force;
		return this;
	}

	events = {
		collisionStart: [],
		collisionActive: [],
		collisionEnd: [],
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
		]);

		this.width = width;
		this.height = height;
		this.centerSprite();

		this.setPosition(position);
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
		})());


		this.radius = radius;
		this.numSides = numSides;
		this.centerSprite();

		this.setPosition(position);
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
				vertices.push(new vec(Math.cos(angle * i) * radius, Math.sin(angle * i) * radius));
			}
			return vertices;
		})());

		this.radius = radius;
		this.updateInertia();
		this.centerSprite();

		this.setPosition(position);
		this.add();
	}
}
class fromVertices extends Body {
	constructor(vertices, position, options={}) {
		super("polygon", options, vertices);

		this.setPosition(position);
		this.centerSprite();
		this.add();
	}
}
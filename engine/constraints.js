
class Constraint {
	constructor(bodyA, bodyB, options = {}) {
		this.bodyA = bodyA;
		this.bodyB = bodyB;

		ter.Common.merge(this, options);
		if (!options.length) {
			this.length = bodyA.position.add(this.offsetA.rotate(bodyA.angle)).sub(bodyB.position.add(this.offsetB.rotate(bodyB.angle))).length;
		}
		this.type = "constraint";

		this.bounds = {
			min: bodyA.position.min(bodyB.position),
			max: bodyA.position.max(bodyB.position),
		}

		this.add();
	}
	delete() {
		this.removed = true;
		ter.World.constraints.delete(this);
		Render.bodies[this.render.layer].delete(this);
	}
	add() {
		this.removed = false;
		ter.World.constraints.push(this);
		if (!Render.bodies[this.render.layer]) {
			Render.bodies[this.render.layer] = new Set();
		}
		Render.bodies[this.render.layer].add(this);
	}
	updateBounds() {
		let { bodyA, bodyB, offsetA, offsetB } = this;
		offsetA = offsetA.rotate(bodyA.angle);
		offsetB = offsetB.rotate(bodyA.angle);

		this.bounds.min = bodyA.position.add(offsetA).min2(bodyB.position.add(offsetB));
		this.bounds.max = bodyA.position.add(offsetA).max2(bodyB.position.add(offsetB));
	}
	realLength() {
		let { bodyA, bodyB, offsetA, offsetB } = this;
		return bodyA.position.add(offsetA.rotate(bodyA.angle)).sub(bodyB.position.add(offsetB.rotate(bodyB.angle))).length;
	}

	offsetA = new vec(0, 0);
	offsetB = new vec(0, 0);
	removed = true;
	stiffness = 0.1;
	angularStiffness = 0;
	ignoreSlack = false;
	length = 200;
	render = {
		border: "#ffffff",
		borderWidth: 4,
		borderType: "miter",
		lineDash: false,
		lineCap: "butt",
		visible: true,
		opacity: 1,
		layer: 0,
	}
}
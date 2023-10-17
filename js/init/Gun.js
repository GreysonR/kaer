"use strict";

class Gun {
	constructor(type, options = {}) {
		let merge = ter.Common.merge;
		let base = Weapons[type];

		merge(this, base);
		merge(this, options);

		this.magazine = this.magazineSize;
	}

	lastShot = -100000; // time that last bullet was fired
	magazine = 0; // bullets left in magazine

	shoot(position, angle, parent) {
		const now = World.time;
		if (now - this.lastShot >= this.fireRate && this.magazine > 0) {
			this.lastShot = now;
			--this.magazine;

			const { bulletSpeed } = this;
			let velocity = new vec(Math.cos(angle), Math.sin(angle)).mult2(bulletSpeed);
			new Bullet(this, position, velocity, this.trailLength, parent);
		}
	}
	reload() {
		this.magazine = this.magazineSize;
	}
}

class Bullet {
	static all = new Set();
	constructor(gun, position, velocity, trailLength, parent) {
		let bulletSpeed = velocity.length;
		Bullet.all.add(this);
		let body = this.body = Bodies.rectangle(14, 50, new vec(position), {
			isSensor: true,
			frictionAir: 0,
			removed: true,
			render: {
				layer: -2,
				round: 4,
				background: "transparent",
			}
		});
		body.setAngle(velocity.angle - Math.PI/2);
		body.velocity.set(velocity);

		let bullet = this;
		let timeout = animations.create({
			duration: gun.range / (bulletSpeed + velocity.sub(parent.velocity).length) * 16.67 * 1.8,
			curve: ease.linear,
			callback: () => {},
			onend: () => {
				bullet.delete();
				bullet.hitNothing();
			}
		})
		body.on("collisionStart", collision => {
			let otherBody = collision.bodyA === body ? collision.bodyB : collision.bodyA;
			if (!otherBody.isSensor && otherBody != parent) {
				if (otherBody.parentCar && otherBody.parentCar.takeDamage) {
					otherBody.parentCar.takeDamage(gun.damage);
					bullet.hitCharacter(collision);
				}
				else {
					bullet.hitStatic(collision);
				}
				bullet.delete();
				timeout.stop();
			}
		});

		this.lastPositions = [];

		// Render bullet trail
		this.startPosition = new vec(position);
		this.maxTrailLength = trailLength;
		this.deleteTime = 0;
		this.renderTrail = function() {
			let trailLength = bullet.maxTrailLength;
			if (body.removed) {
				const now = World.time;
				trailLength = (1 - (now - bullet.deleteTime) * velocity.length / 10 / bullet.maxRealizedTrailLength) * bullet.maxRealizedTrailLength;
				if (trailLength <= 0 || bullet.maxRealizedTrailLength <= 0) {
					Render.off("beforeLayer-2", bullet.renderTrail);
					return;
				}
			}
			let start = body.position.add(body.velocity.normalize().mult(body.height / 2));
			let end = bullet.startPosition.sub(start);
			if (end.length > trailLength) {
				end.length = trailLength;
			}
			let direction = new vec(end);
			end.add2(start);
			renderTrail(start, start.add(direction.mult(0.25)), start.add(direction.mult(0.75)), end, body.width, 0, -2, 1);
			let angle = body.angle;
			ctx.arc(start.x, start.y, body.width / 2, angle, Math.PI + angle);
			ctx.fillStyle = createGradient(start, end, [["#DC567Cff", 0], ["#E9644700", 1]]);
			ctx.fill();
		}
		Render.on("beforeLayer-2", this.renderTrail);

		body.add();
	}
	delete() {
		this.body.delete();
		Bullet.all.delete(this);
		this.deleteTime = World.time;
		this.maxRealizedTrailLength = Math.min(this.startPosition.sub(this.body.position).length, this.maxTrailLength);
	}
	hitStatic(collision) { // effects for hitting a static body
		let { normal, contacts } = collision;
		if (collision.bodyA.isSensor) { // bodyA is the bullet, so the normal is of the bullet
			normal = normal.mult(-1);
		}
		let point = contacts.reduce((prev, cur) => { // get average position of contacts to find collision point
			return prev.add2(cur.vertice);
		}, new vec(0, 0)).div2(contacts.length);
		let normalAngle = Math.atan2(normal.y, normal.x);
		let tangentAngle = normalAngle + Math.PI/2;

		// circle
		{
			let duration = 400;
			let maxRadius = Math.random() * 30 + 30;
			let maxLineWidth = 8;
			let radius = 0;
			let lineWidth = maxLineWidth;
			let position = point.add(normal.mult(10));
			let maxDash = 30;
			let dash = 0;
			function render() {
				if (lineWidth > 0 && (dash == 0 || dash >= 1)) {
					ctx.beginPath();
					ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
					ctx.strokeStyle = "#DBA391";
					ctx.lineWidth = lineWidth;
					if (dash >= 1) {
						ctx.lineCap = "round";
						ctx.setLineDash([dash, maxDash - dash])
					}
					ctx.stroke();
					ctx.setLineDash([]);
				}
			}
			animations.create({
				duration: duration,
				curve: ease.out.quintic,
				callback: p => {
					radius = maxRadius * p;
				},
				onend() {
					Render.off("beforeLayer-2", render);
				},
			});
			animations.create({
				duration: duration * 0.7,
				delay: duration * 0.3,
				curve: ease.linear,
				callback: p => {
					lineWidth = maxLineWidth * (1 - p);
					dash = maxDash * (1 - p);
				},
			});
			Render.on("beforeLayer-2", render);
		}

		// lines
		let numLines = 5; // must be > 1
		let lineVelocityBounds = [2, 5]; // [min, max]
		for (let i = 0; i < numLines; i++) {
			let angle = (i / (numLines - 1)) * Math.PI + tangentAngle + (Math.random() * 0.4 - 0.2);
			let speed = Math.random() * (lineVelocityBounds[1] - lineVelocityBounds[0]) + lineVelocityBounds[0];
			let distance = Math.random() * 20 + 60;
			let start = new vec(point);
			let direction = new vec(Math.cos(angle), Math.sin(angle));
			let offset = direction.mult(distance);
			let length = 20;
			
			let ptA = new vec(start);
			let ptB = new vec(start);
			function render() {
				ctx.beginPath();
				ctx.moveTo(ptA.x, ptA.y);
				ctx.lineTo(ptB.x, ptB.y);
				ctx.strokeStyle = "#FFF4EB";
				ctx.lineWidth = 8;
				ctx.lineCap = "round";
				ctx.stroke();
			}
			let animation = animations.create({
				duration: distance / speed * 16.67,
				curve: ease.out.quadratic,
				callback: p => {
					let lengthPercent = length / distance;
					p = p * (1 + lengthPercent);
					let percentB = Math.min(1, p);
					let percentA = Math.max(0, p - lengthPercent);
					ptA = start.add(offset.mult(percentA));
					ptB = start.add(offset.mult(percentB));

					if (percentA >= 0.995) {
						animation.stop();
					}
				},
				onend() {
					Render.off("beforeLayer-2", render);
				},
				onstop() {
					Render.off("beforeLayer-2", render);
				},
			});
			Render.on("beforeLayer-2", render);
		}

		// dots
		let numDots = 6;
		for (let i = 0; i < numDots; i++) {
			let angle = Math.random() * Math.PI + tangentAngle;
			let duration = Math.random() * 200 + 200;
			let maxRadius = Math.random() * 14 + 8;
			let distance = Math.random() * 60 + 30 - (maxRadius / (14 + 8) * 30);
			let start = new vec(point);
			let direction = new vec(Math.cos(angle), Math.sin(angle));
			let offset = direction.mult(distance);
			
			let pt = new vec(start);
			let radius = maxRadius;
			function render() {
				ctx.beginPath();
				ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
				ctx.closePath();
				ctx.fillStyle = "#FFF4EB";
				ctx.fill();
			}
			let positionAnimation = animations.create({
				duration: duration,
				curve: ease.linear,
				callback: p => {
					pt.set(start.add(offset.mult(p)));
				},
				onend() {
					Render.off("beforeLayer-2", render);
				},
			});
			let radiusAnimation = animations.create({
				duration: duration * 0.6,
				delay: duration * 0.4,
				curve: ease.linear,
				callback: p => {
					radius = maxRadius * Math.max(0, 1 - p);
				},
				onend() {
					radius = 0;
				},
			});
			Render.on("beforeLayer-2", render);
		}
	}
	hitCharacter(collision) { // effects for hitting a character
		let { normal, contacts } = collision;
		if (collision.bodyA.isSensor) { // bodyA is the bullet, so the normal is of the bullet
			normal = normal.mult(-1);
		}
		let point = contacts.reduce((prev, cur) => { // get average position of contacts to find collision point
			return prev.add2(cur.vertice);
		}, new vec(0, 0)).div2(contacts.length);
		let normalAngle = Math.atan2(normal.y, normal.x);
		let tangentAngle = normalAngle + Math.PI/2;

		// circle
		{
			let startAngle = tangentAngle - 0.4;
			let endAngle = startAngle + Math.PI + 0.8;
			let duration = 400;
			let maxRadius = Math.random() * 30 + 30;
			let maxLineWidth = 10;
			let radius = 0;
			let lineWidth = maxLineWidth;
			let position = point.add(normal.mult(10));
			let maxDash = 30;
			let dash = 0;
			function render() {
				if (lineWidth > 0 && (dash == 0 || dash >= 1)) {
					ctx.beginPath();
					ctx.arc(position.x, position.y, radius, startAngle, endAngle);
					// ctx.arc(position.x, position.y, radius, 0, Math.PI*2);
					ctx.strokeStyle = "#E4749480";
					ctx.lineWidth = lineWidth;
					if (dash >= 1) {
						ctx.lineCap = "round";
						ctx.setLineDash([dash, maxDash - dash]);
					}
					ctx.stroke();
					ctx.setLineDash([]);
				}
			}
			animations.create({
				duration: duration,
				curve: ease.out.quintic,
				callback: p => {
					radius = maxRadius * p;
				},
				onend() {
					Render.off("beforeLayer-2", render);
				},
			});
			animations.create({
				duration: duration * 0.7,
				delay: duration * 0.3,
				curve: ease.linear,
				callback: p => {
					lineWidth = maxLineWidth * (1 - p);
					dash = maxDash * (1 - p);
				},
			});
			Render.on("beforeLayer-2", render);
		}

		// lines
		let numLines = 5; // must be > 1
		let lineVelocityBounds = [2, 5]; // [min, max]
		for (let i = 0; i < numLines; i++) {
			let angle = (i / (numLines - 1)) * Math.PI + tangentAngle + (Math.random() * 0.4 - 0.2);
			let speed = Math.random() * (lineVelocityBounds[1] - lineVelocityBounds[0]) + lineVelocityBounds[0];
			let distance = Math.random() * 20 + 60;
			let start = new vec(point);
			let direction = new vec(Math.cos(angle), Math.sin(angle));
			let offset = direction.mult(distance);
			let length = 20;
			
			let ptA = new vec(start);
			let ptB = new vec(start);
			function render() {
				ctx.beginPath();
				ctx.moveTo(ptA.x, ptA.y);
				ctx.lineTo(ptB.x, ptB.y);
				ctx.strokeStyle = "#FFF4EB";
				ctx.lineWidth = 8;
				ctx.lineCap = "round";
				ctx.stroke();
			}
			let animation = animations.create({
				duration: distance / speed * 16.67,
				curve: ease.out.quadratic,
				callback: p => {
					let lengthPercent = length / distance;
					p = p * (1 + lengthPercent);
					let percentB = Math.min(1, p);
					let percentA = Math.max(0, p - lengthPercent);
					ptA = start.add(offset.mult(percentA));
					ptB = start.add(offset.mult(percentB));

					if (percentA >= 0.995) {
						animation.stop();
					}
				},
				onend() {
					Render.off("beforeLayer-2", render);
				},
				onstop() {
					Render.off("beforeLayer-2", render);
				},
			});
			Render.on("beforeLayer-2", render);
		}

		// dots
		let numDots = 6;
		for (let i = 0; i < numDots; i++) {
			let angle = Math.random() * Math.PI + tangentAngle;
			let duration = Math.random() * 200 + 200;
			let maxRadius = Math.random() * 14 + 8;
			let distance = Math.random() * 60 + 30 - (maxRadius / (14 + 8) * 30);
			let start = new vec(point);
			let direction = new vec(Math.cos(angle), Math.sin(angle));
			let offset = direction.mult(distance);
			
			let pt = new vec(start);
			let radius = maxRadius;
			function render() {
				ctx.beginPath();
				ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
				ctx.closePath();
				ctx.fillStyle = "#FFF4EB";
				ctx.fill();
			}
			let positionAnimation = animations.create({
				duration: duration,
				curve: ease.linear,
				callback: p => {
					pt.set(start.add(offset.mult(p)));
				},
				onend() {
					Render.off("beforeLayer-2", render);
				},
			});
			let radiusAnimation = animations.create({
				duration: duration * 0.6,
				delay: duration * 0.4,
				curve: ease.linear,
				callback: p => {
					radius = maxRadius * Math.max(0, 1 - p);
				},
				onend() {
					radius = 0;
				},
			});
			Render.on("beforeLayer-2", render);
		}
	}
	hitNothing() { // effects for hitting nothing
		let point = new vec(this.body.position).add(this.body.velocity.normalize().mult(15));
		// circle
		{
			let duration = 300;
			let maxRadius = Math.random() * 20 + 10;
			let maxLineWidth = 9;
			let radius = 0;
			let lineWidth = maxLineWidth;
			let position = point;
			let maxDash = 30;
			let dash = 0;
			function render() {
				if (lineWidth > 0 && (dash == 0 || dash >= 1)) {
					ctx.beginPath();
					ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
					ctx.strokeStyle = "#ffffff20";
					ctx.lineWidth = lineWidth;
					if (dash >= 1) {
						ctx.lineCap = "round";
						ctx.setLineDash([dash, maxDash - dash])
					}
					ctx.stroke();
					ctx.setLineDash([]);
				}
			}
			animations.create({
				duration: duration,
				curve: ease.out.quintic,
				callback: p => {
					radius = maxRadius * p;
				},
				onend() {
					Render.off("beforeLayer-2", render);
				},
			});
			animations.create({
				duration: duration * 0.7,
				delay: duration * 0.3,
				curve: ease.linear,
				callback: p => {
					lineWidth = maxLineWidth * (1 - p);
					dash = maxDash * (1 - p);
				},
			});
			Render.on("beforeLayer-2", render);
		}

		// dots
		let numDots = 6;
		for (let i = 0; i < numDots; i++) {
			let angle = Math.random() * Math.PI * 2;
			let duration = Math.random() * 200 + 200;
			let maxRadius = Math.random() * 8 + 5;
			let distance = Math.random() * 50 + 30 - (maxRadius / (14 + 8) * 30);
			let start = new vec(point);
			let direction = new vec(Math.cos(angle), Math.sin(angle));
			let offset = direction.mult(distance);
			
			let pt = new vec(start);
			let radius = maxRadius;
			function render() {
				ctx.beginPath();
				ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
				ctx.closePath();
				ctx.fillStyle = "#FFF4EB80";
				ctx.fill();
			}
			let positionAnimation = animations.create({
				duration: duration,
				curve: ease.linear,
				callback: p => {
					pt.set(start.add(offset.mult(p)));
				},
				onend() {
					Render.off("beforeLayer-2", render);
				},
			});
			let radiusAnimation = animations.create({
				duration: duration * 0.6,
				delay: duration * 0.4,
				curve: ease.linear,
				callback: p => {
					radius = maxRadius * Math.max(0, 1 - p);
				},
				onend() {
					radius = 0;
				},
			});
			Render.on("beforeLayer-2", render);
		}
	}
}

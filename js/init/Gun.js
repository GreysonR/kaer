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
		const now = Performance.aliveTime;
		if (now - this.lastShot >= this.fireRate && this.magazine > 0) {
			this.lastShot = now;
			--this.magazine;

			const { bulletSpeed } = this;
			let velocity = new vec(Math.cos(angle), Math.sin(angle)).mult2(bulletSpeed);
			new Bullet(this, position, velocity, parent);
		}
	}
	reload() {
		this.magazine = this.magazineSize;
	}
}

class Bullet {
	static all = new Set();
	constructor(gun, position, velocity, parent) {
		let bulletSpeed = velocity.length;
		Bullet.all.add(this);
		let body = this.body = Bodies.rectangle(14, 50, new vec(position), {
			isSensor: true,
			frictionAir: 0,
			render: {
				layer: -2,
				round: 4,
				background: "#DC567C00",
			}
		});
		body.setAngle(velocity.angle - Math.PI/2);
		// velocity.add2(parent.velocity.mult(Math.max(0, parent.velocity.normalize().dot(velocity.normalize())) ** 0.5));
		// velocity.add2(parent.velocity);
		body.velocity.set(velocity);

		let bullet = this;
		let timeout = setTimeout(() => {
			bullet.delete();
		}, gun.range / (bulletSpeed + velocity.sub(parent.velocity).length) * 16.67);
		body.on("collisionStart", collision => {
			let otherBody = collision.bodyA === body ? collision.bodyB : collision.bodyA;
			if (!otherBody.isSensor && otherBody != parent) {
				if (otherBody.parentCar && otherBody.parentCar.takeDamage) {
					otherBody.parentCar.takeDamage(gun.damage);
				}
				bullet.delete();
				clearTimeout(timeout);
			}
		});

		this.lastPositions = [];

		// Render bullet trail
		let startPosition = new vec(position);
		this.maxTrailLength = 200;
		this.deleteTime = 0;
		this.renderTrail = function() {
			let trailLength = bullet.maxTrailLength;
			if (body.removed) {
				const now = Performance.aliveTime;
				trailLength = (1 - (now - bullet.deleteTime) * velocity.length / 3000) * bullet.maxTrailLength;
				if (trailLength <= 0) {
					Render.off("beforeLayer-2", bullet.renderTrail);
					return;
				}
			}
			let start = body.position.add(body.velocity.normalize().mult(body.height / 2));
			let end = startPosition.sub(start);
			if (end.length > trailLength) {
				end.length = trailLength;
			}
			let direction = new vec(end);
			end.add2(start);
			renderTrail(start, start.add(direction.mult(0.25)), start.add(direction.mult(0.75)), end, body.width, 0, -2, 1);
			let angle = body.angle;
			ctx.arc(start.x, start.y, body.width / 2, angle, Math.PI + angle);
			ctx.fillStyle = createGradient(start, end, [["#DC567Cff", 0], ["#DC567C30", 0.6], ["#DC567C00", 1]]);
			ctx.fill();
		}
		Render.on("beforeLayer-2", this.renderTrail);
	}
	delete() {
		this.body.delete();
		Bullet.all.delete(this);
		this.deleteTime = Performance.aliveTime;
	}
}

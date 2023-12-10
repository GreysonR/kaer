"use strict";

class SmokeParticle {
	constructor(position, velocity, radius, duration, parent) {
		this.start = position;
		this.position = new vec(position);
		this.velocity = velocity;

		this.maxRadius = radius;
		this.radius = 0;
		this.duration = duration;
		this.parent = parent;
		this.animate();
	}
	animate() {
		let particle = this;
		// let share = 0.3 + Math.random() * 0.3;
		let share = 0.6;
		particle.animation = animations.create({
			duration: particle.duration * share,
			curve: ease.linear,
			callback: p => {
				particle.radius = particle.maxRadius * p;
			},
			onend: () => {
				particle.animation = animations.create({
					delay: 100,
					duration: particle.duration * (1 - share),
					curve: ease.linear,
					callback: p => {
						particle.radius = particle.maxRadius * (1 - p);
					},
					onend: () => {
						this.stop();
					},
				});
			},
		});
		particle.velocityAnimation = animations.create({
			duration: particle.duration + 100,
			curve: ease.linear,
			callback: p => {
				particle.position.set(particle.start.add(particle.velocity.mult(p)));
			}
		});
	}
	draw() {
		ctx.moveTo(this.position.x, this.position.y);
		ctx.arc(this.position.x, this.position.y, Math.max(0, this.radius), 0, Math.PI*2);
	}
	stop() {
		if (this.parent) {
			this.parent.particles.delete(this);
		}
		if (this.animation) this.animation.stop();
		if (this.velocityAnimation) this.velocityAnimation.stop();
	}
}
class Smoke {
	static all = new Set();
	static getRandomInRange(range) { // range is an array of [min, max]
		return (Math.random() * (range[1] - range[0])) + range[0];
	}
	static update = function() {
		let now = world.time;
		for (let smoke of Smoke.all) {
			smoke.draw();
			smoke.update(now);
		}
	}
	
	stopped = false;
	position = new vec(100, 100);
	velocity = new vec(0, 0);
	aliveTime = [400, 700];
	radius = [40, 90];
	speed = [100, 200];
	spawnTime = [10, 10];
	spawnQuantity = [1, 2];
	nextSpawnTime = 0;

	render = {
		background: "#FFFFFF80",
	}
	constructor(options = {}) {
		Common.merge(this, options);
		Smoke.all.add(this);
		this.particles = [];
	}
	update(time) {
		if (this.stopped || time < this.nextSpawnTime) return;
		let random = Smoke.getRandomInRange;
		this.nextSpawnTime = time + random(this.spawnTime);
		let quantity = Math.round(random(this.spawnQuantity));

		for (let i = 0; i < quantity; ++i) {
			let radius = random(this.radius);
			let aliveTime = random(this.aliveTime);
			let speed = random(this.speed);
			let angle = Math.random() * Math.PI * 2;
			let velocity = this.velocity.mult(speed * 0).add2(new vec(Math.cos(angle) * speed * 0.2, Math.sin(angle) * speed * 0.2));
			this.particles.push(new SmokeParticle(new vec(this.position), velocity, radius, aliveTime, this));
		}
	}
	draw() {
		if (this.particles.length === 0) return;
		ctx.beginPath();
		for (let particle of this.particles) {
			particle.draw();
		}
		ctx.fillStyle = this.render.background;
		ctx.fill();
	}

	stop() {
		this.stopped = true;
	}
	delete() {
		Smoke.all.delete(this);
		if (typeof onend === "function") onend();

		for (let particle of this.particles) {
			if (particle.animation) {
				particle.animation.stop();
			}
		}
	}
}

Render.on("beforeLayer1", Smoke.update);

"use strict";

class Character {
	static all = [];

	constructor(model, options = {}) {
		let merge = ter.Common.merge;
		let modelBase = CharacterModels[model];

		merge(this, modelBase.stats);
		merge(this, options);

		this.body = modelBase.getBody();
		this.body.parentObj = this;
		this.body.on("beforeUpdate", this.update.bind(this));
		this.model = model;

		Character.all.push(this);
	}

	// ~ names
	// name = "Unknown"; // if multiplayer / leaderboard added in future
	model = "";

	// ~ movement
	speed = 5;

	// ~ health
	lastDamage = -5000;
	damageCooldown = 0;
	gun = null;
	gunTarget = new vec(0, 0);

	// ~ controls
	controls = {
		up: false,
		down: false,
		right: false,
		left: false,
		locked: false, // whether you have control of character or not; controlled by game state not player
		shoot: false,
	};

	events = {
		takeDamage: [],
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
		let events = this.events[event];
		for (let i = 0; i < events.length; i++) {
			events[i](arg1, arg2);
		}

		if (this.parent) {
			this.parent.trigger(event, arg1, arg2);
		}
	}
	takeDamage = function(damage) {
		const now = world.time;
		if (now - this.lastDamage >= this.damageCooldown) {
			this.lastDamage = now;
			damage = Math.min(this.health, damage);
			this.health -= damage;
			this.trigger("takeDamage", damage);

			if (this.health <= 0) {
				this.delete();
			}
		}
	}
	add() {
		this.body.add();
		Character.all.push(this);
		this.health = this.maxHealth;
		if (this === player) updateHealthBar();
	}
	delete() {
		if (!this.body.removed) {
			this.body.delete();
			Character.all.delete(this);
	
			if (this.health <= 0) {	
				this.destroyAnimation();
			}
		}
	}
	destroyAnimation() {
		let point = new vec(this.body.position);

		// circle
		{
			let duration = 600;
			let maxRadius = Math.random() * 50 + 150;
			let maxLineWidth = 16;
			let radius = 0;
			let lineWidth = maxLineWidth;
			let position = point;
			let maxDash = 100;
			let dash = 0;
			function render() {
				if (lineWidth > 0 && (dash == 0 || dash >= 1)) {
					ctx.beginPath();
					ctx.arc(position.x, position.y, radius, 0, Math.PI*2);
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
				curve: ease.out.quadratic,
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
		let numLines = 8; // must be > 1
		let lineVelocityBounds = [4, 8]; // [min, max]
		for (let i = 0; i < numLines; i++) {
			let angle = (i / (numLines - 1)) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
			let speed = Math.random() * (lineVelocityBounds[1] - lineVelocityBounds[0]) + lineVelocityBounds[0];
			let distance = Math.random() * 100 + 140;
			let start = new vec(point);
			let direction = new vec(Math.cos(angle), Math.sin(angle));
			let offset = direction.mult(distance);
			let length = 50;
			
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
		let numDots = 15;
		let dotColors = ["#FFF4EBd8", "#FFF4EBd8", "#FFF4EBd8", "#FFF4EBd8", "#E47494d8", "#ED8666d8"]
		for (let i = 0; i < numDots; i++) {
			let angle = Math.random() * Math.PI * 2;
			let duration = Math.random() * 300 + 400;
			let maxRadius = Math.random() * 20 + 14;
			let distance = Math.random() * 200 + 100 - (maxRadius / (20 + 14) * 100);
			let start = new vec(point);
			let direction = new vec(Math.cos(angle), Math.sin(angle));
			let offset = direction.mult(distance);
			let color = dotColors.choose();
			
			let pt = new vec(start);
			let radius = maxRadius;
			function render() {
				ctx.beginPath();
				ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
				ctx.closePath();
				ctx.fillStyle = color;
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
	updateShoot() {
		if (!this.controls.locked && this.controls.shoot && this.gun !== undefined) {
			let target = this.gunTarget;
			let angle = target.sub(this.body.position).angle;
			this.gun.shoot(this.body.position.add(new vec(Math.cos(angle), Math.sin(angle)).mult2(this.body.height / 2)), angle, this.body);
			if (this.gun.singleFire) {
				this.controls.shoot = false;
			}
		}
	}
	update = function() {
		let { body, controls } = this;
		let { up, down, left, right, locked } = controls;

		if (locked) {
			up = false;
			down = false;
			right = false;
			left = false;
		}
		this.updateShoot();

		let velocity = new vec(right - left, down - up).normalize().mult(this.speed);
		body.velocity.set(velocity);
	}
	resetEffects() {
	}
}

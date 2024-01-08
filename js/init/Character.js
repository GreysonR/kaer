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
	model = "";

	// ~ movement
	speed = 5;

	// ~ health
	lastDamage = -5000;
	damageCooldown = 0;
	gun = null;
	gunTarget = new vec(0, 0);
	invincible = false;

	// ~ controls
	controls = {
		up: false,
		down: false,
		right: false,
		left: false,
		locked: false, // whether you have control of character or not; controlled by game state not player
		shoot: false,
		roll: false,
	};
	roll = {
		active: false,
		distance: 200,
		duration: 420,
		invincibilityDuration: 300,
		animation: null,

		cooldown: 150,
		last: -10000,
	}

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
		if (now - this.lastDamage >= this.damageCooldown && !this.invincible && this.health > 0) {
			this.lastDamage = now;
			damage = Math.min(this.health, damage);
			this.health -= damage;
			this.trigger("takeDamage", damage);

			if (this.health <= 0) {
				this.delete();
			}
		}
	}
	add(reset = false) {
		this.body.add();
		Character.all.push(this);
		if (reset) this.health = this.maxHealth;
		if (this === player) updateHealthBar();
	}
	delete() {
		if (!this.body.removed) {
			this.body.delete();
			this.body.velocity.set({ x: 0, y: 0 });
			this.body.angularVelocity = 0;
			Character.all.delete(this);
	
			if (this.health <= 0) {	
				this.destroyAnimation();
			}
		}
	}
	destroyAnimation() {
		createExplosion(new vec(this.body.position), {
			circle: {
				visible: false,
			},
			lines: {
				quantity: 5,
				velocity: [4, 8],
				length: 50,
				distance: [100, 250],
				color: "#FFF4EB",
				lineWidth: 10,
			},
			dots: {
				duration: [400, 700],
				radius: [19, 30],
				distance: [80, 220],
				angle: [0, Math.PI*2],
				colors: [
					{
						color: "#FFF4EBe8",
						quantity: 5,
					},
					{
						color: "#E47494e8",
						quantity: 8,
					},
					{
						color: "#ED8666e8",
						quantity: 2,
					},
				],
			}
		});
	}
	updateShoot() {
		if (!(this.gun instanceof Gun) || this.controls.locked) return;
		if (this.controls.shoot) {
			let target = this.gunTarget;
			let angle = target.sub(this.body.position).angle;
			this.gun.shoot(this.body.position.add(new vec(Math.cos(angle), Math.sin(angle)).mult2(this.body.height / 2)), angle, this.body);
			if (this.gun.singleFire) {
				this.controls.shoot = false;
			}
		}
	}
	update = function() {
		let now = world.time;
		let { body, controls } = this;
		let { up, down, left, right, locked, roll } = controls;

		if (locked) {
			up = false;
			down = false;
			right = false;
			left = false;
			roll = false;
		}
		if (roll) {
			let { distance, duration, invincibilityDuration, cooldown, last } = this.roll;
			controls.roll = false;
			if (!this.roll.active) { // create roll animation
				let direction = new vec(right - left, down - up).normalize().mult(distance);
				if (!direction.x && !direction.y || now - last <= cooldown) return;
				if (this.roll.animation) this.roll.animation.stop();
				
				let curveDx = (t) => 2 * Math.pow(1 - t, 1); // d/dx of ease.out.quadratic
				let curveDxArea = 1.7 * duration / 100;
				direction.div2(curveDxArea);
				
				let character = this;
				controls.locked = true;
				character.invincible = true;
				this.roll.active = true;
				this.roll.animation = animations.create({
					duration: duration,
					curve: ease.linear,
					callback: t => {
						let pDx = curveDx(t);
						character.body.applyForce(direction.mult(pDx)); // apply d/dx of curve

						if (t * duration >= invincibilityDuration) { // remove invincibility once past invincibility time
							character.invincible = false;
						}
					},
					onend: () => {
						character.invincible = false;
						character.roll.active = false;
						character.roll.last = world.time;
						controls.locked = false;
					},
					onstop: () => {
						character.invincible = false;
						this.roll.active = false;
						character.roll.last = world.time;
					}
				});
			}
			return;
		}


		if (!locked) {
			this.updateShoot();

			let velocity = new vec(right - left, down - up).normalize().mult(this.speed);
			body.applyForce(velocity);
		}
	}
	resetEffects() {
	}
	resetControls() {
		for (let key of Object.keys(this.controls)) {
			this.controls[key] = false;
		}
	}
}

"use strict";

class Car {
	static all = [];

	constructor(model, options = {}) {
		let merge = ter.Common.merge;
		let modelBase = Models[model];

		merge(this, modelBase.car);
		merge(this, options);

		this.body = modelBase.getBody();
		this.body.parentObj = this;
		this.body.on("beforeUpdate", this.update.bind(this));
		this.model = model;

		Car.all.push(this);
	}

	// ~ names
	model = "car1";

	// ~ drifting / sliding
	hasTireSkid = false;
	hasTireSmoke = false;
	isDrifting = false;
	driftAmount = 0;

	// ~ health
	lastDamage = -5000;
	damageCooldown = 0;
	gun = null;
	gunTarget = new vec(0, 0);

	// ~ visual
	driftHistory = [];
	tireSkid = [];
	smoke = [];

	// ~ controls
	controls = {
		up: false,
		down: false,
		right: false,
		left: false,
		handbrake: false,
		locked: false, // whether you have control of car or not; controlled by game state not player
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
		if (now - this.lastDamage >= this.damageCooldown && this.health > 0) {
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
		Car.all.push(this);
		if (reset) this.health = this.maxHealth;
		if (this === player) updateHealthBar();
	}
	delete() {
		if (!this.body.removed) {
			this.body.delete();
			this.body.velocity.set({ x: 0, y: 0 });
			this.body.angularVelocity = 0;
			Car.all.delete(this);
	
			if (this.health <= 0) {	
				this.destroyAnimation();
			}
			
			for (let smoke of this.smoke) {
				smoke.stop();
			}
		}
	}
	destroyAnimation() {
		createExplosion(new vec(this.body.position), {
			circle: {
				duration: 600,
				fadeDuration: 200,
				radius: [150, 200],
				lineWidth: 16,
				dash: 100,
				color: "#E4749480",
			},
			lines: {
				quantity: 9,
				velocity: [4, 8],
				length: 50,
				distance: [140, 240],
				color: "#FFF4EB",
				lineWidth: 10,
			},
			dots: {
				duration: [400, 700],
				radius: [19, 40],
				distance: [100, 300],
				angle: [0, Math.PI*2],
				colors: [
					{
						color: "#FFF4EBe8",
						quantity: 10,
					},
					{
						color: "#E47494e8",
						quantity: 3,
					},
					{
						color: "#ED8666e8",
						quantity: 3,
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
		let delta = Engine.delta;

		let { body, controls, maxSpeed, acceleration, reverseAcceleration, maxReverseSpeed, turnSpeed, tireGrip, isDrifting, driftAmount, power, steeringWeight, driftHistory } = this;
		let { up, down, left, right, handbrake, locked } = controls;
		let { rotationBounds, rotationSensitivity } = this;
		let { angle, velocity } = body;

		let carDir = new vec(Math.cos(angle), Math.sin(angle)); // normalized vector of the direction the car is facing
		let carNorm = carDir.normal();
		let velDotCar = velocity.normalize().dot(carDir);
		let velDCS = velDotCar < 0 ? -1 : 1; // velocity dot car sign, not using Math.sign so it can never be 0 and no division errors occur
		let speed = velocity.length;
		let addVel = new vec(0, 0); // final linear velocity added
		let addAngle = 0; // final angular velocity added

		this.updateShoot();
	
		if (locked) {
			up = false;
			down = false;
			right = false;
			left = false;
		}
		
		// get + apply material properties
		let materialName = getCarMaterial(body);
		if (!materialName) materialName = "grass";
		let material = Materials[materialName];
		tireGrip *= material.tireGrip ?? 1;
		steeringWeight *= material.steeringWeight ?? 1;
		turnSpeed *= material.turnSpeed ?? 1;
		acceleration *= material.acceleration ?? 1;
		maxSpeed *= material.maxSpeed ?? 1;
		maxReverseSpeed *= material.maxReverseSpeed ?? 1;
		power = Math.min(100, power * (material.power ?? 1))
	
		// ~ handbrake
		if (handbrake) {
			// all numbers here are arbitrary (most numbers in this function are arbitrary tbh)
			tireGrip *= 0.3;
			up *=   1;
			down *= 1;
			maxSpeed *= 0.95;
			// acceleration *= 0.8;
			turnSpeed *= 1;
			steeringWeight = steeringWeight + (1 - steeringWeight) * 0.3;
			power *= 0.8;
		}
	
		// ~ tire friction
		let maxGrip = Math.max(0.0000001, tireGrip) * 0.1; // maxGrip can't be zero bc we divide by it later on
		let normVel = carNorm.dot(velocity);
		let grip = Math.abs(normVel) * 0.97; // assume tires cancel all sliding initially (0.97 makes it look less stiff)
		if (Math.abs(normVel) > maxGrip) { // clamp grip to the max sliding the tires can handle
			grip = Math.max(maxGrip, Math.abs(normVel) * 0.4 * tireGrip);
		}
		if (Math.abs(normVel) > maxGrip * 10) { // update isDrifting based on how much car is sliding
			this.isDrifting = true;
		}
		else {
			this.isDrifting = false;
		}
		isDrifting = this.isDrifting;
		let gripAmt = Math.min(maxGrip, Math.abs(grip)) * -Math.sign(normVel);
		addVel.add2(carNorm.mult(gripAmt));
		this.driftAmount = (normVel - gripAmt);
		let gripPercent = (1 / Math.max(1, Math.abs(this.driftAmount)));
		if (handbrake) gripPercent *= 0.7;
	
		// ~ brake
		if (down) {
			let dirDotVel = carDir.dot(velocity);
			if (dirDotVel > 0.05) { // brake if going forwards
				addVel.sub2(carDir.mult((velocity.length * 0.4 + 2) * 0.12 * down * gripPercent));
			}
			else { // drive backwards
				if (dirDotVel < 0 && velocity.length < maxReverseSpeed * 1.2) { // prevents sudden speed limiting b/c you start sliding backwards quickly
					maxSpeed = maxReverseSpeed;
				}
				else { // if you are sliding backwards, only decrease your acceleration so you gradually slow down instead of suddenly being clamped to maxReverseSpeed
					reverseAcceleration *= 0.1;
				}
				addVel.sub2(carDir.mult(reverseAcceleration));
			}
		}
		if (handbrake) {
			let dirDotVel = carDir.dot(velocity);
			if (Math.abs(dirDotVel) > 0.1) { // brake if not sliding
				addVel.sub2(carDir.mult((velocity.length * 0.4 + 2) * 0.08 * gripPercent * Math.sign(dirDotVel)));
			}
		}
	
		// ~ gas
		if (up) {
			let acc = (0.15 + (isDrifting ? (power + (1 - power) / (Math.abs(driftAmount) ** 2)) * 0.2 : 0)) * up;
			addVel.add2(carDir.mult(acceleration * acc * Math.min(1, Math.pow(tireGrip, 0.5))));
		}
	
		// ~ turn
		let maxTurnAmt = turnSpeed * 0.0036;
		// turnAmt = (speed car is moving straight + total car speed) * maxTurnAmt, clamped to max of maxTurnAmt 
		let turnAmt = Math.min(maxTurnAmt, (Math.abs(velocity.dot(carDir)) / 25 + velocity.length / 40) * maxTurnAmt);
		if (left) {
			addAngle -= turnAmt * velDotCar * left;
		}
		if (right) {
			addAngle += turnAmt * velDotCar * right;
		}
	
		// ~ change drag based on car state
		if (handbrake) {
			body.frictionAir = 0.016; // lots of friction with handbrake
		}
		else if (!(up || down)) {
			if (speed > 0.01) { // moving
				addVel.sub2(velocity.mult(0.002)); // decrease speed only in direction that car is moving
		
				if (isDrifting) {
					addVel.sub2(carDir.mult(0.06)); // decrease speed in car direction even more if drifting
				}
			}
			else { // stopped
				addVel.sub2(velocity.mult(0.5));
			}
			body.frictionAir = 0.01;
		}
		else { // not much friction if manually changing speed
			body.frictionAir = 0.002;
		}
	
		let gripRatio = ((1 - steeringWeight) + Math.max(1, Math.abs(grip / maxGrip) ** 0.5) * steeringWeight);
		body.frictionAngular = 0.10 / gripRatio;
		addAngle /= gripRatio;
	
		
		// ~ rotation point
		let rotRange = rotationBounds[1] - rotationBounds[0];
		let rotPercent = (Math.abs(gripAmt) / maxGrip) ** (1 / rotationSensitivity);
		if (handbrake) {
			rotRange *= 1.5;
		}
		body.rotationPoint.set({ x: Math.min(body.width / 2, Math.max(-body.width / 2, rotRange * rotPercent * velDCS + rotationBounds[0])), y: 0 })
	
	
		// ~ apply forces
		body.applyForce(addVel);
		body.applyTorque(addAngle * 0.5); // some weird multiplication bc of engine update
	
		// ~ limit speed
		if (speed > maxSpeed) {
			body.applyForce(body.velocity.mult(maxSpeed / speed - 1));
		}
		// ~ limit torque
		let torque = body.torque;
		if (Math.abs(torque) > maxTurnAmt) {
			body.applyTorque((maxTurnAmt - Math.abs(torque)) * Math.sign(torque))
		}
	
		// - Visuals
		// ~ position history
		driftHistory.unshift(Math.abs(normVel));
		let avgDrift = driftHistory.reduce((t, c) => t + c) / driftHistory.length;
		let maxDriftHistLen = Math.max(1, Math.round(20 / delta));
		if (driftHistory.length > maxDriftHistLen) driftHistory.length = maxDriftHistLen;
	
		// ~ toggle skid marks
		let hadTireSkid = this.hasTireSkid;
		this.hasTireSkid = avgDrift > maxGrip * 11;
		if (this.hasTireSkid !== hadTireSkid) {
			if (this.hasTireSkid) {
				this.tireSkid.push(new Skid(), new Skid(), new Skid(), new Skid());
			}
			else {
				this.tireSkid.length = 0;
			}
		}
	
		// ~ toggle smoke
		let hadTireSmoke = this.hasTireSmoke;
		this.hasTireSmoke = material.hasTireSmoke && avgDrift > maxGrip * 25;
		if (this.hasTireSmoke !== hadTireSmoke) {
			if (this.hasTireSmoke) {
				let options = {
					position: body.position,
					render: {
						background: "#F2ECE9a0",
					}
				}
				this.smoke.push(new Smoke(options));
				this.smoke.push(new Smoke(options));
			}
			else {
				for (let smoke of this.smoke) {
					smoke.stop();
				}
				this.smoke.length = 0;
			}
		}
		
		// ~ add points to skid marks
		if (this.tireSkid.length > 0) {
			let angle = body.angle;
			let { width, height } = body;
			let s = 0.3;
	
			this.tireSkid[0].addPt(new vec(-width*s, -height*s).rotate(angle).add(body.position));
			this.tireSkid[1].addPt(new vec(-width*s,  height*s).rotate(angle).add(body.position));
			// this.tireSkid[2].addPt(new vec( width*s,  height*s).rotate(angle).add(body.position));
			// this.tireSkid[3].addPt(new vec( width*s, -height*s).rotate(angle).add(body.position));
		}
	
		// ~ set smoke position
		if (this.smoke.length > 0) {
			let angle = body.angle;
			let { width, height } = body;
			let s = 0.3;
			
			this.smoke[0].position = new vec(-width*s, -height*s).rotate(angle).add(body.position);
			this.smoke[1].position = new vec(-width*s,  height*s).rotate(angle).add(body.position);
			// this.smoke[0].position = new vec(body.position);
			// this.smoke[1].position = new vec(body.position);
			this.smoke[0].velocity = new vec(body.velocity);
			this.smoke[1].velocity = new vec(body.velocity);
		}
	}
	resetEffects() {
		for (let skid of this.tireSkid) {
			skid.delete();
		}
		this.tireSkid.length = 0;

		for (let smoke of this.smoke) {
			smoke.delete();
		}
		this.smoke.length = 0;
	}
	resetControls() {
		for (let key of Object.keys(this.controls)) {
			this.controls[key] = false;
		}
	}
}

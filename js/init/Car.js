"use strict";

class Car {
	static all = [];

	constructor(model, options = {}) {
		let merge = ter.Common.merge;
		let modelBase = Models[model];

		merge(this, modelBase.car);
		merge(this, options);

		this.body = modelBase.getBody();
		this.body.parentCar = this;
		this.body.on("beforeUpdate", this.update.bind(this));
		this.model = model;

		Car.all.push(this);
	}

	// ~ names
	// name = "Unknown"; // if multiplayer / leaderboard added in future
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
	path = [];
	pathFrame = 0; // number of frames since a position was added to the path array
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
		const now = World.time;
		if (now - this.lastDamage >= this.damageCooldown) {
			this.lastDamage = now;
			this.health = Math.max(0, this.health - damage);
			this.trigger("takeDamage");

			if (this.health <= 0) {
				this.delete();
			}
		}
	}
	add = function() {
		this.body.add();
		Car.all.push(this);
		this.health = this.maxHealth;
		if (this === player) updateHealthBar();
	}
	delete = function() {
		this.body.delete();
		Car.all.delete(this);

		if (this.health <= 0) {	
			this.destroyAnimation();
		}
		
		for (let smoke of this.smoke) {
			smoke.stop();
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
		let delta = Engine.delta;

		let { body, controls, maxSpeed, acceleration, reverseAcceleration, maxReverseSpeed, turnSpeed, tireGrip, slidingGrip, isDrifting, driftAmount, power, steeringWeight, driftHistory } = this;
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
		if (isDrifting) {
			tireGrip = slidingGrip;
		}
		
		// get + apply material properties
		let material = getCarMaterial(body);
		if (!material) material = "grass";
		let materialProps = Materials[material];
		tireGrip *= (isDrifting ? (materialProps.slidingGrip ?? materialProps.tireGrip) : materialProps.tireGrip) ?? 1;
		steeringWeight *= materialProps.steeringWeight ?? 1;
		turnSpeed *= materialProps.turnSpeed ?? 1;
		acceleration *= materialProps.acceleration ?? 1;
		maxSpeed *= materialProps.maxSpeed ?? 1;
		maxReverseSpeed *= materialProps.maxReverseSpeed ?? 1;
		power = Math.min(100, power * (materialProps.power ?? 1))
	
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
			if (speed > 0.5) { // moving
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
		this.pathFrame = (this.pathFrame + 1) % 3;
		if (this.pathFrame === 0) this.path.unshift(new vec(body.position));
		if (this.path.length > 100 / World.timescale) {
			this.path.length = Math.ceil(100 / World.timescale);
		}
	
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
		this.hasTireSmoke = avgDrift > maxGrip * 17 && materialProps.hasTireSmoke;
		if (this.hasTireSmoke !== hadTireSmoke) {
			if (this.hasTireSmoke) {
				let options = {
					position: body.position,
					render: {
						background: "#ffffff70",
					}
				}
				this.smoke.push(new Smoke(options));
				this.smoke.push(new Smoke(options));
			}
			else {
				for (let smoke of this.smoke) {
					smoke.stop(() => {
						let angle = body.angle;
						let { width, height } = body;
						let s = 0.3;
						
						smoke.position = new vec(-width*s, -height*s).rotate(angle).add(body.position);
	
						let verts = [];
						for (let pt of this.path) {
							verts.push(pt.sub(body.position));
						}
						smoke.setPath(verts);
					});
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
	
		// ~ add points to smoke path
		if (this.smoke.length > 0) {
			let angle = body.angle;
			let { width, height } = body;
			let s = 0.3;
			
			this.smoke[0].position = new vec(-width*s, -height*s).rotate(angle).add(body.position);
			this.smoke[1].position = new vec(-width*s,  height*s).rotate(angle).add(body.position);
	
			let verts = [];
			for (let pt of this.path) {
				verts.push(pt.sub(body.position));
			}
			for (let s of this.smoke) {
				s.setPath(verts);
			}
		}
	}
}

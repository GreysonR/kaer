"use strict";

class Car {
	static all = [];

	constructor(model, options = {}) {
		let merge = ter.Common.merge;
		let modelBase = Models[model];

		merge(this, modelBase.car);
		merge(this, options);

		this.body = modelBase.getBody();
		this.body.on("beforeUpdate", this.update.bind(this));
		this.model = model;

		Car.all.push(this);
	}

	// ~ names
	name = "Unknown";
	model = "car1";

	// ~ drifting / sliding
	hasTireSkid = false;
	hasTireSmoke = false;
	isDrifting = false;
	driftAmount = 0;

	// ~ health
	lastDamage = -5000;
	damageCooldown = 500;
	minDamageSpeed = 5;

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
	};

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
		let maxTurnAmt = turnSpeed * 0.04;
		let turnAmt = Math.min(maxTurnAmt * 0.09, (Math.abs(velocity.dot(carDir)) / 30 + velocity.length / 40) * maxTurnAmt * 0.09);
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
		body.applyTorque(addAngle * 0.5);
	
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
	
		// ~ skid marks
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
	
		// ~ smoke
		let hadTireSmoke = this.hasTireSmoke;
		this.hasTireSmoke = avgDrift > maxGrip * 17 && materialProps.hasTireSmoke;
		if (this.hasTireSmoke !== hadTireSmoke) {
			if (this.hasTireSmoke) {
				let options = {
					position: body.position,
					render: {
						background: "#ffffff40",
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


// new Player("car1");

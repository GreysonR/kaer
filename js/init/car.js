"use strict";

const car = Bodies.rectangle(246*0.53, 111*0.53, new vec(3170, 4100), { // -200, 200
	angle: 0,
	mass: 100,
	
	rotationBounds: [-40, 0],
	rotationSensitivity: 0.5,
	rotationPoint: new vec(-40, 0),

	// don't change these it won't do anything
	friction: 0.085,
	frictionAir: 0,
	frictionAngular: 0,
	restitution: 0.2, // except this

	// car basic stats
	maxSpeed: 14, // [0, Infinity]
	maxReverseSpeed: 7, // [0, Infinity]
	acceleration: 2, // [0, Infinity]
	turnSpeed: 0.9, // [0, Infinity] not recommended to be above 1.5

	// drifting / sliding
	tireGrip: 4, // [0.0001, Infinity]
	slide: 0.08, // [0, 1] 1 = keeps rotating a lot after sliding, 0 = doesn't keep rotating much after sliding, values between 0 - 0.2 recommended
	drifting: false,
	driftAmount: 0,
	driftAcceleration: 0.3, // [-1, 1] min amount of acceleration kept when drifting, could also be labeled "power"
	hasTireSkid: false,
	hasTireSmoke: false,

	// health
	maxHealth: 12,
	health:    12,
	lastDamage: -5000,
	damageCooldown: 500,
	minDamageSpeed: 5,
	damage: 6,

	// visual
	driftHistory: [],
	tireSkid: [],
	path: [],
	smoke: [],

	// controls
	up: false,
	down: false,
	right: false,
	left: false,
	handbrake: false,

	// render options
	render: {
		background: "#FF9B26",
		sprite: "car",
	}
});
car.on("collisionStart", carCollision);
car.on("collisionActive", carCollision);
function carCollision(event) {
	if (modeName !== "chase") return;

	let { bodyA, bodyB, contacts, normal, start } = event;
	let otherBody = bodyA === car ? bodyB : bodyA;
	let now = Performance.aliveTime;

	if (!(otherBody.isCar || otherBody.isStatic) || otherBody.isSensor) return;
	if (now - car.lastDamage < car.damageCooldown) return;

	let avgContact = (() => {
		let avg = new vec(0, 0);
		for (let i = 0; i < contacts.length; i++) {
			avg.add2(contacts[i].vertice);
		}
		avg.div2(contacts.length);

		return avg;
	})();

	let carDir = new vec(Math.cos(car.angle), Math.sin(car.angle));
	let carDot = avgContact.sub(car.position).dot(carDir);
	let inFront = carDot >= car.width / 2 - 20;

	if (inFront && otherBody.isCar) return;

	let speed = Math.abs(car.velocity.sub(otherBody.velocity).dot(normal));
	let damage = speed <= car.minDamageSpeed ? 0 : Math.round((speed - car.minDamageSpeed) ** 0.5 * ((otherBody.damage ?? 1) * 0.7));
	if (otherBody.isCar && now - start >= car.damageCooldown - 5) damage = Math.max(1, damage);

	// if (inFront && otherBody.isCar) damage = Math.round(damage * 0.3);

	car.lastDamage = now;
	car.health = Math.max(0, car.health - damage);
	if (car.health <= 0) {
		car.delete();
	}
	updateHealthUI();
}

/*
// Render car rotation point
Render.on("afterRender", () => {
	ctx.beginPath();
	let angle = car.angle;
	let rotationPos = car.rotationPoint.rotate(angle);
	ctx.arc(car.position.x + rotationPos.x, car.position.y + rotationPos.y, 5, 0, Math.PI*2);
	ctx.fillStyle = "blue";
	ctx.fill();
});/* */


camera.position = car.position;
camera.fov = 1800;

function updateCar() {
	let timescale = 144 / Performance.fps;
	let timescaleSqrt = Math.sqrt(timescale);
	let timescaleSqr = timescale * timescale;

	let { angle, velocity, up, down, left, right, handbrake, maxSpeed, acceleration, maxReverseSpeed, turnSpeed, tireGrip, drifting, driftAmount, driftAcceleration, slide, driftHistory } = car;
	let { rotationBounds, rotationSensitivity, rotationPoint} = car;

	if (gamepad.connected) {
		let controller = navigator.getGamepads()[0];

		up = controller.buttons[7].value;
		down = controller.buttons[6].value;
		left = Math.abs(controller.axes[0]) > 0.1 ? -Math.max(0, controller.axes[0]) : 0;
		right = Math.abs(controller.axes[0]) > 0.1 ? Math.min(0, controller.axes[0]) : 0;
		handbrake = controller.buttons[1].value;

		/*
		for (let i = 0; i < controller.buttons.length; i++) {
			if (controller.buttons[i].pressed) {
				console.log(i, controller.buttons[i]);
			}
		}/** */
	}
	
	// get material properties
	let material = getCarMaterial();
	if (!material) material = "grass";
	let materialProps = Materials[material];
	tireGrip *= materialProps.tireGrip ?? 1;
	slide *= materialProps.slide ?? 1;
	turnSpeed *= materialProps.turnSpeed ?? 1;
	acceleration *= materialProps.acceleration ?? 1;
	maxSpeed *= materialProps.maxSpeed ?? 1;
	maxReverseSpeed *= materialProps.maxReverseSpeed ?? 1;
	driftAcceleration = Math.min(1, driftAcceleration * (materialProps.driftAcceleration ?? 1))

	let carDir = new vec(Math.cos(angle), Math.sin(angle));
	let carNorm = carDir.normal();
	let addVel = new vec(0, 0);
	let addAngle = 0;
	let velDotCar = velocity.normalize().dot(carDir) * timescaleSqrt;
	let velDCS = velDotCar < 0 ? -1 : 1;
	let velDC2 = Math.abs(velDotCar) * velDCS;

	velocity = velocity.mult(timescaleSqrt);
	driftAmount *= timescaleSqrt;
	

	// ~ handbrake
	if (handbrake) {
		tireGrip *= 0.3;
		up *=   0.7;
		down *= 0.7;
		maxSpeed *= 0.9;
		acceleration *=  0.8;
		turnSpeed *= 1;
		slide = slide + (1 - slide) * 0.3;
		driftAcceleration *= 0.5;
	}

	// ~ tire friction
	let maxGrip = Math.max(0.0000001, tireGrip) * 0.1;
	let normVel = carNorm.dot(velocity);
	let grip = Math.abs(normVel) * 0.97;
	if (Math.abs(normVel) > maxGrip) { // ~ drifting
		grip = Math.max(maxGrip, Math.abs(normVel) * 0.4 * tireGrip);
	}
	if (Math.abs(normVel) > maxGrip * 10 * timescale) {
		car.drifting = true;
	}
	else {
		car.drifting = false;
	}
	let gripAmt = Math.min(maxGrip, Math.abs(grip)) * -Math.sign(normVel);
	addVel.add2(carNorm.mult(gripAmt));
	car.driftAmount = (normVel - gripAmt);
	let gripPercent = (1 / Math.max(1, Math.abs(car.driftAmount)));

	// ~ gas
	if (up) {
		let acc = (0.15 + (drifting ? (driftAcceleration + (1 - driftAcceleration) / (Math.abs(driftAmount) * timescale ** 1.8)) * 0.2 : 0)) * up;
		addVel.add2(carDir.mult(acceleration * acc * Math.min(1, Math.sqrt(tireGrip))));
	}
	// ~ brake
	if (down) {
		if (carDir.dot(velocity) > 0.5) { // ~ brake
			addVel.sub2(carDir.mult((velocity.length * 0.4 + 2) * 0.08 * down * gripPercent));
		}
		else { // ~ drive backwards
			addVel.sub2(carDir.mult(0.15));
			maxSpeed = maxReverseSpeed;
		}
	}

	// ~ turn
	let maxTurnAmt = turnSpeed * 0.03 * timescale;
	let turnAmt = Math.min(maxTurnAmt * 0.09, (Math.abs(velocity.dot(carDir)) / 20 + velocity.length / 30 / timescale ** 8) * maxTurnAmt * 0.09);
	if (left) {
		addAngle -= turnAmt * velDC2 * left;
	}
	if (right) {
		addAngle += turnAmt * velDC2 * right;
	}

	// ~ drag
	let speed = car.velocity.length;
	if (handbrake) {
		car.frictionAir = 0.015;
		car.frictionAngular = 0.02;
	}
	else if (!(up || down)) {
		if (speed > 0.5) {
			addVel.sub2(velocity.mult(0.002));
	
			if (drifting) {
				addVel.sub2(carDir.mult(0.06));
			}
		}
		else {
			addVel.sub2(velocity.mult(0.5));
		}
		car.frictionAir = 0.01;
	}
	else {
		car.frictionAir = 0.002;
	}

	slide /= timescale ** 2;
	let gripRatio = ((1 - slide) + Math.max(1, Math.abs(grip / maxGrip) ** 0.5) * slide);
	/*
	if (!handbrake) {
		if (left || right) {
			car.frictionAngular = 0.07 / gripRatio;
			addAngle /= gripRatio;
		}
		else {
			car.frictionAngular = 0.5;
		}
	}*/
	car.frictionAngular = 0.085 / gripRatio;
	addAngle /= gripRatio;

	
	// ~ rotation point
	let rotRange = rotationBounds[1] - rotationBounds[0];
	let rotPercent = (Math.abs(gripAmt) / maxGrip) ** (1 / rotationSensitivity);
	if (handbrake) {
		rotRange *= 1.5;
	}
	rotationPoint.set({ x: Math.max(-car.width / 2, rotRange * rotPercent * velDCS + rotationBounds[0]), y: 0 })

	
	addAngle *= 0.5;
	car.applyForce(addVel.mult(timescaleSqrt));
	car.applyTorque(addAngle * timescaleSqrt);
	let torque = car.angle - car.last.angle;
	maxSpeed *= timescaleSqrt;
	if (speed > maxSpeed) {
		car.applyForce(car.velocity.mult(maxSpeed / speed - 1));
	}
	if (Math.abs(torque) > maxTurnAmt) {
		car.applyTorque((maxTurnAmt - Math.abs(torque)) * Math.sign(torque))
	}

	// - Scoring
	if (Math.abs(normVel) > maxGrip * 15 * timescale && Math.abs(Common.modDiff(curMap.completePercent, curMap.maxLapPercent, 1)) <= 0.01) {
		driftScore += Math.abs(Common.angleDiff(car.velocity.angle, car.angle)) * (car.velocity.length / 10) ** 3 / 8;
	}

	// - Visuals 
	driftHistory.unshift(Math.abs(normVel) / timescale);
	let avgDrift = driftHistory.reduce((t, c) => t + c) / driftHistory.length;

	let maxDriftHistLen = Math.max(1, Math.round(20 / timescale));
	if (driftHistory.length > maxDriftHistLen) driftHistory.length = maxDriftHistLen;

	car.path.unshift(new vec(car.position));
	if (car.path.length > 200) {
		car.path.length = 200;
	}

	// skid marks
	let hadTireSkid = car.hasTireSkid;
	car.hasTireSkid = avgDrift > maxGrip * 11;
	if (car.hasTireSkid !== hadTireSkid) {
		if (car.hasTireSkid) {
			car.tireSkid.push(new Skid(), new Skid(), new Skid(), new Skid());
		}
		else {
			car.tireSkid.length = 0;
		}
	}

	// smoke
	let hadTireSmoke = car.hasTireSmoke;
	car.hasTireSmoke = avgDrift > maxGrip * 17 && materialProps.hasTireSmoke;
	if (car.hasTireSmoke !== hadTireSmoke) {
		if (car.hasTireSmoke) {
			let options = {
				position: car.position,
				render: {
					background: "#ffffff40",
				}
			}
			car.smoke.push(new Smoke(options));
			car.smoke.push(new Smoke(options));
		}
		else {
			for (let smoke of car.smoke) {
				smoke.stop(() => {
					let angle = car.angle;
					let { width, height } = car;
					let s = 0.3;
					
					smoke.position = new vec(-width*s, -height*s).rotate(angle).add(car.position);

					let verts = [];
					for (let pt of car.path) {
						verts.push(pt.sub(car.position));
					}
					smoke.setPath(verts);
				});
			}
			car.smoke.length = 0;
		}
	}
	
	if (car.tireSkid.length > 0) {
		let angle = car.angle;
		let { width, height } = car;
		let s = 0.3;

		car.tireSkid[0].addPt(new vec(-width*s, -height*s).rotate(angle).add(car.position));
		car.tireSkid[1].addPt(new vec(-width*s,  height*s).rotate(angle).add(car.position));
		// car.tireSkid[2].addPt(new vec( width*s,  height*s).rotate(angle).add(car.position));
		// car.tireSkid[3].addPt(new vec( width*s, -height*s).rotate(angle).add(car.position));
	}

	if (car.smoke.length > 0) {
		let angle = car.angle;
		let { width, height } = car;
		let s = 0.3;
		
		car.smoke[0].position = new vec(-width*s, -height*s).rotate(angle).add(car.position);
		car.smoke[1].position = new vec(-width*s,  height*s).rotate(angle).add(car.position);

		let verts = [];
		for (let pt of car.path) {
			verts.push(pt.sub(car.position));
		}
		for (let s of car.smoke) {
			s.setPath(verts);
		}
	}
}
function getCarMaterial() {
	let point = car.position.add(new vec(-30, 0).rotate(car.angle));
	let bounds = SurfaceGrid.getBounds(car);
	let materials = new Set();
	
	for (let x = bounds.min.x; x <= bounds.max.x; x++) {
		for (let y = bounds.min.y; y <= bounds.max.y; y++) {
			let n = SurfaceGrid.pair(new vec(x, y));
			let node = SurfaceGrid.grid[n];
			if (!node) continue;

			for (let body of node) {
				if (body.containsPoint(point)) {
					if (!body.material) {
						console.warn("body has no material", body);
						continue;
					}
					
					materials.add(body.material);
				}
			}
		}
	}

	if (materials.has("road")) return "road";
	if (materials.has("dirt")) return "dirt";
	return "grass";
}

let lastFov = [];
let lastPos = [];
let baseFov = 1800;
Render.on("beforeLayer0", () => {
	let g = 0.3; // higher g = fov more sensitive to speed changes
	let carUp = new vec(Math.cos(car.angle), Math.sin(car.angle));
	let fps = Performance.history.fps.reduce((t, v) => t + v, 60) / Performance.history.fps.length;
	let timescale = 144 / fps;
	
	let curFov = baseFov + (Math.min(1, (g - g / Math.max(1, g*car.velocity.length / timescale)) / g)) ** 10 * 1800;
	lastFov.unshift(curFov);
	let maxFovLen = Math.max(1, Math.round(Performance.fps * 0.5));
	if (lastFov.length > maxFovLen) {
		lastFov.pop();
		if (Math.abs(lastFov.length - maxFovLen) > 6)
			lastFov.pop();
	}
	let avgFov = lastFov.reduce((a, b) => a + b, 0) / lastFov.length;
	camera.fov = avgFov;

	let curPos = car.position.add(carUp.mult(carUp.dot(car.velocity.div(timescale ** 0.5)) * 9));
	lastPos.unshift(curPos);
	let maxPosLen = Math.max(1, Math.round(Performance.fps * 0.1));
	if (lastPos.length > maxPosLen) {
		lastPos.pop();
		if (Math.abs(lastPos.length - maxPosLen) > 6)
			lastPos.pop();
	}
	let avgPos = lastPos.reduce((a, b) => a.add(b), new vec(0, 0)).div(lastPos.length);
	camera.position = avgPos; // car.position.add(car.velocity.mult(-2));
});

function updateHealthUI() {
	let healthBar = document.getElementById("health");
	let healthText = document.getElementById("healthText");

	healthText.innerHTML = car.health + " / " + car.maxHealth;
	healthBar.style.width = (car.health / car.maxHealth) * 100 + "%";
}
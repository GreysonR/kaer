"use strict";

// const car = Bodies.rectangle(246*0.53, 118*0.53, new vec(0, 0), { // default
// const car = Bodies.rectangle(195*0.58, 118*0.58, new vec(0, 0), { // fiat 124
const car = Bodies.rectangle(240*0.53, 127*0.53, new vec(0, 0), { // ford rs2000
	angle: 0,
	mass: 3,
	
	rotationBounds: [-40, 0],
	rotationSensitivity: 0.2,
	rotationPoint: new vec(-40, 0),

	// don't change these it won't do anything
	frictionAir: 0,
	frictionAngular: 0,
	last: {
		angle: 0,
	},

	friction: 0.05, // these will do something
	restitution: 0.1,

	// car basic stats
	maxSpeed: 21, // [0, Infinity]
	maxReverseSpeed: 12, // [0, Infinity]
	acceleration: 2, // [0, Infinity]
	turnSpeed: 3.6, // [0, Infinity]

	// drifting / sliding
	tireGrip: 6, // [0.0001, Infinity] grip for car to before it's sliding
	slidingGrip: 6, // [0.0001, tireGrip] grip for car while it's sliding
	slide: 0.05, // [0, 1] 1 = keeps rotating a lot after sliding, 0 = doesn't keep rotating much after sliding, values between 0 - 0.2 recommended
	drifting: false,
	driftAmount: 0,
	power: 0.3, // [-1, 1] min amount of acceleration kept when drifting
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
	pathFrame: 0,
	smoke: [],

	// controls
	up: false,
	down: false,
	right: false,
	left: false,
	handbrake: false,
	locked: false,

	name: "Ford Escort Mk2",

	// render options
	render: {
		layer: 1,
		background: "#FF9B26",
		// sprite: "cars/car.png",
		// sprite: "cars/Fiat 124.png",
		sprite: "cars/Ford Escort Mk2.png",
	}
});
car.accelerationCurve = function(x) {
	// return x > 0.8 ? 1 : 1.4 * (1 - x) ** 0.4; // d/dx 1 - (1 - x) ** 1.4 (ease out quadratic)
	return 1;
}
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

	let speed = Math.abs(car.velocity.sub(otherBody.velocity).dot(normal)) * Math.sqrt(Performance.fps / 144);
	if (otherBody.isStatic) speed *= 0.6;
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

let graphPts = [];
Render.graph = false;
Render.on("afterRestore", () => {
	let speed = car.velocity.length;
	if (speed > 1) {
		graphPts.push(speed);
	}

	let w = 800; // width
	let h = 300; // height
	let m = 20; // margin
	if (Render.graph) {
		ctx.beginPath();
		ctx.fillStyle = "#444444a0";
		ctx.fillRect(m, m, w - 2*m, h - 2*m);
	}

	if (graphPts.length > 0) {
		let ptH = h - 2*m;
		let ptW = w - 2*m;
		if (graphPts.length > ptW) {
			graphPts.shift();
		}

		if (Render.graph) {
			ctx.beginPath();
			for (let i = 0; i < graphPts.length; i++) {
				let x = i;

				if (i === 0) {
					ctx.moveTo(x + m, ptH - (graphPts[i] / 50) * ptH + m);
				}
				else if (x <= ptW) {
					ctx.lineTo(x + m, ptH - (graphPts[i] / 50) * ptH + m);
				}
			}
			ctx.lineWidth = 4;
			ctx.strokeStyle = "#43C7FF";
			ctx.stroke();
		}
	}
});

function updateCar() {
	let timescale = Engine.delta;

	let { angle, velocity, up, down, left, right, handbrake, locked, maxSpeed, acceleration, maxReverseSpeed, turnSpeed, tireGrip, slidingGrip, drifting, driftAmount, power, slide, driftHistory } = car;
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

	if (locked) {
		up = false;
		down = false;
		right = false;
		left = false;
	}

	if (car.drifting) {
		tireGrip = slidingGrip;
	}
	
	// get material properties
	let material = getCarMaterial();
	if (!material) material = "grass";
	let materialProps = Materials[material];
	tireGrip *= (car.drifting ? (materialProps.slidingGrip ?? materialProps.tireGrip) : materialProps.tireGrip) ?? 1;
	slide *= materialProps.slide ?? 1;
	turnSpeed *= materialProps.turnSpeed ?? 1;
	acceleration *= materialProps.acceleration ?? 1;
	maxSpeed *= materialProps.maxSpeed ?? 1;
	maxReverseSpeed *= materialProps.maxReverseSpeed ?? 1;
	power = Math.min(100, power * (materialProps.power ?? 1))

	let carDir = new vec(Math.cos(angle), Math.sin(angle));
	let carNorm = carDir.normal();
	let addVel = new vec(0, 0);
	let addAngle = 0;
	let velDotCar = velocity.normalize().dot(carDir);
	let velDCS = velDotCar < 0 ? -1 : 1;
	let velDC2 = Math.abs(velDotCar) * velDCS;
	let speed = car.velocity.length;
	

	// ~ handbrake
	if (handbrake) {
		tireGrip *= 0.3;
		up *=   1;
		down *= 1;
		maxSpeed *= 0.95;
		// acceleration *= 0.8;
		turnSpeed *= 1;
		slide = slide + (1 - slide) * 0.3;
		power *= 0.8;
	}

	// ~ tire friction
	let maxGrip = Math.max(0.0000001, tireGrip) * 0.1;
	let normVel = carNorm.dot(velocity);
	let grip = Math.abs(normVel) * 0.97;
	if (Math.abs(normVel) > maxGrip) { // ~ drifting
		grip = Math.max(maxGrip, Math.abs(normVel) * 0.4 * tireGrip);
	}
	if (Math.abs(normVel) > maxGrip * 10) {
		car.drifting = true;
	}
	else {
		car.drifting = false;
	}
	let gripAmt = Math.min(maxGrip, Math.abs(grip)) * -Math.sign(normVel);
	addVel.add2(carNorm.mult(gripAmt));
	car.driftAmount = (normVel - gripAmt);
	let gripPercent = (1 / Math.max(1, Math.abs(car.driftAmount)));
	if (handbrake) gripPercent *= 0.7;

	// ~ brake
	if (down) {
		let dirDotVel = carDir.dot(velocity);
		if (dirDotVel > 0.5) { // ~ brake
			addVel.sub2(carDir.mult((velocity.length * 0.4 + 2) * 0.12 * down * gripPercent));
		}
		else { // ~ drive backwards
			let reverseAcceleration = 0.4;
			if (dirDotVel < 0 && car.velocity.length < maxReverseSpeed * 1.2) {
				maxSpeed = maxReverseSpeed;
			}
			else {
				reverseAcceleration *= 0.1;
			}
			addVel.sub2(carDir.mult(reverseAcceleration));
		}
	}
	if (handbrake) {
		let dirDotVel = carDir.dot(velocity);
		if (Math.abs(dirDotVel) > 0.3) { // ~ brake
			addVel.sub2(carDir.mult((velocity.length * 0.4 + 2) * 0.08 * gripPercent * Math.sign(dirDotVel)));
		}
	}

	// ~ gas
	if (up) {
		let acc = (0.15 + (drifting ? (power + (1 - power) / (Math.abs(driftAmount) ** 2)) * 0.2 : 0)) * up;
		if (!car.drifting) acc *= car.accelerationCurve(speed / maxSpeed);
		addVel.add2(carDir.mult(acceleration * acc * Math.min(1, Math.pow(tireGrip, 0.5))));
	}

	// ~ turn
	let maxTurnAmt = turnSpeed * 0.04;
	let turnAmt = Math.min(maxTurnAmt * 0.09, (Math.abs(velocity.dot(carDir)) / 30 + velocity.length / 40) * maxTurnAmt * 0.09);
	if (left) {
		addAngle -= turnAmt * velDC2 * left;
	}
	if (right) {
		addAngle += turnAmt * velDC2 * right;
	}

	// ~ drag
	if (handbrake) {
		car.frictionAir = 0.016;
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
	car.frictionAngular = 0.10 / gripRatio;
	addAngle /= gripRatio;

	
	// ~ rotation point
	let rotRange = rotationBounds[1] - rotationBounds[0];
	let rotPercent = (Math.abs(gripAmt) / maxGrip) ** (1 / rotationSensitivity);
	if (handbrake) {
		rotRange *= 1.5;
	}
	rotationPoint.set({ x: Math.max(-car.width / 2, rotRange * rotPercent * velDCS + rotationBounds[0]), y: 0 })

	
	addAngle *= 0.5;
	car.applyForce(addVel);
	car.applyTorque(addAngle);

	let torque = car.torque;
	if (speed > maxSpeed) {
		car.applyForce(car.velocity.mult(maxSpeed / speed - 1));
	}
	if (Math.abs(torque) > maxTurnAmt) {
		car.applyTorque((maxTurnAmt - Math.abs(torque)) * Math.sign(torque))
	}

	// - Scoring
	if (Math.abs(normVel) > maxGrip * 15 && Math.abs(Common.modDiff(curMap.completePercent, curMap.maxLapPercent, 1)) <= 0.01) {
		driftScore += Math.abs(Common.angleDiff(car.velocity.angle, car.angle)) * (car.velocity.length / 10) ** 3 / 8;
	}

	// - Visuals 
	driftHistory.unshift(Math.abs(normVel));
	let avgDrift = driftHistory.reduce((t, c) => t + c) / driftHistory.length;
	let maxDriftHistLen = Math.max(1, Math.round(20 / timescale));
	if (driftHistory.length > maxDriftHistLen) driftHistory.length = maxDriftHistLen;

	car.pathFrame = (car.pathFrame + 1) % 3;
	if (car.pathFrame === 0) car.path.unshift(new vec(car.position));
	if (car.path.length > 100 / World.timescale) {
		car.path.length = Math.ceil(100 / World.timescale);
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

	car.last.angle = car.angle;
}
car.on("beforeUpdate", updateCar);
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

	if (materials.has("dirt")) return "dirt";
	if (materials.has("road")) return "road";
	return "grass";
}

/*
// Render car rotation point
Render.on("afterRender", () => {
	ctx.beginPath();
	let pos = car.position.add(car.rotationPoint.rotate(car.angle));
	ctx.arc(pos.x, pos.y, 7, 0, Math.PI*2);
	ctx.fillStyle = "red";
	ctx.fill();
});/**/

let lastFov = [];
let lastPos = [];
let baseFov = 1800;
Render.on("beforeLayer0", () => {
	let g = 0.09; // higher g = fov more sensitive to speed changes
	let carUp = new vec(Math.cos(car.angle), Math.sin(car.angle));
	
	let curFov = baseFov + (Math.min(1, (g - g / Math.max(1, g*car.velocity.length)) / g)) ** 3 * 2000;
	lastFov.unshift(curFov);
	let maxFovLen = Math.max(1, Math.round(Performance.fps * 0.5));
	if (lastFov.length > maxFovLen) {
		lastFov.pop();
		if (Math.abs(lastFov.length - maxFovLen) > 6)
			lastFov.pop();
	}
	let avgFov = lastFov.reduce((a, b) => a + b, 0) / lastFov.length;
	camera.fov = avgFov;

	let curPos = car.position.add(carUp.mult(carUp.dot(car.velocity) * 12)); // velocity) * 14));
	lastPos.unshift(curPos);
	let maxPosLen = Math.max(1, Math.round(Performance.history.avgFps * 0.14)); // avgFps * 0.1) * 2
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

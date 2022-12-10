"use strict";

const car = Bodies.rectangle(220*0.6, 100*0.6, new vec(3170, 4100), { // -200, 200
	angle: 0,
	mass: 100,

	// don't change these it won't do anything
	friction: 0.085,
	frictionAir: 0,
	frictionAngular: 0,
	restitution: 0,

	// car basic stats
	maxSpeed: 14,
	maxReverseSpeed: 7,
	acceleration: 2,
	turnSpeed: 0.9,

	// drifting / sliding
	tireGrip: 4,
	slide: 0.08, // 1 = keeps rotating a lot after sliding, 0 = doesn't keep rotating much after sliding, values between 0 - 0.2 recommended
	drifting: false,
	driftAmount: 0,
	hasTireSkid: false,
	hasTireSmoke: false,

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
car.on("collisionStart", event => {
	if (event.bodyA.isCar || event.bodyB.isCar) {
		let { bodyA, bodyB, normal } = event;
		let normalA = new vec(Math.cos(bodyA.angle), Math.sin(bodyA.angle));
		let normalB = new vec(Math.cos(bodyB.angle), Math.sin(bodyB.angle));
		let normalDir = normalB.dot(event.normal);
		let contactDir = normalA.dot(event.normal);

		if ((Math.abs(contactDir) < 0.5) && Math.abs(normalDir) > 0.5) { // bodyB is hitting bodyA
			event.bodyA.delete();
		}
	}
});


/*
// spawn block grid
for (let x = 0; x < 6; x++) {
	for (let y = 0; y < 6; y++) {
		Bodies.rectangle(200, 200, new vec(x*1200-900, y*900-1000), {
			static: true,
			restitution: 0,
			render: {
				background: "white",
			}
		})
	}
}
/* */

/*
// spawn red smashable blocks
function despawnBlock(block) {
	if (!block.fadeOut) {
		block.fadeOut = animation.create({
			duration: 300,
			delay: 1000,
			curve: ease.linear,
			callback: (p) => {
				block.render.opacity = 1 - p;
			},
			onend: () => {
				block.render.opacity = 0;
				block.delete();
			},
		});
	}
}
for (let x = 0; x < 2; x++) {
	for (let y = 0; y < 2; y++) {
		let b = Bodies.rectangle(3.5, 3.5, new vec(x*4 + 50, y*4-500), {
			mass: 0.01,
			static: false,
			restitution: 0.6,
			render: {
				border: "red",
				borderWidth: 2,
				borderType: "round",
				background: "red",
			}
		});
		b.on("collisionStart", event => {
			// return;
			let { bodyA, bodyB } = event;
			if (bodyA === car || bodyB === car || true) {
				despawnBlock(b);
			}
		});
	}
}
/* */

camera.position = car.position;
camera.fov = 1800;

function updateCar() {
	let timescale = 144 / Performance.fps;
	let timescaleSqrt = Math.sqrt(timescale);
	let timescaleSqr = timescale * timescale;

	let { angle, velocity, up, down, left, right, handbrake, maxSpeed, acceleration, maxReverseSpeed, turnSpeed, tireGrip, drifting, driftAmount, slide, driftHistory } = car;

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
		tireGrip *= 0.1;
		up *=   0.8;
		down *= 0.8;
		maxSpeed *= 0.8;
		slide = slide + (1 - slide) * 0.15;
	}
	// ~ gas
	if (up) {
		let acc = (0.15 + (drifting ? (0.5 + 0.5 / (Math.abs(driftAmount) * timescale ** 1.8)) * 0.2 : 0)) * up;
		addVel.add2(carDir.mult(acceleration * acc * Math.min(1, Math.sqrt(tireGrip))));
	}
	// ~ brake
	if (down) {
		if (carDir.dot(velocity) > 0.5) { // ~ brake
			addVel.sub2(carDir.mult((velocity.length * 0.4 + 2) * 0.08 * down));
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

	// ~ tire friction
	let maxGrip = tireGrip * 0.1;
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
		driftScore += Math.abs(Common.angleDiff(car.velocity.angle, car.angle)) * car.velocity.length ** 2 / 500;
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
	car.hasTireSmoke = avgDrift > maxGrip * 17;
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
		car.tireSkid[1].addPt(new vec( width*s, -height*s).rotate(angle).add(car.position));
		car.tireSkid[2].addPt(new vec( width*s,  height*s).rotate(angle).add(car.position));
		car.tireSkid[3].addPt(new vec(-width*s,  height*s).rotate(angle).add(car.position));
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
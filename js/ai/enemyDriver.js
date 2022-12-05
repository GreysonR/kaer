
function merge(obj, options) {
	Object.keys(options).forEach(option => {
		let value = options[option];

		if (typeof value === "object") {
			if (typeof obj[option] !== "object") {
				obj[option] = {};
			}
			merge(obj[option], value);
		}
		else {
			obj[option] = value;
		}
	});

	return obj;
}

function Enemy(position, options = {}) {
	options = merge({
		angle: -Math.PI/2,
		frictionAir: 0,
		frictionAngular: 0,

		isCar: true,
	
		mass: 100,
	
		maxSpeed: 16,
		maxReverseSpeed: 5,
		acceleration: 2,
		turnSpeed: 1,
	
		tireGrip: 4,
		slide: 0.3,
		drifting: false,
		driftAmount: 0,
	
		up: false,
		down: false,
		right: false,
		left: false,

		reverseTime: 0,
		restition: 1,

		render: {
			background: "#FF9B26",
			sprite: "policeCar",
		}
	}, options);

	let obj = Bodies.rectangle(220*0.6, 100*0.6, new vec(position), options);

	Enemy.all.push(obj);

	return obj;
}
Enemy.all = [];
Enemy.update = function(car) {
	let timescale = 144 / Performance.fps;
	let timescaleSqrt = Math.sqrt(timescale);
	let timescaleSqr = timescale * timescale;

	let { angle, velocity, up, down, left, right, maxSpeed, acceleration, maxReverseSpeed, turnSpeed, tireGrip, drifting, driftAmount } = car;

	let carDir = new vec(Math.cos(angle), Math.sin(angle));
	let carNorm = carDir.normal();
	let addVel = new vec(0, 0);
	let addAngle = 0;
	let velDotCar = velocity.normalize().dot(carDir) * timescaleSqrt;
	let velDCS = velDotCar < 0 ? -1 : 1;
	let velDC2 = Math.abs(velDotCar) * velDCS;
	// if (left || right) console.log(Math.abs(velDotCar)**0.2*Math.sign(velDotCar));

	velocity = velocity.mult(timescaleSqrt);
	driftAmount *= timescaleSqrt;

	// ~ gas
	if (up) {
		let acc = (0.15 + (drifting ? (0.5 + 0.5 / (Math.abs(driftAmount) * timescaleSqr)) * 0.2 : 0)) * up;
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
	let maxTurnAmt = turnSpeed * 0.03 * timescale**1.2;
	let turnAmt = Math.min(maxTurnAmt * 0.09, (Math.abs(velocity.dot(carDir) * timescaleSqrt) / 20 + velocity.length / 30 / timescaleSqr) * maxTurnAmt * 0.09);
	if (left) {
		addAngle -= turnAmt * velDC2 * left;
	}
	if (right) {
		addAngle += turnAmt * velDC2 * right;
	}

	// ~ tire friction
	let lastDrifting = car.drifting;
	let maxGrip = tireGrip * 0.1 / timescaleSqrt;
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

	// ~ drag
	let speed = car.velocity.length;

	if (!(up || down)) {
		if (speed > 0.5) {
			addVel.sub2(velocity.mult(0.015));
	
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

	let gripRatio = ((1 - car.slide) + Math.max(1, Math.abs(grip / maxGrip) ** 0.5) * car.slide);
	car.frictionAngular = 0.07 / gripRatio / (Performance.fps / 144)**0.9;
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
}

/*
// spawn enemies
Enemy(new vec(1000, 500));
Enemy(new vec(1000, 800));
/* */


Render.on("afterRender", () => {
	let subAngle = ter.Common.angleDiff;
	let timescale = 144 / Performance.fps;
	let now = Performance.aliveTime;

	for (let enemy of Enemy.all) {
		let { position, angle, down, reverseTime } = enemy;
		let dist = position.sub(car.position).length;
		let angleToPlayer = position.sub(car.position).angle - Math.PI;
		let angleDiff = subAngle(angleToPlayer, angle);


		if (!down) {
			if (angleDiff > 0) {
				enemy.right = true;
				enemy.left = false;
			}
			else {
				enemy.right = false;
				enemy.left = true;
			}
			enemy.up = true;

			// slow down to make tight turn
			if (Math.abs(angleDiff) > Math.PI*0.3 && dist < 500) {
				enemy.up = (Math.max(10, dist) / 500) ** 3;
			}
			
			// start reversing
			if (enemy.velocity.length / timescale < 5 && Math.abs(angleDiff) > Math.PI * 0.4 && now - reverseTime > 3000) {
				enemy.up = false;
				enemy.down = true;
				enemy.reverseTime = Performance.aliveTime;
			}
		}
		else {
			if (angleDiff < 0) {
				enemy.right = true;
				enemy.left = false;
			}
			else {
				enemy.right = false;
				enemy.left = true;
			}

			if (now - reverseTime > 700) {
				enemy.down = false;
			}
		}

		Enemy.update(enemy);
	}
});
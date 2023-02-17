
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
		state: "attack",
	
		mass: 100,
	
		maxSpeed: 15,
		maxReverseSpeed: 5,
		acceleration: 2,
		turnSpeed: 1,
	
		tireGrip: 3,
		slide: 0.14,
		drifting: false,
		driftAmount: 0,
	
		up: false,
		down: false,
		right: false,
		left: false,

		reverseTime: 0,
		restition: 1,

		maxHealth: 3,
		health: 3,
		lastDamage: -1000,
		damageCooldown: 200,
		minDamageSpeed: 5,
		damage: 1,

		render: {
			background: "#FF9B26",
			sprite: "cars/policeCar",
		}
	}, options);

	let obj = Bodies.rectangle(225*0.6, 114*0.6, new vec(position), options);
	let sensor = Bodies.fromVertices([new vec(0, 0), new vec(0, 114 * 0.6), new vec(500, 114 * 0.3 + 300), new vec(500, 114 * 0.3 - 300)], obj.position.add({ x: 300, y: 0 }), {
		isSensor: true,
		render: {
			background: "#FF611D50",
			layer: 4,
			visible: false,
		}
	});
	obj.sensor = sensor;

	
	obj.on("collisionStart", enemyCollision);
	obj.on("collisionActive", enemyCollision);
	function enemyCollision(event) {
		let { bodyA, bodyB, contacts, normal, start } = event;
		let otherBody = bodyA === obj ? bodyB : bodyA;
		let now = Performance.aliveTime;

		if (otherBody.isSensor) return;
		if (now - obj.lastDamage < obj.damageCooldown) return;

		let inFront = true;
		if (otherBody === car) {
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
			let carCross = avgContact.sub(car.position).cross(carDir);
			inFront = Math.abs(Common.angleDiff(obj.angle + Math.PI, car.angle)) < Math.PI * 0.2 && Math.abs(carCross) <= obj.height / 2 && carDot >= obj.width / 2 - 20;
		}

		if (inFront) { // enemy takes damage
			let speed = Math.abs(obj.velocity.sub(otherBody.velocity).dot(normal));
			let damage = speed <= obj.minDamageSpeed ? 0 : Math.round((speed - obj.minDamageSpeed) ** 0.5 * ((otherBody.damage ?? 1) * 0.3));
			if (now - start >= obj.damageCooldown - 5 && otherBody === car) damage = Math.max(1, damage);

			obj.lastDamage = now;
			obj.health -= damage;
			if (obj.health <= 0) {
				obj.delete();
				lastEnemyDeaths.push(now);
			}
		}
	}

	obj.on("delete", () => {
		Enemy.all.delete(obj);
		sensor.delete();
	});

	Enemy.all.push(obj);

	return obj;
}
Enemy.all = [];
Enemy.update = function(enemy) {
	if (car.position.sub(enemy.position).length > 2500) {
		enemy.delete();
		lastEnemySpawn -= 5000;
		lastEnemyDeaths.push(Performance.aliveTime - 5000);
		return;
	}
	let timescale = 144 / Performance.fps;
	let timescaleSqrt = Math.sqrt(timescale);
	let timescaleSqr = timescale * timescale;

	let { angle, velocity, up, down, left, right, maxSpeed, acceleration, maxReverseSpeed, turnSpeed, tireGrip, drifting, driftAmount } = enemy;

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
	let maxGrip = tireGrip * 0.1 / timescaleSqrt;
	let normVel = carNorm.dot(velocity);
	let grip = Math.abs(normVel) * 0.97;
	if (Math.abs(normVel) > maxGrip) { // ~ drifting
		grip = Math.max(maxGrip, Math.abs(normVel) * 0.4 * tireGrip);
	}
	if (Math.abs(normVel) > maxGrip * 10) {
		enemy.drifting = true;
	}
	else {
		enemy.drifting = false;
	}

	let gripAmt = Math.min(maxGrip, Math.abs(grip)) * -Math.sign(normVel);
	addVel.add2(carNorm.mult(gripAmt));
	enemy.driftAmount = (normVel - gripAmt);

	// ~ drag
	let speed = enemy.velocity.length;

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
		enemy.frictionAir = 0.01;
	}
	else {
		enemy.frictionAir = 0.002;
	}

	let gripRatio = ((1 - enemy.slide) + Math.max(1, Math.abs(grip / maxGrip) ** 0.5) * enemy.slide);
	enemy.frictionAngular = 0.07 / gripRatio / (Performance.fps / 144)**0.9;
	addAngle /= gripRatio;
	
	addAngle *= 0.5;
	enemy.applyForce(addVel.mult(timescaleSqrt));
	enemy.applyTorque(addAngle * timescaleSqrt);
	let torque = enemy.angle - enemy.last.angle;
	maxSpeed *= timescaleSqrt;
	if (speed > maxSpeed) {
		enemy.applyForce(enemy.velocity.mult(maxSpeed / speed - 1));
	}
	if (Math.abs(torque) > maxTurnAmt) {
		enemy.applyTorque((maxTurnAmt - Math.abs(torque)) * Math.sign(torque))
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
		let { position, angle, state, reverseTime, sensor } = enemy;
		let dist = position.sub(car.position).length;
		let angleToPlayer = position.sub(car.position).angle - Math.PI;
		let angleDiff = subAngle(angleToPlayer, angle);

		sensor.setPosition(enemy.position.add({ x: Math.cos(enemy.angle) * 370, y: Math.sin(enemy.angle) * 370 }));
		sensor.setAngle(enemy.angle);

		let collisions = sensor.pairs;
		let avgPoint = new vec(0, 0);
		let nBodies = 0;
		for (let collisionId of collisions) {
			let collision = World.pairs[collisionId];
			let { bodyA, bodyB } = collision;
			let otherBody = bodyA === sensor ? bodyB : bodyA;

			if (otherBody.isStatic && otherBody.position.sub(car.position).length > 300) {
				avgPoint.add2(otherBody.position);
				nBodies++;
			}
		}
		avgPoint.div2(nBodies);

		if (nBodies > 0) {
			let enemyNorm = new vec(Math.cos(angle + Math.PI/2), Math.sin(angle + Math.PI/2));
			let pointDir = avgPoint.sub(car.position);
			let pointDot = pointDir.dot(enemyNorm);
			
			angleDiff += -10000 / Math.max(5, Math.abs(pointDot) ** 1.5) * Math.sign(pointDot);
		}


		if (state === "attack") {
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
				enemy.state = "reverse";
			}
		}
		else if (state === "reverse") {
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
				enemy.state = "attack";
			}
		}

		Enemy.update(enemy);
	}
});
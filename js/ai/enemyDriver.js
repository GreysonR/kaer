Render.on("afterRender", () => {
	let subAngle = ter.Common.angleDiff;
	let timescale = 144 / Performance.fps;
	let now = World.time;

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
				enemy.reverseTime = World.time;
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

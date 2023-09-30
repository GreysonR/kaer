"use strict";

class Enemy extends Car {
	static all = [];
	constructor(model, options = {}) {
		super(model, options);
		Enemy.all.push(this);

		this.reverseTime = -10000;
		this.state = "attack";
		this.target = player.body.position;
		console.log(player.body.position);	
		let sightBox = this.sightBox = Bodies.rectangle(800, 600, new vec(this.body.position), {
			isSensor: true,
			render: {
				visible: false,
				layer: 10,
				background: "#ff000040",
			}
		});
		let car = this;
		sightBox.collisions = {};
		sightBox.on("beforeUpdate", () => {
			// set sightBox to follow car
			let angle = car.body.angle;
			let offsetAmount = sightBox.width * 0.5 - 50;
			let offset = new vec(Math.cos(angle) * offsetAmount, Math.sin(angle) * offsetAmount);
			sightBox.setPosition(car.body.position.add(offset));
			sightBox.setAngle(angle);

			// iterate through collision pairs to update target
			let carDirection = new vec(Math.cos(car.body.angle), Math.sin(car.body.angle));
			let direction = player.body.position.sub(car.body.position).normalize2().mult2(500);
			let directionNormalized = direction.normalize();
			for (let collision of Object.values(sightBox.collisions)) {
				let otherBody = collision.bodyA === sightBox ? collision.bodyB : collision.bodyA;
				if (otherBody != car.body && otherBody != player.body && !otherBody.isSensor) {
					let closestPoint = closestPointBetweenBodies(car.body, otherBody);
					let distance = car.body.position.sub(closestPoint);
					let distNormalized = distance.normalize();
					if (Math.abs(distNormalized.dot(carDirection)) > 0.94) {
						distNormalized.normal2();
						if (distNormalized.dot(directionNormalized) < 0) distNormalized.mult2(-1);
					}
					
					direction.add2(distNormalized.mult((400 / distance.length) ** 0.4 * 100 * carDirection.dot(distance.normalize()) ** 2));
				}
			}
			car.target = car.body.position.add(direction);
		});
		sightBox.on("collisionStart", collision => {
			sightBox.collisions[collision.id] = collision;
		});
		sightBox.on("collisionEnd", collision => {
			delete sightBox.collisions[collision.id];
		});
	}
	update() {

	}
	renderTarget() {
		Render.on("afterRender", () => {
			ctx.beginPath();
			let point = police.target;
			ctx.moveTo(point.x, point.y);
			ctx.arc(point.x, point.y, 10 / camera.scale, 0, Math.PI*2);
			ctx.fillStyle = "#ff000080";
			ctx.fill();
		});
	}
}


let police = new Enemy("Police Basic");
police.body.setPosition(new vec(2450, 2400));


// Update police AI
Render.on("afterRender", () => {
	let subAngle = ter.Common.angleDiff;
	let now = Performance.aliveTime;

	for (let enemy of Enemy.all) {	
		let { state, reverseTime, body, controls, target } = enemy;
		let { position, angle } = body;
		let dist = position.sub(target).length;
		let angleToTarget = position.sub(target).angle - Math.PI;
		let angleDiff = subAngle(angleToTarget, angle);
		let direction = new vec(Math.cos(angle), Math.sin(angle));

		if (state === "attack") {
			if (angleDiff * Math.sign(direction.dot(body.velocity)) > 0) {
				controls.right = true;
				controls.left = false;
			}
			else {
				controls.right = false;
				controls.left = true;
			}
			controls.up = true;

			// slow down to make tight turn
			if (Math.abs(angleDiff) > Math.PI*0.3 && dist < 500) {
				controls.up = (Math.max(10, dist) / 500) ** 3;
			}
			
			// start reversing
			if (body.velocity.length < 5 && Math.abs(angleDiff) > Math.PI * 0.4 && now - reverseTime > 8000) {
				controls.up = false;
				controls.down = true;
				enemy.reverseTime = Performance.aliveTime;
				enemy.state = "reverse";
			}
		}
		else if (state === "reverse") {
			if (angleDiff < 0) {
				controls.right = true;
				controls.left = false;
			}
			else {
				controls.right = false;
				controls.left = true;
			}

			if (now - reverseTime > 2000 || Math.abs(angleDiff) < Math.PI * 0.2) {
				controls.down = false;
				enemy.state = "attack";
			}
		}
	}
});

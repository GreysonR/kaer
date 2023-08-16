"use strict";

// const car = Bodies.rectangle(246*0.53, 118*0.53, new vec(0, 0), { // default
// const car = Bodies.rectangle(195*0.58, 118*0.58, new vec(0, 0), { // fiat 124
const player = new Car("Ford Escort Mk2");
player.body.on("collisionStart", carCollision);
player.body.on("collisionActive", carCollision);
function carCollision(event) {
	let { bodyA, bodyB, contacts, normal, start } = event;
	let otherBody = bodyA === player ? bodyB : bodyA;
	let now = Performance.aliveTime;

	if (!(otherBody.isCar || otherBody.isStatic) || otherBody.isSensor) return;
	if (now - player.lastDamage < player.damageCooldown) return;

	let avgContact = (() => {
		let avg = new vec(0, 0);
		for (let i = 0; i < contacts.length; i++) {
			avg.add2(contacts[i].vertice);
		}
		avg.div2(contacts.length);

		return avg;
	})();

	let car = player.body;
	let carDir = new vec(Math.cos(car.angle), Math.sin(car.angle));
	let carDot = avgContact.sub(car.position).dot(carDir);
	let inFront = carDot >= car.width / 2 - 20;

	if (inFront && otherBody.isCar) return;

	let speed = Math.abs(car.velocity.sub(otherBody.velocity).dot(normal)) * Math.sqrt(Performance.fps / 144);
	if (otherBody.isStatic) speed *= 0.6;
	let damage = speed <= player.minDamageSpeed ? 0 : Math.round((speed - player.minDamageSpeed) ** 0.5 * ((otherBody.damage ?? 1) * 0.7));
	if (otherBody.isCar && now - start >= player.damageCooldown - 5) damage = Math.max(1, damage);

	// if (inFront && otherBody.isCar) damage = Math.round(damage * 0.3);

	player.lastDamage = now;
	player.health = Math.max(0, player.health - damage);
	if (player.health <= 0) {
		car.delete();
	}
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

// - velocity graph
let graphPts = [];
Render.graph = false;
Render.on("afterRestore", () => {
	let speed = player.body.velocity.length;
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

// - car rotation point visual 
Render.rotationPoint = false;
Render.on("afterRender", () => {
	if (!Render.rotationPoint) return;
	ctx.beginPath();
	let car = player.body;
	let pos = car.position.add(car.rotationPoint.rotate(car.angle));
	ctx.arc(pos.x, pos.y, 4, 0, Math.PI*2);
	ctx.fillStyle = "cyan";
	ctx.fill();
});

// - gamepad controls
function updateGamepad() {
	if (gamepad.connected) {
		let controller = navigator.getGamepads()[0];
		let controls = player.controls;
		let deadzone = 0.1;

		controls.up = controller.buttons[7].value;
		controls.down = controller.buttons[6].value;
		controls.left = Math.abs(controller.axes[0]) >  deadzone ? -Math.max(0, controller.axes[0]) : 0;
		controls.right = Math.abs(controller.axes[0]) > deadzone ? Math.min(0, controller.axes[0]) : 0;
		controls.handbrake = controller.buttons[1].value;

		/*
		// debug: get what id a button is
		for (let i = 0; i < controller.buttons.length; i++) {
			if (controller.buttons[i].pressed) {
				console.log(i, controller.buttons[i]);
			}
		}/** */
	}
}
player.body.on("beforeUpdate", updateGamepad);


let lastFov = [];
let lastPos = [];
let baseFov = 1800;
Render.on("beforeLayer0", () => {
	let g = 0.09; // higher g = fov more sensitive to speed changes
	let carBody = player.body;
	let carUp = new vec(Math.cos(carBody.angle), Math.sin(carBody.angle));
	
	let curFov = baseFov + (Math.min(1, (g - g / Math.max(1, g*carBody.velocity.length)) / g)) ** 3 * 2000;
	lastFov.unshift(curFov);
	let maxFovLen = Math.max(1, Math.round(Performance.fps * 0.5));
	if (lastFov.length > maxFovLen) {
		lastFov.pop();
		if (Math.abs(lastFov.length - maxFovLen) > 6)
			lastFov.pop();
	}
	let avgFov = lastFov.reduce((a, b) => a + b, 0) / lastFov.length;
	camera.fov = avgFov;

	let curPos = carBody.position.add(carUp.mult(carUp.dot(carBody.velocity) * 12)); // velocity) * 14));
	lastPos.unshift(curPos);
	let maxPosLen = Math.max(1, Math.round(Performance.history.avgFps * 0.14)); // avgFps * 0.1) * 2
	if (lastPos.length > maxPosLen) {
		lastPos.pop();
		if (Math.abs(lastPos.length - maxPosLen) > 6)
			lastPos.pop();
	}
	let avgPos = lastPos.reduce((a, b) => a.add(b), new vec(0, 0)).div(lastPos.length);
	camera.position = avgPos; // carBody.position.add(carBody.velocity.mult(-2));
});
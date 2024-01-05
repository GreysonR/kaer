"use strict";

let playerBodies = {
	car: new Car("car1"),
	character: new Character("Player"),
}
playerBodies.character.gun = new Gun("playerGun");

var player = playerBodies.car;
// const player = new Character("Player");

playerBodies.character.gun.damage = 8;

playerBodies.car.gun = new Gun("playerGun");
playerBodies.car.gun.damage = 100;
playerBodies.car.maxHealth = 100; playerBodies.car.health = playerBodies.car.maxHealth;

let healthbarWrapperWidth = document.getElementsByClassName("healthbarWrapper")[0].clientWidth;
playerBodies.car.on("takeDamage", updateHealthBar);
playerBodies.character.on("takeDamage", updateHealthBar);
function updateHealthBar() {
	let health = player.health;
	let width = health / player.maxHealth * healthbarWrapperWidth;
	document.getElementById("healthbar").style.width = width + "px";
	document.getElementById("healthbarText").innerHTML = health + "/" + player.maxHealth;
}
updateHealthBar();
function playerDamageEffects(damage) {
	let intensity = Math.min(3, (damage / 10) ** 0.5);
	
	// blur
	blurCanvas(2.5 * intensity, 60, 280);

	// camera zoom
	let scale = 1;
	let scaleDelta = 0.05 * intensity;
	function zoom() {
		camera.fov *= scale;
	}
	Render.on("beforeSave", zoom);
	animations.create({
		duration: 100,
		curve: ease.out.cubic,
		callback: p => {
			scale = 1 - scaleDelta * p;
		},
		onend: () => {
			animations.create({
				duration: 600,
				curve: ease.linear,
				callback: p => {
					scale = 1 - scaleDelta * (1 - p);
				},
				onend: () => {
					Render.off("beforeSave", zoom);
				}
			});
		}
	});

	// red outline
	let redOutline = createElement("div", {
		class: "redOutline hit",
		parent: document.body,
	});
	redOutline.addEventListener("animationend", function end() {
		redOutline.remove();
	});
}
playerBodies.car.on("takeDamage", playerDamageEffects);
playerBodies.character.on("takeDamage", playerDamageEffects);
player.add();

// - shooting
Render.on("beforeRender", () => {
	player.gunTarget.set(camera.screenPtToGame(mousePosition));
});

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


// - update camera
var gameCamera = {
	lastFov: [],
	lastPosition: [],
	baseFov: 2000,
}
function updateGameCamera() {
	let { baseFov, lastFov, lastPosition } = gameCamera;
	
	// fov
	let g = 0.15; // higher g = fov more sensitive to speed changes
	let body = player.body;
	let bodyUp = new vec(Math.cos(body.angle), Math.sin(body.angle));
	
	let curFov = baseFov + (Math.min(1, (g - g / Math.max(1, g*body.velocity.length)) / g)) ** 3 * 1200;
	lastFov.unshift(curFov);
	let maxFovLen = Math.max(1, Math.round(Performance.history.avgFps * 1));
	let n = 0;
	while (lastFov.length > maxFovLen && ++n <= 1) {
		lastFov.pop();
	}
	let totalAvgFovWeight = 0;
	let avgFov = lastFov.reduce((a, b, i) => {
		let weight = 1 / Math.sqrt(i * 1 + 1);
		totalAvgFovWeight += weight;
		return a + b * weight;
	}, 0) / totalAvgFovWeight;
	camera.fov = avgFov;

	// position
	let curPos;
	let posWeightFalloff = 1;
	if (player instanceof Car) {
		curPos = body.position.add(bodyUp.mult(bodyUp.dot(body.velocity) * 12)); // velocity) * 14));
	}
	else {
		curPos = new vec(body.position);//.add(body.velocity.mult(Engine.delta));
		posWeightFalloff = 300;
	}
	lastPosition.unshift(curPos);
	let maxPosLen = Math.max(1, Math.round(Performance.history.avgFps * 0.5)); // avgFps * 0.1) * 2
	n = 0;
	while (lastPosition.length > maxPosLen && ++n <= 1) {
		lastPosition.pop();
	}
	let totalAvgPosWeight = 0;
	let avgPos = lastPosition.reduce((a, b, i) => {
		let weight = 1 / Math.sqrt(i * posWeightFalloff + 1);
		totalAvgPosWeight += weight;
		return a.add2(b.mult(weight));
	}, new vec(0, 0)).div(totalAvgPosWeight);
	camera.position.set(avgPos); // carBody.position.add(carBody.velocity.mult(-2));
}

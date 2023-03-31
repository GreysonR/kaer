"use strict";

window.addEventListener("keydown", event => {
	let key = event.key.toLowerCase();

	if (key === "w" || key === "arrowup") {
		car.up = true;
	}
	else if (key === "s" || key === "arrowdown") {
		car.down = true;
	}
	else if (key === "a" || key === "arrowleft") {
		car.left = true;
	}
	else if (key === "d" || key === "arrowright") {
		car.right = true;
	}
	else if (key === " ") {
		car.handbrake = true;
	}
	else if (key === "r") {
		resetCar();
	}
	else if (key === "escape") {
		if (trackName !== "" && modeName !== "") {
			if (homeOpen) {
				closeHome();
			}
			else {
				openHome();
			}
		}
	}

	if (key === "e") {
		if (baseFov > 3000) {
			baseFov = 2800;
		}
		else {
			baseFov = 13000;
		}
	}
	if (key === " ") {
		// path.getNext();
	}

	if (event.altKey && key === "q") { // toggle map file input
		document.getElementById("mapInput").classList.toggle("active");
		document.getElementById("pathInput").classList.toggle("active");
	}
	if (event.altKey && key === "p") { // toggle performance render
		Performance.enabled = !Performance.enabled;
	}
	if (event.altKey && key === "v") { // toggle vertice render
		Render.showVertices = !Render.showVertices;
		Render.showCollisions = Render.showVertices;
	}
	if (event.altKey && key === "b") { // toggle broadphase render
		Render.showBroadphase = !Render.showBroadphase;
	}
	if (event.altKey && key === "a") { // toggle image smoothing (anti aliasing)
		ctx.imageSmoothingEnabled = !ctx.imageSmoothingEnabled;
	}
});
window.addEventListener("keyup", event => {
	let key = event.key.toLowerCase();

	if (key === "w" || key === "arrowup") {
		car.up = false;
	}
	else if (key === "s" || key === "arrowdown") {
		car.down = false;
	}
	else if (key === "a" || key === "arrowleft") {
		car.left = false;
	}
	else if (key === "d" || key === "arrowright") {
		car.right = false;
	}
	else if (key === " ") {
		car.handbrake = false;
	}
});


// controller
let gamepad = {
	connected: false,
	controller: null,
	buttonNames: [
		'DPad-Up','DPad-Down','DPad-Left','DPad-Right',
		'Start','Back','Axis-Left','Axis-Right',
		'LB','RB','Power','A','B','X','Y',
	],
	buttons: {},
}
window.addEventListener("gamepadconnected", event => {
	if (event.gamepad.index === 0) {
		gamepad.connected = true;
		gamepad.controller = event.gamepad;
	}
});
window.addEventListener("gamepaddisconnected", event => {
	if (event.gamepad.index === 0) {
		gamepad.connected = false;
		gamepad.controller = null;
	}
});
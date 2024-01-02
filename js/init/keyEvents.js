"use strict";

var mousePosition = new vec(0, 0);

window.addEventListener("keydown", event => {
	let key = event.key.toLowerCase();

	if (!event.repeat) {
		if (key === "w" || key === "arrowup") {
			player.controls.up = true;
		}
		else if (key === "s" || key === "arrowdown") {
			player.controls.down = true;
		}
		else if (key === "a" || key === "arrowleft") {
			player.controls.left = true;
		}
		else if (key === "d" || key === "arrowright") {
			player.controls.right = true;
		}
		else if (key === " ") {
			player.controls.handbrake = true;
		}
		else if (key === "escape") {
			// open pause menu
		}
	
		// debug keybinds
		if (devMode) {
			if (key === "e") { // toggle big fov
				if (!window.originalFov) {
					window.originalFov = baseFov;
				}
				if (baseFov !== 10000) baseFov = 10000;
				else baseFov = window.originalFov;
			}
			if (event.altKey && key === "q") { // toggle map file input
				document.getElementById("mapInput").classList.toggle("active");
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
				Render.showBoundingBox = !Render.showBoundingBox;
			}
			if (event.altKey && key === "g") { // toggle graph
				Render.graph = !Render.graph;
			}
			if (event.altKey && key === "c") { // toggle graph
				Render.rotationPoint = !Render.rotationPoint;
			}
			if (event.altKey && key === "a") { // toggle image smoothing (anti aliasing)
				ctx.imageSmoothingEnabled = !ctx.imageSmoothingEnabled;
			}
		}
	}
});
window.addEventListener("keyup", event => {
	let key = event.key.toLowerCase();

	if (!event.repeat) {
		if (key === "w" || key === "arrowup") {
			player.controls.up = false;
		}
		else if (key === "s" || key === "arrowdown") {
			player.controls.down = false;
		}
		else if (key === "a" || key === "arrowleft") {
			player.controls.left = false;
		}
		else if (key === "d" || key === "arrowright") {
			player.controls.right = false;
		}
		else if (key === " ") {
			player.controls.handbrake = false;
		}
	}
});
window.addEventListener("blur", () => { // reset player controls when window is unfocused
	for (let key of Object.keys(player.controls)) {
		player.controls[key] = false;
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

window.addEventListener("mousemove", event => {
	let screenPosition = new vec(event.clientX, event.clientY);
	mousePosition.set(screenPosition);
});
window.addEventListener("mousedown", event => {
	if (event.button === 0) {
		player.controls.shoot = true;
	}
});
window.addEventListener("mouseup", event => {
	if (event.button === 0) {
		player.controls.shoot = false;
	}
});

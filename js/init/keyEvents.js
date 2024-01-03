"use strict";

var mousePosition = new vec(0, 0);

function toggleControl(value) {
	if (player.controls[this.control] != undefined)
		player.controls[this.control] = value;
}
let binds = {
	"w": toggleControl.bind({ control: "up" }),
	"s": toggleControl.bind({ control: "down" }),
	"a": toggleControl.bind({ control: "left" }),
	"d": toggleControl.bind({ control: "right" }),
	"arrowup": toggleControl.bind({ control: "up" }),
	"arrowdown": toggleControl.bind({ control: "down" }),
	"arrowleft": toggleControl.bind({ control: "left" }),
	"arrowright": toggleControl.bind({ control: "right" }),
	" ": toggleControl.bind({ control: "handbrake" }),

	"click0": toggleControl.bind({ control: "shoot" }),
	"click2": toggleControl.bind({ control: "roll" }),
	
	"f": function switchMovement(value) {
		if (!value) return;
		if (player.health <= 0 || player.controls.locked) return;
		let position = player.body.position;
		let originalControls = {};
		Common.merge(originalControls, player.controls);

		if (player instanceof Car) { // swap to character
			player.delete();
			player = playerBodies.character;
			player.add();
		}
		else { // swap to car
			// let angle = player.body.velocity.angle;
			let angle = player.body.angle - Math.PI;
			player.delete();
			player = playerBodies.car;
			player.add();
			player.body.setAngle(angle);
		}
		for (let key of Object.keys(player.controls)) {
			if (originalControls[key]) {
				player.controls[key] = originalControls[key];
			}
			else {
				player.controls[key] = false;
			}
		}
		player.body.setPosition(position);
	},
}

window.addEventListener("keydown", event => {
	let key = event.key.toLowerCase();

	if (!event.repeat) {
		let fullKeyName = (event.ctrlKey ? "ctrl " : "") + (event.altKey ? "alt " : "") + (event.shiftKey ? "shift " : "") + key;
		if (binds[key]) {
			binds[key](true);
		}
		else if (binds[fullKeyName]) {
			binds[fullKeyName](true);
		}

		// debug keybinds
		if (devMode) {
			if (key === "e") { // toggle big fov
				if (!window.originalFov) {
					window.originalFov = gameCamera.baseFov;
				}
				if (gameCamera.baseFov !== 10000) gameCamera.baseFov = 10000;
				else gameCamera.baseFov = window.originalFov;
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
			if (event.altKey && key === "a") { // toggle image smoothing (anti aliasing for sprites)
				ctx.imageSmoothingEnabled = !ctx.imageSmoothingEnabled;
			}
		}
	}
});
window.addEventListener("keyup", event => {
	let key = event.key.toLowerCase();

	if (!event.repeat) {
		let fullKeyName = (event.ctrlKey ? "ctrl " : "") + (event.altKey ? "alt " : "") + (event.shiftKey ? "shift " : "") + key;
		if (binds[key]) {
			binds[key](false);
		}
		if (binds[fullKeyName]) {
			binds[fullKeyName](false);
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
	let key = "click" + event.button;
	let fullKeyName = (event.ctrlKey ? "ctrl " : "") + (event.altKey ? "alt " : "") + (event.shiftKey ? "shift " : "") + key;
	if (binds[key]) {
		binds[key](true);
	}
	else if (binds[fullKeyName]) {
		binds[fullKeyName](true);
	}
});
window.addEventListener("mouseup", event => {
	let key = "click" + event.button;
	let fullKeyName = (event.ctrlKey ? "ctrl " : "") + (event.altKey ? "alt " : "") + (event.shiftKey ? "shift " : "") + key;
	if (binds[key]) {
		binds[key](false);
	}
	else if (binds[fullKeyName]) {
		binds[fullKeyName](false);
	}
});

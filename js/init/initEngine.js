"use strict";

const canvas = document.getElementById("canv");
const ctx = canvas.getContext("2d");
const { Performance, World, Bodies, Engine, Common, Render } = ter;
const { camera } = Render;
let tree = World.tree.tree;
var focused = true;

ter.init({
	canvas: canvas,
	ctx: ctx,
	width: window.innerWidth,
	height: window.innerHeight,
});
subcanv.width =  window.innerWidth;
subcanv.height = window.innerHeight;
skidMarkCanv.width =  window.innerWidth;
skidMarkCanv.height = window.innerHeight;

window.addEventListener("resize", () => {
	ter.setSize(window.innerWidth, window.innerHeight);
	subcanv.width =  window.innerWidth;
	subcanv.height = window.innerHeight;
	skidMarkCanv.width =  window.innerWidth;
	skidMarkCanv.height = window.innerHeight;
});
window.addEventListener("contextmenu", event => {
	event.preventDefault();
});
window.addEventListener("focus", () => {
	Performance.update();
	focused = true;
});
window.addEventListener("blur", () => {
	focused = false;
});


Performance.enabled = false;
Performance.getAvg = true;
Render.showBoundingBox = false;
// Render.showBroadphase = false;
Render.showVertices = false
// Render.showCenters = true;

// ctx.imageSmoothingEnabled = false;

var runEngine = true;
function main() {
	// - run engine
	if (Performance.fps / Math.max(1, Performance.history.avgFps) < 0.5) { // prevent freeze jumps
		Performance.fps = Performance.history.avgFps;
		Performance.delta = 1000 / Performance.fps;
	}
	else {
		if (runEngine) {
			Engine.update();
		}
		else 
			Performance.update();
		
		// - move car
		updateCar();
		// if (runEngine)
		// 	Engine.updateCollisions();

		// - render
		Render();
		// Performance.render();

		// - run animations
		animation.run();
	}

	requestAnimationFrame(main);
}
window.addEventListener("load", main);

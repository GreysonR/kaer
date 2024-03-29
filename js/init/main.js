"use strict";

const canvas = document.getElementById("canv");
const ctx = canvas.getContext("2d");
const { Performance, World:world, Bodies, Engine, Common, Render } = ter;
const { camera } = Render;

ter.init({
	canvas: canvas,
	ctx: ctx,
	width: window.innerWidth,
	height: window.innerHeight,
});

window.addEventListener("resize", () => {
	ter.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener("contextmenu", event => {
	event.preventDefault();
});

Performance.enabled = false;
Performance.getAvg = true;
Render.showBoundingBox = false;
// Render.showBroadphase = false;
Render.showVertices = false;
// Render.showCenters = true;

// ctx.imageSmoothingEnabled = false;
Render.setPixelRatio(devicePixelRatio);

var runEngine = true;
var runRender = true;
function main() {
	// - run engine
	if (Performance.fps / Math.max(1, Performance.history.avgFps) < 0.3) { // prevent freeze jumps
		Performance.fps = Performance.history.avgFps;
		Performance.delta = 1000 / Performance.fps;
	}
	else {
		if (runEngine) {
			Engine.update();
			if (gameCamera.update) gameCamera.update();
		}
		else 
			Performance.update();

		// - render
		if (runRender) {
			Render();
		}

		// - run animations
		animations.run();
	}

	requestAnimationFrame(main);
}
window.addEventListener("load", main);

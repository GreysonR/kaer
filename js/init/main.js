"use strict";

const canvas = document.getElementById("canv");
const ctx = canvas.getContext("2d");
const { Performance, World, Bodies, Engine, Common, Render } = ter;
const { camera } = Render;
let tree = World.dynamicGrid.tree;

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
Render.showVertices = false
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


function createElement(type, properties) {
	let elem = document.createElement(type);

	function addProperties(elem, properties) {
		Object.keys(properties).forEach(property => {
			if (typeof properties[property] === "object" && !Array.isArray(property) && !(properties[property] instanceof Element)) {
				addProperties(elem[property], properties[property]);
			}
			else {
				if (property === "class") {
					let classes = typeof properties[property] === "string" ? properties[property].split(" ") : properties[property];
					for (let className of classes) {
						elem.classList.add(className);
					}
				}
				else if (property === "parent") {
					properties[property].appendChild(elem);
				}
				else {
					elem[property] = properties[property];
				}
			}
		});
	}
	addProperties(elem, properties);

	return elem;
}
function gaussianRandom(mean = 0, stdev = 1, random = Math.random) { // Standard Normal distribution using Box-Muller transform https://stackoverflow.com/a/36481059
    let u = 1 - random();
    let v = random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}
function createSeededRandom(seed) { // Returns function that generates numbers between [0, 1). Adaptation of https://stackoverflow.com/a/19301306
	var mask = 0xffffffff;
	var m_w = (123456789 + seed) & mask;
	var m_z = (987654321 - seed) & mask;
	
	return function() {
		m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
		m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
		var result = ((m_z << 16) + (m_w & 65535)) >>> 0;
		result /= 4294967296;
		return result;
	}
}

String.prototype.toCapital = function() {
	return this.slice(0, 1).toUpperCase() + this.slice(1);
}
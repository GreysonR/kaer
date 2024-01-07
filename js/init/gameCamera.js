"use strict";

var gameCamera = {
	lastFov: [],
	lastPosition: [],
	baseFov: 2000,
	update: updateGameCamera,
}
function getDefaultCameraPosition() {
	let { lastPosition } = gameCamera;
	let posWeightFalloff = (player instanceof Car) ? 1 : 300;
	let totalAvgPosWeight = 0;
	let avgPos = lastPosition.reduce((a, b, i) => {
		let weight = 1 / Math.sqrt(i * posWeightFalloff + 1);
		totalAvgPosWeight += weight;
		return a.add2(b.mult(weight));
	}, new vec(0, 0)).div(totalAvgPosWeight);
	return avgPos;
}
function updateGameCamera(updateValues = true) {
	let { baseFov, lastFov, lastPosition } = gameCamera;
	
	// fov
	let g = 0.15; // higher g = fov more sensitive to speed changes
	let body = player.body;
	let bodyUp = new vec(Math.cos(body.angle), Math.sin(body.angle));
	let n = 0;
	
	if (updateValues) {
		let curFov = baseFov + (Math.min(1, (g - g / Math.max(1, g*body.velocity.length)) / g)) ** 3 * 1200;
		lastFov.unshift(curFov);
		let maxFovLen = Math.max(1, Math.round(Performance.history.avgFps * 1));
		while (lastFov.length > maxFovLen && ++n <= 1) {
			lastFov.pop();
		}
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
	if (player instanceof Car) {
		curPos = body.position.add(bodyUp.mult(bodyUp.dot(body.velocity) * 12));
	}
	else {
		curPos = new vec(body.position);
	}
	lastPosition.unshift(curPos);

	let maxPosLen = Math.max(1, Math.round(Performance.history.avgFps * 0.5));
	n = 0;
	while (lastPosition.length > maxPosLen && ++n <= 1) {
		lastPosition.pop();
	}
	camera.position.set(getDefaultCameraPosition()); // carBody.position.add(carBody.velocity.mult(-2));
}

"use strict";
let motionBlur = document.getElementById("motionBlur");
let motionBlurCtx = motionBlur.getContext("2d");
let motionBlurMask = motionBlurCtx.createRadialGradient(0, 0, 20, 0, 0, 100);
let lastTranslation = new vec(camera.translation);
let prevTranslationDiffs = [new vec(0, 0)];
motionBlurMask.addColorStop(0, "#ffffff");
motionBlurMask.addColorStop(0.5, "#ffffff");
// motionBlurMask.addColorStop(0.75, "#ffffffb0");
motionBlurMask.addColorStop(1, "#ffffff00");

window.addEventListener("load", () => {
	motionBlur.width =  canv.width;
	motionBlur.height = canv.height;
	motionBlur.style.transformOrigin = "top left";
	motionBlur.style.transform = canv.style.transform;
});
window.addEventListener("resize", () => {
	motionBlur.width = canv.width;
	motionBlur.height = canv.height;
	motionBlur.style.transform = canv.style.transform;
});

Render.on("afterRender", () => {
	let filter = document.getElementById("blurFilterItem");
	let avgPrevTranslationDiffs = (() => {
		let avg = new vec(0, 0);
		for (let diff of prevTranslationDiffs) {
			avg.add2(diff);
		}
		avg.div2(prevTranslationDiffs.length);
		return avg;

		// let sorted = ([...prevTranslationDiffs]).sort((a, b) => a.length - b.length);
		// return new vec(sorted[Math.round(sorted.length / 2)]);
	})();
	let vel = avgPrevTranslationDiffs.mult(Performance.fps / 144);
	let blur = vel.abs().sub(2).max({ x: 0, y: 0 }).min({ x: 10, y: 10 }).pow(0.8).mult(2 * camera.scale);
	filter.setAttribute("stdDeviation", `${blur.x || 0},${blur.y || 0}`);

	prevTranslationDiffs.unshift(lastTranslation.sub(camera.translation));
	lastTranslation.set(camera.translation);

	let maxLen = Math.round(10 * Performance.fps / 144);
	if (prevTranslationDiffs.length > maxLen) {
		prevTranslationDiffs.length = maxLen;
	}

	motionBlurCtx.save();
	motionBlurCtx.clearRect(0, 0, canv.width, canv.height);
	
	motionBlurCtx.fillStyle = "#71B132";
	motionBlurCtx.fillRect(0, 0, canv.width, canv.height);
	motionBlurCtx.drawImage(canv, 0, 0);
	
	motionBlurCtx.globalCompositeOperation = "destination-out";
	let dir = new vec(Math.cos(car.angle), Math.sin(car.angle));
	let pos = camera.gamePtToScreen(car.position).add(dir.mult(500 * camera.scale));
	let scale = camera.scale * 1000 / 100; // 1100
	motionBlurCtx.translate(pos.x, pos.y);
	motionBlurCtx.scale(scale, scale);
	motionBlurCtx.fillStyle = motionBlurMask;
	motionBlurCtx.beginPath();
	motionBlurCtx.arc(0, 0, 100, 0, Math.PI*2);
	motionBlurCtx.fill();
	motionBlurCtx.globalCompositeOperation = "source-over";
	motionBlurCtx.restore();


	if (Performance.enabled) {
		motionBlurCtx.globalCompositeOperation = "destination-out";
		motionBlurCtx.fillStyle = "#ffffff";
		motionBlurCtx.fillRect(25, 25, Render.pixelRatio * 200, Render.pixelRatio * 70);
		motionBlurCtx.globalCompositeOperation = "source-over";
	}
});
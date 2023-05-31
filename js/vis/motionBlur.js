"use strict";
let motionBlur = document.getElementById("motionBlur");
let motionBlurCtx = motionBlur.getContext("2d");
let motionBlurMask = motionBlurCtx.createRadialGradient(0, 0, 20, 0, 0, 100);
var useMotionBlur = true;
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
	if (!useMotionBlur) return;
	let filter = document.getElementById("blurFilterItem");
	filter.setAttribute("stdDeviation", `${(car.velocity.length ** 0.4 * 0.9 + 1.8) * camera.scale}`);

	motionBlurCtx.save();
	motionBlurCtx.clearRect(0, 0, motionBlur.width, motionBlur.height);
	
	motionBlurCtx.fillStyle = "#71B132";
	motionBlurCtx.fillRect(0, 0, motionBlur.width, motionBlur.height);
	motionBlurCtx.drawImage(canv, 0, 0);
	
	motionBlurCtx.globalCompositeOperation = "destination-out";
	let dir = new vec(Math.cos(car.angle), Math.sin(car.angle));
	let pos = camera.gamePtToScreen(car.position).add(dir.mult(500 * camera.scale));
	let scale = camera.scale * 1400 / 100 / (camera.fov / baseFov); // 1200
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
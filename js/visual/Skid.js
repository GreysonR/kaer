"use strict";

class Skid {
	static all = new Set();
	
	constructor() {
		this.path = new Set();
		Skid.all.add(this);
	}

	addPt = function(point) {
		this.path.add([ point, world.time]);
	}
	delete() {
		Skid.all.delete(this);
	}
}

Render.on("beforeLayer0", () => {
	let now = world.time;

	ctx.beginPath();
	for (let skid of Skid.all) {
		let { path } = skid;

		// delete points
		let maxTime = 1500;
		if (path.size <= 0) {
			skid.delete();
			continue;
		}

		// render
		if (path.size > 1) {
			let moved = false;
			for (let point of path) {
				// let camDiff = point[0].mult(camera.scale).add(camera.translation);
				// || (Math.abs(camDiff.x - canv.width/2) > canv.width*0.5 || Math.abs(camDiff.y - canv.height/2) > canv.height*0.5)
				if (now - point[1] > maxTime) {
					path.delete(point);
					continue;
				}

				if (moved === false) {
					moved = true;
					ctx.moveTo(point[0].x, point[0].y);
				}
				else {
					ctx.lineTo(point[0].x, point[0].y);
				}
			}
		}
	}
	ctx.strokeStyle = "#1C1C1C20";
	ctx.lineWidth = 15;
	ctx.lineCap = "round";
	ctx.stroke();
});

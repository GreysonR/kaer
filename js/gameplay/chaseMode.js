"use strict";

Render.on("afterRender", () => {
	if (modeName !== "chase") return;
	if (curMap.curJob) return;

	let carPos = car.position;
	let jobs = curMap.jobStarts.filter(v => !v.jobTaken).sort((a, b) => {
		let lenA = carPos.sub(a.position).length;
		let lenB = carPos.sub(b.position).length;

		if (lenA < lenB) return -1;
		if (lenA > lenB) return 1;
		return 0;
	});
	
	for (let i = 0; i < Math.min(3, jobs.length); i++) {
		let diff = carPos.sub(jobs[i].position);
		if (diff.length > 600) {
			let angle = diff.angle - Math.PI/2;
			let vertices = [{"x":19,"y":0},{"x":37,"y":37},{"x":19,"y":32},{"x":0,"y":37}];
			vertices = vertices.map(v => new vec(v).sub2({ x: 37/2, y: 27/2 }).mult2(0.7).add2({ x: 0, y: -150}).rotate2(angle).add(car.position));
	
			ctx.beginPath();
			Render.roundedPolygon(vertices, 5);
			ctx.fillStyle = "#5DCEFF";
			ctx.fill();
		}
	}
});
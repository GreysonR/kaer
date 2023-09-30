"use strict";

function renderTrail(start, startControl, endControl, end, startWidth, endWidth = 0, startCoef = -0.3, endCoef = 1) {
	let startVec = start.sub(startControl);
	let startDirection = startVec.normalize();
	let startNormal = startDirection.normal();

	let endVec = endControl.sub(end);
	let endDirection = endVec.normalize();
	let endNormal = endDirection.normal();

	let totalLength = startControl.sub(start).length + endControl.sub(startControl).length + end.sub(endControl).length;
	let startControlWidth = (1 - startControl.sub(start).length * startCoef) / totalLength * (startWidth - endWidth) + endWidth;
	let endControlWidth = (end.sub(endControl).length * endCoef) / totalLength * (startWidth - endWidth) + endWidth;

	ctx.beginPath();
	// curve from start to end
	let a = start.add(startNormal.mult(startWidth / 2));
	ctx.moveTo(a.x, a.y);
	let b = startControl.add(startNormal.mult(startControlWidth / 2));
	let c = endControl.add(endNormal.mult(endControlWidth / 2));
	let d = end.add(endNormal.mult(endWidth / 2));
	ctx.bezierCurveTo(b.x, b.y, c.x, c.y, d.x, d.y);

	let e = end.add(endNormal.mult(endWidth / 2));
	ctx.lineTo(e.x, e.y);

	// curve from end to start
	let f = endControl.sub(endNormal.mult(endControlWidth / 2));
	let g = startControl.sub(startNormal.mult(startControlWidth / 2));
	let h = start.sub(startNormal.mult(startWidth / 2));
	ctx.bezierCurveTo(f.x, f.y, g.x, g.y, h.x, h.y);
	ctx.closePath();
}

// - trail render test
// (() => {
	// 	let points = [];
// 	Render.on("afterRender", () => {
// 		points.push(new vec(player.body.position));
// 		if (points.length > 30) {
// 			points.shift();
			
// 			renderTrail(points[29], points[19], points[9], points[0], 100, 0, -2, 1);
// 			ctx.fillStyle = "#ff0000";
// 			ctx.fill();
// 		}
// 	});
// })();

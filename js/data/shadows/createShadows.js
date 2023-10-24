"use strict";
var shadowData = {};

class Shadow {
	static all = [];
	static sunAngle = Math.PI/4;
	static sunLength = 150;
	static round = 40;
	static renderAll() {
		ctx.beginPath();
		for (let shadow of Shadow.all) {
			shadow.render();
		}
		ctx.fillStyle = "#00000026";
		ctx.fill();

		// ctx.lineWidth = 2;
		// ctx.strokeStyle = "red";
		// ctx.stroke();
	}
	getSupport(center, vertice, vertices, maxTangent = Infinity) { // get farthest point in direction of vertice within maxTangent away
		let direction = vertice.sub(center).normalize();
		let normal = direction.normal();
		let maxAmt = -Infinity;
		let maxVert;
		for (let vertice of vertices) {
			let dot = vertice.dot(direction);
			let cross = vertice.sub(center).dot(normal);
			if (dot > maxAmt && Math.abs(cross) < maxTangent) {
				maxAmt = dot;
				maxVert = vertice;
			}
		}
		return maxVert;
	}
	constructor(name, position, width, height, angle) {
		let data = shadowData[name];
		let sunLength = Shadow.sunLength;
		let sunAngle = Shadow.sunAngle;
		let direction = new vec(Math.cos(sunAngle), Math.sin(sunAngle));
		let size = new vec(width, height);

		console.log(data);

		// create projected points 
		let points = [];
		for (let vertice of data) {
			let { position: relPos, height } = vertice;
			let originalPoint = position.add(new vec(relPos).sub(size.mult(0.5)).rotate(angle));
			let projectedPoint = originalPoint.add(direction.mult(height * sunLength));
			points.push(originalPoint, projectedPoint);
		}

		// create convex hull
		let hull = [];
		let hullCenter = points.reduce((a, b) => a.add(b), new vec(0, 0)).div2(points.length); // average positions to get center, not correct in this case but close enough
		for (let vertice of points) {
			let support = this.getSupport(hullCenter, vertice, points, 70);
			if (support === vertice) {
				hull.push(vertice);
			}
		}
		hull.sort((a, b) => Common.angleDiff(a.sub(hullCenter).angle, b.sub(hullCenter).angle)); // sort vertices by angles from center

		this.vertices = hull;
		Shadow.all.push(this);
		
		// debug render
		/*
		Render.on("afterRender", () => {
			// point render
			ctx.beginPath();
			for (let point of points) {
				ctx.moveTo(point.x, point.y);
				ctx.arc(point.x, point.y, 5, 0, Math.PI*2);
			}
			ctx.fillStyle = "red";
			ctx.fill();
			
			ctx.beginPath();
			ctx.moveTo(hullCenter.x, hullCenter.y);
			ctx.arc(hullCenter.x, hullCenter.y, 8, 0, Math.PI*2);
			ctx.fillStyle = "#00ff00";
			ctx.fill();
		});
		/**/
	}
	render() {
		Render.roundedPolygon(this.vertices, Shadow.round);
	}
}
Render.on("beforeLayer8", Shadow.renderAll);

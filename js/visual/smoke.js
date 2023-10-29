"use strict";

class Smoke {
	static all = new Set();
	static update = function() {
		let now = World.time;
		for (let smoke of Smoke.all) {
			Smoke.render(smoke);
			smoke.update(now);
		}
	}
	static render = function(smoke) {
		if (smoke.vertices[0].length < 1 || smoke.vertices[1].length < 1) return;

		ctx.translate(smoke.position.x, smoke.position.y);
		ctx.rotate(smoke.angle - Math.PI/2);

		// render
		let { startPt, endPt, closeLength, stopped, transformPt } = smoke;
		let tp = function(pt) {
			return transformPt(pt, smoke);
		}

		let start = {
			position: startPt,
			curvePts: [ startPt, startPt ],
		}
		let end = {
			position: endPt,
			curvePts: [ new vec(-closeLength*0.1, 0), new vec(closeLength*0.1, 0) ],
		}
		if (stopped) {
			// start.curvePts = [ new vec(-closeLength, 0), new vec(closeLength, 0) ];
		}

		let len0 = smoke.vertices[0].length;
		let len1 = smoke.vertices[1].length;

		ctx.beginPath();
		let sp = tp(startPt);
		ctx.moveTo(sp.x, sp.y);
		for (let i = len1 - 1; i >= 0; i--) {
			let cur = smoke.vertices[1][i];
			let last = i + 1 >= len1 ? start : smoke.vertices[1][(i + 1) % len1];

			let curAngle = last.position.sub(cur.position).angle - Math.PI/2;
			let curPt1 = cur.curvePts[1].rotate(curAngle).add(cur.position);
			let lastPt0 = last.curvePts[0].rotate(curAngle).add(last.position);

			lastPt0 = tp(lastPt0);
			curPt1 = tp(curPt1);
			let curPos = tp(cur.position);
			ctx.bezierCurveTo(lastPt0.x, lastPt0.y, curPt1.x, curPt1.y, curPos.x, curPos.y);
		}

		
		// curve to end point
		let curPt1 = tp(end.curvePts[1].add(endPt));
		let lastPt0 = tp(smoke.vertices[1][0].curvePts[1].add(smoke.vertices[1][0].position));
		let tEndPt = tp(endPt);
		ctx.bezierCurveTo(lastPt0.x, lastPt0.y, curPt1.x, curPt1.y, tEndPt.x, tEndPt.y);/* */

		for (let i = 0; i < len0; i++) {
			let cur = smoke.vertices[0][i];
			let last = i - 1 < 0 ? end : smoke.vertices[0][(i - 1 + len0) % len0]; // smoke.vertices[1][0]

			let curAngle = last.position.sub(cur.position).angle - Math.PI/2;
			let curPt1 = cur.curvePts[1].rotate(curAngle).add(cur.position);
			let lastPt0 = last.curvePts[0].rotate(curAngle).add(last.position);

			lastPt0 = tp(lastPt0);
			curPt1 = tp(curPt1);
			let curPos = tp(cur.position);
			ctx.bezierCurveTo(lastPt0.x, lastPt0.y, curPt1.x, curPt1.y, curPos.x, curPos.y);
		}
		let ep = tp(new vec(-startPt.x, startPt.y));
		ctx.lineTo(ep.x, ep);
		ctx.closePath();
		ctx.fillStyle = smoke.render.background;
		ctx.fill();

		
		// - debug
		/*
		// render start pt
		ctx.fillStyle = "#3CCF77";
		ctx.beginPath();
		ctx.arc(startPt.x, startPt.y, 2, 0, Math.PI*2);
		ctx.fill();/* */
		/*
		// render end pt
		ctx.fillStyle = "#3CCF77";
		ctx.beginPath();
		ctx.arc(endPt.x, endPt.y, 2, 0, Math.PI*2);
		ctx.fill();

		ctx.fillStyle = "#3CCFBE";
		ctx.beginPath();
		ctx.arc(lastPt0.x, lastPt0.y, 2, 0, Math.PI*2);
		ctx.fill();

		ctx.fillStyle = "#CCCF3C";
		ctx.beginPath();
		ctx.arc(curPt1.x, curPt1.y, 2, 0, Math.PI*2);
		ctx.fill();/* */
		/*
		for (let i = len0 - 1; i >= 0; i--) {
			// break;
			let cur = smoke.vertices[0][i];
			let last = i - 1 < 0 ? cur : smoke.vertices[0][(i - 1 + len0) % len0];
			let curAngle = last.position.sub(cur.position).angle - Math.PI/2;

			let curPt0 = cur.curvePts[0].rotate(curAngle).add(cur.position);
			let curPt1 = cur.curvePts[1].rotate(curAngle).add(cur.position);

			ctx.strokeStyle = "#ffffff40";
			ctx.beginPath();
			ctx.moveTo(curPt0.x, curPt0.y);
			ctx.lineTo(curPt1.x, curPt1.y);
			ctx.stroke();

			ctx.fillStyle = "yellow";
			ctx.beginPath();
			ctx.arc(curPt0.x, curPt0.y, 2, 0, Math.PI*2);
			ctx.fill();

			ctx.fillStyle = "red";
			ctx.beginPath();
			ctx.arc(curPt1.x, curPt1.y, 2, 0, Math.PI*2);
			ctx.fill();

			ctx.fillStyle = "blue";
			ctx.beginPath();
			ctx.arc(cur.position.x, cur.position.y, 2, 0, Math.PI*2);
			ctx.fill();
		}/* */
		/*
		ctx.beginPath();
		let i = 0;
		for (let pt of smoke.path) {
			if (i === 0) {
				ctx.moveTo(pt[0].x, pt[0].y);
			}
			else {
				ctx.lineTo(pt[0].x, pt[0].y);
			}
			i++;
		}
		ctx.lineWidth = 2;
		ctx.strokeStyle = "#ff000080";
		ctx.stroke();/* */
		
		ctx.rotate(-smoke.angle + Math.PI/2);
		ctx.translate(-smoke.position.x, -smoke.position.y);
	}
	
	constructor(options = {}) {
		Common.merge(this, options);
		Smoke.all.add(this);

		this.setPath([new vec(0, 0), new vec(0, this.openLength + this.closeLength)]);
		
		let totalLen = this.openLength + this.closeLength;
		let endPt = this.endPt;
		animations.create({
			duration: this.aliveTime * 0.8,
			curve: ease.linear,
			callback: function(p) {
				endPt.y = totalLen * p;
			},
		});
	}
	update(time) {
		if (this.stopped) return;
		
		let { lastAdded, nextTime, openLength, closeLength, startPt, maxWidth, aliveTime, verticeTime, variation } = this;
		let { angle: angleVar, position: posVar, curveLength: curVar } = variation;
		let smoke = this;

		let closePt = new vec(maxWidth / 2, openLength);
		let endPt = new vec(0, openLength + closeLength);

		let openDiff = closePt.sub(startPt);
		let openNorm = openDiff.normalize();
		let closeDiff = endPt.sub(closePt);
		let closeNorm = closeDiff.normalize();
		let openDLength = openDiff.length; // open diagonal length
		let closeDLength = closeDiff.length; // close diagonal length
		let totalLength = openDLength + closeDLength;

		// add points to each side
		for (let side = 0; side <= 1; side++) {
			let sideVec = { x: Math.sign(side - 0.5), y: 1 };
			if (time - lastAdded[side] >= nextTime[side]) { // can add vertice
				let pos = new vec(0, 0);
				let offset = (posVar[1] - posVar[0]) * Math.random() + posVar[0];
				let startAngle = openDiff.angle;
				let endAngle = closeDiff.angle;
				let curveOffset = (curVar[1] - curVar[0]) * Math.random() + curVar[0];
				let offsetAngle = (angleVar * Math.random() - angleVar / 2) * -Math.sign(side - 0.5) - Math.PI/2;
				let offsetAngleDiff = Common.angleDiff(offsetAngle, Math.PI * side - Math.PI/2);
				let vertice = {
					offset: offset,
					position: pos,
					fullCurvePts: [new vec(Math.cos(offsetAngle) * curveOffset, Math.sin(offsetAngle) * curveOffset), new vec(Math.cos(offsetAngle + Math.PI) * curveOffset, Math.sin(offsetAngle + Math.PI) * curveOffset)],
					curvePts: [],
					startTime: time,
				}
				vertice.curvePts = [ ...vertice.fullCurvePts ];

				animations.create({
					duration: openDLength / totalLength * aliveTime,
					curve: ease.linear,
					callback: function(p) {
						vertice.position = openDiff.mult(p).add2(openNorm.normal().mult(vertice.offset * p)).mult(sideVec);
						vertice.curvePts[0] = vertice.fullCurvePts[0].mult(p);
						vertice.curvePts[1] = vertice.fullCurvePts[1].mult(p);
					},
					onend: function() {
						animations.create({
							duration: closeDLength / totalLength * aliveTime,
							curve: ease.linear,
							callback: function(p) {
								// vertice.position = openDiff.normalize().mult(closeDLength).mult(p).add2(closePt).add2(openNorm.normal().mult(vertice.offset * (1 - p))).mult(sideVec);
								vertice.position = closeDiff.mult(p).add2(closePt).add2(openNorm.normal().mult(vertice.offset * (1 - p))).mult(sideVec);

								vertice.curvePts[0] = vertice.fullCurvePts[0].mult(1 - p);
								vertice.curvePts[1] = vertice.fullCurvePts[1].mult(1 - p);
							},
							onend: function() {
								smoke.vertices[side].delete(vertice);
							},
						});
					},
				});

				smoke.vertices[side].push(vertice);

				nextTime[side] = (verticeTime[1] - verticeTime[0]) * Math.random() + verticeTime[0];
				lastAdded[side] = time;
			}
		}
	}
	setPath(path) {
		let totalLen = this.openLength + this.closeLength;
		let segments = [];

		let curLen = 0;
		for (let i = 0; i < path.length; i++) {
			let cur = path[i];
			if (i > 0) {
				let last = path[i - 1];
				curLen += cur.sub(last).length;
			}
			segments[i] = [ path[i], curLen / totalLen ];

			if (curLen >= totalLen) break;
		}

		this.path = segments;
	}
	transformPt(pt, smoke) {
		let totalVLen = smoke.openLength + smoke.closeLength;
		let ptPercent = pt.y / totalVLen;
		let path = smoke.path;

		for (let i = 1; i < path.length; i++) {
			let cur = path[i];
			let last = path[i - 1];

			if (cur[1] >= ptPercent || i === path.length - 1) {
				let percentDown = ptPercent - last[1];
				let pathPt = last[0].add(cur[0].sub(last[0]).mult(percentDown));
				let norm = cur[0].sub(last[0]).normalize().normal();

				return pathPt.add(norm.mult(pt.x));
			}
		}
	}

	vertices = [
		[],
		[]
	]
	path = [new vec(0, 0), new vec(0, 800)];
	startPt = new vec(0, 0);
	endPt = new vec(0, 0);
	lastAdded = [0, 0];
	nextTime = [0, 0];

	stop(callback, onend) {
		this.stopped = true;
		
		let smoke = this;
		let totalLen = this.openLength + this.closeLength * 2;
		let startPt = this.startPt;
		let endPt = this.endPt;
		animations.create({
			duration: this.aliveTime,
			curve: ease.linear,
			callback: function(p) {
				startPt.y = totalLen * p;

				// startPt.y = -totalLen * p;
				// endPt.y = totalLen * (1 - p);

				if (callback) callback();
			},
			onend: () => {
				Smoke.all.delete(smoke);
				if (typeof onend === "function") onend();
			},
		});
	}
	stopped = false;

	position = new vec(100, 100);
	angle = Math.PI/2;

	openLength = 300;
	closeLength = 200;
	maxWidth = 200;
	aliveTime = 700;
	verticeTime = [140, 160]; // [min time, max time]
	variation = {
		angle: Math.PI*0.5,
		position: [-20, 40],
		curveLength: [30, 50],
	}
	render = {
		background: "#CBCBCB41",
	}
}

Render.on("beforeLayer0", Smoke.update);

"use strict";

function generateMap() {
	car.setAngle(Math.PI*3/2);
	car.setPosition(new vec(0, 0));

	let paths = [ generatePath(new vec(0, 3000), new vec(0, -10)), generatePath() ];

	// let testBezier = new Bezier(new vec(0, 200), new vec(100, 0), new vec(100, 200), new vec(200, 200));

	Render.on("beforeRender", () => {
		// testBezier.renderDx();
		// testBezier.render();
		// testBezier.renderDx2();

		// render road
		for (let path of paths) {
			ctx.beginPath();
			ctx.moveTo(path[0].position.x, path[0].position.y);
			for (let i = 1; i < path.length; i++) {
				let pt = path[i];
				let lastPt = path[i - 1];
				let { cPts: cPtA } = lastPt;
				let { position: posB, cPts: cPtB } = pt;
	
				ctx.bezierCurveTo(cPtA[1].x, cPtA[1].y, cPtB[0].x, cPtB[0].y, posB.x, posB.y);
			}
			ctx.strokeStyle = "#799F28"; // grass outline
			ctx.lineWidth = 780;
			ctx.stroke();
			ctx.strokeStyle = "#97592D"; // dirt outline
			ctx.lineWidth = 640;
			ctx.stroke();
			ctx.strokeStyle = "#425155"; // dark outline
			ctx.lineWidth = 480;
			ctx.stroke();
			ctx.strokeStyle = "#53656A"; // main road
			ctx.lineWidth = 340;
			ctx.stroke();
		}
	});
}

function generatePath(start = new vec(0, 0), end = new vec(0, -100000)) {// generate key points
	let scale = 11;
	start.div2(scale);
	end.div2(scale);

	let points = [{
		position: new vec(start),
		dir: end.sub(start).normalize().normal(),
		isKey: true,
		cPts: [ new vec(start), new vec(start).add(end.sub(start).normalize().mult(100))],
	}];

	let keyPtDist = [400, 600];
	let height = end.y - start.y;
	let width = 1000;
	let yDir = Math.sign(height);

	for (let y = start.y + keyPtDist[0] * yDir; y > end.y - 50 * yDir; y += (Math.random() * (keyPtDist[1] - keyPtDist[0]) + keyPtDist[0]) * yDir) {
		let middleX = (start.x - end.x) * ((y - start.y) / height);
		let lastPt = points[points.length - 1] ?? start;
		lastPt = lastPt.position;

		let xRange = 600; // tweak this value
		let x = Math.random() * xRange * Math.sign(Math.random() - 0.5);
		x = Math.min(width, Math.abs(x)) * Math.sign(x);
		if (Math.abs(lastPt.x - x) > xRange) {
			x = lastPt.x * 0.5 + x * 0.5;
		}
		points.push({
			position: new vec(x, y),
			dir: new vec(0, 0),
			isKey: true,
			cPts: [],
		});
	}
	points.push({
		position: new vec(end),
		dir: end.sub(start).normalize().normal(),
		isKey: true,
		cPts: [ new vec(end).add(end.sub(start).normalize().mult(-50)), new vec(end)],
	});

	// divide into sub segments
	let lastPt = points[0];
	let subPtDist = 120; // distance between each sub point
	for (let pt of Object.values(points)) {
		if (pt === points[0]) continue;
		let index = points.indexOf(pt);

		let diff = pt.position.sub(lastPt.position);
		let maxSub = Math.floor(diff.length / subPtDist);
		let nSub = Math.floor((diff.length - subPtDist * .4) / subPtDist);
		for (let i = 1; i < nSub; i++) {
			let p = i / nSub * 0.8 + 0.1;
			// if (p < 0.1 || p > 0.9) continue;

			let position = diff.mult(p).add(lastPt.position);

			points.splice(index + i - 1, 0, {
				position: position,
				dir: new vec(0, 0),
				isKey: false,
				keys: {
					last: lastPt.position,
					next: pt.position,
				},
				p: p * diff.length,
				cPts: [],
			});
		}

		lastPt = pt;
	}

	// assign directions + shift points
	let lastKey = points[0];
	let lastKeyDir = Math.sign(Math.random() - 0.5);
	let subPtShift = [ 150, 200 ];
	let lastShift = 0;
	for (let i = 1; i < points.length - 1; i++) {
		let pt = points[i];
		let lastPt = points[i - 1];
		let nextPt = points[i + 1];

		if (pt.isKey) { // give dir to key points
			let pLast = pt.position.sub(lastPt.position);
			let pNext = nextPt.position.sub(pt.position);
			pt.dir = pLast.add(pNext).normal().normalize();

			lastKeyDir = 1;
			if (pLast.cross(pNext) < 0) {
				pt.dir.mult2(-1);
				lastKeyDir = -1;
			}

			lastKey = pt;
		}
		else { // give dir + shift to non key points
			// dir
			let pLast = pt.position.sub(lastKey.position);
			let pNext = nextPt.position.sub(pt.position);
			pt.dir = pLast.add(pNext).normal().normalize();

			pt.dir.mult2(-lastKeyDir);
			lastKeyDir *= Math.sign(Math.random() - 0.8) // -1;

			lastKey = pt;

			// shift sub pt based on dir
			let curShift = Math.min(subPtShift[1], Math.random() * (subPtShift[1] - subPtShift[0]) - lastShift + subPtShift[0]);
			curShift = Math.min(curShift, pt.p);

			lastShift = curShift;
			pt.position.add2(pt.dir.mult(curShift));
		}
	}

	// correct points that are too tight
	for (let i = 1; i < points.length - 1; i++) {
		let pt = points[i].position;
		let lastPt = points[i - 1].position;
		let nextPt = points[i + 1].position;
		let tightness = (pt.sub(lastPt).normalize().dot(pt.sub(nextPt).normalize()) + 1) / 2;
		let last, next;

		if (points[i].isKey) {
			last = lastPt;
			next = nextPt;
		}
		else {
			last = points[i].keys.last;
			next = points[i].keys.next;
		}

		if (pt.isKey && tightness > 0.6 || tightness > 0.4) {
			let diff = next.sub(last).normalize();
			let straight = diff.mult(diff.dot(pt.sub(last))).add(last);
			pt.set(pt.sub(straight).mult((tightness - 0.4) * 0.2 + 0.4).add(straight));
		}
	}

	// create bezier curves
	for (let i = 1; i < points.length - 1; i++) {
		let pt = points[i];
		let lastPt = points[i - 1];
		let nextPt = points[i + 1];
		let pLast = pt.position.sub(lastPt.position);
		let pNext = nextPt.position.sub(pt.position);
		let dir = pLast.add(pNext).normalize();

		let cLen = Math.max(20, 50 * lastPt.position.sub(nextPt.position).length ** 0.7 / 40);

		pt.cPts[0] = pt.position.add(pt.dir.normal().mult( cLen));
		pt.cPts[1] = pt.position.add(pt.dir.normal().mult(-cLen));

		if (dir.dot(pt.cPts[0]) > dir.dot(pt.cPts[1])) {
			let a = pt.cPts[0];
			pt.cPts[0] = pt.cPts[1];
			pt.cPts[1] = a;
		}
	}

	// scale
	for (let pt of points) {
		pt.position.mult2(scale);
		pt.cPts[0].mult2(scale);
		pt.cPts[1].mult2(scale);
	}

	return points;
}
function generatePath2(start = new vec(0, 0), end = new vec(0, -10000)) {// generate key points
	noise.seed(1000);

	let points = [{
		position: new vec(start),
		cPts: [ new vec(start), new vec(start).add(end.sub(start).normalize().mult(600))],
	}];

	// to do: add points to path

	points.push({
		position: new vec(end),
		cPts: [ new vec(end).add(end.sub(start).normalize().mult(-600)), new vec(end)],
	});

	// create bezier curves
	for (let i = 1; i < points.length - 1; i++) {
		let pt = points[i];
		let lastPt = points[i - 1];
		let nextPt = points[i + 1];
		let pLast = pt.position.sub(lastPt.position);
		let pNext = nextPt.position.sub(pt.position);
		let dir = pLast.add(pNext).normalize();

		let cLen = Math.max(20, 50 * lastPt.position.sub(nextPt.position).length ** 0.7 / 40 / 12);

		pt.cPts[0] = pt.position.add(pt.dir.normal().mult( cLen));
		pt.cPts[1] = pt.position.add(pt.dir.normal().mult(-cLen));

		if (dir.dot(pt.cPts[0]) > dir.dot(pt.cPts[1])) {
			let a = pt.cPts[0];
			pt.cPts[0] = pt.cPts[1];
			pt.cPts[1] = a;
		}
	}

	return points;
}

// baseFov = 13000;
// Render.showVertices = true;
"use strict";

function generateMap() {
	car.setAngle(Math.PI*3/2);
	car.setPosition(new vec(0, 0));

	let b = new Bezier(new vec(0, 1), new vec(0.5, 1), new vec(0.5, 0), new vec(1, 0));
	console.log(b);

	// generate key points
	let start = new vec(0, 0);
	let end = new vec(0, -100000);
	let scale = 1;
	let points = [{
		position: new vec(start),
		dir: end.sub(start).normalize().normal(),
		isKey: true,
		cPts: [ new vec(start), new vec(start).add(end.sub(start).normalize().mult(50))],
	}];

	let keyPtDist = [250, 400];
	let height = end.y - start.y;
	let width = 1000;
	let yDir = Math.sign(height);

	for (let y = start.y + (Math.random() * (keyPtDist[1] - keyPtDist[0]) + keyPtDist[0]) * yDir; y > end.y - height * 0.08; y += (Math.random() * (keyPtDist[1] - keyPtDist[0]) + keyPtDist[0]) * yDir) {
		let middleX = (start.x - end.x) * ((y - start.y) / height);
		let lastPt = points[points.length - 1] ?? start;
		lastPt = lastPt.position;

		let xRange = 170; // tweak this value
		let x = (Math.abs(lastPt.x - middleX) ** 0.9 * Math.sign(lastPt.x - middleX) + middleX) + Math.random() * xRange * Math.sign(Math.random() - 0.5);
		x = Math.min(width, Math.abs(x)) * Math.sign(x);
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
		dirSign: 1,
		isKey: true,
		cPts: [ new vec(end).add(end.sub(start).normalize().mult(-50)), new vec(end)],
	});

	// divide into sub segments
	let lastPt = points[0];
	let subPtDist = 200;
	for (let pt of Object.values(points)) {
		if (pt === points[0]) continue;
		let index = points.indexOf(pt);

		let diff = pt.position.sub(lastPt.position);
		let nSub = Math.floor(diff.length / subPtDist);
		for (let i = 1; i <= nSub; i++) {
			let p = i / (nSub + 1);

			let position = diff.mult(p).add(lastPt.position);

			points.splice(index + i - 1, 0, {
				position: position,
				dir: new vec(0, 0),
				isKey: false,
				p: p * diff.length,
				cPts: [],
			});
		}

		lastPt = pt;
	}

	// assign directions + shift points
	let lastKey = points[0];
	let lastKeyDir = 1;
	let subPtShift = [ 100, 230 ];
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

			pt.dirSign = lastKeyDir;

			lastKey = pt;
		}
		else { // give dir + shift to non key points
			// dir
			let pLast = pt.position.sub(lastKey.position);
			let pNext = nextPt.position.sub(pt.position);
			pt.dir = pLast.add(pNext).normal().normalize();

			pt.dir.mult2(-lastKeyDir);
			pt.dirSign = lastKeyDir;
			lastKeyDir *= -1;

			lastKey = pt;

			// shift sub pt based on dir
			let curShift = Math.min(subPtShift[1], Math.random() * (subPtShift[1] - subPtShift[0]) - lastShift + subPtShift[0]);
			curShift = Math.min(curShift, pt.p);

			lastShift = curShift;
			pt.position.add2(pt.dir.mult(curShift));
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

	Render.on("beforeRender", () => {
		// bezier curve test
		/*
		ctx.beginPath();
		for (let t = 0; t < b.length; t += 0.05) {
			let pt = b.get(t).mult(200);

			if (t === 0) {
				ctx.moveTo(pt.x, pt.y);
			}
			else {
				ctx.lineTo(pt.x, pt.y);
			}
		}
		ctx.strokeStyle = "blue";
		ctx.lineWidth = 4;
		ctx.stroke();/* */

		// key points
		for (let pt of points) {
			let { position, isKey, dir, cPts } = pt;

			ctx.beginPath();
			ctx.arc(position.x, position.y, 7, 0, Math.PI*2);
			ctx.fillStyle = isKey ? "#1D4EAE" : "#39404490";
			if (pt === points[0] || pt === points[points.length - 1]) ctx.fillStyle = "#BF3232";
			ctx.fill();

			if (dir.length !== 0) {
				ctx.beginPath();
				ctx.moveTo(position.x, position.y);
				ctx.lineTo(position.x + dir.x * 30, position.y + dir.y * 30);
				ctx.strokeStyle = "#DA4545";
				ctx.lineWidth = 3;
				ctx.stroke();
			}

			for (let cPt of cPts) {
				ctx.beginPath();
				ctx.arc(cPt.x, cPt.y, 4, 0, Math.PI*2);
				ctx.fillStyle = "#39404490";
				if (cPt === cPts[0]) ctx.fillStyle = "#89404490";
				ctx.fill();
			}
		}

		// render path
		ctx.beginPath();
		ctx.moveTo(points[0].position.x, points[0].position.y);
		for (let i = 1; i < points.length; i++) {
			let pt = points[i];
			let lastPt = points[i - 1];
			let { cPts: cPtA } = lastPt;
			let { position: posB, cPts: cPtB } = pt;

			ctx.bezierCurveTo(cPtA[1].x, cPtA[1].y, cPtB[0].x, cPtB[0].y, posB.x, posB.y);
		}
		
		ctx.strokeStyle = "#53656A";
		ctx.lineWidth = 5;
		ctx.stroke();
	});
}
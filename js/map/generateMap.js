"use strict";

function generateMap() {
	car.setAngle(Math.PI*3/2);
	car.setPosition(new vec(0, 0));

	window.path = new Path(new vec(0, 0), new vec(0, -1));
	let roadWidth = 480;
	let paths = [ window.path.path ];
	// generateTrees(paths[0], roadWidth);


	// let testBezier = new Bezier(new vec(0, 200), new vec(100, 0), new vec(100, 200), new vec(200, 200));
	Render.on("beforeRender", () => {
		// testBezier.renderDx();
		// testBezier.render();

		// render road
		
		for (let path of paths) {
			if (path.length > 0) {
				ctx.beginPath();
				ctx.moveTo(path[0].position.x, path[0].position.y);
				for (let i = 1; i < path.length; i++) {
					let pt = path[i];
					let lastPt = path[i - 1];
					let { cPts: cPtA } = lastPt;
					let { position: posB, cPts: cPtB } = pt;
	
					if (!cPtA[0] || !cPtB[0]) continue;
		
					ctx.bezierCurveTo(cPtA[1].x, cPtA[1].y, cPtB[0].x, cPtB[0].y, posB.x, posB.y);
				}
				ctx.strokeStyle = "#799F28"; // grass outline
				ctx.lineWidth = roadWidth + 300;
				ctx.stroke();
				ctx.strokeStyle = "#97592D"; // dirt outline
				ctx.lineWidth = roadWidth + 160;
				ctx.stroke();
				ctx.strokeStyle = "#425155"; // dark outline
				ctx.lineWidth = roadWidth;
				ctx.stroke();
				ctx.strokeStyle = "#53656A"; // main road
				ctx.lineWidth = roadWidth - 140;
				ctx.stroke();
			}
		}/**/
	});
}

function generatePath(start = new vec(0, 0), end = new vec(0, -20000)) {
	let scale = 6;
	start.div2(scale);
	end.div2(scale);

	let points = [{
		position: new vec(start),
		dir: end.sub(start).normalize().normal(),
		isKey: true,
		cPts: [ new vec(start), new vec(start).add(end.sub(start).normalize().mult(200))],
	}];

	let keyPtDist = [540, 540];
	let height = end.y - start.y;
	let width = 1000;
	let yDir = Math.sign(height);

	// generate key points
	for (let y = start.y + keyPtDist[0] * 1.5 * yDir; y > end.y - keyPtDist[0]*2 * yDir; y += (Math.random() * (keyPtDist[1] - keyPtDist[0]) + keyPtDist[0]) * yDir) {
		let lastPt = points[points.length - 1] ?? start;
		lastPt = lastPt.position;

		let xRange = 500; // tweak this value
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
		cPts: [ new vec(end).add(end.sub(start).normalize().mult(-100)), new vec(end)],
	});

	// divide into sub segments
	let lastPt = points[0];
	let subPtDist = 180; // distance between each sub point
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
	let subPtShift = [ 200, 250 ];
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

		let cLen = Math.max(20, 70 * lastPt.position.sub(nextPt.position).length ** 0.7 / 40);

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

function generateRoadHitbox(path, roadWidth, material = "road") {
	let beziers = [];
	let hitboxes = [];
	let vertices = [];

	for (let i = 1; i < path.length; i++) {
		let pt = path[i];
		let lastPt = path[i - 1];
		let { position: posA, cPts: cPtA } = lastPt;
		let { position: posB, cPts: cPtB } = pt;

		beziers.push(new Bezier(posA, cPtA[1], cPtB[0], posB));
	}

	// create points for left / right sides
	let leftSide = [];
	let rightSide = [];
	for (let i = 0; i < beziers.length; i++) {
		let bezier = beziers[i];
		let bLen = bezier.length;
		for (let t = i === 0 ? 0 : bLen * 0.1; t <= bLen;) {
			let op = bezier.get(t);
			let dx = bezier.getDx(t);
			let norm = dx.normalize().normal();

			let pt = op.add(norm.mult(roadWidth / 2 * 1.1))
			leftSide.push(pt);

			t += 300;
		}
		
		// add last pt
		leftSide.push(bezier.get(bLen).add(bezier.getDx(bLen).normalize().normal().mult(roadWidth / 2)));
	}
	for (let i = 0; i < beziers.length; i++) {
		let bezier = beziers[i];
		let bLen = bezier.length;
		for (let t = i === 0 ? 0 : bLen * 0.1; t <= bLen;) {
			let op = bezier.get(t);
			let dx = bezier.getDx(t);
			let norm = dx.normalize().normal();

			let pt = op.add(norm.mult(-roadWidth / 2 * 1.1))
			rightSide.push(pt);

			t += 300;
		}
		
		// add last pt
		rightSide.push(bezier.get(bLen).add(bezier.getDx(bLen).normalize().normal().mult(-roadWidth / 2)));
	}

	// remove intersections
	function removeIntersections(side) {
		for (let i = 1; i < Math.max(1, side.length - 10); i++) {
			let a1 = side[i];
			let a2 = side[i - 1];
			for (let j = i + 1; j < Math.min(side.length, i + 10); j++) {
				let b1 = side[j];
				let b2 = side[j + 1];
				
				let intersection = Common.lineIntersects(a1, a2, b1, b2);

				if (intersection) {
					side.splice(i, j - i + 1, intersection);
					i--;
					break;
				}
			}
		}
	}
	removeIntersections(rightSide);
	removeIntersections(leftSide);


	vertices = vertices.concat(leftSide).concat(rightSide.reverse());
	let decompPoints = vertices.map(v => [v.x, v.y]);
	decomp.removeDuplicatePoints(decompPoints, 0.01);
	decomp.makeCCW(decompPoints);
	let convex = decomp.quickDecomp(decompPoints);

	for (let shape of convex) {
		let vertices = shape.map(v => ({ x: v[0], y: v[1] }));
		let center = getCenterOfMass(vertices);

		for (let i = 0; i < vertices.length; i++) {
			vertices[i] = new vec(vertices[i]);
		}

		let obj = Bodies.fromVertices(vertices, center, {
			material: material,
			hasCollisions: false,

			render: {
				visible: true,
				background: "#42515560",
				layer: -1,
			}
		});
		obj.delete();
		SurfaceGrid.addBody(obj);
		hitboxes.push(obj);
	}
	/*
	Render.on("afterRender", () => {
		// lines
		ctx.beginPath();
		for (let vertice of vertices) {
			if (vertice === vertices[0]) {
				ctx.moveTo(vertice.x, vertice.y);
			}
			else {
				ctx.lineTo(vertice.x, vertice.y);
			}
		}
		ctx.strokeStyle = "#ff0000";
		ctx.lineWidth = 1 / camera.scale;
		ctx.stroke();

		// points
		ctx.beginPath();
		for (let vertice of vertices) {
			ctx.beginPath();
			ctx.arc(vertice.x, vertice.y, 2 / camera.scale, 0, Math.PI*2);
			ctx.fillStyle = "#ffffff";
			ctx.fill();
		}

		// hitboxes
		for (let shape of hitboxes) {
			let { vertices } = shape;
			ctx.beginPath();
			ctx.moveTo(vertices[0].x, vertices[0].y);

			for (let j = 1; j < vertices.length; j++) {
				let vertice = vertices[j];
				ctx.lineTo(vertice.x, vertice.y);
			}

			ctx.closePath();

			ctx.fillStyle = "#ffffff10";
			ctx.fill();

			ctx.strokeStyle = "#ffff0010";
			ctx.lineWidth = 1 / camera.scale;
			ctx.stroke();
		}
	});/* */

	return hitboxes;
}

function generateHitbox(path, radius, dt = 600) {
	let beziers = [];
	let hitboxes = [];
	let vertices = [];

	for (let i = 1; i < path.length; i++) {
		let pt = path[i];
		let lastPt = path[i - 1];
		let { position: posA, cPts: cPtA } = lastPt;
		let { position: posB, cPts: cPtB } = pt;

		beziers.push(new Bezier(posA, cPtA[1], cPtB[0], posB));
	}

	// create points for left / right sides
	let leftSide = [];
	let rightSide = [];
	for (let i = 0; i < beziers.length; i++) {
		let bezier = beziers[i];
		let bLen = bezier.length;
		for (let t = i === 0 ? 0 : bLen * 0.1; t <= bLen;) {
			let op = bezier.get(t);
			let dx = bezier.getDx(t);
			let norm = dx.normalize().normal();

			let pt = op.add(norm.mult(radius / 2 * 1.1))
			leftSide.push(pt);

			t += dt;
		}
		
		// add last pt
		leftSide.push(bezier.get(bLen).add(bezier.getDx(bLen).normalize().normal().mult(radius / 2)));
	}
	for (let i = 0; i < beziers.length; i++) {
		let bezier = beziers[i];
		let bLen = bezier.length;
		for (let t = i === 0 ? 0 : bLen * 0.1; t <= bLen;) {
			let op = bezier.get(t);
			let dx = bezier.getDx(t);
			let norm = dx.normalize().normal();

			let pt = op.add(norm.mult(-radius / 2 * 1.1))
			rightSide.push(pt);

			t += dt;
		}
		
		// add last pt
		rightSide.push(bezier.get(bLen).add(bezier.getDx(bLen).normalize().normal().mult(-radius / 2)));
	}

	// remove intersections
	function removeIntersections(side) {
		for (let i = 1; i < Math.max(1, side.length - 10); i++) {
			let a1 = side[i];
			let a2 = side[i - 1];
			for (let j = i + 1; j < Math.min(side.length, i + 10); j++) {
				let b1 = side[j];
				let b2 = side[j + 1];
				
				let intersection = Common.lineIntersects(a1, a2, b1, b2);

				if (intersection) {
					side.splice(i, j - i + 1, intersection);
					i--;
					break;
				}
			}
		}
	}
	removeIntersections(rightSide);
	removeIntersections(leftSide);
	


	vertices = vertices.concat(leftSide).concat(rightSide.reverse());
	let decompPoints = vertices.map(v => [v.x, v.y]);
	decomp.removeDuplicatePoints(decompPoints, 0.01);
	decomp.makeCCW(decompPoints);
	let convex = decomp.quickDecomp(decompPoints);


	for (let shape of convex) {
		let vertices = shape.map(v => ({ x: v[0], y: v[1] }));
		let center = getCenterOfMass(vertices);

		for (let i = 0; i < vertices.length; i++) {
			vertices[i] = new vec(vertices[i]);
		}

		let obj = Bodies.fromVertices(vertices, center, {
			isHitbox: true,
			hasCollisions: true,
			isSensor: true,

			render: {
				visible: true,
				background: "#00ffff60",
				layer: 3,
			}
		});
		obj.delete();
		hitboxes.push(obj);
	}

	return hitboxes;
}
function generateHitboxBasic(path, radius, dt = 600) {
	let beziers = [];
	let hitboxes = [];
	let vertices = [];

	for (let i = 1; i < path.length; i++) {
		let pt = path[i];
		let lastPt = path[i - 1];
		let { position: posA, cPts: cPtA } = lastPt;
		let { position: posB, cPts: cPtB } = pt;

		beziers.push(new Bezier(posA, cPtA[1], cPtB[0], posB));
	}

	// create points for left / right sides
	let leftSide = [];
	let rightSide = [];
	for (let i = 0; i < beziers.length; i++) {
		let bezier = beziers[i];
		leftSide.push(bezier.getAtT(0).add(bezier.getDxAtT(0).normalize().normal().mult(radius / 2)));
		leftSide.push(bezier.getAtT(1).add(bezier.getDxAtT(1).normalize().normal().mult(radius / 2)));
	}
	for (let i = 0; i < beziers.length; i++) {
		let bezier = beziers[i];
		rightSide.push(bezier.getAtT(0).add(bezier.getDxAtT(0).normalize().normal().mult(-radius / 2)));
		rightSide.push(bezier.getAtT(1).add(bezier.getDxAtT(1).normalize().normal().mult(-radius / 2)));
	}

	// remove intersections
	function removeIntersections(side) {
		for (let i = 1; i < side.length; i++) {
			let a1 = side[i];
			let a2 = side[i - 1];
			for (let j = i + 1; j <= i + 4; j++) {
				let b1 = side[j % side.length];
				let b2 = side[(j + 1) % side.length];
				
				let intersection = Common.lineIntersects(a1, a2, b1, b2);

				if (intersection) {
					side.splice(i, j - i + 1, intersection);
					i--;
					break;
				}
			}
		}
	}
	function makeCCW(vertices) { // makes vertices go counterclockwise
		let center = getCenterOfMass(vertices);
		let mapped = vertices.map(v => [v, v.sub(center).angle]);
		mapped.sort((a, b) => a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0);
		return mapped.map(v => v[0]);
	}
	
	
	
	vertices = vertices.concat(leftSide).concat(rightSide.reverse());
	vertices = makeCCW(vertices);
	let center = getCenterOfMass(vertices);

	for (let i = 0; i < vertices.length; i++) {
		vertices[i] = new vec(vertices[i]);
	}

	let obj = Bodies.fromVertices(vertices, center, {
		isHitbox: true,
		hasCollisions: true,
		isSensor: true,

		render: {
			visible: true,
			background: "#00ffff10",
			layer: 3,
		}
	});
	obj.delete();
	hitboxes.push(obj);

	return hitboxes;
}

function generateTrees(path, roadWidth) {
	let hitboxes = generateHitbox(path, roadWidth - 50);

	// -
	// - generate trees
	// - 
	let width = 6000;
	let bottom = path[0].position.y;
	let top = path[path.length - 1].position.y;
	let height = top - bottom;
	let area = Math.abs(width*height);
	let trees = [];
	let treeRadius = 200;
	let treeDensity = 400;
	let numTrees = area / treeDensity**2;
	let n = 0;

	function deleteTree(collision) {
		let { bodyA, bodyB } = collision;
		let tree = bodyA.isTree ? bodyA : bodyB;
		// let other = bodyA.isTree ? bodyB : bodyA;
		if (tree.removed) return;
		tree.delete();
		trees.delete(tree);
	}

	for (let x = -width/2; x < width/2; x += Math.random() * 700 + 400) {
		for (let y = top; y < bottom; y +=   Math.random() * 700 + 400) {
			let offsetAngle = Math.random() * Math.PI*2;
			let offsetDist = Math.random() * 500;
			let offset = new vec(offsetDist * Math.cos(offsetAngle), offsetDist * Math.sin(offsetAngle));
			let pos = new vec(x, y).add(offset);
			pos.x = Math.abs(pos.x / width * 2) ** 1.4 * Math.sign(pos.x) * width/2;
			let obj = Bodies.circle(treeRadius, pos, {
				hasCollisions: true,
				isSensor: true,
				isStatic: false,
				isTree: true,
		
				render: {
					visible: true,
					background: "#42515560",
					layer: 3,
				}
			});
			obj.on("collisionStart", deleteTree);
			trees.push(obj);
		}
	}

	requestAnimationFrame(() => {
		for (let tree of trees) {
			tree.off("collisionStart", deleteTree);

			if (!tree.removed) {
				tree.delete();
				let obj = Bodies.circle(70, new vec(tree.position), {
					hasCollisions: true,
					isStatic: true,
			
					render: {
						visible: true,
						background: "#42515560",
						layer: 3,
						sprite: "env/tree" + (Math.floor(Math.random() * 2) + 1) + ".png",
						spriteWidth:  374 * 1.2,
						spriteHeight: 364 * 1.2,
					}
				});
			}
		}

		for (let hitbox of hitboxes) {
			hitbox.delete();
		}
	});
}

class PathPt {
	constructor(pos, dir, cPts = []) {
		if (!cPts) {
			cPts = [ new vec(pos), new vec(pos) ];
		}
		if (!dir) {
			dir = new vec(0, 1);
		}
		
		this.cPts = cPts;
		this.dir = dir;
		this.position = pos;
		this.bounds = {
			min: new vec(pos),
			max: new vec(pos)
		};
	}
	render() {
		Render.on("afterRender", () => {
			ctx.beginPath();
			ctx.arc(this.position.x, this.position.y, 2 / camera.scale, 0, Math.PI*2);
			ctx.fillStyle = "black";
			ctx.fill();
			
			ctx.beginPath();
			ctx.moveTo(this.position.x, this.position.y);
			ctx.lineTo(this.position.x + this.dir.x * 10 / camera.scale, this.position.y + this.dir.y * 10 / camera.scale);
			ctx.lineWidth = 1.5 / camera.scale;
			ctx.strokeStyle = "#0000ff";
			ctx.stroke();
		});
	}
}

class Path {
	constructor(start, dir, roadWidth = 480) {
		this.start = start;
		this.dir = dir;
		this.roadWidth = roadWidth;
		this.dirAngle = dir.angle;
		this.path = [ new PathPt(new vec(start), dir, [new vec(start), start.add(dir.mult(50))]) ];
		this.maxLength = 15;

		this.hitboxes = [];
		this.roadHitboxes = [];

		this.hitboxGrid = new Grid(4000);

		for (let i = 0; i < 2; i++) {
			this.getNext();
		}
	}
	getCPts(lastPt, pt, nextPt) {
		let cLen = Math.max(20, 2.3 * lastPt.position.sub(nextPt.position).length ** 0.75);

		pt.cPts[0] = pt.position.add(pt.dir.mult(-cLen));
		pt.cPts[1] = pt.position.add(pt.dir.mult( cLen));
	}
	getSupportIndex(points, center, dir, ignore = []) {
		let maxN = 0;
		let maxI = -1;

		for (let i = 0; i < points.length; i++) {
			if (ignore.includes(i)) continue;

			let v = points[i].sub(center);
			let dot = v.dot(dir);

			if (dot > maxN) {
				maxN = dot;
				maxI = i;
			}
		}

		return maxI;
	}
	pointCollides(position) {
		let grid = this.hitboxGrid;
		let bounds = grid.getBounds(position);
		// bounds.min.add2(-1);
		// bounds.max.add2( 1);


		let hitboxCollision = false;
		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let node = grid.grid[grid.pair(new vec(x, y))];
				if (node) {
					for (let body of node) {
						if (body.containsPoint(position)) {
							hitboxCollision = true;
							break;
						}
					}
				}
			}
			if (hitboxCollision) {
				break;
			}
		}
		return hitboxCollision;
	}
	getNext() {
		let last = this.path[this.path.length - 1];
		const angleDiff = Common.angleDiff;
		let { position: lastPos, dir: lastDir } = last;

		let pos;

		let n = 0;
		do {
			let nextDist = Math.random() * 1200 + 500;
			let nextAngle = ((Math.random() * 0.3 + 0.15 + n*0.015) * Math.sign(Math.random() - 0.5)) * Math.PI + lastDir.angle;
			pos = new vec(nextDist * Math.cos(nextAngle), nextDist * Math.sin(nextAngle)).add(lastPos);

			n++;
		} while (this.pointCollides(pos) && n < 60);

		if (!this.pointCollides(pos)) {
			let angleOffset = angleDiff(pos.sub(lastPos).angle, lastDir.angle);
			angleOffset = (Math.random() * 0.3 + 0.3) * Math.abs(angleOffset) ** 0.7 * Math.sign(angleOffset) * 1.5;
			let angle = pos.sub(lastPos).angle + angleOffset;
			// let angle = this.dirAngle + angleOffset;
			// this.dirAngle += Math.random() * 0.05 * Math.sign(Math.random() - 0.5);
			// angle -= angleDiff(angle, this.dirAngle) * 0.3;
			let dir = new vec(Math.cos(angle), Math.sin(angle));
	
			
			let pt = new PathPt(pos, dir);
			
			this.path.push(pt);
	
			if (this.path.length >= 3) { // create curves for new points
				this.getCPts(this.path[this.path.length - 2], last, pt);
			}
			if (this.path.length >= 3) { // create hitbox for new points
				let roadHitboxes = generateRoadHitbox(this.path.slice(this.path.length - 3, this.path.length - 1), this.roadWidth);
				let hitboxes = generateHitboxBasic(this.path.slice(this.path.length - 3, this.path.length - 1), this.roadWidth + 4000);

				for (let hitbox of hitboxes) {
					this.hitboxGrid.addBody(hitbox);
				}

				this.hitboxes.push([...hitboxes]);
				this.roadHitboxes.push([...roadHitboxes]);
			}
		}

		if (this.path.length > this.maxLength) {
			this.removeLast();
		}
	}
	removeLast() {
		let hitboxes = this.hitboxes.shift();
		let roadHitboxes = this.roadHitboxes.shift();

		if (hitboxes) {
			for (let obj of hitboxes) {
				if (!obj.removed) obj.delete();
				this.hitboxGrid.removeBody(obj);
			}
		}
		if (roadHitboxes) {
			for (let obj of roadHitboxes) {
				if (!obj.removed) obj.delete();
				SurfaceGrid.removeBody(obj);
			}
		}

		this.path.shift();
	}
	delete() {
		for (let i = 0; i < this.path.length; i++) {
			this.removeLast();
		}
	}
}

// new Path(new vec(200, 10), new vec(0.7071, 0.7071));



baseFov = 3000;
// Render.showVertices = true;
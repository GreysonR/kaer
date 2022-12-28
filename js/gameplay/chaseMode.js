"use strict";
var policeSpawnPoints = new Grid(2000);

function renderJobArrows() {
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
		let dist = diff.length;
		if (dist > 600) {
			let angle = diff.angle - Math.PI/2;
			let scale = Math.min(1, Math.max(0.5, (1500 / dist) ** 0.6)) * 0.7
			let vertices = [{"x":19,"y":0},{"x":37,"y":37},{"x":19,"y":32},{"x":0,"y":37}];
			vertices = vertices.map(v => new vec(v).sub2({ x: 37/2, y: 27/2 }).mult2(scale).add2({ x: 0, y: -150}).rotate2(angle).add(car.position));
	
			ctx.beginPath();
			Render.roundedPolygon(vertices, 5);
			ctx.fillStyle = "#5DCEFF";
			ctx.fill();
		}
	}
}


let lastEnemySpawn = -25000;
function spawnEnemies() {
	if (modeName !== "chase") return;
	if (curMap.jobsStarted === 0) return;

	let now = Performance.aliveTime;
	let percentComplete = curMap.jobsCompleted / Math.max(1, curMap.jobStarts.length);
	let spawnTime = (1 - percentComplete) * 15000 + 6000;
	let maxAlive = Math.floor(percentComplete * 5) + 1;

	if (now - lastEnemySpawn < spawnTime) return;
	if (Enemy.all.length >= maxAlive) return;

	/*/* */

	let bounds = policeSpawnPoints.getBounds({
		bounds: {
			min: car.position.sub(1500),
			max: car.position.add(1500),
		}
	});
	
	let spawns = [];
	for (let x = bounds.min.x; x <= bounds.max.x; x++) {
		for (let y = bounds.min.y; y <= bounds.max.y; y++) {
			let n = policeSpawnPoints.pair(new vec(x, y));
			let node = policeSpawnPoints.grid[n];
			if (!node || node.size === 0) continue;

			for (let s of node) {
				if (car.position.sub(s).length > 800) {
					spawns.push(s);
				}
			}
		}
	}

	if (spawns.length > 0) {
		let pos = spawns.choose();
		let obj = Enemy(pos);
		obj.setAngle(pos.sub(car.position).angle + Math.PI);
	}
	else {
		let timescale = 144 / Performance.fps;
		let timescaleSqrt = Math.sqrt(timescale);
	
		let carDir = new vec(Math.cos(car.angle), Math.sin(car.angle));
		let velDotCar = car.velocity.normalize().dot(carDir) * timescaleSqrt;
		let velDCS = velDotCar < 0 ? -1 : 1;
	
		lastEnemySpawn = now;
		let angleRange = Math.min(Math.PI*2, 4 / Math.pow(car.velocity.length, 0.3));
		let dist = (Math.random() * 500 + 800) * velDCS;
		let angle = Common.angleDiff(Math.random() * angleRange, angleRange / 2) + car.angle + Math.PI;
		let pos = new vec(Math.cos(angle) * dist, Math.sin(angle) * dist).add2(car.position);
	
		let obj = Enemy(pos);
		obj.setAngle(pos.sub(car.position).angle + Math.PI);
	}
}
"use strict";

// - Drivers
class Driver {
	static all = [];
	constructor({ skill, variation, name, car }) {
		this.name = name;
		this.car = car;
		this.skill = skill;
		this.variation = variation;
		Driver.all.push(this);
	}
}
function createDrivers() {
	let random = createSeededRandom(69);
	for (let i = 0; i < 9; i++) {
		let name = driverNames[Math.floor(random() * driverNames.length)];
		let skill = Math.floor(random() / 0.001) * 0.001;
		let variation = random() * 0.3;
		let car = Car.types[Math.floor(Car.types.length * random())];

		new Driver({
			name: name,
			car: car,
			skill: skill,
			variation: variation,
		});
	}

	Driver.all.sort((a, b) => a.skill - b.skill);
	for (let i = 0; i < Driver.all.length; i++) {
		// Driver.all[i].skill = (1 - (1 - Math.round(i / Driver.all.length / 0.001) * 0.001)) ** 3 * 0.9;
		Driver.all[i].skill = Math.round(i / Driver.all.length / 0.001) * 0.001;
	}
}
createDrivers();


// - Generate track times based on track length/curves and car
function getTrackTime(track, car) {
	/*
	- Reference track times:
	  ~ rally1S1: [23, 45],
	  ~ rally1S2: [20, 41],
	  ~ rally1S3: [21, 43],
	  ~ rally1S4: [27, 58],
	*/
	// v_max = sqrt(mu_track * r_corner * g)
	if (typeof car === "string") car = Car.all[car];
	if (track.env) track = track.env.road;
	track = track.map(v => new Bezier(v));
	let grip = car.tireGrip * Materials.road.tireGrip;
	let { maxSpeed } = car;
	let angleDiff = Common.angleDiff;
	let time = 0;

	for (let i = 0; i < track.length; i++) {
		let bezier = track[i];
		let lastPt = bezier.getAtT(0);
		let lastDir = bezier.getDxAtT(0);
		let len = 0;
		let dt = 0.01;

		for (let t = dt; t <= 1; t += dt) {
			let pt = bezier.getAtT(t);
			let dir = bezier.getDxAtT(t);

			len += pt.sub(lastPt).length ** 0.8 * 1.8;
			len += Math.abs(angleDiff(dir.angle, lastDir.angle) / grip) ** 1.13 * 4900;
			// console.log(pt.sub(lastPt).length, angleDiff(dir.angle, lastDir.angle) / grip * 2000)

			lastPt = pt;
			lastDir = dir;
		}
		len += bezier.getAtT(1).sub(lastPt).length;
		time += len / maxSpeed * dt * 1;
	}
	return Math.round(time * 1000 / 0.001) * 0.001;
}
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
	for (let i = 0; i < 4; i++) {
		let name = driverNames[Math.floor(random() * driverNames.length)];
		let skill = Math.floor(random() / 0.001) * 0.001;
		let variation = random() * 0.1 + 0.06;
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
		Driver.all[i].skill = (1 - (1 - Math.round(i / Driver.all.length / 0.001) * 0.001) ** 2) * 0.92;
		// Driver.all[i].skill = Math.round(i / Driver.all.length / 0.001) * 0.001;
	}
}
createDrivers();


// - Generate track times based on track length/curves and car
function getTrackTime(track, car) {
	/*
	- Reference track times:
	  ~ rally1S1: 23,
	  ~ rally1S2: 20,
	  ~ rally1S3: 21,
	  ~ rally1S4: 27,
	*/
	if (typeof car === "string") car = Car.all[car];

	let grip = car.tireGrip * Materials.road.tireGrip;
	let { maxSpeed } = car;
	let angleDiff = Common.angleDiff;
	let time = 0;
	let { road, dirt } = track;
	road = road.map(v => new Bezier(v));

	for (let i = 0; i < road.length; i++) {
		let bezier = road[i];
		let lastPt = bezier.getAtT(0);
		let lastDir = bezier.getDxAtT(0);
		let len = 0;
		let dt = 0.01;

		for (let t = dt; t <= 1; t += dt) {
			let pt = bezier.getAtT(t);
			let dir = bezier.getDxAtT(t);

			len += pt.sub(lastPt).length ** 0.8 * 1.8; // straight length
			len += Math.abs(angleDiff(dir.angle, lastDir.angle) / grip) ** 1.13 * 4400; // turn
			// console.log(pt.sub(lastPt).length, angleDiff(dir.angle, lastDir.angle) / grip * 2000)
			
			lastPt = pt;
			lastDir = dir;
		}
		len += bezier.getAtT(1).sub(lastPt).length ** 0.8 * 1.8;
		time += len / maxSpeed * dt * 1;
	}

	if (dirt) {
		for (let section of dirt) {
			section = section.map(v => new Bezier(v));
			for (let i = 0; i < section.length; i++) {
				let bezier = section[i];
				let lastPt = bezier.getAtT(0);
				let len = 0;
				let dt = 0.01;
		
				for (let t = dt; t <= 1; t += dt) {
					let pt = bezier.getAtT(t);
					len += pt.sub(lastPt).length ** 0.8; // straight length
					lastPt = pt;
				}	
				len += bezier.getAtT(1).sub(lastPt).length ** 0.8;
				time += len / maxSpeed * dt * 0.09;
			}
		}
	}
	return Math.round(time * 1000 / 0.001) * 0.001;
}
function getTrackLength(track) {
	if (track.road) track = track.road;
	track = track.map(v => new Bezier(v));

	let length = 0;
	for (let i = 0; i < track.length; i++) {
		let bezier = track[i];
		let lastPt = bezier.getAtT(0);
		let dt = 0.01;

		for (let t = dt; t <= 1; t += dt) {
			let pt = bezier.getAtT(t);
			length += pt.sub(lastPt).length;
			lastPt = pt;
		}
		length += bezier.getAtT(1).sub(lastPt).length;
	}
	return length;
}

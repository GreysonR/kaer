"use strict";

let SurfaceGrid = new Grid();

let Materials = {
	road: {
		tireGrip: 1,
		slidingGrip: 1,
		slide: 1,
		turnSpeed: 1,
		acceleration: 1,
		maxSpeed: 1,
		maxReverseSpeed: 1,
		power: 1,
		hasTireSmoke: true,
	},
	dirt: {
		tireGrip: 0.6,
		slidingGrip: 0.6,
		slide: 1.3,
		turnSpeed: 1,
		acceleration: 1,
		maxSpeed: 1,
		maxReverseSpeed: 1,
		power: 1.7,
		hasTireSmoke: false,
	},
	grass: {
		tireGrip: 0.75,
		slidingGrip: 0.6,
		slide: 3,
		turnSpeed: 0.9,
		acceleration: 0.6,
		maxSpeed: 1,
		maxReverseSpeed: 1,
		power: 1,
		hasTireSmoke: false,
	},
}
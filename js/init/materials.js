"use strict";

let SurfaceGrid = new Grid();

let Materials = {
	road: {
		tireGrip: 1,
		slide: 1,
		turnSpeed: 1,
		acceleration: 1,
		maxSpeed: 1,
		maxReverseSpeed: 1,
		driftAcceleration: 1,
		hasTireSmoke: true,
	},
	dirt: {
		tireGrip: 0.5,
		slide: 1.3,
		turnSpeed: 1,
		acceleration: 0.8,
		maxSpeed: 1,
		maxReverseSpeed: 1,
		driftAcceleration: 1.5,
		hasTireSmoke: false,
	},
	grass: {
		tireGrip: 0.7,
		slide: 3,
		turnSpeed: 0.9,
		acceleration: 0.65,
		maxSpeed: 1,
		maxReverseSpeed: 1,
		driftAcceleration: 1,
		hasTireSmoke: false,
	},
}
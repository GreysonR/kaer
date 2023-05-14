"use strict";

class Car {
	static types = [];
	static all = {};
	constructor(options = {}) {
		ter.Common.merge(this, options);
		Car.types.push(this.name);
		Car.all[this.name] = this;
	}
	
	name = "";

	// rotation point settings
	rotationBounds = [-40, 0];
	rotationSensitivity = 0.2;
	rotationPoint = { x: -40, y: 0 };

	// car basic stats
	maxSpeed = 21; // [0, Infinity]
	maxReverseSpeed = 12; // [0, Infinity]
	acceleration = 2; // [0, Infinity]
	turnSpeed = 3.6; // [0, Infinity]

	// drifting / sliding
	tireGrip = 6; // [0.0001, Infinity] grip for car to before it's sliding
	slidingGrip = 6; // [0.0001, tireGrip] grip for car while it's sliding
	slide = 0.05; // [0, 1] 1 = keeps rotating a lot after sliding, 0 = doesn't keep rotating much after sliding, values between 0 - 0.2 recommended
	power = 0.3; // [-1, 1] min amount of acceleration kept when drifting

	// render options
	sprite = "cars/Ford Escort Mk2.png";
}

new Car({
	name: "Ford Escort Mk2",
	sprite: "cars/Ford Escort Mk2.png",

	rotationBounds: [-40, 0],
	rotationSensitivity: 0.2,
	rotationPoint: { x: -40, y: 0 },

	// car basic stats
	maxSpeed: 21, // [0, Infinity]
	maxReverseSpeed: 12, // [0, Infinity]
	acceleration: 2, // [0, Infinity]
	turnSpeed: 3.6, // [0, Infinity]

	// drifting / sliding
	tireGrip: 6, // [0.0001, Infinity] grip for car to before it's sliding
	slidingGrip: 6, // [0.0001, tireGrip] grip for car while it's sliding
	slide: 0.05, // [0, 1] 1 = keeps rotating a lot after sliding, 0 = doesn't keep rotating much after sliding, values between 0 - 0.2 recommended
	power: 0.3, // [-1, 1] min amount of acceleration kept when drifting
});
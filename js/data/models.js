"use strict";

class Model {
	static types = [];
	static all = {};
	constructor(options = {}) {
		ter.Common.merge(this, options);
		Model.types.push(this.model);
		Model.all[this.model] = this;

		this.getBody = function() {
			return Bodies.rectangle(this.body.width, this.body.height, new vec(0, 0), this.body);
		}
	}
	
	car = {
		model: "",

		// basic stats
		maxSpeed: 21, // [0, Infinity]
		maxReverseSpeed: 12, // [0, Infinity]
		acceleration: 2, // [0, Infinity]
		reverseAcceleration: 0.4, // [0, Infinity]
		turnSpeed: 3.6, // [0, Infinity]
	
		// drifting / sliding
		tireGrip: 6, // [0.0001, Infinity] grip for car to before it's sliding
		slidingGrip: 6, // [0.0001, tireGrip] grip for car while it's sliding
		slide: 0.05, // [0, 1] 1 = keeps rotating a lot after sliding, 0 = doesn't keep rotating much after sliding, values between 0 - 0.2 recommended
		power: 0.3, // [-1, 1] min amount of acceleration kept when sliding

		// rotation point settings
		rotationBounds: [-40, 0],
		rotationSensitivity: 0.2,
		
		// health
		maxHealth:	12,
		health:	12,
		ramDamage: 6,
	};
	body = {
		friction: 0.05,
		restitution: 0.1,
		mass: 3,
	};
}

var Models = {
	"Ford Escort Mk2": new Model({
		model: "Ford Escort Mk2",
		car: {
			// basic stats
			maxSpeed: 21,
			maxReverseSpeed: 12,
			acceleration: 2,
			reverseAcceleration: 0.4,
			turnSpeed: 3.6,

			// drifting / sliding
			tireGrip: 6,
			slidingGrip: 6,
			slide: 0.05,
			power: 0.3,

			// rotation point settings
			rotationBounds: [-40, 0],
			rotationSensitivity: 0.2,

			// health
			maxHealth:	12,
			health:	12,
			ramDamage: 6,
		},
		body: {
			width: 240*0.53,
			height: 127*0.42,
			mass: 2,
			render: {
				sprite: "cars/Ford Escort Mk2.png",
				spriteScale: new vec(1, 1.25),
			}
		},
	}),
	"Police Basic": new Model({
		model: "Police Basic",
		car: {
			// basic stats
			maxSpeed: 21,
			maxReverseSpeed: 12,
			acceleration: 2,
			reverseAcceleration: 0.4,
			turnSpeed: 3.6,

			// drifting / sliding
			tireGrip: 6,
			slidingGrip: 6,
			slide: 0.05,
			power: 0.3,

			// rotation point settings
			rotationBounds: [-40, 0],
			rotationSensitivity: 0.2,

			// health
			maxHealth:	12,
			health:	12,
			ramDamage: 6,
		},
		body: {
			width: 90*1.5,
			height: 47*1.5 / 1.25,
			mass: 2,
			render: {
				sprite: "cars/policeCar.png",
				spriteScale: new vec(1, 1.25),
			}
		},
	}),
};

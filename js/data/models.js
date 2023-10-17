"use strict";

class Model {
	constructor(options = {}) {
		ter.Common.merge(this, options);
		this.getBody = function() {
			return Bodies.rectangle(this.body.width, this.body.height, new vec(0, 0), this.body);
		}
	}
	
	model = "";
	car = {
		// basic stats
		maxSpeed: 21, // [0, Infinity]
		maxReverseSpeed: 12, // [0, Infinity]
		acceleration: 2, // [0, Infinity]
		reverseAcceleration: 0.4, // [0, Infinity]
		turnSpeed: 3.6, // [0, Infinity]
	
		// drifting / sliding
		tireGrip: 6, // (0, Infinity] grip for car while not sliding
		slidingGrip: 6, // (0, tireGrip] grip for car while sliding
		steeringWeight: 0.05, // [0, 1] 1 = keeps rotating a lot after sliding, 0 = doesn't keep rotating much after sliding
		power: 0.3, // [-1, 1] min amount of acceleration kept when sliding

		// rotation point settings
		rotationBounds: [-40, 0],
		rotationSensitivity: 0.2,
		
		// health
		maxHealth:	12,
		health:	12,
		ramDamage: 6,
		damageCooldown: 500,
	};
	body = {
		friction: 0.05,
		restitution: 0.1,
		mass: 3,
		render: {
			layer: 1,
		},
	};
}

var Models = {
	"car1": new Model({
		model: "car1",
		car: {
			// basic stats
			maxSpeed: 17,
			maxReverseSpeed: 7,
			acceleration: 1.6,
			reverseAcceleration: 0.3,
			turnSpeed: 3.4,

			// drifting / sliding
			tireGrip:    3.9,
			slidingGrip: 3.9,
			steeringWeight: 0.02,
			power: 0.2,

			// rotation point settings
			rotationBounds: [-40, 0],
			rotationSensitivity: 0.2,

			// health
			maxHealth:	50,
			health:	    50,
			ramDamage: 6,
			damageCooldown: 200,
		},
		body: {
			width: 110,
			height: 55,
			mass: 2,
			render: {
				sprite: "cars/car1.png",
				spriteScale: new vec(1, 1),
			}
		},
	}),
	"Police Basic": new Model({
		model: "Police Basic",
		gun: "pistol",
		car: {
			// basic stats
			maxSpeed: 16,
			maxReverseSpeed: 8,
			acceleration: 1.7,
			reverseAcceleration: 0.3,
			turnSpeed: 3.4,

			// drifting / sliding
			tireGrip:    4.3,
			slidingGrip: 4.3,
			steeringWeight: 0.02,
			power: 0.3,

			// rotation point settings
			rotationBounds: [-40, 0],
			rotationSensitivity: 0.2,

			// health
			maxHealth:	50,
			health:	    50,
			ramDamage: 2,
			damageCooldown: 0,
		},
		body: {
			width: 118,
			height: 55,
			mass: 2,
			render: {
				sprite: "cars/policeCar.png",
				spriteScale: new vec(1, 1),
			}
		},
	}),
};

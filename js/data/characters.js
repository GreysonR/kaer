"use strict";

class CharacterModel {
	constructor(options = {}) {
		ter.Common.merge(this, options);
		this.getBody = function() {
			return Bodies.rectangle(this.body.width, this.body.height, new vec(0, 0), this.body);
		}
	}
	
	model = "";
	stats = {
		// health
		maxHealth:	12,
		health:	12,
		damageCooldown: 500,
	};
	body = {
		removed: true,
		round: 10,
		roundQuality: 20,
		friction: 0.05,
		restitution: 0.1,
		mass: 3,
		render: {
			layer: 1,
		},
	};
}

var CharacterModels = {
	"GroundBasic": new CharacterModel({
		model: "GroundBasic",
		gun: "pistol2",
		value: 20,
		stats: {
			// health
			maxHealth:	12,
			health:	    12,
			damageCooldown: 100,
			speed: 5,
		},
		body: {
			width:  50,
			height: 50,
			mass: 1,
			render: {
				sprite: "characters/GroundBasic.png",
				spriteScale: new vec(1, 1),
			},
			collisionFilter: {
				category: "1"
			},
		},
	}),
};
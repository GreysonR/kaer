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
		frictionAir: 0.9,
		restitution: 0.1,
		mass: 3,
		render: {
			layer: 1,
		},
	};
}

var CharacterModels = {
	"Player": new CharacterModel({
		model: "Player",
		stats: {
			// health
			maxHealth:	60,
			health:	    60,
			damageCooldown: 500,
			speed: 25, // 8.5
		},
		body: {
			width:  50,
			height: 50,
			mass: 1,
			render: {
				sprite: "characters/Player.png",
				spriteScale: new vec(1, 1),
			},
			collisionFilter: {
				category: "1"
			},
		},
	}),
	"GroundBasic": new CharacterModel({
		model: "GroundBasic",
		gun: "pistol2",
		value: 20,
		stats: {
			// health
			maxHealth:	10,
			health:	    10,
			damageCooldown: 100,
			speed: 15,
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
	"KingBoss": new CharacterModel({
		model: "KingBoss",
		value: 500,
		stats: {
			// health
			maxHealth:	400,
			health:	    400,
			damageCooldown: 100,
			speed: 6,
		},
		body: {
			width:  92,
			height: 92,
			mass: 500,
			frictionAngular: 1,
			render: {
				layer: 2,
				sprite: "characters/KingBoss.png",
				spriteScale: new vec(2.15, 1.63),
			},
			collisionFilter: {
				category: "1"
			},
		},
	}),
};

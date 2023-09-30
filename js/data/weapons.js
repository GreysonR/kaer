"use strict";

class Weapon {
	constructor(options = {}) {
		ter.Common.merge(this, options);
	}

	damage = 10; // damage per shot
	fireRate = 500; // time between shots in ms
	bulletSpeed = 10; // bullet speed
	range = 1000; // max distance bullet travels
	trailLength = 600;
	
	magazineSize = 6; // number of bullets before reload
	reloadTime = 600; // reload time in ms
}

var Weapons = {
	"pistol": new Weapon({
		damage: 8,
		fireRate: 100,
		bulletSpeed: 30, // 70
		range: 1000,
		
		magazineSize: 10,
		reloadTime: 600,
	}),
}

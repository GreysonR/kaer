"use strict";

class Weapon {
	constructor(options = {}) {
		ter.Common.merge(this, options);
	}

	damage = 10; // damage per shot
	fireRate = 100; // time between shots in ms
	bulletSpeed = 30; // bullet speed
	range = 1000; // max distance bullet travels
	trailLength = 600;
	
	magazineSize = 6; // number of bullets before reload
	reloadTime = 600; // reload time in ms
	singleFire = false; // whether you have to click every time to shoot or just hold the button
}

var Weapons = {
	"pistol": new Weapon({
		damage: 10,
		fireRate: 200,
		bulletSpeed: 30,
		range: 1000,
		
		magazineSize: 10,
		reloadTime: 600,
		singleFire: false,
	}),
}

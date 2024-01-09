"use strict";

class Weapon {
	constructor(options = {}) {
		ter.Common.merge(this, options);
	}

	damage = 10; // damage per shot
	fireRate = 100; // time between shots in ms
	bulletSpeed = 30; // bullet speed
	range = 1000; // max distance bullet travels
	kick = 0.3; // how much firing the weapon pushes you back
	trailLength = 600;
	
	magazineSize = Infinity; // number of bullets before reload
	reloadTime = 600; // reload time in ms
	singleFire = false; // whether you have to click every time to shoot or just hold the button
}

var Weapons = {
	"playerGun": new Weapon({
		damage: 6,
		fireRate: 300,
		bulletSpeed: 30,
		range: 1000,
	}),
	"pistol": new Weapon({
		damage: 3,
		fireRate: 700,
		bulletSpeed: 26,
		range: 1000,
	}),
	"pistol2": new Weapon({
		damage: 2,
		fireRate: 900,
		bulletSpeed: 17,
		range: 900,
	}),
}

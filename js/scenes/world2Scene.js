"use strict";
let world2Scene = (function createWorld2Scene() {
	let scene = createMap(world2Data);

	// floor + outer walls
	let sceneWidth =  10000;
	let sceneHeight = 10000;
	let floor = Bodies.rectangle(sceneWidth, sceneHeight, new vec(sceneWidth/2, sceneHeight/2), {
		isStatic: true,
		hasCollisions: false,
		removed: true,
		render: {
			sprite: "world2/floor.svg",
			useBuffer: true,
			layer: -4,
		}
	});
	scene.addBody(floor);
	
	let walls = Bodies.rectangle(sceneWidth, sceneHeight, new vec(sceneWidth/2, sceneHeight/2), {
		isStatic: true,
		hasCollisions: false,
		removed: true,
		render: {
			sprite: "world2/walls.svg",
			useBuffer: true,
			layer: 10,
		}
	});
	scene.addBody(walls);
	
	
	scene.on("beforeAdd", function spawnCar() {
		// put player at spawn
		if (scene.spawn) {
			player.body.setPosition(new vec(scene.spawn.position));
			player.body.setAngle(scene.spawn.angle);
			lastFov.length = 0;
			lastPos.length = 0;
		}

		// reset orders
		scene.completedOrders = 0;

		// reset run
		run.reset();
		
		// add temp to inventory
		for (let type of Object.keys(run.inventory)) {
			run.inventory[type] = 4;
		}
		
		// create enemy
		let police = window.police = new Enemy("Police Basic");
		police.body.setPosition(new vec(2100, 5000));
		police.body.setAngle(-Math.PI/2);
	});

	return scene;
})();

world2Scene.add();

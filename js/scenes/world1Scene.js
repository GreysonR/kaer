"use strict";
let world1Scene = (function createWorld1Scene() {
	let scene = new Scene();

	// floor + outer walls
	let sceneWidth =  20000;
	let sceneHeight = 20000;
	let floor = Bodies.rectangle(sceneWidth, sceneHeight, new vec(sceneWidth/2, sceneHeight/2), {
		isStatic: true,
		hasCollisions: false,
		removed: true,
		render: {
			sprite: "world1/floor.svg",
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
			sprite: "world1/walls.svg",
			useBuffer: true,
			layer: 10,
		}
	});
	scene.addBody(walls);

	let objectsScene = createMap(world1Data);
	scene.addBody(objectsScene);
	
	
	scene.on("beforeAdd", function spawnCar() {
		if (objectsScene.spawn) {
			player.body.setPosition(new vec(objectsScene.spawn.position));
			player.body.setAngle(objectsScene.spawn.angle);
			lastFov.length = 0;
			lastPos.length = 0;
		}

		let police = window.police = new EnemyCar("PoliceBasic");
		police.body.setPosition(new vec(8650, 14200));
		// police.renderTarget()
	});

	return scene;
})();

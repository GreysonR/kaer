"use strict";
let world0Scene = (function createWorld0Scene() {
	let scene = new Scene();

	// floor + outer walls
	let sceneWidth =  10000;
	let sceneHeight = 10000;
	let floor = Bodies.rectangle(sceneWidth, sceneHeight, new vec(sceneWidth/2, sceneHeight/2), {
		isStatic: true,
		hasCollisions: false,
		removed: true,
		render: {
			sprite: "world0/floor.svg",
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
			sprite: "world0/walls.svg",
			useBuffer: true,
			layer: 10,
		}
	});
	scene.addBody(walls);

	let objectsScene = createMap(world0Data);
	scene.addBody(objectsScene);
	
	
	scene.on("beforeAdd", function spawnCar() {
		if (objectsScene.spawn) {
			player.body.setPosition(new vec(objectsScene.spawn.position));
			player.body.setAngle(objectsScene.spawn.angle);
			lastFov.length = 0;
			lastPos.length = 0;
		}
	});

	return scene;
})();

world0Scene.add();

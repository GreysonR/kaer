"use strict";
let world2Scene = (function createWorld2Scene() {
	let scene = createMap(world2Data);

	// floor + outer walls
	let sceneWidth =  12857;
	let sceneHeight = 11078;
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

	return scene;
})();
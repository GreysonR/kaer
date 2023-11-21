"use strict";
let world2Scene = (function createWorld2Scene() {
	let scene = createMap(world2Data);
	scene.setCompletedOrders = function(value) {
		scene.completedOrders = value;
		document.getElementById("ordersAmount").innerHTML = Math.max(0, scene.requiredOrders - value);
	}

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

	function finishLevel() {
		for (let body of scene.exitBlocks) {
			body.delete();
		}
	}
	
	
	scene.on("beforeAdd", function spawnCar() {
		// put player at spawn
		if (scene.spawn) {
			player.body.setPosition(new vec(scene.spawn.position));
			player.body.setAngle(scene.spawn.angle);
			lastFov.length = 0;
			lastPos.length = 0;
		}

		// reset orders
		scene.setCompletedOrders(0);

		// add event listeners
		window.addEventListener("levelFinish", finishLevel);
		
		// create enemy
		let police = window.police = new Enemy("Police Basic");
		police.body.setPosition(new vec(3141, 5210));
		police.body.setAngle(-Math.PI/2);
	});

	scene.on("beforeDelete", () => {
		window.removeEventListener("levelFinish", finishLevel);
		for (let enemy of Enemy.all) {
			enemy.delete();
		}
	});

	return scene;
})();
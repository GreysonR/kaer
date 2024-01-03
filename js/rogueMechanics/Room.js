"use strict";

class Room extends Scene {
	constructor({ name, position, width, height }) {
		super();
		this.data = mapData[name];
		this.position = new vec(position);
		this.name = name;


		this.width = width;
		this.height = height;
		
		this.exitBlocks = [];

		this.loadScene();

		// let sceneWidth =  12857;
		// let sceneHeight = 11078;
	}
	loadScene() {
		let mapData = this.data;
		let scene = this;

		// scene progress
		function finishLevel() {
			window.removeEventListener("levelFinish", finishLevel);
			for (let body of scene.exitBlocks) {
				body.delete();
			}
		}
		
		// scene events
		this.on("beforeAdd", () => {
			// spawn player
			if (this.spawn) {
				player.body.setPosition(new vec(this.spawn.position));
				player.body.setAngle(this.spawn.angle);
				gameCamera.lastFov.length = 0;
				gameCamera.lastPosition.length = 0;
			}

			// start wave
			this.waves.add();

			// add event listeners
			window.addEventListener("levelFinish", finishLevel);
		});
		this.on("beforeDelete", () => {
			// remove enemies
			scene.waves.delete();
		});
		
		// load bodies from data
		for (let typeName of Object.keys(mapData)) {
			if (typeName === "orderCount") continue;
			let objFunc = MapBodies[typeName]; // creator function of for this object type
			if (!objFunc) {
				console.warn("no map function for type " + typeName);
				continue;
			}
			let types = mapData[typeName]; // array of options for objects of this type

			for (let options of types) {
				if (options.position) {
					options.position.x += scene.position.x;
					options.position.y += scene.position.y;
				}
				else if (options.x != undefined && options.y != undefined) {
					options.x += scene.position.x;
					options.y += scene.position.y;
				}

				let obj = objFunc(options, scene);
				if (obj) {
					obj.delete();
					scene.addBody(obj);
				}
				if (options.blocksExit) {
					scene.exitBlocks.push(obj);
				}
			}
		}
		
		// floor + outer walls images
		let floor = Bodies.rectangle(this.width, this.height, new vec(this.width/2, this.height/2).add(this.position), {
			isStatic: true,
			hasCollisions: false,
			removed: true,
			render: {
				sprite: `${this.name}/floor.svg`,
				useBuffer: true,
				layer: -4,
			}
		});
		this.addBody(floor);
		let walls = Bodies.rectangle(this.width, this.height, new vec(this.width/2, this.height/2).add(this.position), {
			isStatic: true,
			hasCollisions: false,
			removed: true,
			render: {
				sprite: `${this.name}/walls.svg`,
				useBuffer: true,
				layer: 10,
			}
		});
		this.addBody(walls);

		// create waves
		this.waves = new Waves(this.waves, this);
		this.waves.on("complete", finishLevel);
	}
	data;
	waves = [];
	bodies = [];
	doors = [];

	add() {
		super.add();
	}
	delete() {
		super.delete();
	}
}
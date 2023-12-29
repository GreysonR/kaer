"use strict";

var MapBodies = {
	wall: function({ x, y, position, vertices }) {
		for (let i = 0; i < vertices.length; i++) {
			vertices[i] = new vec(vertices[i]);
		}
		if (position) {
			x = position.x;
			y = position.y;
		}
		let obj = Bodies.fromVertices(vertices, new vec(x, y), {
			isStatic: true,
			hasCollisions: true,
			restitution: 0,
			render: {
				visible: false,
				background: "#ffffff",
				round: 0,
			}
		});
		return obj;
	},
	spawn: function({ x, y, angle }, scene) {
		scene.spawn = {
			position: new vec(x, y),
			angle: angle,
		}
	},
	"PoliceBasic": function({ x, y, angle, wave }, scene) {
		if (!scene.waves[wave]) scene.waves[wave] = [];
		scene.waves[wave].push({
			type: "PoliceBasic",
			position: new vec(x, y),
			angle: angle,
		});
	},
	road: function({ x, y, position, vertices }) {
		for (let i = 0; i < vertices.length; i++) {
			vertices[i] = new vec(vertices[i]);
		}
		if (position) {
			x = position.x;
			y = position.y;
		}
		let obj = Bodies.fromVertices(vertices, new vec(x, y), {
			material: "road",
			hasCollisions: false,
			isStatic: true,
			removed: true,

			render: {
				visible: false,
				// background: "#42515560",
				background: "transparent",
				layer: -1,
			}
		});
		obj.on("add", () => {
			SurfaceGrid.addBody(obj);
		});
		obj.on("delete", () => {
			SurfaceGrid.removeBody(obj);
		});

		return obj;
	},
	circle: function(x, y, width, height, name, positions, radius = 26, layer = 7, dir = "nature") {
		var scene = new Scene();
		let img = Bodies.rectangle(width, height, new vec(x + width/2, y + height/2), {
			isStatic: true,
			hasCollisions: false,
			removed: true,
			render: {
				visible: true,
				layer: layer,
				sprite: `${dir}/${name}.png`,
			}
		});
		scene.addBody(img);

		let hitboxOptions = {
			numSides: 6,
			isStatic: true,
			hasCollisions: true,
			removed: true,
			render: {
				visible: false,
			}
		};
		for (let position of positions) {
			scene.addBody(Bodies.circle(radius, new vec(x + position.x, y + position.y), hitboxOptions));
		}
		return scene;
	},
	rectangle: function(x, y, spriteWidth, spriteHeight, rectangles, name, layer = 7, dir = "nature", round = 30) {
		if (!spriteWidth) spriteWidth = width;
		if (!spriteHeight) spriteHeight = height;

		var scene = new Scene();
		let img = Bodies.rectangle(spriteWidth, spriteHeight, new vec(x + spriteWidth/2, y + spriteHeight/2), {
			isStatic: true,
			hasCollisions: false,
			removed: true,
			render: {
				visible: true,
				layer: layer,
				sprite: `${dir}/${name}.png`,
			}
		});
		scene.addBody(img);

		let hitboxOptions = {
			isStatic: true,
			hasCollisions: true,
			removed: true,
			round: round,
			render: {
				visible: false,
			}
		};
		for (let rectangle of rectangles) {
			let { x: bodyX, y: bodyY, width, height } = rectangle;
			scene.addBody(Bodies.rectangle(width, height, new vec(x + bodyX + width/2, y + bodyY + height/2), hitboxOptions));
		}
		return scene;
	},
	genericBody: function(x, y, width, height, name, verticesList, layer = 7, dir = "nature") {
		var scene = new Scene();
		let img = Bodies.rectangle(width, height, new vec(x + width/2, y + height/2), {
			isStatic: true,
			hasCollisions: false,
			removed: true,
			render: {
				visible: true,
				layer: layer,
				sprite: `${dir}/${name}.png`,
			}
		});
		scene.addBody(img);

		let hitboxOptions = {
			isStatic: true,
			hasCollisions: true,
			removed: true,
			render: {
				visible: false,
			}
		};
		for (let vertices of verticesList) {
			vertices = vertices.map(v => new vec(v));
			let position = getCenterOfMass(vertices);
			scene.addBody(Bodies.fromVertices(vertices, new vec(x + position.x, y + position.y), hitboxOptions));
		}
		return scene;
	},
	tree1: function({ x, y }) {
		let width  = 311;
		let height = 326;
		return MapBodies.circle(x, y, width, height, "tree1", [
			new vec(169, 58),
			new vec(52, 178),
			new vec(187, 205),
		]);
	},
	tree2: function({ x, y }) {
		let width  = 328;
		let height = 319;
		return MapBodies.circle(x, y, width, height, "tree2", [
			new vec(69, 69),
			new vec(215, 120),
			new vec(92, 206),
		]);
	},
	tree3: function({ x, y }) {
		let width  = 297;
		let height = 206;
		return MapBodies.circle(x, y, width, height, "tree3", [
			new vec(70, 70),
			new vec(204, 110),
		]);
	},
	tree4: function({ x, y }) {
		let width  = 202;
		let height = 308;
		return MapBodies.circle(x, y, width, height, "tree4", [
			new vec(70, 70),
			new vec(60, 205),
		]);
	},
	tree5: function({ x, y }) {
		let width  = 177;
		let height = 180;
		return MapBodies.circle(x, y, width, height, "tree5", [
			new vec(65, 65),
		]);
	},
	tree6: function({ x, y }) {
		let width  = 168;
		let height = 176;
		return MapBodies.circle(x, y, width, height, "tree6", [
			new vec(60, 60),
		]);
	},
	bush1: function({ x, y }) {
		let width  = 144;
		let height = 120;
		return MapBodies.circle(x, y, width, height, "bush1", [
		], 5);
	},
	stone1: function({ x, y }) {
		let width  = 149;
		let height = 134;
		return MapBodies.genericBody(x, y, width, height, "stone1", [[
			new vec(48, 0),
			new vec(68, 0),

			new vec(112, 48),
			new vec(112, 68),

			new vec(68, 110),
			new vec(48, 110),

			new vec(0, 68),
			new vec(0, 48),
		]], -1);
	},
	stone2: function({ x, y }) {
		let width  = 135;
		let height = 123;
		let scene = MapBodies.genericBody(x, y, width, height, "stone2", [
			[{"x":29,"y":12},{"x":61,"y":2},{"x":101.67,"y":12.73},{"x":110.47,"y":53.76},{"x":100,"y":83},{"x":71.7,"y":108.88},{"x":34.9,"y":99.27},{"x":14,"y":79},{"x":1.98,"y":41}]
		], -1);
		for (let body of scene.bodies) {
			body.blocksExit = true;
		}
		return scene;
	},
	stone3: function({ x, y }) {
		let width  = 132;
		let height = 128;
		let scene = MapBodies.genericBody(x, y, width, height, "stone3", [
			[{"x":3,"y":41},{"x":8,"y":28},{"x":26.16,"y":5.81},{"x":54.27,"y":1.47},{"x":76,"y":6},{"x":103.85,"y":27.89},{"x":103.72,"y":63.05},{"x":96,"y":79},{"x":74.38,"y":98.7},{"x":45.37,"y":98.69},{"x":27,"y":91},{"x":5,"y":70.96}]
		], -1);
		for (let body of scene.bodies) {
			body.blocksExit = true;
		}
		return scene;
	},
	stone4: function({ x, y }) {
		let width  = 106;
		let height = 93;
		let scene = MapBodies.genericBody(x, y, width, height, "stone4", [
			[{"x":31,"y":8},{"x":63,"y":1},{"x":97.14,"y":20.02},{"x":86.26,"y":55.53},{"x":59,"y":74},{"x":28.4,"y":79.77},{"x":4.43,"y":59.45},{"x":5.09,"y":27.21}]
		], -1);
		for (let body of scene.bodies) {
			body.blocksExit = true;
		}
		return scene;
	},
	stone5: function({ x, y }) {
		let width  = 212;
		let height = 208;
		let scene = MapBodies.genericBody(x, y, width, height, "stone5", [
			[{"x":8,"y":71},{"x":31,"y":28},{"x":65.01,"y":2.85},{"x":106,"y":12.45},{"x":149,"y":46},{"x":163.95,"y":65.8},{"x":167.6,"y":90.53},{"x":165,"y":113},{"x":146.91,"y":146.37},{"x":110.18,"y":157.13},{"x":69,"y":153},{"x":56.8,"y":149.93},{"x":35,"y":142},{"x":4.99,"y":112.58}]
		], -1);
		for (let body of scene.bodies) {
			body.blocksExit = true;
		}
		return scene;
	},
	stone6: function({ x, y }) {
		let width  = 262;
		let height = 236;
		let scene = MapBodies.genericBody(x, y, width, height, "stone6", [
			[{"x":13,"y":85},{"x":57,"y":24},{"x":87.97,"y":4.07},{"x":123.99,"y":10.76},{"x":179,"y":45},{"x":202.42,"y":85.24},{"x":182.92,"y":127.31},{"x":118,"y":177},{"x":89.14,"y":187.39},{"x":59.66,"y":178.87},{"x":25,"y":156},{"x":3.72,"y":122.75}]
		], -1);
		for (let body of scene.bodies) {
			body.blocksExit = true;
		}
		return scene;
	},
	stone7: function({ x, y }) {
		let width  = 270;
		let height = 243;
		let scene = MapBodies.genericBody(x, y, width, height, "stone7", [
			[{"x":26,"y":38},{"x":73,"y":9},{"x":118.68,"y":4.53},{"x":185,"y":31},{"x":207.48,"y":49.04},{"x":216.47,"y":76.19},{"x":218,"y":114},{"x":204.84,"y":149.18},{"x":171.43,"y":165.64},{"x":70,"y":173},{"x":37.56,"y":164.76},{"x":17.91,"y":137.98},{"x":5,"y":95},{"x":6.04,"y":63.01}]
		], -1);
		for (let body of scene.bodies) {
			body.blocksExit = true;
		}
		return scene;
	},
	barrel: function({ x, y }) {
		let width  = 86;
		let height = 86;
		return MapBodies.circle(x, y, width, height, "barrel", [
			new vec(35, 35),
		], 37, -1);
	},
	building: function(x, y, angle = 0, width, height, sprite, shadowName) {
		let body = Bodies.rectangle(width, height, new vec(x, y), {
			isStatic: true,
			hasCollisions: true,
			removed: true,
			round: 20,
			render: {
				visible: true,
				layer: 8,
				sprite: `buildings/${sprite}.png`,
			}
		});
		body.setAngle(angle);
		let shadow;

		body.on("add", () => {
			if (shadowName)
				shadow = new Shadow(shadowName, new vec(x, y), width, height, angle);
		});
		body.on("delete", () => {
			if (shadow)
				shadow.delete();
		})


		return body;
	},
	house1: function({ x, y, angle = 0 }) {
		let width  = 400;
		let height = 300;
		return MapBodies.building(x, y, angle, width, height, "house1", "house1");
	},
	house2A: function({ x, y, angle = 0 }) {
		let width  = 600;
		let height = 300;
		return MapBodies.building(x, y, angle, width, height, "house2A", "house2");
	},
	house2B: function({ x, y, angle = 0 }) {
		let width  = 600;
		let height = 300;
		return MapBodies.building(x, y, angle, width, height, "house2B", "house2");
	},
	house3A: function({ x, y, angle = 0 }) {
		let width  = 700;
		let height = 450;
		return MapBodies.building(x, y, angle, width, height, "house3A", "house3");
	},
	house3B: function({ x, y, angle = 0 }) {
		let width  = 700;
		let height = 450;
		return MapBodies.building(x, y, angle, width, height, "house3B", "house3");
	},
	building1: function({ x, y }) {
		let width  = 560;
		let height = 560;
		return MapBodies.rectangle(x, y, 940, 931, [
			{ x: 0, y: 0, width: width, height: height },
		], "building1", 8, "buildings");
	},
	building2: function({ x, y }) {
		let width  = 594;
		let height = 594;
		return MapBodies.rectangle(x, y, 1087, 1067, [
			{ x: 0, y: 0, width: width, height: height },
		], "building2", 8, "buildings", 45);
	},

	LHouseA: function({ x, y }) {
		return MapBodies.rectangle(x, y, 946, 699, [
			{ x: 0, y: 0, width: 300, height: 600 },
			{ x: 0, y: 300, width: 800, height: 300 },
		], "LHouseA", 8, "buildings", 20);
	},
	LHouseB: function({ x, y }) {
		return MapBodies.rectangle(x, y, 950, 703, [
			{ x: 0, y: 0, width: 300, height: 600 },
			{ x: 0, y: 0, width: 800, height: 300 },
		], "LHouseB", 8, "buildings", 20);
	},
	LHouseC: function({ x, y }) {
		return MapBodies.rectangle(x, y, 903, 699, [
			{ x: 500, y: 0, width: 300, height: 600 },
			{ x: 0, y: 300, width: 800, height: 300 },
		], "LHouseC", 8, "buildings", 20);
	},
	LHouseD: function({ x, y }) {
		return MapBodies.rectangle(x, y, 901, 731, [
			{ x: 500, y: 0, width: 300, height: 600 },
			{ x: 0, y: 0, width: 800, height: 300 },
		], "LHouseD", 8, "buildings", 20);
	},
	LHouseE: function({ x, y }) {
		return MapBodies.rectangle(x, y, 697, 926, [
			{ x: 300, y: 0, width: 300, height: 800 },
			{ x: 0, y: 0, width: 600, height: 300 },
		], "LHouseE", 8, "buildings", 20);
	},
	exit: function({ x, y, width, height }) {
		let body = Bodies.rectangle(width, height, new vec(x + width/2, y + height / 2), {
			isStatic: true,
			hasCollisions: true,
			isSensor: true,
			render: {
				visible: false,
				background: "#ffffff30",
			},
			collisionFilter: {
				mask: "1"
			},
		});

		body.on("collisionStart", collision => {
			let otherBody = collision.bodyA === body ? collision.bodyB : collision.bodyA;
			if (otherBody === player.body) { // go to next level
				// transition to next level
				body.delete();
				run.transitionToScene(world2Scene)
			}
		});

		return body;
	},
}

function createMap(mapData) {
	let scene = new Scene();
	scene.exitBlocks = [];
	scene.enemies = [];

	function finishLevel() {
		window.removeEventListener("levelFinish", finishLevel);
		for (let body of scene.exitBlocks) {
			body.delete();
		}
	}
	
	scene.on("beforeAdd", () => {
		// spawn player
		if (scene.spawn) {
			player.body.setPosition(new vec(scene.spawn.position));
			player.body.setAngle(scene.spawn.angle);
			lastFov.length = 0;
			lastPos.length = 0;
		}

		// add enemies
		for (let enemy of scene.enemies) {
			enemy.add();
		}

		// add event listeners
		window.addEventListener("levelFinish", finishLevel);
	});
	scene.on("beforeDelete", () => {
		// remove enemies
		for (let enemy of scene.enemies) {
			enemy.delete();
		}
	});
	
	
	for (let typeName of Object.keys(mapData)) {
		if (typeName === "orderCount") continue;
		let objFunc = MapBodies[typeName]; // creator function of for this object type
		if (!objFunc) {
			console.warn("no map function for type " + typeName);
			continue;
		}
		let types = mapData[typeName]; // array of options for objects of this type

		for (let options of types) {
			let obj = objFunc(options, scene);
			if (obj) {
				obj.delete();
				scene.addBody(obj);

				if (obj.bodies) {
					for (let body of obj.bodies) {
						if (body.blocksExit) {
							scene.exitBlocks.push(obj);
						}
					}
				}
			}
		}
	}

	return scene;
}

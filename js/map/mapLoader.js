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
		// resetCar();
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
}

function createMap(mapData) {
	let scene = new Scene();
	scene.navmesh = new Navmesh(1000);
	
	for (let typeName of Object.keys(mapData)) {
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

				
				function addToNavmesh(body) {
					if (body.hasCollisions && !body.isSensor && body.isStatic) {
						scene.navmesh.addBody(body);
					}
				}
				if (obj.bodies) { // this is a scene
					for (let body of obj.bodies) {
						addToNavmesh(body);
					}
				}
				else {
					addToNavmesh(obj);
				}
				/**/
			}
		}
	}

	return scene;
}

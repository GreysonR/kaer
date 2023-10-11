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

			render: {
				visible: false,
				// background: "#42515560",
				background: "transparent",
				layer: -1,
			}
		});
		obj.delete();
		SurfaceGrid.addBody(obj);

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
	rectangle: function(x, y, width, height, name, layer = 7, dir = "nature") {
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
		scene.addBody(Bodies.rectangle(width, height, new vec(x + width/2, y + height/2), hitboxOptions));
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
	house1: function({ x, y, angle = 0 }) {
		let width  = 400;
		let height = 300;
		
		let body = Bodies.rectangle(width, height, new vec(x + width/2, y + height/2), {
			isStatic: true,
			hasCollisions: true,
			removed: true,
			render: {
				visible: true,
				layer: -1,
				sprite: `buildings/house1.png`,
			}
		});
		body.setAngle(angle);

		return body;
	}
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

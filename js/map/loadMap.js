"use strict";

let mapBodies = {
	env: {
		zone: function({ x, y, width, height, angle }) {
			let obj = Bodies.rectangle(width, height, new vec(x, y), {
				static: true,
				hasCollisions: false,
				angle: angle,

				render: {
					background: "#FFC12010",
					layer: -1,
				}
			});
			return obj;
		},
		wall: function({ x, y, vertices }) {
			for (let i = 0; i < vertices.length; i++) {
				vertices[i] = new vec(vertices[i]);
			}
			let obj = Bodies.fromVertices(vertices, new vec(x, y), {
				static: true,
				hasCollisions: true,

				render: {
					background: "#ffffff",
					round: 10,
				}
			});
			return obj;
		},
		circle: function({ x, y, width, angle }) {
			let obj = Bodies.circle(width / 2, new vec(x, y), {
				static: true,
				hasCollisions: true,
				angle: angle,

				render: {
					background: "#ffffff",
				}
			});
			return obj;
		},
	}
}

for (let categoryName of Object.keys(map)) {
	if (!mapBodies[categoryName]) continue;

	let category = map[categoryName];
	for (let typeName of Object.keys(category)) {
		let objFunc = mapBodies[categoryName][typeName];
		if (!objFunc) continue;
		let types = category[typeName];

		for (let options of types) {
			let obj = objFunc(options);
		}
	}
}
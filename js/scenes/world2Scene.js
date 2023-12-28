"use strict";
let world2Scene = (function createWorld2Scene() {
	let scene = new Room({
		name: "world2",
		width: 12857,
		height: 11078,
		position: new vec(0, 0),
		waves: new Waves([
			[
				{
					type: "PoliceBasic",
				},
			],
		])
	})
	return scene;
})();
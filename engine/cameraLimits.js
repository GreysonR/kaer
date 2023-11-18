"use strict";

ter.Render.camera.limits = {
	min: new vec(-Infinity, -Infinity),
	max: new vec(Infinity, Infinity),
};

ter.Render.on("beforeSave", () => { // change camera position so it's within limits
	const camera = ter.Render.camera;
	
	let offset = new vec(0, 0);
	offset.sub2(camera.bounds.min.sub(camera.limits.min).min2(new vec(0, 0)));
	offset.sub2(camera.bounds.max.sub(camera.limits.max).max2(new vec(0, 0)));
	camera.position.add2(offset);

	if (camera.bounds.max.x - camera.bounds.min.x >= camera.limits.max.x - camera.limits.min.x) {
		camera.position.x = (camera.limits.max.x + camera.limits.min.x) / 2;
	}
	if (camera.bounds.max.y - camera.bounds.min.y >= camera.limits.max.y - camera.limits.min.y) {
		camera.position.y = (camera.limits.max.y + camera.limits.min.y) / 2;
	}
});

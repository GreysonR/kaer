// returns an array of index(es) that make up edges of voronoi region. 2 points if it's between 2 vertices, 1 point if it's between axes, 0 points if it's inside body
function getVoronoiRegion(body, point) { 
	let { vertices } = body;
	let length = vertices.length;
	for (let i = 0; i < length; i++) {
		let vertice = vertices[i];
		let nextVertice = vertices[(i + 1) % length];
		let vertToNext = nextVertice.sub(vertice);
		let axis = vertToNext.normalize();
		let normal = axis.normal();
		let vertToPoint = point.sub(vertice);


		let outside = vertToPoint.dot(normal) >= -10; // theoretically should be 0, but a bit of penetration is allowed in simulation
		let vpDotAxis = vertToPoint.dot(axis);
		let within = vpDotAxis >= 0 && vpDotAxis <= vertToNext.length;

		if (outside && within) {
			return [i, (i + 1) % length];
		}
		else { // check if between axis and lastAxis
			let lastVertice = vertices[(i - 1 + length) % length];
			let lastAxis = lastVertice.sub(vertice).normalize();
			if (vertToPoint.dot(lastAxis) < 0 && vpDotAxis < 0) {
				return [i];
			}
		}
	}
	return [];
}
function closestPointBetweenBodies(bodyA, bodyB) { // returns the closest point on bodyB from the vertices of bodyA
	// should technically be run 2x for (bodyA, bodyB) and (bodyB, bodyA) to find the actual closest points
	let verticesA = bodyA.vertices;
	let verticesB = bodyB.vertices;
	let point = null;
	let minDistance = Infinity;
	for (let i = 0; i < verticesA.length; i++) {
		let verticeA = verticesA[i];
		let region = getVoronoiRegion(bodyB, verticeA);

		if (region.length > 0) {
			let projected;

			if (region.length === 1) {
				projected = new vec(verticesB[region[0]]);
			}
			else if (region.length === 2) {
				let pointBA = verticesB[region[0]];
				let pointBB = verticesB[region[1]];
				let axis = pointBB.sub(pointBA).normalize();
				projected = axis.mult(axis.dot(verticeA.sub(pointBA))).add(pointBA);	
			}

			let distance = projected.sub(verticeA).length;
			if (distance < minDistance) {
				minDistance = distance;
				point = projected;
			}
		}
	}
	return point;
}

function createGradient(startPosition, endPosition, colorStops = [["#ff0000ff", 0], ["#ff000000", 1]]) {
	let gradient = ctx.createLinearGradient(startPosition.x, startPosition.y, endPosition.x, endPosition.y);
	for (let colorStop of colorStops) {
		gradient.addColorStop(colorStop[1], colorStop[0]);
	}
	return gradient;
}

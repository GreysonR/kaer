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
function closestEdgeBetweenBodies(bodyA, bodyB) { // returns the closest point and its normal (point and normal are only on bodyB)
	let verticesA = bodyA.vertices;
	let verticesB = bodyB.vertices;
	let point = null;
	let normal = new vec(1, 0);
	let minDistance = Infinity;
	for (let i = 0; i < verticesA.length; i++) {
		let verticeA = verticesA[i];
		let region = getVoronoiRegion(bodyB, verticeA);

		if (region.length > 0) {
			let projected;
			let curNormal;

			if (region.length === 1) {
				projected = new vec(verticesB[region[0]]);
				let prev = verticesB[(region[0] - 1 + verticesB.length) % verticesB.length];
				let next = verticesB[(region[0] + 1) % verticesB.length];
				let axisA = projected.sub(prev).normalize();
				let axisB = next.sub(projected).normalize();
				curNormal = axisA.add(axisB).normalize();
			}
			else if (region.length === 2) {
				let pointBA = verticesB[region[0]];
				let pointBB = verticesB[region[1]];
				let axis = pointBB.sub(pointBA).normalize();
				projected = axis.mult(axis.dot(verticeA.sub(pointBA))).add(pointBA);
				curNormal = axis;
			}

			let distance = projected.sub(verticeA).length;
			if (distance < minDistance) {
				minDistance = distance;
				point = projected;
				normal = curNormal.normal();
			}
		}
	}
	return {
		point: point,
		normal: normal,
	};
}

function createGradient(startPosition, endPosition, colorStops = [["#ff0000ff", 0], ["#ff000000", 1]]) {
	let gradient = ctx.createLinearGradient(startPosition.x, startPosition.y, endPosition.x, endPosition.y);
	for (let colorStop of colorStops) {
		gradient.addColorStop(colorStop[1], colorStop[0]);
	}
	return gradient;
}
function createRadialGradient(position, radius, colorStops = [["#ff0000ff", 0], ["#ff000000", 1]]) {
	let gradient = ctx.createRadialGradient(position.x, position.y, 0, position.x, position.y, radius);
	for (let colorStop of colorStops) {
		gradient.addColorStop(colorStop[1], colorStop[0]);
	}
	return gradient;
}

function createElement(type, properties) {
	let elem = document.createElement(type);

	function addProperties(elem, properties) {
		Object.keys(properties).forEach(property => {
			if (typeof properties[property] === "object" && !Array.isArray(property) && !(properties[property] instanceof Element)) {
				addProperties(elem[property], properties[property]);
			}
			else {
				if (property === "class") {
					let classes = typeof properties[property] === "string" ? properties[property].split(" ") : properties[property];
					for (let className of classes) {
						elem.classList.add(className);
					}
				}
				else if (property === "parent") {
					properties[property].appendChild(elem);
				}
				else {
					elem[property] = properties[property];
				}
			}
		});
	}
	addProperties(elem, properties);

	return elem;
}
function gaussianRandom(mean = 0, stdev = 1, random = Math.random) { // Standard Normal distribution using Box-Muller transform https://stackoverflow.com/a/36481059
    let u = 1 - random();
    let v = random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}
function createSeededRandom(seed) { // Returns function that generates numbers between [0, 1). Adaptation of https://stackoverflow.com/a/19301306
	var mask = 0xffffffff;
	var m_w = (123456789 + seed) & mask;
	var m_z = (987654321 - seed) & mask;
	
	return function() {
		m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
		m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
		var result = ((m_z << 16) + (m_w & 65535)) >>> 0;
		result /= 4294967296;
		return result;
	}
}
function blurCanvas(amount = 10, durationIn = 200, durationOut = 200) {
	canv.style.filter = "url(#blurFilter)";
	let filter = document.getElementById("blurFilterItem");
	
	animations.create({
		duration: durationIn,
		curve: ease.out.cubic,
		callback: p => {
			filter.setAttribute("stdDeviation", `${amount * p},${amount * p}`);
		}
	});
	animations.create({
		delay: durationIn,
		duration: durationOut,
		curve: ease.linear,
		callback: p => {
			filter.setAttribute("stdDeviation", `${amount * (1 - p)},${amount * (1 - p)}`);
		},
		onend: () => {
			canv.style.filter = "none";
		}
	});
}
function setCSSVariable(varName, value) {
	root.style.setProperty(`--${varName}`, value);
}

function boundedRandom([min, max]) {
	return Math.random() * (max - min) + min;
}
function boundedRandomPoint(bounds) {
	return new vec(boundedRandom([bounds.min.x, bounds.max.x]), boundedRandom([bounds.min.y, bounds.max.y]));
}

String.prototype.toCapital = function() {
	return this.slice(0, 1).toUpperCase() + this.slice(1);
}

function renderMoneyGain(textStart, money) {
	if (money <= 0) return;
	let textPosition = new vec(textStart);
	let textShift = new vec(0, Math.random() * -50 - 50);
	let textOpacity = 1;
	let text = `+$${money}`;
	let fontSize = 22 + 4 * Math.log2(Math.max(1, money));
	function renderText() {
		ctx.globalAlpha = textOpacity;
		ctx.beginPath();
		ctx.font = `bold ${fontSize}px Dosis`;
		ctx.lineJoin = "round";
		ctx.textAlign = "center";
		ctx.fillStyle = "#9DF897";
		ctx.strokeStyle = "#314753CC";
		ctx.lineWidth = 16;
		ctx.strokeText(text, textPosition.x, textPosition.y);
		ctx.fillText(text, textPosition.x, textPosition.y);
		ctx.globalAlpha = 1;
	}
	animations.create({ // shift animation
		duration: 900,
		curve: ease.linear,
		callback: p => {
			textPosition.set(textStart.add(textShift.mult(p)));
		},
		onend: () => {
			Render.off("afterRender", renderText);
		},
	});
	animations.create({ // opacity animation
		duration: 300,
		delay: 600,
		curve: ease.linear,
		callback: p => {
			textOpacity = Math.max(0, 1 - p);
		},
		onend: () => {
			textOpacity = 0;
		},
	});
	Render.on("afterRender", renderText);
}

function createExplosion(point = new vec(0, 0), options = { circle: {}, lines: {}, dots: {} }) {
	// todo: add angle bounds to circle and lines, then use function for all bullet collision effects

	// circle
	(function createCircle() {
		let defaults = {
			visible: true,
			duration: 600,
			fadeDuration: 200,
			radius: [150, 200],
			lineWidth: 16,
			dash: 100,
			color: "#E4749480",
		}
		Common.merge(defaults, options.circle)
		if (!defaults.visible) return;
		let { duration, fadeDuration, radius: maxRadiusBounds, lineWidth: maxLineWidth, dash: maxDash, color } = defaults;
		let radius = 0;
		let maxRadius = boundedRandom(maxRadiusBounds);
		let lineWidth = maxLineWidth;
		let position = point;
		let dash = 0;
		function render() {
			if (lineWidth > 0 && (dash == 0 || dash >= 1)) {
				ctx.beginPath();
				ctx.arc(position.x, position.y, radius, 0, Math.PI*2);

				ctx.strokeStyle = color;
				ctx.lineWidth = lineWidth;
				if (dash >= 1) {
					ctx.lineCap = "round";
					ctx.setLineDash([dash, maxDash - dash]);
				}
				ctx.stroke();
				ctx.setLineDash([]);
			}
		}
		animations.create({
			duration: duration,
			curve: ease.out.quadratic,
			callback: p => {
				radius = maxRadius * p;
			},
			onend() {
				Render.off("beforeLayer-2", render);
			},
		});
		animations.create({
			duration: fadeDuration,
			delay: duration - fadeDuration,
			curve: ease.linear,
			callback: p => {
				lineWidth = maxLineWidth * (1 - p);
				if (maxDash > 0) dash = maxDash * (1 - p);
			},
		});
		Render.on("beforeLayer-2", render);
	})();

	// lines
	(function createLines() {
		let defaults = {
			visible: true,
			quantity: 8,
			velocity: [4, 8],
			length: 50,
			distance: [140, 240],
			color: "#FFF4EB",
			lineWidth: 8,
		}
		Common.merge(defaults, options.lines);
		let { visible, quantity, velocity, length, distance, color, lineWidth } = defaults;
		if (!visible || quantity <= 0) return;
		// lines
		let lines = new Set();
		for (let i = 0; i < quantity; i++) {
			let angle = (i / (quantity - 1)) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
			let speed = boundedRandom(velocity);
			let curDistance = boundedRandom(distance);
			let start = new vec(point);
			let direction = new vec(Math.cos(angle), Math.sin(angle));
			let offset = direction.mult(curDistance);
			
			let ptA = new vec(start);
			let ptB = new vec(start);
			let line = [ptA, ptB];
			lines.add(line);
			let animation = animations.create({
				duration: curDistance / speed * 16.67,
				curve: ease.out.quadratic,
				callback: p => {
					let lengthPercent = length / curDistance;
					p = p * (1 + lengthPercent);
					let percentB = Math.min(1, p);
					let percentA = Math.max(0, p - lengthPercent);
					ptA.set(start.add(offset.mult(percentA)));
					ptB.set(start.add(offset.mult(percentB)));

					if (percentA >= 0.995) {
						animation.stop();
					}
				},
				onend() {
					lines.delete(line);
				},
				onstop() {
					lines.delete(line);
				},
			});
		}
		function render() {
			if (lines.size === 0) {
				Render.off("beforeLayer-2", render);
				return;
			}

			ctx.beginPath();
			for (let line of lines) {
				let [ptA, ptB] = line;
				ctx.moveTo(ptA.x, ptA.y);
				ctx.lineTo(ptB.x, ptB.y);
			}
			ctx.strokeStyle = color;
			ctx.lineWidth = lineWidth;
			ctx.lineCap = "round";
			ctx.stroke();
		}
		Render.on("beforeLayer-2", render);
	})();

	// dots
	(function createDots() {
		let defaults = {
			visible: true,
			duration: [400, 700],
			radius: [14, 34],
			distance: [100, 300],
			weightedDistance: true,
			angle: [0, Math.PI*2],
			colors: [],
		}
		Common.merge(defaults, options.dots);
		if (!defaults.visible || defaults.colors.length === 0) return;
		let { duration: durationBounds, radius: radiusBounds, distance: distanceBounds, angle: angleBounds, weightedDistance } = defaults;

		function createColorDots(options = {}) {
			let defaults = {
				color: "#FFF4EBd8",
				quantity: 4,
			}
			Common.merge(defaults, options);
			let { color, quantity } = defaults;

			let dots = new Set();
			for (let i = 0; i < quantity; ++i) {
				let angle = boundedRandom(angleBounds);
				let duration = boundedRandom(durationBounds);
				let maxRadius = boundedRandom(radiusBounds);
				let distance = boundedRandom(distanceBounds);

				if (weightedDistance) {
					distance -= (maxRadius / radiusBounds[1] * distanceBounds[0]);
				}
	
				let start = new vec(point);
				let direction = new vec(Math.cos(angle), Math.sin(angle));
				let offset = direction.mult(distance);
	
				let dot = {
					position: new vec(point),
					radius: maxRadius,
				};
				dots.add(dot);
	
				let positionAnimation = animations.create({
					duration: duration,
					curve: ease.linear,
					callback: p => {
						dot.position.set(start.add(offset.mult(p)));
					},
					onend() {
						dots.delete(dot);
					},
				});
				let radiusAnimation = animations.create({
					duration: duration * 0.6,
					delay: duration * 0.4,
					curve: ease.linear,
					callback: p => {
						dot.radius = maxRadius * Math.max(0, 1 - p);
					},
					onend() {
						radius = 0;
					},
				});
			}
			function render() {
				if (dots.size === 0) {
					Render.off("beforeLayer-2", render);
					return;
				}
	
				ctx.beginPath();
				for (let dot of dots) {
					let { position, radius } = dot;
					ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
					ctx.closePath();
				}
				ctx.fillStyle = color;
				ctx.fill();
			}
			Render.on("beforeLayer-2", render);
		}
		for (let dotOptions of defaults.colors) {
			createColorDots(dotOptions);
		}
	})();
}
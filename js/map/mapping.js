"use strict";

function getCenterOfMass(vertices) { /* https://bell0bytes.eu/centroid-convex/ */
	let centroid = new vec(0, 0);
	let det = 0;
	let tempDet = 0;
	let numVertices = vertices.length;

	if (vertices.length < 3) { // return avg
		for (let i = 0; i < vertices.length; i++) {
			centroid.add2(vertices[i]);
		}
		centroid.div2(vertices.length);
		return centroid;
	}

	for (let i = 0; i < vertices.length; i++) {
		let curVert = vertices[i];
		let nextVert = vertices[(i + 1) % numVertices];

		tempDet = curVert.x * nextVert.y - nextVert.x * curVert.y;
		det += tempDet;

		centroid.add2({ x: (curVert.x + nextVert.x) * tempDet, y: (curVert.y + nextVert.y) * tempDet });
	}

	centroid.div2(3 * det);

	return centroid;
}

function getSVGPaths(elem) {
	let pathArr = elem.properties.d.replace(/M/g, "!M").replace(/H/g, "!H").replace(/V/g, "!V").replace(/L/g, "!L").replace(/C/g, "!C").replace(/Z/g, "!Z").split("!").filter(v => v != "");
	let x = 0;
	let y = 0;
	let path = [];
	let paths = [];
	for (let i = 0; i < pathArr.length; i++) {
		let func = pathArr[i][0];
		let part = pathArr[i].slice(1).split(" ");

		if (func === "M") {
			x = Math.round(Number(part[0]));
			y = Math.round(Number(part[1]));

			if (i !== 0) {
				console.warn("More than 1 path");
				paths.push(path);
				path = [];
			}
		}
		else if (func === "H") {
			x = Math.round(Number(part[0]));

			if (isNaN(Number(part[0]))) console.error(part, pathArr);
		}
		else if (func === "V") {
			y = Math.round(Number(part[0]));
		}
		else if (func === "L") {
			x = Math.round(Number(part[0]));
			y = Math.round(Number(part[1].replace("Z", "")));
		}
		else if (func === "C") {
			path.push({
				posA: { x: x, y: y },
				posB: { x: Number(part[4]), y: Number(part[5]) },
				cPts: [{ x: Number(part[0]), y: Number(part[1]) },{ x: Number(part[2]), y: Number(part[3]) }],
			});
			x = Number(part[4]);
			y = Number(part[5]);
			continue;
		}
		else if (func === "Z") {
			if (i !== pathArr.length - 1) {
				console.warn("More than 1 path");
				paths.push(path);
				path = [];
			}
		}
		else {
			console.error(func, part);
			console.error(pathArr, i);
		}

		path.push({ x: Math.round(x), y: Math.round(y) });
	}

	paths.push(path);
	return paths;
}

function radiusFromPoints(a, b, c) { // https://math.stackexchange.com/a/2836488
	let db = b.sub(a);
	let dc = c.sub(a);
	let distX = ((db.x**2 * dc.y - dc.x**2 * db.y + db.y ** 2 * dc.y - dc.y ** 2 * db.y) / (2 * (dc.x * db.y - db.x * dc.y)));
	let distY = ((db.x ** 2 * dc.x - dc ** 2 * db.x + db.y ** 2 * dc.x - dc.y ** 2 * db.x) / (2 * (dc.x * db.y - db.x * dc.y)));
	return Math.sqrt(distX ** 2 + distY ** 2);
}

function createShadowData(elem) { // elem must be path
	// get path
	let path;
	for (let child of elem.children[0].children[0].children[0].children) {
		if (child.tagName === "path") {
			path = getSVGPaths(child);
			path = path[0]; // assumes there's 1 path (which there should be)
			break;
		}
	}

	// get height of points based on nearest rectangle's round amount
	let finalPoints = new Array(path.length);
	function crawl(elem) {
		for (let child of elem.children) {
			if (child.tagName != "clipPath") {
				crawl(child);
			}
		}
		if (elem.tagName === "rect") {
			let { properties } = elem;
			let height = properties.rx;
			let position = new vec(properties);
			if (!position.x) position.x = 0;
			if (!position.y) position.y = 0;
			let found = false;
			for (let i = 0; i < path.length; i++) {
				let point = path[i];
				if (position.sub(point).length < 3) {
					finalPoints[i] = {
						position: position.toObject(),
						height: height,
					}
					found = true;
					break;
				}
			}
			if (!found) {
				console.warn("not found: ", position);
			}
		}
	}
	crawl(elem.children[0]);

	return finalPoints.filter(v => v != null);
}

document.getElementById("mapInput").addEventListener("input", event => {
	let input = event.target;
	let fr = new FileReader();
	fr.readAsText(input.files[0]);
	let filename = input.files[0].name;
	// let name = input.value.replace(/\\/g, "/").split("/"); // gets the filename
	// name = name[name.length - 1].replace(".svg", "");

	fr.onload = function() {
		// Compile file
		let res = fr.result;
		let parsed = svgParse(res);

		if (filename.includes("ShadowBase")) { // secondary functionality of making shadow data
			let out = createShadowData(parsed);
			out = JSON.stringify(out);
			copyToClipboard(out);
			console.log(out);
			input.value = "";
			return;
		}
		
		let out = {
		}

		let resourceNames = {};
		for (let resourceName of Object.keys(Resources)) {
			resourceNames[Resources[resourceName].color] = resourceName;
		}
		
		const ignoreMapBody = ["road", "wall"];
		
		function getVertices(rect) {
			let a = 0;
			if (rect.transform) {
				let transform = rect.transform.replace("rotate(", "").replace(")", "").split(" ");
				a = transform[0] / 180 * Math.PI;
			}
			let w = rect.width;
			let h = rect.height;

			let vx = new vec(Math.cos(a) * w, Math.sin(a) * w);
			let vy = new vec(Math.cos(a + Math.PI/2) * h, Math.sin(a + Math.PI/2) * h);

			let vertices = [
				new vec(0, 0).round(),
				new vec(vx).round(),
				new vec(vx.add(vy)).round(),
				new vec(vy).round(),
			];

			return [vertices, vx, vy];
		}
		

		function roundVert(vert) {
			if (Array.isArray(vert)) {
				for (let v of vert) {
					roundVert(v);
				}
			}
			else {
				vert.x = Number((Math.round(vert.x / 0.01) * 0.01).toFixed(2));
				vert.y = Number((Math.round(vert.y / 0.01) * 0.01).toFixed(2));
			}
		}

		function crawlNext(elem) {
			if (elem.tagName === "clipPath" || elem.tagName === "defs") return;
			if (elem.properties?.id) {
				let data = elem.properties.id.split("_")[0].split(":");
				let id = data[0];
				let additionalData = {};
				if (data.length > 1) {
					let parameters = data[1].split(",");
					for (let parameter of parameters) {
						let [key, value] = parameter.split("=");
						additionalData[key] = Number(value) ? Number(value) : value;
					}
				}

				if (MapBodies[id] && !ignoreMapBody.includes(id)) {
					if (!out[id]) out[id] = [];
					let rect = elem.children[elem.children.length - 1];
					let options = { x: rect.properties.x, y: rect.properties.y };
					if (id === "spawn" || id.includes("house") || rect.properties.transform?.includes("rotate") || Models[id]) {
						let { width, height } = rect.properties;
						let angle = (rect.properties.transform ? (Number(rect.properties.transform.replace("rotate(", "").split(" ")[0]) || 0) : 0) * Math.PI / 180;
						let centerOffset = new vec(width/2, height/2).rotate(angle);
						options.angle = angle;
						options.x += centerOffset.x;
						options.y += centerOffset.y;
					}
					if (id === "exit") {
						options.width = rect.properties.width;
						options.height = rect.properties.height;
					}
					ter.Common.merge(options, additionalData);
					out[id].push(options);
					return;
				}
			}
			if (Array.isArray(elem.children) && elem.children.length > 0) {
				for (let child of elem.children) {
					crawlNext(child);
				}
			}

			let name;
			if (elem.tagName === "rect" || elem.tagName === "path") {
				// Get element name
				if (elem.properties?.fill === "none") return;
				name = elem.properties?.id?.split("_")[0].split("=")[0];
				if (!name) {
					console.warn("no name: " + name, elem.properties);
					return;
				}
				if (!ignoreMapBody.includes(name)) return;
				if (!out[name]) {
					out[name] = [];
				}
			}
			
			if (elem.tagName === "rect") {
				let rect = elem.properties;
				let vertices = getVertices(rect);
				let obj = {
					x: Math.round(rect.x + vertices[1].x / 2 + vertices[2].x / 2),
					y: Math.round(rect.y + vertices[1].y / 2 + vertices[2].y / 2),
				}
				if (name === "spawn") {
					let a = 0;
					if (rect.transform) {
						let transform = rect.transform.replace("rotate(", "").replace(")", "").split(" ");
						a = transform[0] / 180 * Math.PI;
					}
					obj.angle = a;
					delete obj.vertices;
				}
				else if (Object.keys(Enemies).includes(name)) { // 
					console.warn(obj);
				}
				out[name].push(obj);
			}
			else if (elem.tagName === "path") {
				// parse path
				let paths = getSVGPaths(elem);

				for (let path of paths) {
					if (path.length > 1) {
						let center = getCenterOfMass(path);

						if (name === "wall") {
							let vertices = [];
							for (let vertice of path) {
								if (vertice.x != undefined) {
									vertices.push(vertice);
								}
								else {
									let bezier = new Bezier(vertice.posA, vertice.cPts[0], vertice.cPts[1], vertice.posB);
									let pointDensity = 100;
									let numPoints = Math.floor(bezier.length / pointDensity);

									vertices.push(bezier.a);
									for (let i = 0; i < numPoints; i++) {
										let point = bezier.getAtT((i + 1) / (numPoints + 1));
										vertices.push(point);
									}
									vertices.push(bezier.d);
								}
							}
							for (let vertice of vertices) {
								roundVert(vertice);
							}
							// Remove duplicate vertices
							let verticeIds = new Set();
							for (let i = 0; i < vertices.length; ++i) {
								let id = ter.Common.pairCommon(new vec(vertices[i]).round2());
								if (verticeIds.has(id)) {
									vertices.splice(i, 1);
									--i;
								}
								else {
									verticeIds.add(id);
								}
							}
							let center = getCenterOfMass(vertices);
							out[name].push({
								x: center.x,
								y: center.y,
								vertices: vertices
							});
							continue;
						}
						else if (name === "road") {
							let roadHitbox = generateRoadHitbox(path, elem.properties["stroke-width"], undefined, false);
							for (let hitbox of roadHitbox) {
								roundVert(hitbox.position);
								roundVert(hitbox.vertices);
								out[name].push(hitbox);
							}
							continue;
						}
						
						if (new vec(path[0]).equals(path[path.length - 1])) {
							path.pop();
						}
		
						out[name].push({
							x: Math.round(center.x),
							y: Math.round(center.y),
							vertices: path,
						});
					}
				}
			}
		}
		crawlNext(parsed);

		// out = JSON.stringify(out, null, "\t");

		out = JSON.stringify(out);

		copyToClipboard(out);
		console.log(out);
		input.value = "";
	}
});

function copyToClipboard(text) {
    if (window.clipboardData && window.clipboardData.setData) {
        // Internet Explorer-specific code path to prevent textarea being shown while dialog is visible.
        return window.clipboardData.setData("Text", text);

    }
    else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        var textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in Microsoft Edge.
        document.body.appendChild(textarea);
        textarea.select();
        try {
            return document.execCommand("copy");  // Security exception may be thrown by some browsers.
        }
        catch (ex) {
            console.warn("Copy to clipboard failed.", ex);
            return prompt("Copy to clipboard: Ctrl+C, Enter", text);
        }
        finally {
            document.body.removeChild(textarea);
        }
    }
}


function generateRoadHitbox(path, roadWidth = 700, dt = 300, canRemoveIntersections = true) {
	let beziers = [];
	let hitboxes = [];
	let vertices = [];

	for (let i = 0; i < path.length; i++) {
		let pt = path[i];

		if (pt.a !== undefined) {
			beziers.push(new Bezier(pt));
		}
		else {
			let { posA, posB, cPts } = pt;
	
			if (!posA) continue;
			beziers.push(new Bezier(new vec(posA), new vec(cPts[0]), new vec(cPts[1]), new vec(posB)));
		}
	}

	// create points for left / right sides
	let leftSide = [];
	let rightSide = [];
	for (let i = 0; i < beziers.length; i++) {
		let bezier = beziers[i];
		let bLen = bezier.length;
		for (let t = i === 0 ? 0 : bLen * 0.1; t <= bLen;) {
			let op = bezier.get(t);
			let dx = bezier.getDx(t);
			let norm = dx.normalize().normal();

			let pt = op.add(norm.mult(roadWidth / 2 * 1.1))
			leftSide.push(pt);

			t += typeof dt === "function" ? dt(dx) : dt;
		}
		
		// add last pt
		leftSide.push(bezier.get(bLen).add(bezier.getDx(bLen).normalize().normal().mult(roadWidth / 2)));
	}
	for (let i = 0; i < beziers.length; i++) {
		let bezier = beziers[i];
		let bLen = bezier.length;
		for (let t = i === 0 ? 0 : bLen * 0.1; t <= bLen;) {
			let op = bezier.get(t);
			let dx = bezier.getDx(t);
			let norm = dx.normalize().normal();

			let pt = op.add(norm.mult(-roadWidth / 2 * 1.1))
			rightSide.push(pt);

			t += 300;
		}
		
		// add last pt
		rightSide.push(bezier.get(bLen).add(bezier.getDx(bLen).normalize().normal().mult(-roadWidth / 2)));
	}

	// remove intersections
	function removeIntersections(side) {
		for (let i = 1; i < Math.max(1, side.length - 10); i++) {
			let a1 = side[i];
			let a2 = side[i - 1];
			for (let j = i + 1; j < Math.min(side.length, i + 10); j++) {
				let b1 = side[j];
				let b2 = side[j + 1];
				
				let intersection = Common.lineIntersects(a1, a2, b1, b2);

				if (intersection) {
					side.splice(i, j - i + 1, intersection);
					i--;
					break;
				}
			}
		}
	}
	if (canRemoveIntersections) {
		removeIntersections(rightSide);
		removeIntersections(leftSide);
	}


	vertices = vertices.concat(leftSide).concat(rightSide.reverse());
	let decompPoints = vertices.map(v => [v.x, v.y]);
	decomp.removeDuplicatePoints(decompPoints, 0.01);
	try {
		decomp.makeCCW(decompPoints);
	}
	catch(err) {
		console.error(err);
		console.error(path);
	}
	let convex = decomp.quickDecomp(decompPoints);

	for (let shape of convex) {
		let vertices = shape.map(v => ({ x: v[0], y: v[1] }));
		let center = getCenterOfMass(vertices);

		hitboxes.push({
			position: center,
			vertices: vertices,
		});
	}

	return hitboxes;
}
function generateRoadPath(path, dt = 300) {
	let beziers = [];

	for (let i = 0; i < path.length; i++) {
		let pt = path[i];
		let { posA, posB, cPts } = pt;

		if (!posA) continue;
		beziers.push(new Bezier(new vec(posA), new vec(cPts[0]), new vec(cPts[1]), new vec(posB)));
	}

	if (dt === 0) {
		return beziers;
	}

	// create points for left / right sides
	let vertices = [];
	for (let i = 0; i < beziers.length; i++) {
		let bezier = beziers[i];
		let bLen = bezier.length;
		for (let t = i === 0 ? 0 : bLen * 0.1; t <= bLen;) {
			vertices.push(bezier.get(t));
			t += dt;
		}
		
		// add last pt
		vertices.push(bezier.getAtT(1));
	}

	return vertices;
}

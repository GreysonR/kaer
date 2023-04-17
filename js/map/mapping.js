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

document.getElementById("mapInput").addEventListener("input", event => {
	let input = event.target;
	let fr = new FileReader();
	fr.readAsText(input.files[0]);

	fr.onload = function() {
		// Compile file
		let res = fr.result;
		let index = 0;
		
		let out = {
			env: {
				roadHitbox: [],
			},
		}
		
		const envColors = {
			// ~ env
			"white": "wall",
			"#D58850": "checkpoint",
			"#BF3232": "spawn",
			"#82E1BF": "path",
			"#2027CD": "policeSpawns",

			"#53656A": "road",
			"#592B21": "rail",

			"#46A325": "tree",
			"#DDB45F": "zoneHitbox",

			"#425155": "roadHitbox",
			"#97592D": "dirtHitbox",

			"#955EBF": "job",
			"#FF7D1E": "coin",
		}
		
		function getPolygons() {
			let iStart = res.indexOf("<path", index);
			// if (res.indexOf("<path", index) > -1) iStart = Math.min(res.indexOf("<path", index), iStart);
			let iEnd = res.indexOf("/>", index);

			if (iStart > index) {
				index = iEnd + 2;
				
				// get string of current path
				let pathText = res.slice(iStart + 5, iEnd);
				
				// create object from string
				if (pathText == "") return;
				let pathObjArr = pathText.trim().split('"');
				let pathObj = (() => {
					let obj  = {};
					for (let i = 0; i < Math.floor(pathObjArr.length / 2) * 2; i += 2) {
						obj[pathObjArr[i].replace("=", "").replace(/[" "]/g, "")] = !isNaN(Number(pathObjArr[i + 1])) ? Number(pathObjArr[i + 1]) : pathObjArr[i + 1];
					}
					return obj;
				})();

				let text = res.slice(iStart + 5, iEnd);
				if (text == "") return;
				let polyArr = text.trim().split('"').flatMap((v, i, arr) => {
					if (i % 2 === 0 && v !== "") {
						return [ [ v, arr[i + 1] ] ];
					}
					else {
						return [];
					}
				});
				let obj = (() => {
					let obj  = {};
					for (let i = 0; i < polyArr.length; i++) {
						obj[polyArr[i][0].replace("=", "").replace(/[" "]/g, "")] = polyArr[i][1];
					}
					return obj;
				})();

				// parse path
				let pathArr = obj["d"].replace(/M/g, "!M").replace(/H/g, "!H").replace(/V/g, "!V").replace(/L/g, "!L").replace(/Z/g, "!Z").split("!").filter(v => v != "");
				let x = 0;
				let y = 0;
				let paths = [[]];
				let pathNum = 0;
				for (let i = 0; i < pathArr.length; i++) {
					let func = pathArr[i][0]
					let part = pathArr[i].slice(1).split(" ");

					if (func === "M") {
						x = Math.round(Number(part[0]));
						y = Math.round(Number(part[1]));
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
					else if (func === "Z") {
						console.warn("More than 1 path");
						// paths.push([]);
						// pathNum++;
					}
					else {
						console.error(func, part);
						console.error(pathArr, i);
					}

					paths[pathNum].push({ x: Math.round(x), y: Math.round(y) });
				}
				
				for (let path of paths) {
					if (path.length > 1) {
					}
				}
			}
			else {
				index = -1;
			}
		}

		
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
			]

			return [vertices, vx, vy];
		}
		
		let parsed = svgParse(res);

		function crawlNext(elem) {
			if (elem.tagName === "clipPath") return;
			if (Array.isArray(elem.children) && elem.children.length > 0) {
				for (let child of elem.children) {
					crawlNext(child);
				}
			}

			if (elem.tagName === "rect") {
				let rect = elem.properties;
				let name = "wall";
				if (envColors[rect.fill]) {
					name = envColors[rect.fill];
				}
				if (!out.env[name]) {
					out.env[name] = [];
				}

				let vertices = getVertices(rect);
				let obj = {
					x: Math.round(rect.x + vertices[1].x / 2 + vertices[2].x / 2),
					y: Math.round(rect.y + vertices[1].y / 2 + vertices[2].y / 2),
					vertices: vertices[0],
				}
				if (name === "tree") {
					delete obj.vertices;
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
				out.env[name].push(obj);
			}
			else if (elem.tagName === "path") {
				// parse path
				let pathArr = elem.properties.d.replace(/M/g, "!M").replace(/H/g, "!H").replace(/V/g, "!V").replace(/L/g, "!L").replace(/C/g, "!C").replace(/Z/g, "!Z").split("!").filter(v => v != "");
				let x = 0;
				let y = 0;
				let path = [];
				for (let i = 0; i < pathArr.length; i++) {
					let func = pathArr[i][0];
					let part = pathArr[i].slice(1).split(" ");

					if (func === "M") {
						x = Math.round(Number(part[0]));
						y = Math.round(Number(part[1]));
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
							// paths.push([]);
							// pathNum++;
						}
					}
					else {
						console.error(func, part);
						console.error(pathArr, i);
					}

					path.push({ x: Math.round(x), y: Math.round(y) });
				}

				
				if (path.length > 1) {
					let pathObj = elem.properties;
					let name = "wall";
					if (envColors[pathObj.fill] || envColors[pathObj.stroke]) {
						name = envColors[pathObj.fill] || envColors[pathObj.stroke];
					}
					if (!out.env[name]) {
						out.env[name] = [];
					}
					let center = getCenterOfMass(path);
					
					if (name !== "path" && Common.angleDiff(center.sub(path[0]).angle, center.sub(path[1]).angle) > 0) {
						path.reverse();
					}

					if (name === "path") {
						let decompPoints = path.map(v => [v.x, v.y]);
						decomp.makeCCW(decompPoints);
						decomp.removeDuplicatePoints(decompPoints, 0.01);
						path = decompPoints.map(v => ({ x: v[0], y: v[1] }));
					}

					if (name === "road") {
						if (path[0].x) {
							path.shift();
						}
						let roadHitbox = generateRoadHitbox(path, elem.properties["stroke-width"]);
						let roadPath = generateRoadPath(path, 0);
						
						for (let hitbox of roadHitbox) {
							out.env[name + "Hitbox"].push(hitbox);
						}

						// if (roadPath[0].a.y < roadPath[roadPath.length - 1].a.y) {
						// 	roadPath.reverse();
						// }
						for (let bezier of roadPath) {
							out.env[name].push(bezier.toObject());
						}
					}
					else if (name === "rail") {
						if (path[0].x) {
							path.shift();
						}
						let hitbox = generateRoadHitbox(path, elem.properties["stroke-width"] + 5, 200);
						for (let obj of hitbox) {
							if (!out.env.wall) out.env.wall = [];
							out.env["wall"].push(obj);
						}
					}
					else if (name === "wall" || name.includes("Hitbox")) {
						let decompPoints = path.map(v => [v.x, v.y]);
						decomp.removeDuplicatePoints(decompPoints, 0.01);
						decomp.makeCCW(decompPoints);
						let convex = decomp.quickDecomp(decompPoints);

						for (let shape of convex) {
							let verts = shape.map(v => ({ x: v[0], y: v[1] }));
							let center = getCenterOfMass(verts);
							out.env[name].push({
								x: Math.round(center.x),
								y: Math.round(center.y),
								vertices: verts,
							});
						}
					}
					else {
						if (new vec(path[0]).equals(path[path.length - 1])) {
							path.pop();
						}
		
						out.env[name].push({
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


function generateRoadHitbox(path, roadWidth = 700, dt = 300) {
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
	removeIntersections(rightSide);
	removeIntersections(leftSide);


	vertices = vertices.concat(leftSide).concat(rightSide.reverse());
	let decompPoints = vertices.map(v => [v.x, v.y]);
	decomp.removeDuplicatePoints(decompPoints, 0.01);
	decomp.makeCCW(decompPoints);
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
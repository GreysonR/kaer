"use strict";


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
			},
		}
		
		const envColors = {
			// ~ env
			"white": "wall",
			"#D58850": "checkpoint",
			"#BF3232": "spawn",
			"#82E1BF": "path",
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
		function transform(rect) {
			let pos = new vec(rect.x, rect.y);
			let w  = rect.width / 2;
			let h  = rect.height / 2;

			if (rect.transform) {
				let transform = rect.transform.replace("rotate(", "").replace(")", "").split(" ");
				let a = transform[0] / 180 * Math.PI;

				pos.add2({ x: Math.round(Math.cos(a)*w - Math.sin(a)*h), y: Math.round(Math.sin(a)*w + Math.cos(a)*h) });
				pos = pos.toObj();
				pos.angle = -a;
			}
			else {
				pos.add2({ x: w, y: h });
				pos = pos.toObj();
			}
			return pos;
		}
		
		function getNext() {
			let iStart = res.indexOf("<rect", index);
			let iEnd = res.indexOf("/>", iStart);

			if (iStart > index) {
				// get string of current rect
				let rectText = res.slice(iStart + 5, iEnd);

				// create rect object from string
				if (rectText == "") return;
				let rectArr = rectText.trim().split('"');
				let rect = (() => {
					let obj  = {};
					for (let i = 0; i < Math.floor(rectArr.length / 2) * 2; i += 2) {
						obj[rectArr[i].replace("=", "").replace(/[" "]/g, "")] = !isNaN(Number(rectArr[i + 1])) ? Number(rectArr[i + 1]) : rectArr[i + 1];
					}
					return obj;
				})();

				// add obj defaults
				if (!rect.x) rect.x = 0;
				if (!rect.y) rect.y = 0;
				if (!rect.rx) rect.rx = 0;
				if (!rect.fill) {
					console.warn(rect, rectText);
					index = iEnd + 2;
					return;
				}

				if (!rect.width || !rect.height) {
					console.error(rectText);
					index = iEnd + 2;
					return;
				}

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
				if (name === "checkpoint") {
					obj.index = Math.round(rect.rx * 100);
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

				index = iEnd + 2;
			}
			else {
				index = -1;
			}
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
				let pathArr = obj["d"].replace(/M/g, "!M").replace(/H/g, "!H").replace(/V/g, "!V").replace(/L/g, "!L").split("!").filter(v => v != "");
				let x = 0;
				let y = 0;
				let path = [];
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
					else {
						console.error(func, part);
						console.error(pathArr, i);
					}

					path.push({ x: Math.round(x), y: Math.round(y) });
				}
				
				if (path.length > 1) {
					let name = "wall";
					if (envColors[pathObj.fill] || envColors[pathObj.stroke]) {
						if (envColors[pathObj.stroke]) console.log(pathObj.stroke);
						name = envColors[pathObj.fill] || envColors[pathObj.stroke];
					}
					if (!out.env[name]) {
						out.env[name] = [];
					}
					let center = new vec(0, 0);
					for (let p of path) {
						center.add2({ x: p.x / path.length, y: p.y / path.length });
					}
					
					if (name !== "path" && Common.angleDiff(center.sub(path[0]).angle, center.sub(path[1]).angle) > 0) {
						path.reverse();
					}

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
			else {
				index = -1;
			}
		}

		
		index = 0;
		let n = 0;
		while (index !== -1 && n < 500) {
			getPolygons();
			n++;
		}
		
		index = 0;
		while (index !== -1 && n < 500) {
			getNext();
			n++
		}

		// console.log(paths);

		// out = JSON.stringify(out, null, "\t");
		out = JSON.stringify(out);

		navigator.clipboard.writeText(out);
		console.log(out);
		input.value = "";
	}
});

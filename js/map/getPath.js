"use strict";


function parsePts(str) {
	str = str.split("\n");
	let out = [];
	
	for (let i = 0; i < str.length; i++) {
		let s = str[i].split(",");
		out.push({ x: s[0], y: s[1] });
	}

	out = JSON.stringify(out);
	copyToClipboard(out);

	return out;
}


document.getElementById("pathInput").addEventListener("input", event => {
	const resolution = 50;
	const round = 10;
	let input = event.target;
	let fr = new FileReader();
	fr.readAsText(input.files[0]);

	fr.onload = function() {
		let res = fr.result;
		let out = [];
		
		let tempParent = document.createElement("div");
		tempParent.innerHTML = res;
		let svgElem = tempParent.children[0];

		for (let i = 0; i < svgElem.childElementCount; i++) {
			let cur = [];
			let d = svgElem.children[i].getAttribute("d");
			const properties = new svgPathProperties.svgPathProperties(d);
			const length = properties.getTotalLength();

			for (let j = 0; j < Math.floor(length / resolution); j++) {
				let pt = properties.getPointAtLength(j * resolution);
				pt.x = Math.round(pt.x * round) / round;
				pt.y = Math.round(pt.y * round) / round;
				cur.push(pt);
			}

			out.push(cur);
		}

		let txt = JSON.stringify(out);
		copyToClipboard(txt);
		console.log(out);
	}
});
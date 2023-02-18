"use strict";

class Bezier {
	constructor(pt1, cp1, cp2, pt2) { // start, control 1, control 2, end
		// https://javascript.info/bezier-curve
		// P = ((1−t)^3 * P1) + (3(1−t)^2 * t * P2) + (3(1−t) * t^2 * P3) + (t^3 * P4)
		// arc length = ∫a^b √[1 + (dy/dx)^2] dx
		// arc length = ∫a^b

		this.a = new vec(pt1);
		this.b = new vec(cp1);
		this.c = new vec(cp2);
		this.d = new vec(pt2);

		this.length = this.getLength();
	}
	getAtT(t) {
		let x = (this.a.x * (1 - t)**3) + (3*this.b.x * t * (1 - t)**2) + (3*this.c.x * (1 - t) * t**2) + (this.d.x * t**3);
		let y = (this.a.y * (1 - t)**3) + (3*this.b.y * t * (1 - t)**2) + (3*this.c.y * (1 - t) * t**2) + (this.d.y * t**3);

		return new vec(x, y);
	}
	getLength() {
		let lastPt = this.getAtT(0);
		let d = 0.01;
		let len = 0;
		for (let t = d; t <= 1; t += d) {
			let pt = this.getAtT(t);
			len += pt.sub(lastPt).length;
			lastPt = pt;
		}
		len += this.getAtT(1).sub(lastPt).length;

		return len;
	}
	get(d) {
		return this.getAtT(d / this.length);
	}
	getDxAtT(t) {
		let x = 3 * ((this.d.x - 3*this.c.x + 3*this.b.x - this.a.x) * t ** 2 + (2*this.c.x - 4*this.b.x + 2*this.a.x) * t + this.b.x - this.a.x);
		let y = 3 * ((this.d.y - 3*this.c.y + 3*this.b.y - this.a.y) * t ** 2 + (2*this.c.y - 4*this.b.y + 2*this.a.y) * t + this.b.y - this.a.y);

		return new vec(x, y);
	}
	getDx(d) {
		return this.getDxAtT(d / this.length);
	}
}

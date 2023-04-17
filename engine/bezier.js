"use strict";

class Bezier {
	constructor(pt1, cp1, cp2, pt2) { // start, control 1, control 2, end
		// https://javascript.info/bezier-curve
		// P = ((1−t)^3 * P1) + (3(1−t)^2 * t * P2) + (3(1−t) * t^2 * P3) + (t^3 * P4)
		// arc length = ∫a^b √[1 + (dy/dx)^2] dx
		// arc length = ∫a^b

		if (pt1.a && pt1.b) {
			this.a = new vec(pt1.a);
			this.b = new vec(pt1.b);
			this.c = new vec(pt1.c);
			this.d = new vec(pt1.d);
		}
		else {
			this.a = new vec(pt1);
			this.b = new vec(cp1);
			this.c = new vec(cp2);
			this.d = new vec(pt2);
		}

		this.length = this.getLength();
	}
	getAtT(t) {
		let x = (this.a.x * (1 - t)**3) + (3*this.b.x * t * (1 - t)**2) + (3*this.c.x * (1 - t) * t**2) + (this.d.x * t**3);
		let y = (this.a.y * (1 - t)**3) + (3*this.b.y * t * (1 - t)**2) + (3*this.c.y * (1 - t) * t**2) + (this.d.y * t**3);

		return new vec(x, y);
	}
	getLength(dt = 0.01) {
		let lastPt = this.getAtT(0);
		let len = 0;
		for (let t = dt; t <= 1; t += dt) {
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
	getDxAtT(t) { // 1st derivative
		let x = 3 * ((this.d.x - 3*this.c.x + 3*this.b.x - this.a.x) * t ** 2 + (2*this.c.x - 4*this.b.x + 2*this.a.x) * t + this.b.x - this.a.x);
		let y = 3 * ((this.d.y - 3*this.c.y + 3*this.b.y - this.a.y) * t ** 2 + (2*this.c.y - 4*this.b.y + 2*this.a.y) * t + this.b.y - this.a.y);

		return new vec(x, y);
	}
	getDx(d) {
		return this.getDxAtT(d / this.length);
	}
	getDx2AtT(t) { // 2nd derivative
		let x = 6 * ((this.d.x - 3*this.c.x + 3*this.b.x - this.a.x) * t + this.c.x - 2*this.b.x + this.a.x);
		let y = 6 * ((this.d.y - 3*this.c.y + 3*this.b.y - this.a.y) * t + this.c.y - 2*this.b.y + this.a.y);

		return new vec(x, y);
	}
	getDx2(d) {
		return this.getDx2AtT(d / this.length);
	}

	render() {
		ctx.beginPath();
		for (let t = 0; t < this.length; t += 10) {
			let pt = this.get(t);

			if (t === 0) {
				ctx.moveTo(pt.x, pt.y);
			}
			else {
				ctx.lineTo(pt.x, pt.y);
			}
		}
		ctx.strokeStyle = "#ff0000";
		ctx.lineWidth = 1 / camera.scale;
		ctx.stroke();
	}
	renderDx() {
		ctx.strokeStyle = "#000000";
		ctx.lineWidth = 1 / camera.scale;


		for (let t = 10; t < this.length; t += 10) {
			let pt = this.get(t);
			let lastPt = this.get(t - 10);

			ctx.lineWidth = this.getDx(t).length ** 2 * 0.0001 / camera.scale;

			ctx.beginPath();
			ctx.moveTo(lastPt.x, lastPt.y);
			ctx.lineTo(pt.x, pt.y);
			ctx.stroke();

		}
	}
	toObject() {
		return {
			a: this.a.toObject(),
			b: this.b.toObject(),
			c: this.c.toObject(),
			d: this.d.toObject(),
		};
	}
}

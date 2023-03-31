class vec {
	constructor(x, y) {
		if (typeof x === "object") {
			if (Array.isArray(x)) {
				this.x = x[0];
				this.y = x[1];
			}
			else {
				this.x = x.x;
				this.y = x.y;
			}
		}
		else {
			this.x = x;
			this.y = y;
		}

		return this;
	}
	add(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x + vec2, this.y + vec2);
		}
		else {
			return new vec(this.x + vec2.x, this.y + vec2.y);
		}
	}
	sub(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x - vec2, this.y - vec2);
		}
		else {
			return new vec(this.x - vec2.x, this.y - vec2.y);
		}
	}
	mult(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x * vec2, this.y * vec2);
		}
		else {
			return new vec(this.x * vec2.x, this.y * vec2.y);
		}
	}
	div(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x / vec2, this.y / vec2);
		}
		else {
			return new vec(this.x / vec2.x, this.y / vec2.y);
		}
	}
	add2(vec2) {
		if (typeof vec2 === "number") {
			this.x += vec2;
			this.y += vec2;
			return this;
		}
		else {
			this.x += vec2.x;
			this.y += vec2.y;
			return this;
		}
	}
	sub2(vec2) {
		if (typeof vec2 === "number") {
			this.x -= vec2;
			this.y -= vec2;
			return this;
		}
		else {
			this.x -= vec2.x;
			this.y -= vec2.y;
			return this;
		}
	}
	mult2(vec2) {
		if (typeof vec2 === "number") {
			this.x *= vec2;
			this.y *= vec2;
			return this;
		}
		else {
			this.x *= vec2.x;
			this.y *= vec2.y;
			return this;
		}
	}
	div2(vec2) {
		if (typeof vec2 === "number") {
			this.x /= vec2;
			this.y /= vec2;
			return this;
		}
		else {
			this.x /= vec2.x;
			this.y /= vec2.y;
			return this;
		}
	}
	pow(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x ** vec2, this.y ** vec2);
		}
		else {
			return new vec(this.x ** vec2.x, this.y ** vec2.y);
		}
	}
	pow2(vec2) {
		if (typeof vec2 === "number") {
			this.x = this.x ** vec2;
			this.y = this.y ** vec2;
			return this;
		}
		else {
			this.x = this.x ** vec2.x;
			this.y = this.y ** vec2.y;
			return this;
		}
	}
	sign() {
		return new vec(Math.sign(this.x), Math.sign(this.y));
	}
	sign2() {
		this.x = Math.sign(this.x);
		this.y = Math.sign(this.y);
		return this;
	}
	mod(vec2) {
		if (typeof vec2 === "number")
			return new vec(this.x % vec2, this.y % vec2);
		return new vec(this.x % vec2.x, this.y % vec2.y);
	}
	mod2(vec2) {
		if (typeof vec2 === "number") {
			this.x %= vec2;
			this.y %= vec2;
		}
		else {
			this.x %= vec2.x;
			this.y %= vec2.y;
		}
		return this;
	}
	dot(vec2) {
		return this.x * vec2.x + this.y * vec2.y;
	}
	cross(vec2) {
		return this.x * vec2.y - this.y * vec2.x;
	}
	avg(vec2, weight = 0.5) {
		let weight2 = 1 - weight;
		return new vec(this.x * weight + vec2.x * weight2, this.y * weight + vec2.y * weight2);
	}
	get length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	set length(len) {
		let scale = len / this.length;
		this.x *= scale;
		this.y *= scale;

		return this;
	}
	get angle() {
		return Math.atan2(this.y, this.x);
	}
	get area() {
		return this.x * this.y;
	}
	manhattan(vec2) {
		return Math.abs(vec2.x - this.x) + Math.abs(vec2.y - this.y);
	}
	abs() {
		return new vec(Math.abs(this.x), Math.abs(this.y));
	}
	abs2() {
		this.x = Math.abs(this.x);
		this.y = Math.abs(this.y);
		return this;
	}
	reflect(vec2) { // vec2 must be normalized
		// Vect2 = Vect1 - 2 * WallN * (WallN DOT Vect1)
		let v2 = vec2.normal();
		return this.sub(v2.mult(v2.dot(this) * 2));
	}
	reflect2(vec2) { // vec2 must be normalized
		let v2 = vec2.normal();
		return this.sub2(v2.mult(v2.dot(this) * 2));
	}
	rotate(angle) {
		return new vec(Math.cos(angle) * this.x - Math.sin(angle) * this.y, Math.sin(angle) * this.x + Math.cos(angle) * this.y);
	}
	rotate2(angle) {
		let x = Math.cos(angle) * this.x - Math.sin(angle) * this.y;
		this.y = Math.sin(angle) * this.x + Math.cos(angle) * this.y;
		this.x = x;
		return this;
	}
	project(vec2, bound = false) { // projects this vector onto the other one
		let d1 = this.dot(vec2);
		let d2 = vec2.x * vec2.x + vec2.y * vec2.y;

		if (bound) {
			d1 = Math.max(0, Math.min(d2, d1));
		}

		return new vec(d1 * vec2.x / d2, d1 * vec2.y / d2);
	}
	project2(vec2, bound = false) { // projects this vector onto the other one
		let d1 = this.dot(vec2);
		let d2 = vec2.x * vec2.x + vec2.y * vec2.y;

		if (bound) {
			d1 = Math.max(0, Math.min(d2, d1));
		}

		this.x = d1 * vec2.x / d2;
		this.y = d1 * vec2.y / d2;

		return this;
	}
	normalize() {
		let len = this.length;
		if (len === 0) return new vec(this);
		return new vec(this.x / len, this.y / len);
	}
	normalize2() {
		let len = this.length;
		if (len === 0) return this;
		this.x /= len;
		this.y /= len;
		return this;
	}
	normal() { // left hand normal
		return new vec(this.y, -this.x);
	}
	normal2() { // left hand normal
		let y = this.y;
		this.y = -this.x;
		this.x = y;
		return this;
	}
	floor() {
		return new vec(Math.floor(this.x), Math.floor(this.y));
	}
	floor2() {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	}
	ceil() {
		return new vec(Math.ceil(this.x), Math.ceil(this.y));
	}
	ceil2() {
		this.x = Math.ceil(this.x);
		this.y = Math.ceil(this.y);
		return this;
	}
	round() {
		return new vec(Math.round(this.x), Math.round(this.y));
	}
	round2() {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	}
	min(vec2) {
		return new vec(Math.min(vec2.x, this.x), Math.min(vec2.y, this.y));
	}
	min2(vec2) {
		this.x = Math.min(this.x, vec2.x);
		this.y = Math.min(this.y, vec2.y);
		return this;
	}
	max(vec2) {
		return new vec(Math.max(vec2.x, this.x), Math.max(vec2.y, this.y));
	}
	max2(vec2) {
		this.x = Math.max(this.x, vec2.x);
		this.y = Math.max(this.y, vec2.y);
		return this;
	}
	clamp(min, max) {
		return new vec(Math.max(min.x, Math.min(max.x, this.x)), Math.max(min.y, Math.min(max.y, this.y)));
	}
	clamp2(min, max) {
		this.x = Math.max(min.x, Math.min(max.x, this.x));
		this.y = Math.max(min.y, Math.min(max.y, this.y));
		return this;
	}
	equals(vec2) {
		return this.x === vec2.x && this.y === vec2.y;
	}
	set(vec2) {
		this.x = vec2.x;
		this.y = vec2.y;
		return this;
	}
	toString() {
		return `{ x: ${ this.x }, y: ${ this.y } }`;
	}
	toStringInt() {
		return `{ x: ${ Math.round(this.x) }, y: ${ Math.round(this.y) } }`;
	}
	toObj() {
		return { x: this.x, y: this.y };
	}
	isNaN() {
		return isNaN(this.x) || isNaN(this.y);
	}
}

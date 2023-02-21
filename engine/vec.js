class vec {
	constructor(x, y) {
		if (typeof x === "object") {
			this.x = x.x;
			this.y = x.y;
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
		return Math.sqrt(this.x ** 2 + this.y ** 2);
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
	rotate(angle) {
		return new vec(Math.cos(angle) * this.x - Math.sin(angle) * this.y, Math.sin(angle) * this.x + Math.cos(angle) * this.y);
	}
	rotate2(angle) {
		let x = Math.cos(angle) * this.x - Math.sin(angle) * this.y;
		this.y = Math.sin(angle) * this.x + Math.cos(angle) * this.y;
		this.x = x;
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
	normal() {
		return new vec(this.y, -this.x);
	}
	normal2() {
		let y = this.y;
		this.y = -this.x;
		this.x = y;
		return this;
	}
	inverse() {
		return new vec(-this.x, -this.y);
	}
	inverse2() {
		this.x *= -1;
		this.y *= -1;
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
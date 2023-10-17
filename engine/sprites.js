"use strict";

class Sprite {
	static all = {};
	static allBuffers = {};
	static imgDir = "./img/";
	constructor({ src = "", width, height, position, scale = new vec(1, 1) }) {
		this.src = src;
		this.width = width;
		this.height = height;
		this.scale = scale;
		this.loaded = false;
		this.position = position;
		this.useBuffer = false;

		let sprite = this;
		let cache = Sprite.all[src];
		
		if (!cache) {
			let img = new Image();
			
			// document.body.appendChild(img);
			// img.id = src + "-image";
			// img.style.position = "absolute";
			// img.style.top =  "0px";
			// img.style.left = "0px";
			// img.style.opacity = 0.001;
			img.width =  width;
			img.height = height;
			
			// cache image
			Sprite.all[src] = img;

			img.onload = function() {
				sprite.image = img;
				sprite.loaded = true;
				sprite.trigger("load");
				sprite.events.load.length = 0;
			}
			img.src = Sprite.imgDir + src;
		}
		else {
			sprite.image = cache;
			sprite.loaded = true;
			sprite.trigger("load");
			sprite.events.load.length = 0;
		}
	}
	buffer() {
		let { src, width, height, image } = this;
		let cache = Sprite.allBuffers[src];
		if (!cache) {
			let buffer = document.createElement("canvas");
			// let scale = 0.5 * Math.min(1.5, Math.sqrt(canv.width * canv.height / 1700 ** 2));
			// let scale = Math.min(1, camera.scale * 0.9);
			let scale = Math.min(1, camera.scale * 0.8);
			buffer.width  = width  * scale;
			buffer.height = height * scale;

			// console.log(buffer, this);
			buffer.getContext("2d").drawImage(image, 0, 0, buffer.width, buffer.height);
			this.image = buffer;
			Sprite.allBuffers[src] = buffer;

			buffer.id = src + "-buffer";
			buffer.style.position = "absolute";
			buffer.style.top = "0px";
			buffer.style.left = "0px";
			buffer.style.opacity = 0.0001;
			buffer.style.pointerEvents = "none";
			document.body.appendChild(buffer);
		}
		else {
			this.image = cache;
		}
		this.useBuffer = true;
	}
	render = function(position, angle, ctx, spriteScale = new vec(1, 1)) {
		let { position: spritePos, width, height, scale, image } = this;
		scale = scale.mult(spriteScale);

		ctx.translate(position.x, position.y);
		ctx.rotate(angle);
		ctx.scale(scale.x, scale.y);
		ctx.drawImage(image, spritePos.x, spritePos.y, width, height);
		ctx.scale(1 / scale.x, 1 / scale.y);
		ctx.rotate(-angle);
		ctx.translate(-position.x, -position.y);
	}
	deleteCache() {
		delete Sprite.all[this.src];
		if (this.useBuffer) {
			document.body.removeChild(Sprite.allBuffers[this.src]);
			delete Sprite.allBuffers[this.src];
		}
	}

	events = {
		load: [],
	}
	on(event, callback) {
		if (event === "load" && this.loaded) {
			callback();
			return;
		}

		if (this.events[event]) {
			this.events[event].push(callback);
		}
	}
	off(event, callback) {
		event = this.events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	trigger(event) {
		this.events[event].forEach(callback => {
			callback();
		});
	}
}

class SpriteAnimation {
	static all = new Set();
	static update() {
		const now = World.time;
		for (let animation of SpriteAnimation.all) {
			let { startTime, duration, frames, lastFrame, curve, totalLoops, loopNumber } = animation;
			let pLinear = Math.max(0, Math.min(1, (now - startTime) / duration));
			let p = curve(pLinear);
			
			if (pLinear >= 1) {
				if (loopNumber + 1 < totalLoops) {
					animation.loopNumber++;
					animation.startTime = now;
					p = curve(0);
				}
				else {
					animation.lastFrame = frames.length - 1;
					animation.stop();
				}
			}

			let frame = Math.floor(p * frames.length);
			if (p < 1 && frame !== lastFrame) {
				animation.lastFrame = frame;
				animation.callback({ sprite: frames[frame], frame: frame });
			}
		}
	}

	constructor({ frames = [], duration = 200, curve = ease.linear, callback, onstart, onend, totalLoops = 1, autostart = false }) {
		this.frames = frames;
		this.duration = duration;
		this.startTime = World.time;
		this.curve = curve;
		this.pauseTime = 0;
		this.lastFrame = -1;
		this.loopNumber = 0;
		this.totalLoops = totalLoops ?? 1;

		this.callback = callback;
		this.onstart = onstart;
		this.onend = onend;
		this.playing = false;

		if (autostart && totalLoops > 0) {
			SpriteAnimation.all.add(this);
			if (typeof this.onstart === "function") this.onstart();
		}
	}
	stop() {
		if (this.playing) {
			if (typeof this.onend === "function") this.onend();
			SpriteAnimation.all.delete(this);
			this.pauseTime = 0;
			this.lastFrame = -1;
			this.loopNumber = 0;
			this.playing = false;
		}
	}
	pause() {
		if (this.playing) {
			SpriteAnimation.all.delete(this);
			this.pauseTime = World.time - this.startTime;
			this.playing = false;
		}
	}
	start() {
		this.startTime = World.time - this.pauseTime;
		SpriteAnimation.all.add(this);
		this.playing = true;

		if (this.pauseTime === 0 && typeof this.onstart === "function") {
			this.onstart();
		}
	}
}

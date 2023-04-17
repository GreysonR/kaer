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

			// cache image
			Sprite.all[src] = img;

			// img.src = Sprite.imgDir + src;
			// img.decode().then(() => {
			// 	sprite.image = img;
			// 	sprite.loaded = true;
			// }).catch(err => {
			// 	console.log(Sprite.imgDir + src, err, img);
			// });

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
			console.log(width, height);
			buffer.width = width;
			buffer.height = height;

			console.log(buffer, this);
			buffer.getContext("2d").drawImage(image, 0, 0, width, height);
			this.image = buffer;
			Sprite.allBuffers[src] = buffer;

			buffer.id = src + "-buffer";
			buffer.style.position = "absolute";
			buffer.style.top = "0px";
			buffer.style.left = "0px";
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
	delete(deleteCache = false) { // not fully impemented yet
		if (deleteCache) {
			delete Sprite.all[src];
			if (this.useBuffer) {
				document.body.removeChild(this.image);
			}
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
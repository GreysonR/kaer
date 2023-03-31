"use strict";

class Sprite {
	static all = {};
	static imgDir = "./img/";
	constructor({ src = "", width, height, position, scale = new vec(1, 1) }) {
		this.src = src;
		this.width = width;
		this.height = height;
		this.scale = scale;
		this.loaded = false;
		this.position = position;

		let sprite = this;
		let cache = Sprite.all[src];
		
		if (!cache) {
			let img = new Image();
			Sprite.all[src] = img;
			img.src = Sprite.imgDir + src;

			img.onload = function() {
				sprite.image = img;
				sprite.loaded = true;
			}
		}
		else {
			sprite.image = cache;
			sprite.loaded = true;
		}
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
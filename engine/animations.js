"use strict";

// https://easings.net/
const animations = {
	running: new Set(),
	queued: new Set(),
	run: function() {
		let now = ter.World.time;
		for (let loop of this.queued) {
			if (now >= loop.startTime) {
				this.queued.delete(loop);
				this.running.add(loop);
			}
		}
		for (let loop of this.running) {
			loop();
		}
	},
	create: function({ duration = 600, curve = ease.linear, start = 0, delay = 0, onstop, onend, callback, worldTimescale = true }) {
		let t = start * duration;
		let p = t !== 0 && t !== 1 ? curve(t) : t === 0 ? 0 : 1;
		let run = true;

		function loop() {
			if (run) {
				let delta = Performance.delta;
				if (worldTimescale) delta *= ter.World.timescale;
				t += delta;

				p = curve(t / duration);
				callback(p);

				if (t >= duration) {
					run = false;
					animations.running.delete(loop);
				}
				if (t >= duration) {
					if (typeof onend === "function") {
						onend();
					}
				}
			}
		}

		if (delay > 0) {
			loop.startTime = ter.World.time + delay;
			this.queued.add(loop);
		}
		else {
			this.running.add(loop);
		}

		return {
			duration: duration,
			get percent() {
				return p;
			},
			set percent(value) {
				p = Math.max(0, Math.min(value, 1));
			},
			get running() {
				return run;
			},
			stop: () => {
				if (run) {
					run = false;
					if (typeof onstop === "function") {
						onstop(p);
					}
					animations.running.delete(this);
					animations.queued.delete(this);
					return p;
				}
			},
			start: () => {
				if (run === false) {
					run = true;
					
					let now = ter.World.time;
					if (delay > 0 && loop.startTime < now) {
						animations.queued.add(this);
					}
					else {
						animations.running.add(this);
					}
				}
			},
		};
	},
}
const ease = {
	linear: x => x,
	in: {
		sine: x => 1 - Math.cos((x * Math.PI) / 2),
		quadratic: x => x ** 2,
		cubic: x => x ** 3,
		quartic: x => x ** 4,
		quintic: x => x ** 5,
		exponential: x => x === 0 ? 0 : pow(2, 10 * x - 10),
		circular: x => 1 - Math.sqrt(1 - Math.pow(x, 2)),
		back: x => { const c1 = 1.70158; const c3 = c1 + 1; return c3 * x ** 3 - c1 * x ** 2; }
	},
	out: {
		sine: x => Math.sin((x * Math.PI) / 2),
		quadratic: x => 1 - (1 - x) ** 2,
		cubic: x => 1 - Math.pow(1 - x, 3),
		quartic: x => 1 - Math.pow(1 - x, 4),
		quintic: x => 1 - Math.pow(1 - x, 5),
		exponential: x => x === 1 ? 1 : 1 - Math.pow(2, -10 * x),
		circular: x => Math.sqrt(1 - Math.pow(x - 1, 2)),
		back: x => { const c1 = 2; const c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
	},
	inOut: {
		sine: x => -(Math.cos(Math.PI * x) - 1) / 2,
		quadratic: x => x < 0.5 ? 2 * x ** 2 : 1 - Math.pow(-2 * x + 2, 2) / 2,
		cubic: x => x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2,
		quartic: x => x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2,
		quintic: x => x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2,
		exponential: x => x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
		circular: x => x < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2,
		back: x => { const c1 = 1.70158; const c2 = c1 * 1.525; return x < 0.5 ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2 : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2; },
	}
}

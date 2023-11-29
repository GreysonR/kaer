"use strict";

// https://easings.net/
const animations = {
	running: [],
	run: function() {
		let i = this.running.length;

		if (i > 0) {
			for (i; i--;) {
				this.running[i]();
			}
		}
	},
	create: function({ duration = 600, curve = ease.inOut.sine, start = 0, delay = 0, onstop, onend, callback, worldTimescale = true }) {
		let t = start * duration;
		let p = t !== 0 && t !== 1 ? curve(t) : t === 0 ? 0 : 1;
		let run = true;
		let timeout;

		function loop() {
			if (run === true) {
				let delta = Performance.delta;
				if (worldTimescale) delta *= ter.World.timescale;
				t += delta;

				p = curve(t / duration);
				callback(p);

				if (t >= duration) {
					run = false;
					animations.running.splice(animations.running.indexOf(loop), 1);
				}
				if (t >= duration) {
					if (typeof onend === "function") {
						onend();
					}
				}
			}
		}

		if (delay > 0) {
			setTimeout(() => {
				this.running.push(loop);
			}, delay);
		}
		else {
			this.running.push(loop);
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
				if (run === true) {
					run = false;
					if (typeof onstop === "function") {
						onstop(p);
					}
					if (timeout != undefined) {
						clearTimeout(timeout);
					}
					return p;
				}
			},
			start: () => {
				if (run === false) {
					run = true;
					timeout = setTimeout(loop, delay);
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

"use strict";

class Enemy extends Car {
	static all = [];
	constructor(model, options = {}) {
		super(model, options);
		Enemy.all.push(this);

		this.reverseTime = 0;
		this.state = "attack";
	}
	update() {

	}
}

let police = new Enemy("Police Basic");
police.body.setPosition(new vec(3330, 1400));

// Update police AI
Render.on("afterRender", () => {
	let subAngle = ter.Common.angleDiff;
	let now = Performance.aliveTime;

	for (let enemy of Enemy.all) {	
		let { state, reverseTime, body, controls } = enemy;
		let { position, angle } = body;
		let dist = position.sub(player.body.position).length;
		let angleToPlayer = position.sub(player.body.position).angle - Math.PI;
		let angleDiff = subAngle(angleToPlayer, angle);

		if (state === "attack") {
			if (angleDiff > 0) {
				controls.right = true;
				controls.left = false;
			}
			else {
				controls.right = false;
				controls.left = true;
			}
			controls.up = true;

			// slow down to make tight turn
			if (Math.abs(angleDiff) > Math.PI*0.3 && dist < 500) {
				controls.up = (Math.max(10, dist) / 500) ** 3;
			}
			
			// start reversing
			if (body.velocity.length < 5 && Math.abs(angleDiff) > Math.PI * 0.4 && now - reverseTime > 3000) {
				controls.up = false;
				controls.down = true;
				controls.reverseTime = Performance.aliveTime;
				enemy.state = "reverse";
			}
		}
		else if (state === "reverse") {
			if (angleDiff < 0) {
				controls.right = true;
				controls.left = false;
			}
			else {
				controls.right = false;
				controls.left = true;
			}

			if (now - reverseTime > 700) {
				controls.down = false;
				enemy.state = "attack";
			}
		}
	}
});

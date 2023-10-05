"use strict";

class Enemy extends Car {
	static all = [];
	static update() {
		let subAngle = ter.Common.angleDiff;
		let now = Performance.aliveTime;
	
		for (let enemy of Enemy.all) {
			let { state, reverseTime, body, controls, target } = enemy;
			let { position, angle } = body;
			let dist = position.sub(target).length;
			let angleToTarget = position.sub(target).angle - Math.PI;
			let angleDiff = subAngle(angleToTarget, angle);
			let direction = new vec(Math.cos(angle), Math.sin(angle));
	
			if (state === "attack") {
				if (angleDiff * Math.sign(direction.dot(body.velocity)) > 0) {
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
				if (body.velocity.length < 5 && Math.abs(angleDiff) > Math.PI * 0.4 && now - reverseTime > 8000) {
					controls.up = false;
					controls.down = true;
					enemy.reverseTime = Performance.aliveTime;
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
	
				if (now - reverseTime > 2000 || Math.abs(angleDiff) < Math.PI * 0.2) {
					controls.down = false;
					enemy.state = "attack";
				}
			}
		}
	}
	constructor(model, options = {}) {
		super(model, options);
		Enemy.all.push(this);

		this.reverseTime = -10000;
		this.state = "attack";
		this.target = player.body.position;
		let sightBox = this.sightBox = Bodies.rectangle(500, 500, new vec(this.body.position), {
			isSensor: true,
			render: {
				visible: false,
				layer: 10,
				background: "#ff000040",
			}
		});
		let car = this;
		sightBox.collisions = {};
		let updateTarget = this.updateTarget.bind(this);
		sightBox.on("beforeUpdate", updateTarget);
		car.body.on("delete", () => {
			sightBox.off("beforeUpdate", updateTarget);
		});
		sightBox.on("collisionStart", collision => {
			sightBox.collisions[collision.id] = collision;
		});
		sightBox.on("collisionEnd", collision => {
			delete sightBox.collisions[collision.id];
		});

		let renderHealth = this.renderHealth.bind(this);
		Render.on("afterRender", renderHealth);
		car.body.on("delete", () => {
			Render.off("afterRender", renderHealth);
		});

		this.takeDamage = function(damage) {
			const now = Performance.aliveTime;
			const enemy = this;
			if (now - this.lastDamage >= this.damageCooldown) {
				this.lastDamage = now;
				this.health = Math.max(0, this.health - damage);
	
				// health animation
				let startPercent = this.healthBarPercent;
				let nextPercent = this.health / this.maxHealth;
				if (this.healthAnimation && this.healthAnimation.running) {
					this.healthAnimation.stop();
				}
				this.healthAnimation = animations.create({
					duration: 300,
					curve: ease.out.quintic,
					callback: p => {
						enemy.healthBarPercent = p * (nextPercent - startPercent) + startPercent;
					},
				});
	
				// health background animation
				if (this.healthBackgroundAnimation && this.healthBackgroundAnimation.running) {
					this.healthBackgroundAnimation.stop();
				}
				let startBGPercent = this.healthBarBackgroundPercent;
				this.healthBackgroundAnimation = animations.create({
					duration: 500,
					delay: 0,
					curve: ease.inOut.quintic,
					callback: p => {
						enemy.healthBarBackgroundPercent = p * (nextPercent - startBGPercent) + startBGPercent;
					},
				});

				this.showDamageNumber(damage);
				
	
				if (this.health <= 0) {
					this.delete();
				}
			}
		}
	}
	showDamageNumber(damage) {
		let relativePosition = new vec(Math.random() * 150 - 75, -130);
		let offset = new vec(0, Math.random() * -10 - 50);
		let position = relativePosition.add(this.body.position);
		let opacity = 1;
		let duration = 400;
		let colors = [[15, "#FBF9F9"], [25, "#F8BA97"], [50, "#F897B3"], [Infinity, "#F39EFA"]]; // [max damage, color]
		let color = (() => {
			for (let color of colors) {
				if (damage < color[0]) {
					return color[1];
				}
			}
		})();
		let fontSize = 37 + Math.log2(Math.max(1, damage)) * 3;
		animations.create({
			duration: duration,
			curve: ease.linear,
			callback: p => {
				position = relativePosition.add(this.body.position).add2(offset.mult(p));
			},
			onend: () => {
				Render.off("afterRender", render);
			}
		});
		animations.create({
			duration: duration * 0.3,
			delay: duration * 0.7,
			curve: ease.linear,
			callback: p => {
				opacity = 1 - p;
			},
		});

		function render() {
			ctx.globalAlpha = opacity;
			ctx.beginPath();
			ctx.font = `bold ${fontSize}px Dosis`;
			ctx.lineJoin = "round";
			ctx.textAlign = "center";
			ctx.fillStyle = color;
			ctx.strokeStyle = "#28363E80";
			ctx.strokeText(damage, position.x, position.y);
			ctx.fillText(damage, position.x, position.y);
			ctx.globalAlpha = 1;
		}
		Render.on("afterRender", render);
	}
	updateTarget() {
		// set sightBox to follow car
		let sightBox = this.sightBox;
		let angle = this.body.angle;
		let offsetAmount = sightBox.width * 0.5 - 50;
		let offset = new vec(Math.cos(angle) * offsetAmount, Math.sin(angle) * offsetAmount);
		sightBox.setPosition(this.body.position.add(offset));
		sightBox.setAngle(angle);

		// iterate through collision pairs to update target
		let carDirection = new vec(Math.cos(this.body.angle), Math.sin(this.body.angle));
		let direction = player.body.position.sub(this.body.position).normalize2().mult2(500);
		let directionNormalized = direction.normalize();
		for (let collision of Object.values(sightBox.collisions)) {
			let otherBody = collision.bodyA === sightBox ? collision.bodyB : collision.bodyA;
			if (otherBody != this.body && otherBody != player.body && !otherBody.isSensor) {
				let closestPoint = closestPointBetweenBodies(this.body, otherBody);
				let distance = this.body.position.sub(closestPoint);
				let distNormalized = distance.normalize();
				if (Math.abs(distNormalized.dot(carDirection)) > 0.94) {
					distNormalized.normal2();
					if (distNormalized.dot(directionNormalized) < 0) distNormalized.mult2(-1);
				}
				
				direction.add2(distNormalized.mult((400 / distance.length) ** 0.4 * 100 * carDirection.dot(distance.normalize()) ** 2));
			}
		}
		direction.normalize2().mult2(this.body.position.sub(player.body.position).length);
		this.target = this.body.position.add(direction);
	}
	renderTarget() {
		Render.on("afterRender", () => {
			ctx.beginPath();
			let point = police.target;
			ctx.moveTo(point.x, point.y);
			ctx.arc(point.x, point.y, 10 / camera.scale, 0, Math.PI*2);
			ctx.fillStyle = "#ff000080";
			ctx.fill();
		});
	}

	healthBarPercent = 1;
	healthBarBackgroundPercent = 1;
	healthAnimation;
	healthBackgroundAnimation;
	renderHealth() {
		if (this.health < this.maxHealth) {
			let innerWidth = 200;
			let innerHeight = 18;
			let margin = 10;
			let position = this.body.position.add(new vec(0, -100));
			// background
			ctx.beginPath();
			Render.roundedRect(innerWidth + margin * 2, innerHeight + margin * 2, position, 16);
			ctx.fillStyle = "#28363E";
			ctx.fill();
			
			// inner lighter gray
			ctx.beginPath();
			Render.roundedRect(innerWidth, innerHeight, position, 6);
			ctx.fillStyle = "#314753";
			ctx.fill();

			// dark red health background
			{
				ctx.beginPath();
				let width = innerWidth * this.healthBarBackgroundPercent;//innerWidth * (this.health / this.maxHealth);
				Render.roundedRect(width, innerHeight, position.sub(new vec((innerWidth - width) / 2, 0)), 6);
				ctx.fillStyle = "#774251";
				ctx.fill();
			}
			{
				// red health
				ctx.beginPath();
				let width = innerWidth * this.healthBarPercent;// innerWidth * (this.health / this.maxHealth);
				Render.roundedRect(width, innerHeight, position.sub(new vec((innerWidth - width) / 2, 0)), 6);
				ctx.fillStyle = "#DC567C";
				ctx.fill();
			}
		}
	}
}

// Update police AI
Render.on("afterRender", Enemy.update);


let police = new Enemy("Police Basic");
police.body.setPosition(new vec(2450, 2400));
police.renderTarget();
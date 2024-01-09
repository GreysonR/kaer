"use strict";

class EnemyGround extends Character {
	static all = [];
	static update() {
		for (let enemy of EnemyGround.all) {
			enemy.updateAI();
		}
	}
	constructor(model, options = {}) {
		super(model, options);

		// set money value
		this.value = CharacterModels[model].value;

		// init gun
		this.aimVariation = 0.2; // radians
		if (CharacterModels[model].gun) {
			this.gun = new Gun(CharacterModels[model].gun);
		}

		let character = this;
		this.on("spotted", () => {
			character.state = "attack";
			character.seenTime = world.time;
		});

		// reset state
		this.state = "wait";
		this.seenDelay = 1500;
		this.seenTime = -10000;

		// set up targeting
		this.target = player.body.position;
		let sightBox = this.sightBox = Bodies.rectangle(800, 600, new vec(this.body.position), {
			isSensor: true,
			removed: true,
			round: 400,
			roundQuality: 1000,
			render: {
				visible: false,
				layer: 10,
				background: "#ff000040",
			}
		});
		sightBox.collisions = {};
		this.updateTarget = this.updateTarget.bind(this);
		sightBox.on("beforeUpdate", this.updateTarget);
		sightBox.on("collisionStart", collision => {
			let now = world.time;
			sightBox.collisions[collision.id] = collision;

			if (character.state === "wait" && now - character.addTime > 200) {
				let otherBody = collision.bodyA === sightBox ? collision.bodyB : collision.bodyA;
				if (otherBody === player.body || otherBody.isBullet) {
					character.trigger("spotted");
				}
			}
		});
		sightBox.on("collisionEnd", collision => {
			delete sightBox.collisions[collision.id];
		});

		// set up rendering health
		this.renderHealth = this.renderHealth.bind(this);

		this.takeDamage = function(damage) {
			const now = world.time;
			const enemy = this;
			if (now - this.lastDamage >= this.damageCooldown) {
				this.lastDamage = now;
				damage = Math.min(this.health, damage);
				this.health -= damage;
				this.trigger("takeDamage", damage);
	
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
					run.money += this.value;
					renderMoneyGain(this.body.position.add(new vec(0, -100)), this.value);
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
			ctx.lineWidth = 16;
			ctx.strokeText(damage, position.x, position.y);
			ctx.fillText(damage, position.x, position.y);
			ctx.globalAlpha = 1;
		}
		Render.on("afterRender", render);
	}
	updateTarget() {
		this.normals = [];
		// set sightBox to follow car
		let sightBox = this.sightBox;
		let angle = this.body.angle;
		let offsetAmount = sightBox.width * 0.5 - 50;
		if (this.state === "wait") {
			offsetAmount = sightBox.width * 0.3 - 50
		}
		let offset = new vec(Math.cos(angle) * offsetAmount, Math.sin(angle) * offsetAmount);
		sightBox.setPosition(this.body.position.add(offset));
		sightBox.setAngle(angle);

		if (this.state === "wait") {
			return;
		}

		// iterate through collision pairs to update target
		let bodyDirection = new vec(Math.cos(this.body.angle), Math.sin(this.body.angle));
		let distanceToPlayer = this.body.position.sub(player.body.position).length;
		let direction = player.body.position.sub(this.body.position).normalize2().mult2(Math.min(distanceToPlayer, 300));
		let directionNormalized = direction.normalize();
		for (let collision of Object.values(sightBox.collisions)) {
			let otherBody = collision.bodyA === sightBox ? collision.bodyB : collision.bodyA;
			if (otherBody != this.body && otherBody != player.body && !otherBody.isSensor) {
				let { point: closestPoint, normal: closestNormal } = closestEdgeBetweenBodies(this.body, otherBody);
				if (!closestPoint) continue;
				let distance = this.body.position.sub(closestPoint);
				let scale = ((1 - distance.length / sightBox.height) ** 2) * 300;
				if (Math.abs(closestNormal.dot(bodyDirection)) > 0.8) {
					closestNormal.normal2();
					if (closestNormal.dot(directionNormalized) < 0) closestNormal.mult2(-1);
				}
				else {
					scale *= Math.max(0, -bodyDirection.dot(closestNormal.normalize()));
				}
				// let scale = ((400 / distance.length) ** 1) * (carDirection.dot(distance.normalize()) ** 2) * 150;
				this.normals.push([closestPoint, closestNormal.mult(scale)]);
				direction.add2(closestNormal.mult(scale));
			}
		}
		// direction.normalize2().mult2(carDistance);
		this.target = this.body.position.add(direction);
	}
	renderTarget() {
		Render.on("afterRender", (() => {
			ctx.beginPath();
			let point = this.target;
			ctx.moveTo(point.x, point.y);
			ctx.arc(point.x, point.y, 10 / camera.scale, 0, Math.PI*2);
			ctx.fillStyle = "#ff000080";
			ctx.fill();

			for (let edge of this.normals) {
				let [point, normal] = edge;
				ctx.beginPath();
				ctx.moveTo(point.x, point.y);
				ctx.arc(point.x, point.y, 4 / camera.scale, 0, Math.PI * 2);
				ctx.closePath();
				ctx.fillStyle = "blue";
				ctx.fill();

				ctx.beginPath();
				ctx.moveTo(point.x, point.y);
				let line = normal.mult(0.15 / camera.scale);
				ctx.lineTo(point.x + line.x, point.y + line.y);
				ctx.strokeStyle = "blue";
				ctx.lineWidth = 3 / camera.scale;
				ctx.stroke();
			}
		}).bind(this));
	}
	add() {
		super.add();
		EnemyGround.all.push(this);
		this.body.add();
		this.sightBox.add();
		Render.on("afterRender", this.renderHealth);

		if (this.healthAnimation) this.healthAnimation.stop();
		if (this.healthBackgroundAnimation) this.healthBackgroundAnimation.stop();
		this.healthBarPercent = 1;
		this.healthBarBackgroundPercent = 1;

		this.state = "wait";
		this.seenTime = -10000;
		this.addTime = world.time;
		this.body.velocity.set(new vec(0, 0));

		if (this.spawn) {
			this.body.setPosition(new vec(this.spawn.position));
			this.body.setAngle(this.spawn.angle);
		}
	}
	delete() {
		super.delete();
		EnemyGround.all.delete(this);
		this.body.delete();
		this.sightBox.delete();
		Render.off("afterRender", this.renderHealth);
		
		this.state = "wait";
		this.seenTime = -10000;
		this.body.velocity.set(new vec(0, 0));
	}

	updateAI() {
		let now = world.time;
		let { state, body, controls, target, seenTime } = this;
		let range = this.gun ? this.gun.range : 1000;
		let { position } = body;
		let distance = target.sub(position);
		let direction = distance.normalize();
		let realDistance = player.body.position.sub(position);
		
		controls.left = false;
		controls.right = false;
		controls.up = false;
		controls.down = false;
		if (state === "wait") {
			controls.shoot = false;
		}
		else if (state === "alert") {
			if (realDistance.length < Math.max(1500, range * 1.7)) {
				this.state = "attack";
			}
		}
		else if (state === "attack") {
			if (realDistance.length > Math.max(1500, range * 1.7)) {
				this.state = "alert"; // don't move if too far away
				return;
			}
			controls.right = direction.x;
			controls.down = direction.y;
			// if (direction.x > 0.2) controls.right = true;
			// else if (direction.x < -0.2) controls.left = true;
			// if (direction.y > 0.2) controls.down = true;
			// else if (direction.y < -0.2) controls.up = true;
			body.setAngle(direction.angle);

			if (realDistance.length < range * 0.5) {
				this.state = "shoot";
			}
			
			if (player.health > 0 && now - seenTime >= this.seenDelay && this.body.position.sub(player.body.position).length <= range) {
				controls.shoot = true;

				let { aimVariation } = this;
				let diff = player.body.position.sub(this.body.position);
				let angle = diff.angle + Math.random() * aimVariation - aimVariation / 2;
				this.gunTarget.set(new vec(Math.cos(angle), Math.sin(angle)).mult2(diff.length).add(this.body.position));
			}
			else {
				controls.shoot = false;
			}
		}
		else if (state === "shoot") {
			if (player.health > 0 && now - seenTime >= this.seenDelay && this.body.position.sub(player.body.position).length <= range) {
				controls.shoot = true;

				let { aimVariation } = this;
				let diff = player.body.position.sub(this.body.position);
				let angle = diff.angle + Math.random() * aimVariation - aimVariation / 2;
				this.gunTarget.set(new vec(Math.cos(angle), Math.sin(angle)).mult2(diff.length).add(this.body.position));
			}
			else {
				controls.shoot = false;
			}

			if (realDistance.length > range * 0.5) {
				this.state = "attack";
			}

			if (realDistance.length < Math.min(range * 0.3, 200)) {
				controls.right = -direction.x;
				controls.down = -direction.y;
			}
		}
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

class GroundBasic extends EnemyGround {
	constructor(position, angle) {
		super("GroundBasic", {
			spawn: {
				position: position,
				angle: angle,
			}
		});
	}
}

// Update AI
Render.on("afterRender", EnemyGround.update);

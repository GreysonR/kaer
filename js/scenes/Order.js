"use strict";

class Order {
	static radius = 420;
	static id = -1;
	constructor({ radius, position, scene, reward = 100, type = "blue", quantity = 4 }) {
		this.type = type;
		this.color = Resources[type].color;
		let body = this.body = Bodies.circle(radius + Order.radius, position, {
			isSensor: true,
			isStatic: true,
			removed: true,
			collisionFilter: {
				mask: "1",
			},
			render: {
				visible: false,
				layer: -1,
				background: this.color + "80",
			}
		});
		let order = this;
		body.on("collisionActive", collision => {
			let delta = Engine.delta;
			let otherBody = collision.bodyA === body ? collision.bodyB : collision.bodyA;
			if (otherBody === player.body) {
				let inventoryItem = run.inventory[order.type];
				if (inventoryItem.getValue() > 0) {
					order.completeQuantity += delta * order.completeSpeed * 0.01 / this.requiredQuantity;
					order.completeQuantity = Math.min(order.requiredQuantity, order.completeQuantity);
	
					if (Math.floor(order.completeQuantity) > order.wholeCompleteQuanity) {
						order.wholeCompleteQuanity = Math.floor(order.completeQuantity);
						scene.setCompletedOrders(scene.completedOrders + 1);
						inventoryItem.setValue(inventoryItem.getValue() - 1);
						
						let moneyGain = Resources[type].value;
						run.money += moneyGain;
						// console.log(`${order.type}: ${inventoryItem.getValue()}, money: ${run.money}`);

						// create text to show money gain
						let numDots = this.requiredQuantity;
						let dotRadius = 20;
						let dotMargin = 10;
						let dotPosition = position.add(new vec(((numDots - order.wholeCompleteQuanity) / (numDots - 1)) * (dotRadius * 2 + dotMargin) * numDots - (dotRadius * 2 + dotMargin) * numDots * 0.5, 0))
						let textStart = dotPosition.add(new vec(0, -50));
						renderMoneyGain(textStart, moneyGain);
						
						order.createParticles(dotPosition);
	
						if (scene.completedOrders == scene.requiredOrders) {
							window.dispatchEvent(new CustomEvent("levelFinish"));
						}
					}
	
					if (order.completeQuantity === order.requiredQuantity && !order.isComplete) {
						order.complete();
					}
				}
			}
		});

		this.scene = scene;
		this.requiredQuantity = quantity;
		this.reward = reward;
		this.updatePercentComplete = this.updatePercentComplete.bind(this);
	}
	complete() {
		this.isComplete = true;
		this.delete();
	}
	createParticles(position) {
		let order = this;
		// - particle effects
		// create particles
		let particles = [];
		for (let i = 0; i < 5; i++) {
			let angle = Math.random() * Math.PI * 2;
			let distance = Math.random() * 50 + 15;
			let offset = new vec(Math.cos(angle) * distance, Math.sin(angle) * distance);
			let start = new vec(position);
			let maxLength = 10;
			let particle = {
				start: new vec(start),
				end: new vec(start),
			}
			let pLength = maxLength / distance;
			let pScale = (1 + pLength);
			particles.push(particle);

			// animate particle
			animations.create({
				duration: Math.random() * 300 + 400,
				curve: ease.out.quadratic,
				callback: p => {
					p *= pScale;
					particle.end = start.add(offset.mult(Math.min(1, p)));
					particle.start = start.add(offset.mult(Math.max(0, p - pLength)));
				},
				onend: () => {
					particles.delete(particle);
				}
			});
		}
		// create circle
		let circle = {
			position: new vec(position),
			radius: 0,
			maxRadius: Math.random() * 10 + 20,
			maxLineWidth: 6,
			lineWidth: 6,
		};
		animations.create({ // radius animation
			duration: 400,
			curve: ease.out.quadratic,
			callback: p => {
				circle.radius = p * circle.maxRadius;
			},
			onend: () => {
				circle.radius = circle.maxRadius;
			}
		});
		animations.create({ // lineWidth animation
			duration: 350,
			delay: 50,
			curve: ease.out.quadratic,
			callback: p => {
				circle.lineWidth = (1 - p) * circle.maxLineWidth;
			},
			onend: () => {
				circle.lineWidth = 0;
			}
		});
		function render() {
			if (particles.length === 0 && circle.lineWidth === 0) {
				Render.off("afterRender", render);
				return;
			}

			// particles
			ctx.lineCap = "round";
			ctx.strokeStyle = order.color;
			ctx.beginPath();
			ctx.lineWidth = 7;
			for (let particle of particles) {
				ctx.moveTo(particle.start.x, particle.start.y);
				ctx.lineTo(particle.end.x, particle.end.y);
			}
			ctx.stroke();

			// circle
			if (circle.lineWidth > 0) {
				ctx.beginPath();
				ctx.arc(circle.position.x, circle.position.y, circle.radius, 0, Math.PI * 2);
				ctx.lineWidth = circle.lineWidth;
				ctx.stroke();
			}
		}
		Render.on("afterRender", render);
	}
	updatePercentComplete() {
		let delta = Engine.delta;
		if (this.completeQuantity > Math.floor(this.completeQuantity) && this.completeQuantity < this.requiredQuantity && this.completeQuantity === this.lastCompleteQuantity) { // decrease percent complete
			this.completeQuantity = Math.max(Math.floor(this.completeQuantity), this.completeQuantity - delta * 0.01 * this.completeSpeed * 0.3 / this.requiredQuantity);
		}
		this.body.render.opacity = 1 - this.completeQuantity;
		this.lastCompleteQuantity = this.completeQuantity;

		let percent = this.completeQuantity / this.requiredQuantity;

		// render complete %
		ctx.beginPath();
		
		let numDots = this.requiredQuantity;
		let dotRadius = 20;
		let dotMargin = 10;
		for (let i = 0; i < numDots; i++) {
			let position = this.body.position.add(new vec((i / (numDots - 1)) * (dotRadius * 2 + dotMargin) * numDots - (dotRadius * 2 + dotMargin) * numDots * 0.5, 0));
			let radius = Math.min(1, ((1 - (i) / numDots) - percent) * numDots) ** 0.8 * dotRadius;
			if (radius > 0) {
				ctx.moveTo(position.x, position.y);
				ctx.arc(position.x, position.y, radius, 0, Math.PI*2);
			}
		}

		ctx.fillStyle = this.color;
		ctx.fill();
	}
	add() {
		this.body.add();
		this.completeQuantity = 0;
		this.lastCompleteQuantity = 0;
		this.wholeCompleteQuanity = 0;
		this.isComplete = false;
		Render.on("afterRender", this.updatePercentComplete);
	}
	delete() {
		this.body.delete();
		Render.off("afterRender", this.updatePercentComplete);
	}
	body = null;
	scene = null;
	
	type = "";
	color = "";
	reward = 100;

	completeQuantity = 0; // double
	wholeCompleteQuanity = 0; // int
	lastCompleteQuantity = 0;

	requiredQuantity = 4;
	completeSpeed = 8;
	isComplete = false;
}

"use strict";

class Order {
	static radius = 420;
	static colors = {
		brown: "#BB816E",
		red: "#DC567C",
		blue: "#49ADE9",
		green: "#A7D679",
	};
	static id = -1;
	constructor({ radius, position, scene, reward = 100, type = "blue", quantity = 4 }) {
		this.type = type;
		this.color = Order.colors[type];
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
				order.completeQuantity += delta * order.completeSpeed * 0.01 / this.requiredQuantity;
				order.completeQuantity = Math.min(order.requiredQuantity, order.completeQuantity);

				if (Math.floor(order.completeQuantity) > order.wholeCompleteQuanity) {
					order.wholeCompleteQuanity = Math.floor(order.completeQuantity);
					++scene.completedOrders;

					if (scene.completedOrders == scene.requiredOrders) {
						console.log("COMPLETE");
					}
				}

				if (order.completeQuantity === order.requiredQuantity && !order.complete) {
					order.complete = true;
					order.delete();
				}
			}
		});

		this.icon = Bodies.rectangle(119 * 0.7, 156 * 0.7, new vec(position.x, position.y - 100), {
			isStatic: true,
			hasCollisions: false,
			removed: true,
			render: {
				visible: false,
				sprite: `ui/markers/${ this.type }.svg`,
				layer: 100,
			}
		});

		this.scene = scene;
		this.requiredQuantity = quantity;
		this.reward = reward;
		this.updatePercentComplete = this.updatePercentComplete.bind(this);
	}
	updatePercentComplete() {
		let delta = Engine.delta;
		if (this.completeQuantity > Math.floor(this.completeQuantity) && this.completeQuantity < this.requiredQuantity && this.completeQuantity === this.lastCompleteQuantity) { // decrease percent complete
			this.completeQuantity = Math.max(Math.floor(this.completeQuantity), this.completeQuantity - delta * 0.01 * this.completeSpeed * 0.3 / this.requiredQuantity);
		}
		this.body.render.opacity = 1 - this.completeQuantity;
		this.lastCompleteQuantity = this.completeQuantity;

		this.icon.render.visible = false;
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
		this.icon.add();
		this.completeQuantity = 0;
		this.lastCompleteQuantity = 0;
		this.wholeCompleteQuanity = 0;
		this.complete = false;
		Render.on("afterRender", this.updatePercentComplete);
	}
	delete() {
		this.body.delete();
		this.icon.delete();
		Render.off("afterRender", this.updatePercentComplete);
	}
	body = null;
	icon = null;
	scene = null;
	
	type = "";
	color = "";
	reward = 100;

	completeQuantity = 0; // double
	wholeCompleteQuanity = 0; // int
	lastCompleteQuantity = 0;

	requiredQuantity = 4;
	completeSpeed = 8;
	complete = false;
}

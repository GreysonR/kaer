"use strict";

class KingBoss extends EnemyGround {
	phases = {
		wait: "wait",
		phase1: "phase1",
		phase2: "phase2",
	}
	states = {
		roam: (() => { // (almost) always active state that controls position
			function roam() {
				let now = world.time;
				let { enemy } = this;
				let { body } = enemy;
				if (now >= this.nextChange) {
					this.nextChange = now + boundedRandom(this.changeTime);
					this.target = new vec(boundedRandom([this.bounds.min.x, this.bounds.max.x]), boundedRandom([this.bounds.min.y, this.bounds.max.y]));
				}
				let direction = this.target.sub(body.position);
				let distance = direction.length;
				if (distance < 100) {
					enemy.controls.down = 0;
					enemy.controls.right = 0;
					this.startPoint = new vec(body.position);
				}
				else {
					direction.normalize2();
					enemy.controls.right = direction.x;
					enemy.controls.down = direction.y;

					let startDistance = this.startPoint.sub(body.position).length;
					enemy.speed = CharacterModels[enemy.model].stats.speed * Math.min(1, (Math.min(startDistance + 70, distance - 40) / 100) ** 2);
				}
			}
			roam.lastChange = -10000;
			roam.changeTime = [4000, 8000];
			roam.startPoint = new vec(this.spawn.position);
			roam.bounds = {
				min: new vec(this.spawn.position).sub(300),
				max: new vec(this.spawn.position).add(300),
			};
			roam.nextChange = 0;
			roam.target = new vec(0, 0);
			roam.enemy = this;

			return roam.bind(roam);
		}),
		wait: {
			wait: (changedTo) => {
				if (changedTo) {
				}
				else {
					this.states.roam();

					if (player.body.position.sub(this.body.position).length < 1000 && player.health > 0) {
						this.phase = "phase1";
						this.setState("startFight");
					}
				}
			},
		},
		phase1: {
			startFight: (changedTo) => {
				if (changedTo) {
					let enemy = this;
					let startPosition = new vec(camera.position);
					let endPosition = new vec(this.body.position);
					let deltaPosition = endPosition.sub(startPosition);
					let startFov = camera.fov;
					let deltaFov = 1800 - startFov;

					player.controls.locked = true;
					world.timescale = 0.1;
					gameCamera.update = false;

					animations.create({
						worldTimescale: false,
						duration: 1400,
						curve: ease.out.cubic,
						callback: p => {
							updateGameCamera();
							camera.position.set(startPosition.add(deltaPosition.mult(p)));
							camera.fov = startFov + deltaFov * p;
						},
						onend: () => {
							deltaPosition = getDefaultCameraPosition().sub(endPosition);
							animations.create({
								worldTimescale: false,
								duration: 700,
								curve: ease.out.quadratic,
								callback: p => {
									camera.position.set(endPosition.add(deltaPosition.mult(p)));
									camera.fov = startFov + deltaFov * (1 - p);
									world.timescale = 0.1 + 0.9 * Math.max(0, (p - 0.5) / 0.5);
								},
								onend: () => {
									player.controls.locked = false;
									world.timescale = 1;
									gameCamera.update = updateGameCamera;
									let enemy = this;
									animations.create({
										delay: 400,
										curve: ease.linear,
										duration: 0,
										callback: p => {},
										onend: () => {
											enemy.setState("chooseAttack");
										}
									});
								}
							});
						}
					});
				}
			},
			chooseAttack: (changedTo) => {
				if (changedTo) {
					if (this.health <= 0) return;
					if (player.health <= 0) {
						this.phase = "wait";
						this.setState("wait");
						return;
					}

					console.log("choosing attack");
					let nextAttack = "sceptorPound"; // change to random
					
					animations.create({
						delay: 800,
						curve: ease.linear,
						duration: 0,
						callback: p => {},
						onend: () => {
							if (this.health <= 0) return;
							this.setState(nextAttack);
						}
					});
				}
				else {
					this.states.roam();
				}
			},
			sceptorPound: (changedTo) => {
				if (changedTo) {
					let enemy = this;
					function createShockwave(position) {
						if (enemy.health <= 0) return;
						let duration = 2300;
						
						let maxRadius = 1700;
						let radius = 0;

						let maxLineWidth = 24;
						let lineWidth = maxLineWidth;

						let startAngle = Math.random() * 3;
						let angle = 0;

						let dash = 200;

						function render() {
							if (lineWidth > 0 && (dash == 0 || dash >= 1)) {
								ctx.beginPath();
								ctx.arc(position.x, position.y, radius, angle + 0.1, Math.PI * 2 + angle);
								ctx.strokeStyle = "#EA6965b0";
								ctx.lineWidth = lineWidth;
								if (dash >= 1) {
									ctx.lineCap = "round";
									ctx.setLineDash([dash, dash * 0.4]);
								}
								ctx.stroke();
								ctx.setLineDash([]);

								{
									let r = Math.max(0, radius - lineWidth - 15);
									let dash = 2 * Math.PI * Math.max(1, r) / 20;
									let angleOffset = 0.1;
									ctx.beginPath();
									ctx.arc(position.x, position.y, r, angle + 0.1 + angleOffset, Math.PI * 2 + angle + angleOffset);
									ctx.strokeStyle = "#F99B7880";
									ctx.lineWidth = lineWidth * 0.8;
									if (dash >= 1) {
										ctx.lineCap = "round";
										ctx.setLineDash([dash, dash * 0.4, dash * 0.3, dash * 0.4]);
									}
									ctx.stroke();
									ctx.setLineDash([]);
								}
								{
									let r = Math.max(0, radius - lineWidth * 2 - 30);
									let dash = 2 * Math.PI * Math.max(1, r) / 20;
									let angleOffset = 0.2;
									ctx.beginPath();
									ctx.arc(position.x, position.y, r, angle + 0.1 + angleOffset, Math.PI * 2 + angle + angleOffset);
									ctx.strokeStyle = "#EA696550";
									ctx.lineWidth = lineWidth * 0.7;
									if (dash >= 1) {
										ctx.lineCap = "round";
										ctx.setLineDash([dash, dash * 0.4]);
									}
									ctx.stroke();
									ctx.setLineDash([]);
								}

								let direction = player.body.position.sub(position);
								if (Math.abs(direction.length - (radius - lineWidth)) < lineWidth * 3) {
									let startHealth = player.health;
									player.takeDamage(5);
								}
							}
						}
						animations.create({
							duration: duration,
							curve: ease.linear,
							callback: p => {
								radius = maxRadius * p;
								dash = 2 * Math.PI * Math.max(1, radius) / 20;
								angle = p * Math.PI * 0.3 + startAngle;
							},
							onend() {
								Render.off("afterLayer0", render);
							},
						});
						animations.create({
							duration: 300,
							delay: Math.max(0, duration - 300),
							curve: ease.linear,
							callback: p => {
								lineWidth = maxLineWidth * (1 - p);
							},
						});
						Render.on("afterLayer0", render);
					}

					let body = this.body;
					createShockwave(new vec(body.position));
					animations.create({
						delay: 900,
						curve: ease.linear,
						duration: 0,
						callback: p => {},
						onend: () => {
							createShockwave(new vec(body.position));
						}
					});
					animations.create({
						delay: 900 * 2,
						curve: ease.linear,
						duration: 0,
						callback: p => {},
						onend: () => {
							createShockwave(new vec(body.position));
						}
					});
					animations.create({
						delay: 900 * 3 + 400,
						curve: ease.linear,
						duration: 0,
						callback: p => {},
						onend: () => {
							enemy.setState("chooseAttack");
						}
					});
				}
				else {
					this.states.roam();
				}
			},
			summonServants: "summonServants",
			charge: "charge",
			avalanch: "avalanch",
		},
		phase2: {
			summonServants: "summonServants", // same as normal
			sceptorSweep: "sceptorSweep", // directional bullet hell
			sceptorMagicPound: "sceptorMagicPound", // bullet hell
			greatAvalanch: "greatAvalanch", // more intense avalanch falling thing
		}
	}
	constructor(position, angle) {
		super("KingBoss", {
			spawn: {
				position: position,
				angle: angle,
			}
		});

		this.sightBox.delete();
		this.renderHealth = this.renderHealth.bind(this);
		this.states.roam = this.states.roam.call(this);
	}

	// states
	setState(newState) {
		this.state = newState;
		if (typeof this.states[this.phase][this.state] == "function") {
			this.states[this.phase][this.state](true);
		}
	}

	add() {
		super.add();
		this.sightBox.delete();
		// Render.off("afterRender", this.renderHealth);
		
		this.phase = "wait";
		this.setState("wait");

		this.seenTime = -10000;
		this.addTime = world.time;
		this.body.velocity.set(new vec(0, 0));

		if (this.spawn) {
			this.body.setPosition(new vec(this.spawn.position));
			this.body.setAngle(this.spawn.angle);
		}
	}
	updateAI() {
		let stateFunc = this.states[this.phase][this.state];
		if (typeof stateFunc === "function") {
			stateFunc(false);
			this.body.setAngle(0);
			this.body.angularVelocity = 0;
		}
		else {
			console.warn(`No function for phase ${this.phase}, state ${this.state}`);
		}
	}
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
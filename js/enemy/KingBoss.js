"use strict";

class KingBoss extends EnemyGround {
	phases = {
		wait: "wait",
		phase1: "phase1",
		phase2: "phase2",
	}
	states = {
		roam: (() => { // randomly roams area
			function roam() {
				let now = world.time;
				let { enemy } = this;
				let { body } = enemy;
				if (now >= this.nextChange) {
					this.nextChange = now + boundedRandom(this.changeTime);
					this.target = boundedRandomPoint(this.bounds);
				}
				let direction = this.target.sub(body.position);
				let distance = direction.length;
				if (distance < 100) {
					enemy.controls.down = 0;
					enemy.controls.right = 0;
				}
				else {
					direction.normalize2();
					enemy.controls.right = direction.x;
					enemy.controls.down = direction.y;
				}
			}
			roam.lastChange = -10000;
			roam.changeTime = [4000, 8000];
			roam.bounds = {
				min: new vec(this.spawn.position).sub(300),
				max: new vec(this.spawn.position).add(300),
			};
			roam.nextChange = 0;
			roam.target = new vec(0, 0);
			roam.enemy = this;

			return roam.bind(roam);
		}),
		approach: (() => { // slowly walks boss towards player
			function walk() {
				let { enemy } = this;
				let { body } = enemy;

				let direction = player.body.position.sub(body.position);
				let distance = direction.length;
				if (distance < 200) {
					enemy.controls.down = 0;
					enemy.controls.right = 0;
					this.startPoint = new vec(body.position);
				}
				else {
					direction.normalize2();
					if (Common.pointInBounds(body.position, this.bounds) || direction.dot(this.center.sub(body.position)) > -0.4) {
						enemy.controls.right = Math.abs(direction.x) > 0.3 ? Math.sign(direction.x) : 0;
						enemy.controls.down =  Math.abs(direction.y) > 0.3 ? Math.sign(direction.y) : 0;
					}
					else {
						enemy.controls.right = 0;
						enemy.controls.down = 0;
					}

					enemy.speed = CharacterModels[enemy.model].stats.speed;
				}
			}
			walk.center = new vec(this.spawn.position);
			walk.bounds = {
				min: walk.center.sub(500),
				max: walk.center.add(500),
			};
			walk.enemy = this;

			return walk.bind(walk);
		}),
		stop: () => {
			this.controls.up = false;
			this.controls.down = false;
			this.controls.left = false;
			this.controls.right = false;
		},
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
							let frameElem = document.getElementById("kingBossFrame");
							frameElem.classList.add("active");
							setTimeout(() => {
								frameElem.classList.remove("active");
							}, 2000);

							animations.create({
								worldTimescale: false,
								delay: 2000,
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
				else {
					this.states.stop();
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

					let possibleAttacks = ["sceptorPound", "charge", "summonServants", "avalanch"];
					let nextAttack = possibleAttacks.choose();
					// let nextAttack = "avalanch"; // change to random
					
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
					this.states.approach();
				}
			},
			sceptorPound: (changedTo) => {
				if (changedTo) {
					let enemy = this;
					function createShockwave(position) {
						if (enemy.health <= 0) return;
						let duration = 2000;
						
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
					this.states.stop();
				}
			},
			summonServants: (changedTo) => {
				let boss = this;
				if (changedTo) {
					if (boss.adds.length >= boss.maxAdds) {
						boss.setState("chooseAttack");
						return;
					}
					let summonTypes = ["GroundBasic"];
					let summonQuantity = 3
					let summonTime = 600;
					let totalTime = 1400;
					let angleOffset = Math.random() * Math.PI;

					for (let i = 0; i < summonQuantity; ++i) {
						if (boss.adds.length >= boss.maxAdds) break;
						let time = summonTime * (i + 1) / summonQuantity;
						let type = summonTypes[Math.floor(Math.random() * summonTypes.length)];
						
						let angle = Math.PI*2 * (i + 1) / summonQuantity + angleOffset;
						let distance = Math.random() * 150 + 80;
						let position = new vec(Math.cos(angle) * distance, Math.sin(angle) * distance).add(boss.body.position);
						
						let enemy = new Enemies[type](position, 0);
						enemy.value = 0;
						enemy.on("takeDamage", () => {
							if (enemy.health <= 0) {
								boss.adds.delete(enemy);
							}
						});
						boss.adds.push(enemy);
						
						animations.create({
							delay: time,
							curve: ease.linear,
							duration: 0,
							callback: p => {},
							onend: () => {
								enemy.add();
								enemy.state = "attack";
							}
						});
					}
					
					animations.create({
						delay: totalTime,
						curve: ease.linear,
						duration: 0,
						callback: p => {},
						onend: () => {
							boss.setState("chooseAttack");
						}
					});
				}
				else {
					this.states.stop();
				}
			},
			charge: (changedTo) => {
				if (changedTo) {
					let boss = this;
					let pathSprite = new Sprite({
						src: "bossRoom/chargePath.png",
						width: 1364,
						height: 275,
						position: new vec(-1364/2, -275/2),
					});
					
					const chargeDistance = pathSprite.width;
					const chargeTime = 200;
					const rotationSpeed = 0.015;
					const damage = 8;
					let direction = player.body.position.sub(boss.body.position);
					let angle = direction.angle;
					let spritePosition = new vec(Math.cos(angle) * pathSprite.width / 2, Math.sin(angle) * pathSprite.width / 2).add2(boss.body.position);
					let chargeAnimation;

					let hitbox = Bodies.circle(pathSprite.height / 2, new vec(boss.body.position), {
						numSides: 8,
						isSensor: true,
						render: {
							visible: false,
						}
					});

					boss.body.collisionFilter.mask = 0b10;
					
					function renderPath() {
						ctx.beginPath();
						pathSprite.render(spritePosition, angle, ctx);
					}
					Render.on("beforeLayer0", renderPath);

					function updateHitbox() {
						hitbox.setPosition(boss.body.position);
					}
					boss.body.on("beforeUpdate", updateHitbox);


					function damagePlayer(collision) {
						let otherBody = collision.bodyA == hitbox ? collision.bodyB : collision.bodyA;
						if (otherBody === player.body) {
							player.takeDamage(damage);
						}
						else if (otherBody.isStatic && chargeAnimation && otherBody.position.sub(boss.body.position).dot(direction) > 0) {
							chargeAnimation.stop();
						}
					}
					hitbox.on("collisionActive", damagePlayer);

					function stop() {
						Render.off("beforeLayer0", renderPath);
						
						boss.body.off("beforeUpdate", updateHitbox);
						hitbox.off("collisionActive", damagePlayer);
						hitbox.delete();
						
						boss.body.collisionFilter.mask = 0;

						boss.setState("chooseAttack");
					}

					function charge() {
						let deltaPosition = new vec(Math.cos(angle), Math.sin(angle)).mult(chargeDistance - 50);
						let velocity = deltaPosition.div(chargeTime).mult2(16.67 * 3.33);

						chargeAnimation = animations.create({
							curve: ease.linear,
							duration: chargeTime,
							callback: p => {
								boss.body.velocity.set(velocity.mult(Engine.delta));
							},
							onend: stop,
							onstop: stop,
						});
					}

					// track player
					animations.create({
						delay: 0,
						curve: ease.linear,
						duration: 800,
						callback: p => {
							// go towards player
							boss.states.approach();

							// rotate to follow player
							let targetDirection = player.body.position.sub(boss.body.position);
							let targetAngle = targetDirection.angle;
							let angleDiff = Common.angleDiff(targetAngle, angle);
							angle += Math.min(Math.abs(angleDiff), rotationSpeed) * Math.sign(angleDiff) * Engine.delta;

							direction = new vec(Math.cos(angle), Math.sin(angle));
							spritePosition = direction.mult(pathSprite.width/2).add2(boss.body.position);
						},
						onend: () => {
							direction = new vec(Math.cos(angle), Math.sin(angle));
							// lock into a position + angle
							animations.create({
								delay: 0,
								curve: ease.linear,
								duration: 200,
								callback: p => {
									boss.states.stop();
									spritePosition = direction.mult(pathSprite.width/2).add2(boss.body.position);
								},
								onend: () => {
									// charge at player
									charge();
								}
							});
						}
					});
				}
			},
			avalanch: (changeTo) => {
				if (changeTo) {
					let boss = this;
					let boulders = new Set();
					const numBoulders = 40;
					const minBoulderDistance = 450;
					const damage = 5;
					const spawnBounds = {
						min: boss.body.position.sub(700),
						max: boss.body.position.add(700),
					}

					const maxSpawnDuration = 7000;
					const fallTime = 800;
					const fallHeight = 300;
					const scaleBounds = [1, 1.8]
					const delayBounds = [0, maxSpawnDuration - fallTime];
					const numBoulderSprites = 4;
					const now = world.time;

					const dangerSprite = new Sprite({
						src: "bossRoom/boulderDangerArea.png",
						width: 294,
						height: 298,
						position: new vec(-294/2, -298/2),
						scale: new vec(0.9, 0.9),
					});

					function nearOtherBoulders(position, time) {
						for (let boulder of boulders) {
							if (Math.abs(boulder.impactTime - time) < fallTime + 300 && boulder.position.sub(position).length <= minBoulderDistance) {
								return true;
							}
						}
						return false;
					}
					function boulderHitGround(position) {
						createExplosion(position, {
							circle: {
								duration: 500,
								fadeDuration: 300,
								radius: [150, 170],
								lineWidth: 12,
								dash: 100,
								color: "#F7EFEC90",
							},
							lines: {
								visible: false,
							},
							dots: {
								duration: [400, 800],
								radius: [19, 30],
								distance: [100, 280],
								angle: [0, Math.PI*2],
								colors: [
									{
										color: "#F29978",
										quantity: 15,
									},
									{
										color: "#F5F1EF",
										quantity: 15,
									},
								],
							}
						});
					}
					function renderImpactArea() {
						for (let boulder of boulders) {
							let position = boulder.impactPosition;
							let scale = new vec(boulder.scale, boulder.scale);

							if (scale.x <= 0) continue;
							dangerSprite.render(position, 0, ctx, scale);
						}
					}
					Render.on("beforeLayer0", renderImpactArea);
					animations.create({ // wait until all boulders have fallen before switching to new attack
						delay: maxSpawnDuration + 400,
						duration: 0,
						curve: ease.linear,
						callback: p => {},
						onend: () => {
							Render.off("beforeLayer0", renderImpactArea);
							boss.setState("chooseAttack");
						},
					});

					for (let i = 0; i < numBoulders; ++i) {
						let impactPosition = boundedRandomPoint(spawnBounds);
						let n = 0;
						let delay = boundedRandom(delayBounds);
						let impactTime = world.time + delay + fallTime;

						while (nearOtherBoulders(impactPosition, impactTime) && ++n < 100) {
							impactPosition.set(boundedRandomPoint(spawnBounds));
							delay = boundedRandom(delayBounds)
							impactTime = now + delay + fallTime;
						}
						if (n >= 100) { // can't spawn any more
							break;
						}

						let boulder = Bodies.circle(140, impactPosition.add(new vec(0, -fallHeight)), {
							isSensor: true,
							hasCollisions: false,
							removed: true,
							render: {
								sprite: `bossRoom/boulder${ Math.floor(Math.random() * numBoulderSprites) }.png`,
								opacity: 0,
								layer: 10,
							}
						});
						boulders.add(boulder);
						boulder.impactPosition = impactPosition;
						boulder.impactTime = impactTime;
						boulder.scale = 0;

						function damagePlayer(collision) {
							let otherBody = collision.bodyA == boulder ? collision.bodyB : collision.bodyA;
							if (otherBody === player.body) {
								player.takeDamage(damage);
							}
						}
						boulder.on("collisionActive", damagePlayer);

						animations.create({ // switch collisions on
							delay: delay + 300 + fallTime - 30,
							duration: 0,
							curve: ease.linear,
							callback: p => {},
							onend: () => {
								boulder.setCollisions(true);
							}
						});
						
						let deltaPosition = new vec(0, fallHeight);
						let startPosition = new vec(boulder.position);
						animations.create({ // fall animation for position + opacity
							delay: delay + 300,
							duration: fallTime,
							curve: ease.in.quadratic,
							callback: p => {
								p = (p - 0.1) / 0.9;
								if (p < 0) return;
								if (boulder.removed) {
									boulder.add();
								}
								boulder.setPosition(startPosition.add(deltaPosition.mult(p)));
								boulder.render.opacity = Math.max(0, Math.min(1, p / 0.8));
								let spriteScale = (1 - p) * (scaleBounds[1] - scaleBounds[0]) + scaleBounds[0];
								boulder.render.spriteScale.set(new vec(spriteScale, spriteScale));
							},
							onend: () => {
								boulderHitGround(new vec(impactPosition));
								boulder.delete();
								boulders.delete(boulder);
							},
						});
						animations.create({ // animation for danger area sprite
							delay: Math.max(0, delay - 100),
							duration: 400,
							curve: ease.out.cubic,
							callback: p => {
								boulder.scale = p;
							},
							onend: () => {
								boulder.scale = 1;
							},
						});
					}
				}
				else {
					this.states.stop();
				}
			},
		},
		phase2: {
			summonServants: null, // same as normal
			sceptorMagicPound: "sceptorMagicPound", // bullet hell
			greatAvalanch: "greatAvalanch", // more intense avalanch falling thing
		}
	}
	adds = [];
	maxAdds = 4;
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
		this.states.approach = this.states.approach.call(this);
		this.states.phase2.summonServants = this.states.phase1.summonServants;
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
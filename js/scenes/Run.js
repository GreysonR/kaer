"use strict";

var run = {
	set money(value) {
		this._money = value;
		document.getElementById("runMoney").innerHTML = value;
	},
	get money() {
		return this._money;
	},
	_money: 0,
	inventory: new Inventory(),
	reset: function() {
		this.money = 0;
		this.inventory.reset();
	},
	currentScene: world2Scene,
	switchScene: function(newScene) {
		player.body.velocity.set(new vec(0, 0));
		this.currentScene.delete();
		this.currentScene = newScene;
		newScene.add();
	},
	transitionToScene: function(newScene) {
		player.controls.locked = true;

		let blackScreen = document.getElementById("blackScreen");
		blackScreen.classList.add("active");
		animations.create({
			duration: 200,
			curve: ease.linear,
			callback: p => {
				blackScreen.style.opacity = p;
			},
			onend: () => {
				player.resetEffects();
				this.switchScene(newScene);
				animations.create({
					delay: 100,
					duration: 200,
					curve: ease.linear,
					callback: p => {
						blackScreen.style.opacity = 1 - p;
						if (player.controls.locked && p > 0.5) {
							player.controls.locked = false;
						}
					},
					onend: () => {
						blackScreen.classList.remove("active");
					}
				});
			}
		});
	}
}

run.reset();
run.currentScene.add();

// add temp items to inventory
for (let type of Object.keys(run.inventory)) {
	run.inventory[type].setValue(4);
}
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
	reset: function() {
		this.money = 0;
	},
	currentScene: rooms["room0"],
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
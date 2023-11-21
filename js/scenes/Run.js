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
	}
}

run.reset();
run.currentScene.add();

// add temp items to inventory
for (let type of Object.keys(run.inventory)) {
	run.inventory[type].setValue(4);
}
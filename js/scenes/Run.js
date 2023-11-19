"use strict";

var run = {
	money: 0,
	inventory: {},
	reset: function() {
		this.money = 0;
		for (let type of Object.keys(Resources)) {
			this.inventory[type] = 0;
		}
	}
}

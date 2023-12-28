"use strict";

/*
	waves = [
		[
			{
				type: "enemy",
				position: new vec(0, 0),
				angle: 0,
			},
		],
	]
*/
class Waves {
	constructor(waves = [], room = null) { // waves is array of arrays of enemies
		this.waves = waves;
		this.room = room;
	}
	curWave = 0;
	started = false;
	enemies = [];
	room = null;

	add() {
		this.curWave = 0;
		this.placeWave();
	}
	
	placeWave() {
		for (let enemyData of this.waves[this.curWave]) {
			let { type, position, angle } = enemyData;
			if (this.room) {
				position = this.room.position.add(position);
			}
			let enemy = new Enemies[type](position, angle);
			this.enemies.push(enemy);

			let waves = this;
			enemy.body.on("delete", function onEnemyDestroyed() {
				waves.enemies.delete(enemy);
				if (waves.enemies.length === 0) {
					waves.endWave();
				}
			});
			enemy.on("spotted", () => {
				if (!this.started) {
					this.started = true;
					this.aggroWave();
				}
			});
			enemy.add();
		}
	}
	aggroWave() {
		for (let enemy of this.enemies) {
			enemy.state = "attack";
		}
	}
	endWave() {
		this.started = false;
		++this.curWave;
		if (this.curWave < this.waves.length) {
			// place next wave
			this.placeWave();
			this.aggroWave();
		}
		else {
			this.trigger("complete");
		}
	}

	
	events = {
		complete: [],
	}
	on(event, callback) {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(callback);
	}
	off(event, callback) {
		event = this.events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	trigger(event, arg1, arg2) {
		let events = this.events[event];
		for (let i = 0; i < events.length; i++) {
			events[i](arg1, arg2);
		}

		if (this.parent) {
			this.parent.trigger(event, arg1, arg2);
		}
	}
}
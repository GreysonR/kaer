"use strict";

class Scene {
	constructor() {
		this.bodies = [];
	}
	addBody(body) {
		this.bodies.push(body);
	}
	add() {
		this.trigger("beforeAdd");
		for (let body of this.bodies) {
			body.add();
		}
		this.trigger("afterAdd");
	}
	delete() {
		this.trigger("beforeDelete");
		for (let body of this.bodies) {
			body.delete();
		}
		this.trigger("afterDelete");
	}

	events = {
		beforeAdd: [],
		afterAdd: [],
		beforeDelete: [],
		afterDelete: [],
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
	trigger(event, arg1) {
		let events = this.events[event];
		for (let i = 0; i < events.length; i++) {
			events[i](arg1);
		}
	}
}


class InventoryItem {
	type = "";
	#value = 0;
	element = undefined;
	constructor(type, value = 100) {
		this.type = type;
		this.#value = value;
		
		// create UI for item
		let parent = createElement("div", {
			parent: document.getElementById("inventory"),
			class: `item ${type}`,
		});
		this.element = createElement("span", {
			parent: parent,
			innerHTML: value,
		});
	}
	getValue() {
		return this.#value;
	}
	setValue(value) {
		this.#value = value;
		this.updateUI();
	}
	updateUI() {
		if (this.element) {
			this.element.innerHTML = this.getValue();
		}
	}
};

class Inventory {
	constructor() {
		for (let type of Object.keys(Resources)) {
			this[type] = new InventoryItem(type, 0);
		}
	}
	reset() {
		for (let type of Object.keys(Resources)) {
			this[type].setValue(0);
		}
	}
}
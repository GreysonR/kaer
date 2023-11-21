"use strict";

class Resource {
	constructor(type, value = 100, color = "#DC567C") {
		this.type = type;
		this.value = value;
		this.color = color;
	}
	type = "";
	value = 0;
	color = "";
};

var Resources = {
	white: new Resource("white", 25,  "#FFE2D8"),
	red:   new Resource("red",   50,  "#DC567C"),
	green: new Resource("green", 75,  "#A7D679"),
	blue:  new Resource("blue",  100, "#49ADE9"),
};

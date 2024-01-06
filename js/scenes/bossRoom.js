rooms["bossRoom"] = new Room({
	name: "bossRoom",
	width: 5396,
	height: 4673,
	position: new vec(0, 0),
});
rooms["bossRoom"].setPosition(rooms["room1"].exits.top.add(rooms["room1"].position).sub(rooms["bossRoom"].exits.bottom).add(new vec(0, 1)));
rooms["bossRoom"].add();
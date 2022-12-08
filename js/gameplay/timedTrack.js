"use strict";

var checkpoints = [];
var curCheckpoint = -1;
var laps = 0;
var raceStarted = false;
var lapStartTime = 0;
var bestLapTime = Infinity;
var driftScore = 0;
var bestDriftScore = 0;

function getTimeStr(time) {
	let ms = (Math.round(time % 1000) / 1000).toFixed(3) * 1000;
	time /= 1000;
	let s = Math.floor(time % 60) + "";
	time /= 60;
	let m = Math.floor(time % 60);
	time /= 60;
	let h = Math.floor(time);

	if (m > 0 && s.length === 1) s = "0" + s

	let str = s + "." + ms;
	if (m > 0)
		str = m + ":" + str;
	if (m > 60)
		str = h + ":" + str;

	return str;
}

function handleCheckpointCollision(collision) {
	let { bodyA, bodyB } = collision;
	if (!(bodyA === car || bodyB === car)) return;
	let checkpoint = bodyA === car ? bodyB : bodyA;
	let index = checkpoint.index;

	if (curCheckpoint + 1 === index || curCheckpoint === checkpoints.length - 1 && index === 0) {
		let lastCheckpoint = curCheckpoint;
		let now = Performance.lastUpdate;
		curCheckpoint = index;

		if (lastCheckpoint > 1 && curCheckpoint === 0) { // completed a lap
			laps++;
			console.log("Lap #" + laps);

			let time = (now - lapStartTime);
			if (modeName === "time") {
				if (time < bestLapTime) {
					bestLapTime = time;
					document.getElementById("bestTime").innerHTML = "Best: " + getTimeStr(bestLapTime);
				}
			}
			else if (modeName === "drift") {
				let score = Math.round(driftScore * 10) / 10; // driftScore / (time / 1000) * 10
				if (score > bestDriftScore) {
					bestDriftScore = score;
					document.getElementById("bestTime").innerHTML = "Best: " + bestDriftScore.toFixed(1);
				}

				driftScore = 0;
			}

			lapStartTime = now;
		}

		if (lastCheckpoint === -1) {
			raceStarted = true;
			lapStartTime = now;

			Render.on("beforeRender", updateRaceTimer);
		}
	}
}

function updateRaceTimer() {
	let now = Performance.lastUpdate;
	let time = (now - lapStartTime);
	let timer = document.getElementById("timer");

	if (modeName === "time") {
		timer.innerHTML = getTimeStr(time);
	}
	else if (modeName === "drift") {
		timer.innerHTML = (Math.round(driftScore * 10) / 10).toFixed(1); // driftScore / (time / 1000) * 10
	}
}
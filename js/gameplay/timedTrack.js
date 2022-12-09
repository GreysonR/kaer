"use strict";

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

Render.on("beforeRender", () => {
	if (curMap.objs.length > 0) {
		let modDiff = Common.modDiff;
		let now = Performance.lastUpdate;
		let timescale = 144 / Performance.fps;
		let lastPercent = curMap.completePercent;
		let percent = curMap.completePercent = getPercentComplete();
	
		if (percent < 0.1 && lastPercent > 0.9) {
			if (!raceStarted) {
				raceStarted = true;
				lapStartTime = now;
				Render.on("beforeRender", updateRaceTimer);
			}
			else if (curMap.maxLapPercent > 0.9) {
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
					let score = Math.round(driftScore * 10) / 10; // driftScore / (Math.max(1, time) / 1000) * 10
					if (score > bestDriftScore) {
						bestDriftScore = score;
						document.getElementById("bestTime").innerHTML = "Best: " + bestDriftScore.toFixed(1);
					}
	
					driftScore = 0;
				}
				curMap.maxLapPercent = 0;
				lapStartTime = now;
			}
		}
		else {
			if (raceStarted) {
				let maxChange = modDiff(percent, curMap.maxLapPercent, 1);
				if (maxChange > 0 && maxChange / timescale < 0.1) {
					curMap.maxLapPercent = percent;
				}
			}
		}
	}
});

function updateRaceTimer() {
	let now = Performance.lastUpdate;
	let time = (now - lapStartTime);
	let timer = document.getElementById("timer");

	if (modeName === "time") {
		timer.innerHTML = getTimeStr(time);
	}
	else if (modeName === "drift") {
		timer.innerHTML = (Math.round(driftScore * 10) / 10).toFixed(1); // driftScore / (Math.max(1, time) / 1000) * 10
	}
}
import { GameObj, OpacityComp } from "kaplay"
import { playSound } from "../plugins/features/sound"

export function onPause() {
	// playSound("pauseScratch", { detune: 0, speed: 1 })
	
	// GameState.conductor.audioPlay.scratch({
	// 	newDetune: -30,
	// 	newVolume: 0,
	// 	time: 0.2
	// })

	let pauseBlack = get("pauseBlack")[0]

	// not found pauseBlack
	if (!pauseBlack) {
		pauseBlack = add([
			rect(width(), height()),
			color(BLACK),
			pos(center()),
			anchor("center"),
			z(100),
			opacity(0.5),
			"pauseBlack",
		])

		pauseBlack.fadeIn(0.1)

		pauseBlack.onDraw(() => {
			drawText({
				text: "PAUSED",
				pos: vec2(0, 0),
				anchor: "center",
			})
		})
	}

	// was found just fade it in again
	else {
		pauseBlack.fadeIn(0.1)
	}
}

export function onUnpause() {
	let pauseBlack = get("pauseBlack")[0] as GameObj<OpacityComp>
	
	if (pauseBlack) {
		pauseBlack.fadeOut(0.1).onEnd(() => {
			pauseBlack.destroy()
		})
	}
}
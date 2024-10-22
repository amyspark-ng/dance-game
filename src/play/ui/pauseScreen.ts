import { GameObj, OpacityComp } from "kaplay"
import { playSound } from "../../core/plugins/features/sound"

/** Runs when the game is paused */
export function pauseGame() {
	const pauseScratch = playSound("pauseScratch", { volume: 0.1, detune: 0, speed: 1 })
	pauseScratch.detune = rand(-100, 100)
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
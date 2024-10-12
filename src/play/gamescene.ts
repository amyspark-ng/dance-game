import { Key } from "kaplay"
import { addDancer } from "./objects/dancer"
import { GameState } from "../game/gamestate"
import { Conductor, setupConductor } from "./Conductor"
import { playSound } from "../plugins/features/sound"
import { GameSave } from "../game/gamesave"
import { onBeatHit, onTwiceBeat } from "../game/events"

export function GameScene() { scene("game", () => {
	setBackground(RED.lighten(60))

	const audioPlay = playSound("bopeebo", { channel: { volume: 0.05, muted: false } })
	const conductor = new Conductor(audioPlay, 100)
	setupConductor(conductor)

	onBeatHit(() => {
		const currentBeat = add([
			text(GameState.conductor.currentBeat.toString()),
			pos(center()),
			color(BLACK),
			scale(5),
			opacity(1),
		])

		currentBeat.fadeOut(0.25).onEnd(() => { currentBeat.destroy() })
	})
	
	const dancer = addDancer()
	dancer.scale = vec2(0.5)

	onTwiceBeat(() => {
		dancer.moveBop()
	})

	const keysAndMoves = {
		"down": "down",
		"up": "up",
		"left": "left",
		"right": "right",
		"space": "victory",
		"q": "idle",
		"w": "miss",
	}

	Object.keys(keysAndMoves).forEach((key) => {
		onKeyPress(key as Key, () => {
			// dancer.doMove(keysAndMoves[key])
		})
	})
})}
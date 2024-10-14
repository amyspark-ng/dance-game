import { Key } from "kaplay"
import { addDancer } from "./objects/dancer"
import { GameState } from "../game/gamestate"
import { playSound } from "../plugins/features/sound"
import { GameSave } from "../game/gamesave"
import { onBeatHit } from "../game/events"
import { cam } from "../plugins/features/camera"
import { setupInput } from "./input"
import { Conductor, setupConductor } from "./conductor"
import { addStrumline } from "./objects/strumline"

export function GameScene() { scene("game", () => {
	setBackground(RED.lighten(60))

	const audioPlay = playSound("bopeebo", { channel: { volume: 0.1, muted: false } })
	const conductor = new Conductor({ audioPlay: audioPlay, bpm: 100, timeSignature: [4, 4] })
	setupConductor(conductor)

	const dancer = addDancer()
	dancer.scale = vec2(1)

	GameState.managePause()

	onBeatHit(() => {
		if (dancer.getMove() == "idle") {
			dancer.moveBop()
		}
	})

	setupInput()
	addStrumline()
})}
import { Key } from "kaplay"
import { addDancer } from "./objects/dancer"

export function GameScene() { scene("game", () => {
	setBackground(RED.lighten(60))
	
	const dancer = addDancer()

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
			dancer.doMove(keysAndMoves[key])
		})
	})
})}
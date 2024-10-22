import { GameSave } from "../../core/gamesave"
import { goScene } from "../../core/scenes"
import { paramsGameScene, StateGame } from "../playstate"

/** Parameters for the result scene */
export type paramsResultsScene = {
	GameState: StateGame
}

export function ResultsScene() { scene("results", (params: paramsResultsScene) => {
	const dancer = add([
		sprite("dancer_" + params.GameState.params.dancer),
		pos(center()),
		anchor("center"),
	])	

	if (params.GameState.tally.misses > 10) {
		setBackground(BLUE.darken(80))
		debug.log("you suck at this")
		dancer.play("miss")
	}
	
	else {
		setBackground(RED.lighten(80))
		debug.log("you're cool :)")
		dancer.play("victory", { loop: true })
	}

	onKeyPress(GameSave.preferences.controls.pause, () => {
		goScene("game", { song: params.GameState.song } as paramsGameScene)
	})
})}
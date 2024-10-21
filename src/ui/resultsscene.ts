import { GameSave } from "../game/gamesave"
import { goScene } from "../game/scenes"
import { GameSceneParams, GameStateClass } from "../play/gamescene"
import { SongChart, Tally } from "../play/song"

export type resultsSceneParams = {
	GameState: GameStateClass
}

export function ResultsScene() { scene("results", (params: resultsSceneParams) => {
	if (params.GameState.tally.misses > 10) {
		setBackground(BLUE.darken(80))
		debug.log("you suck at this")
	}
	
	else {
		setBackground(RED.lighten(80))
		debug.log("you're cool :)")
	}

	onKeyPress(GameSave.preferences.controls.pause, () => {
		goScene("songselect")
	})

	onKeyPress(GameSave.preferences.controls.pause, () => {
		goScene("game", { song: params.GameState.song } as GameSceneParams)
	})
})}
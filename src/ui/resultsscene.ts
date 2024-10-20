import { GameSave } from "../game/gamesave"
import { goScene } from "../game/scenes"
import { SongChart, Tally } from "../play/song"

export type resultsSceneParams = {
	songChart: SongChart,
	dancer: string,
	tally: Tally,
}

export function ResultsScene() { scene("results", (params: resultsSceneParams) => {
	if (params.tally.misses > 10) {
		debug.log("you suck at this")
	}

	else {
		debug.log("you're cool :)")
	}

	onKeyPress(GameSave.preferences.controls.pause, () => {
		goScene("songselect")
	})
})}
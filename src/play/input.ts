import { GameSave } from "../game/gamesave"
import { getDancer, Move } from "./objects/dancer"
import { GameState } from "../game/gamestate"
import { getStrumline } from "./objects/strumline"
import { ChartNote, NoteGameObj } from "./objects/note"
import { goScene } from "../game/scenes"
import { GameSceneParams } from "./gamescene"
import { songCharts } from "../game/loader"

/** The main function that manages inputs for the game */
export function setupInput() {
	Object.values(GameSave.preferences.gameControls).forEach((gameKey) => {
		onKeyPress(gameKey.kbKey, () => {
			if (!GameState.gameInputEnabled) return
			// bust a move
			getStrumline().press()
		});

		onKeyRelease(gameKey.kbKey, () => {
			if (!GameState.gameInputEnabled) return
			
			getStrumline().release()
		})
	});

	onKeyPress(GameSave.preferences.controls.pause, () => {
		if (!GameState.gameInputEnabled) return
		
		GameState.managePause();
	})

	onKeyPress("r", () => {
		if (!GameState.gameInputEnabled) return
		goScene("game", null, {song: GameState.currentSong} as GameSceneParams)
	})
}

// TIMINGS
export const INPUT_THRESHOLD = 0.05

/** Runs every time you press a key, if you pressed in time to any note it will return it */
export function checkForNote() : ChartNote {
	function timeCondition(note: ChartNote) {
		const lowest = GameState.conductor.timeInSeconds - INPUT_THRESHOLD
		const highest = GameState.conductor.timeInSeconds + INPUT_THRESHOLD
		return lowest <= note.hitTime && note.hitTime <= highest
	}

	// if time in seconds is close by input_treshold to the hit note of any note in the chart
	if (GameState.currentSong.notes.some((note) => timeCondition(note))) {
		return GameState.currentSong.notes.find((note) => timeCondition(note))
	}
	
	// if no note found (the player is a dummy and didn't hit anything)
	else {
		return null;
	}
}
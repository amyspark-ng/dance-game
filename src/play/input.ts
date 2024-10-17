import { GameSave } from "../game/gamesave"
import { getDancer, Move } from "./objects/dancer"
import { GameState } from "../game/gamestate"
import { getStrumline } from "./objects/strumline"
import { ChartNote, NoteGameObj } from "./objects/note"
import { goScene } from "../game/scenes"
import { GameSceneParams } from "./gamescene"
import { songCharts } from "../game/loader"
import { fadeOut } from "../game/transitions/fadeOutTransition"

/** The main function that manages inputs for the game */
export function setupInput() {
	Object.values(GameSave.preferences.gameControls).forEach((gameKey) => {
		onKeyPress(gameKey.kbKey, () => {
			if (GameState.paused) return
			
			// bust a move
			getStrumline().press(gameKey.move)
		});

		onKeyRelease(gameKey.kbKey, () => {
			if (GameState.paused) return
			
			getStrumline().release()
		})
	});

	onKeyPress(GameSave.preferences.controls.pause, () => {
		if (!GameState.gameInputEnabled) return
		
		GameState.managePause();
	})

	onKeyPress(GameSave.preferences.controls.reset, () => {
		if (!GameState.gameInputEnabled) return
		goScene("game", { song: GameState.currentSong } as GameSceneParams)
	})
}

// TIMINGS
export const INPUT_THRESHOLD = 0.1

/** Runs every time you press a key, if you pressed in time to any note it will return it */
export function checkForNote(move: Move) : ChartNote {
	function conditionsForHit(note: ChartNote) {
		// i have to check if the current time in the song is between the hittime of the note
		const t = GameState.conductor.timeInSeconds
		const lowest = note.hitTime - INPUT_THRESHOLD
		const highest = note.hitTime + INPUT_THRESHOLD

		return t >= lowest && t <= highest && note.dancerMove == move
	}

	// if time in seconds is close by input_treshold to the hit note of any note in the chart
	if (GameState.currentSong.notes.some((note) => conditionsForHit(note))) {
		return GameState.currentSong.notes.find((note) => conditionsForHit(note))
	}
	
	// if no note found (the player is a dummy and didn't hit anything)
	else {
		return null;
	}
}
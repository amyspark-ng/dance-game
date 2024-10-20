import { GameSave } from "../game/gamesave"
import { getStrumline } from "./objects/strumline"
import { ChartNote } from "./objects/note"
import { GameState, resetSong } from "./gamescene";
import { Move } from "./objects/dancer";
import { goScene, transitionToScene } from "../game/scenes";
import { chartEditorParams } from "../debug/charteditorscene";
import { fadeOut } from "../game/transitions/fadeOutTransition";

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
		resetSong()
	})

	onKeyPress(GameSave.preferences.controls.debug, () => {
		transitionToScene(fadeOut, "charteditor", { song: GameState.currentSong, seekTime: GameState.conductor.timeInSeconds } as chartEditorParams)
	})
}

// TIMINGS
export const INPUT_THRESHOLD = 0.16

/** Runs when you press and returns the note hit or null if you didn't hit anything on time */
export function checkForNoteHit(move: Move) : ChartNote {
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

/** Returns an array of all the notes currently on the screen */
export function getNotesOnScreen() {
	return get("noteObj", { recursive: true })
}
import { GameSave } from "../game/gamesave"
import { getStrumline } from "./objects/strumline"
import { ChartNote } from "./objects/note"
import { GameStateClass, resetSong } from "./gamescene";
import { Move } from "./objects/dancer";
import { goScene, transitionToScene } from "../game/scenes";
import { chartEditorParams } from "../debug/charteditorscene";
import { fadeOut } from "../game/transitions/fadeOutTransition";

/** The function that manages input functions inside the game, must be called onUpdate */
export function manageInput(GameState: GameStateClass) {
	Object.values(GameSave.preferences.gameControls).forEach((gameKey) => {
		if (GameState.paused) return

		if (isKeyPressed(gameKey.kbKey)) {
			// bust a move
			getStrumline().press(gameKey.move)
		}

		else if (isKeyReleased(gameKey.kbKey)) {
			getStrumline().release()
		}
	});

	if (!GameState.gameInputEnabled) return
	if (isKeyPressed(GameSave.preferences.controls.pause)) {
		GameState.managePause();
	}

	else if (isKeyPressed(GameSave.preferences.controls.reset)) {
		resetSong(GameState)
	}

	else if (isKeyPressed(GameSave.preferences.controls.debug)) {
		transitionToScene(fadeOut, "charteditor", { song: GameState.song, seekTime: GameState.conductor.timeInSeconds } as chartEditorParams)
	}
}

// TIMINGS
export const INPUT_THRESHOLD = 0.16

/** Runs when you press and returns the note hit or null if you didn't hit anything on time */
export function checkForNoteHit(GameState:GameStateClass, move: Move) : ChartNote {
	function conditionsForHit(note: ChartNote) {
		// i have to check if the current time in the song is between the hittime of the note
		const t = GameState.conductor.timeInSeconds
		const lowest = note.hitTime - INPUT_THRESHOLD
		const highest = note.hitTime + INPUT_THRESHOLD

		return t >= lowest && t <= highest && note.dancerMove == move
	}

	// if time in seconds is close by input_treshold to the hit note of any note in the chart
	if (GameState.song.notes.some((note) => conditionsForHit(note))) {
		return GameState.song.notes.find((note) => conditionsForHit(note))
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
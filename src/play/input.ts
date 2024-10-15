import { GameSave } from "../game/gamesave"
import { getDancer, Move } from "./objects/dancer"
import { GameState } from "../game/gamestate"
import { getStrumline } from "./objects/strumline"

/** Converts an index from the type gameKey to the type Move */
function indexToMove(index: number) : Move {
	switch (index) {
		case 1: return "left"
		case 2: return "down"
		case 3: return "up"
		case 4: return "right"
	}
}

/** The main function that manages inputs for the game */
export function setupInput() {
	Object.values(GameSave.preferences.gameControls).forEach((gameKey) => {
		console.log(gameKey)
		onKeyPress(gameKey.kbKey, () => {
			if (!GameState.gameInputEnabled) return
			// bust a move
			const theMove = indexToMove(gameKey.index)
			getDancer().doMove(theMove)
			getStrumline().press(theMove)
		});

		onKeyRelease(gameKey.kbKey, () => {
			if (!GameState.gameInputEnabled) return
			
			getStrumline().release()
		})
	});

	onKeyPress("escape", () => {
		if (!GameState.gameInputEnabled) return
		
		GameState.managePause();
	})
}

// TIMINGS
export const INPUT_THRESHOLD = 0.3

/** Runs everytime you press a key, checks for a move and if the conditions are right, busts it */
export function press_CheckForNote(moveToTry: Move) {

}
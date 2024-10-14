import { Key } from "kaplay"
import { GameSave } from "../game/gamesave"
import { getDancer, Move } from "./objects/dancer"
import { GameState } from "../game/gamestate"
import { getStrumline} from "./objects/strumline"

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
	Object.values(GameSave.preferences.gameControls).forEach((gameControl) => {
		onKeyPress(gameControl.keyboardKey, () => {
			// TODO: Figure out why + 1 ?
			
			// bust a move
			const theMove = indexToMove(gameControl.index + 1)
			getDancer().doMove(theMove)
			getStrumline().press()
		});

		onKeyRelease(gameControl.keyboardKey, () => {
			getStrumline().release()
		})
	});

	onKeyPress("escape", () => {
		GameState.managePause();
	})
}
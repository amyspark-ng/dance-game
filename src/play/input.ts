import { Key } from "kaplay"
import { GameSave } from "../game/gamesave"
import { getDancer, Move } from "./objects/dancer"

function indexToMove(index: number) : Move {
	switch (index) {
		case 0: return "left"	
		case 1: return "down"	
		case 2: return "up"	
		case 3: return "right"	
	}
}

/** The main function that manages inputs for the game */
export function setupInput() {
	Object.values(GameSave.preferences.gameControls).forEach((gameKey) => {
		/** the keyboard key that is mapped to the action */
		const action = indexToMove(gameKey.index);

		onKeyPress(gameKey.keyboardKey, () => {
			getDancer().doMove(action);
		});
	});
}
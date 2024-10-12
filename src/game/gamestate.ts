import { Conductor } from "../play/Conductor"

export class GameStateClass {
	/** The current conductor */
	conductor: Conductor;
}

/** The GameState, an instance of GameStateClass */
export const GameState = new GameStateClass()
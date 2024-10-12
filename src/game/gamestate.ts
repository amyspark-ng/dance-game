export class GameStateClass {
	/**
	 * How many lives the player has
	 * @default 3
	 */
	playerLives: number = 3 
}

/** The GameState, an instance of GameStateClass */
export const GameState = new GameStateClass()
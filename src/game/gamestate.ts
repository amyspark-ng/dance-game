import { Conductor } from "../play/conductor";

export class GameStateClass {
	/** The current conductor */
	conductor: Conductor;

	/** Dictates wheter the game is paused or not, please do not touch if not through the manage pause function */
	private _paused: boolean;
	
	/** Wheter the game is currently paused or not */
	get paused() {
		return this._paused;
	}

	/** Will set the pause to true or false, if a parameter isn't passed it will be toggled */
	managePause(newPause?:boolean) {
		newPause = newPause ?? !this.paused

		this._paused = newPause;
		this.conductor.audioPlay.paused = this._paused
		// openPauseMenu()
	};

	/** Wheter the player can press keys to play */
	gameInputEnabled: boolean = false
}

/** The GameState, an instance of GameStateClass */
export const GameState = new GameStateClass()
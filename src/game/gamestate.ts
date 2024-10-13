import { Conductor } from "../play/Conductor"

export class GameStateClass {
	/** The current conductor */
	conductor: Conductor;

	private _paused: boolean;
	/** Wheter the game is paused or not */
	get paused() {
		return this._paused;
	}

	/** Will set the pause to true or false, if a parameter isn't passed it will be toggled */
	managePause(newPause?:boolean) {
		newPause = newPause ?? !this.paused

		this._paused = newPause;
		this.conductor.audioPlay.paused = this.paused
		// openPauseMenu()
	};
}

/** The GameState, an instance of GameStateClass */
export const GameState = new GameStateClass()
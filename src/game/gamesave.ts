import { Key } from "kaplay";
import { SAVE_NAME } from "../main";
import { volumeChannel } from "../plugins/features/sound";
import { Move } from "../play/objects/dancer";

type gameKey = {
	keyboardKey: Key,
	index: number,
}

export type Preferences = {
	gameControls: {
		left: gameKey,
		right: gameKey,
		down: gameKey,
		up: gameKey,
	},

	controls: {
		pause: Key,
		accept: Key,
	}
}

/** Holds all the info that should be saved and loaded through sessions */
export class GameSaveClass {
	/** Player highscore */
	highscore: number = 0

	sound = {
		sfx: new volumeChannel(),
		music: new volumeChannel(),
		masterVolume: 1,
	}

	/** Writes current instance to localStorage */
	save() {
		setData(SAVE_NAME, this)
	}

	preferences:Preferences = {
		gameControls: {
			left: { keyboardKey: "left", index: 0 },
			down: { keyboardKey: "down", index: 1, },
			up: { keyboardKey: "up", index: 2, },
			right: { keyboardKey: "right", index: 3 }
		},

		controls: {
			pause: "escape",
			accept: "enter",
		}
	}

	/**
	 * Sets GameSave to an instance
	 * @param theNewSave The instance
	 */
	set(theNewSave:GameSaveClass = this.getLatestSave()) {
		Object.assign(this, theNewSave)
	}

	/** Sets this class to a new instance of itself */
	delete() {
		const theNewSave = new GameSaveClass()
		this.set(theNewSave)
	}

	/** Gets the latest instance in localStorage */
	getLatestSave() : GameSaveClass {
		const newGameSave = new GameSaveClass()
		// newGameSave is the default in case it doesn't find a save
		const data = getData(SAVE_NAME, newGameSave) as GameSaveClass

		Object.keys(newGameSave).forEach(function(k) {
			if (!data.hasOwnProperty(k)) data[k] = newGameSave[k];
		});

		return data;
	}

	/** Assigns itself to {@link getLatestSave `getLatestSave()`}  */
	load() {
		Object.assign(this, this.getLatestSave())
	}
}

/** The game save, an instance of GameSaveClass */
export let GameSave = new GameSaveClass()
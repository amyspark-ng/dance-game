import { Key } from "kaplay";
import { SAVE_NAME } from "../main";
import { volumeChannel } from "../plugins/features/sound";
import { saveSongScore } from "../play/song";
import { Move } from "../play/objects/dancer";

type gameKey = { kbKey: Key, move: Move }

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
		reset: Key,
		debug: Key,
	},
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

	preferences:Preferences = {
		gameControls: {
			left: { kbKey: "left", move: "left" },
			down: { kbKey: "down", move: "down" },
			up: { kbKey: "up", move: "up" },
			right: { kbKey: "right", move: "right" },
		},

		controls: {
			pause: "escape",
			accept: "enter",
			reset: "r",
			debug: "l",
		},
	}

	/** The songs that have been played, check {@link songSaveScore} type for more info */
	songsPlayed:saveSongScore[] = [];

	/** Writes current instance to localStorage */
	save() {
		setData(SAVE_NAME, this)
	};

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

		// if there's a property in newGameSave that it's not on class or it's undefined or it's null, then set it to the default
		for (const [key, value] of Object.entries(newGameSave)) {
			if (data[key] === undefined || data[key] === null) {
				data[key] = value
			}
		}

		return data;
	}

	/** Assigns itself to {@link getLatestSave `getLatestSave()`}  */
	load() {
		Object.assign(this, this.getLatestSave())
	}
}

/** The game save, an instance of GameSaveClass */
export let GameSave = new GameSaveClass()
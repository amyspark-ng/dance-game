import { Key } from "kaplay";
import { SAVE_NAME } from "../main";
import { volumeChannel } from "../plugins/features/sound";
import { saveScore } from "../play/song";
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

	noteskin: "P" | "T" | "A"
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

		noteskin: "P",
	}

	/** The songs that have been played, check {@link songSaveScore} type for more info */
	songsPlayed:saveScore[] = [];

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
		function deepMerge(target: any, source: any): any {
			for (const key in source) {
				if (source[key] instanceof Object && key in target) {
					Object.assign(source[key], deepMerge(target[key], source[key]));
				}
			}
			return Object.assign(target || {}, source);
		}

		const newGameSave = new GameSaveClass()
		const data = getData(SAVE_NAME, newGameSave) as GameSaveClass
		return deepMerge(data, newGameSave);
	}

	/** Assigns itself to {@link getLatestSave `getLatestSave()`}  */
	load() {
		Object.assign(this, this.getLatestSave())
	}
}

/** The game save, an instance of GameSaveClass */
export let GameSave = new GameSaveClass()
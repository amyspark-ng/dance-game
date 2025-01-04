import { Key } from "kaplay";
import { Move } from "../play/objects/dancer";
import { SaveScore } from "../play/song";
import { GAME } from "./initGame";
import { volumeChannel } from "./plugins/features/sound";

type gameKey = { kbKey: Key; move: Move; };

/** Holds all the info that should be saved and loaded through sessions */
export class GameSaveClass {
	sound = {
		sfx: { volume: 1, muted: false } as volumeChannel,
		music: { volume: 1, muted: false } as volumeChannel,
		masterVolume: 1,
	};

	scrollSpeed: number = 1;
	fullscreen: boolean = false;

	dancer: string = "astri";

	gameControls = {
		left: { kbKey: "left", move: "left" } as gameKey,
		down: { kbKey: "down", move: "down" } as gameKey,
		up: { kbKey: "up", move: "up" } as gameKey,
		right: { kbKey: "right", move: "right" } as gameKey,
	};

	editorColor = { r: 0, g: 0, b: 0 };

	noteskin: string = "A";

	/** The songs that have been played, check {@link songSaveScore} type for more info */
	songsPlayed: SaveScore[] = [];

	/** Writes current instance to localStorage */
	save() {
		setData(GAME.SAVE_NAME, this);
	}

	/**
	 * Sets GameSave to an instance
	 * @param theNewSave The instance
	 */
	set(theNewSave: GameSaveClass = this.getLatestSave()) {
		Object.assign(this, theNewSave);
	}

	/** Sets this class to a new instance of itself */
	delete() {
		const theNewSave = new GameSaveClass();
		this.set(theNewSave);
	}

	/** Gets the latest instance in localStorage */
	getLatestSave(): GameSaveClass {
		function deepMerge(target: any, source: any): any {
			for (const key in source) {
				if (source[key] instanceof Object && key in target) {
					Object.assign(source[key], deepMerge(target[key], source[key]));
				}
			}
			return Object.assign(target || {}, source);
		}

		const newGameSave = new GameSaveClass();
		const data = getData(GAME.SAVE_NAME);

		return deepMerge(data, newGameSave);
	}

	/** Assigns itself to {@link getLatestSave `getLatestSave()`}  */
	load() {
		const data = getData(GAME.SAVE_NAME);
		this.set(data as GameSaveClass);
	}
}

/** The game save, an instance of GameSaveClass */
export let GameSave = new GameSaveClass();

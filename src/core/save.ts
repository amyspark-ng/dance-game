import { Key } from "kaplay";
import { Move } from "../play/objects/dancer";
import { SongScore } from "../play/savescore";
import { GAME } from "./game";

/** Function to manage some merging of gamesaves */
export function deepMergeSaves(oldSave: _GameSave, newSave: _GameSave): _GameSave {
	const result: any = { ...oldSave }; // Start with a shallow copy of the old save

	for (const key in newSave) {
		if (newSave.hasOwnProperty(key)) {
			if (
				typeof newSave[key] === "object"
				&& newSave[key] !== null
				&& !Array.isArray(newSave[key])
			) {
				// If it's an object, recursively merge
				result[key] = deepMergeSaves(
					oldSave[key] || {}, // Use oldSave's value or empty object
					newSave[key],
				);
			}
			else if (!result.hasOwnProperty(key)) {
				// Add new property from newSave only if it doesn't exist in oldSave
				result[key] = newSave[key];
			}
		}
	}

	return result;
}

/** The type for an object that holds the controls for the game */
type gameControls = Record<Move, Key>;

/** The default controls for the game */
const defaultControls: gameControls = {
	left: "left",
	down: "down",
	up: "up",
	right: "right",
};

/** Holds all the info that should be saved and loaded through sessions */
export class _GameSave {
	/** (static) property that holds the default controls for the game
	 *
	 * Its type is actually a record! (Record<Move, Key>)
	 */
	static defaultControls: gameControls = defaultControls;

	volume: number = 1;
	soundVolume: number = 1;
	musicVolume: number = 1;

	/** The dancers the player can use */
	unlockedDancers: string[] = ["Astri"];

	/** The songs that have been played, check @link {} type for more info */
	scores: SongScore[] = [];

	/** Array of uuids that are stored as keys on the localStorage and have to be loaded */
	extraSongs: string[] = [];

	// #region PREFERENCES

	/** The controls for the game
	 *
	 * Its type is actually a record! (Record<Move, Key>)
	 */
	gameControls: gameControls = defaultControls;

	soundDownKey: Key = "-";
	soundUpKey: Key = "+";

	/** (From 0 to 1) The hue of the background in the editor */
	editorHue = 0.696;

	/** The prefix for the noteskin */
	noteskin: string = "arrows";

	/** Wheter the strumline and lane will be on the top or the bottom (LOL) */
	upscroll: boolean = false;

	/** The multiplier for the scrollspeed */
	scrollSpeed: number = 1;

	/** The dancer the player is using (to dance) */
	dancer: string = "Astri";

	/** Wheter notes should jump when hit */
	sillyNotes: boolean = true;

	// #endregion PREFERENCES

	/** Writes current instance to localStorage */
	save() {
		setData(GAME.SAVE_NAME, this);
		return console.log("SAVED");
	}

	/**
	 * Sets GameSave to an instance
	 * @param theNewSave The instance
	 */
	set(theNewSave: _GameSave = this.getLatestSave()) {
		Object.assign(this, theNewSave);
	}

	/** Sets this class to a new instance of itself */
	delete() {
		const theNewSave = new _GameSave();
		this.set(theNewSave);
		return console.log("DELETED GAME SAVE!!");
	}

	/** Gets the latest instance in localStorage */
	private getLatestSave(): _GameSave {
		const newGameSave = new _GameSave();
		const data = getData(GAME.SAVE_NAME, newGameSave);

		return deepMergeSaves(data, newGameSave);
	}

	/** Assigns itself to {@link getLatestSave `getLatestSave()`}  */
	load() {
		const data = this.getLatestSave();
		this.set(data as _GameSave);
	}

	/** Gets the key stored in the game save for a certain move */
	getKeyForMove(move: Move): Key {
		return this.gameControls[move];
	}

	/** Returns the move you'd do if you pressed the key stored in the game save for that move */
	getMoveForKey(gameKey: Key): Move {
		return Object.keys(this.gameControls).find((move) => this.gameControls[move] == gameKey) as Move;
	}
}

/** The game save, an instance of _GameSave */
export const GameSave = new _GameSave();

import { _GameSave, GameSave } from "../core/save";
import { Tally } from "./objects/scoring";

// TODO: Find where to put this

/** When a song ends, an object of this type gets pushed to {@link `_GameSave.songsPlayed`}*/
export class SaveScore {
	/** The uuid of the song */
	uuid: string;
	/** The tally of the score */
	tally: Tally;

	/** Gets the saveScore for a song name */
	static getHighscore(uuid: string): SaveScore {
		const scoresOfSong = GameSave.scores.filter((song) => song.uuid == uuid);

		if (scoresOfSong.length < 1) {
			return new SaveScore(uuid);
		}
		else {
			// get the highest song save score
			return scoresOfSong.reduce((a, b) => a.tally.score > b.tally.score ? a : b);
		}
	}

	constructor(uuid: string, tally: Tally = new Tally()) {
		this.uuid = uuid;
		this.tally = tally;
	}
}

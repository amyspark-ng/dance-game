import { ChartNote } from "./objects/note";
import { Tally } from "./objects/scoring";

/** Class that holds the properties a chart file will have */
export class SongChart {
	/** The title of the song (string) */
	title: string = "X Song";

	/** Actually divides the time it'll take the note to reach the strum by this */
	speedMultiplier: number = 1;

	/** Id of the song (like title but id with - and all that) */
	idTitle: string = "x-song";
	
	/** An array of notes a song has */
	notes: ChartNote[] = []

	/** The bpm of the song */
	bpm: number = 100

	/** The time signature of the song */
	timeSignature: [number, number] = [4, 4];

	constructor(idTitle?:string) {
		// this fake idtitle is for fake songs used for testing
		if (!idTitle) return
		this.idTitle = idTitle;
		this.title = this.idTitle.replace(/-/g, " ");
	}
}

/** When a song ends, an object of this type gets pushed to GameSave.songsPlayed*/
export class saveScore {
	idTitle: string;
	tally: Tally = new Tally();
}
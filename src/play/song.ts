import { ChartNote } from "./objects/note";

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
}

/** Holds the current tallies for the current song */
export class Tally {
	awesomes: number = 0;
	goods: number = 0;
	ehhs: number = 0;
	misses: number = 0;
	score: number = 0;
	highestCombo: number = 0;
	get hitNotes() {
		return this.awesomes + this.goods + this.ehhs;
	}

	get totalNotes() {
		return this.awesomes + this.goods + this.ehhs + this.misses;
	}

	/** Get the how much the song was cleared (0% missed all notes, 100% got all notes right) */
	get cleared() {
		return (this.hitNotes / this.totalNotes) * 100
	}
}

/** When a song ends, an object of this type gets pushed to GameSave.songsPlayed*/
export class saveScore {
	idTitle: string;
	tally: Tally = new Tally();
}

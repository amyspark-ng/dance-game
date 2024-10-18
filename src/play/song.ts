import { ChartNote } from "./objects/note";

/** Class that holds the properties a chart file will have */
export class SongChart {
	/** The title of the song (string) */
	title: string;

	/** Actually divides the time it'll take the note to reach the strum by this */
	speedMultiplier: number;

	/** Id of the song (like title but id with - and all that) */
	idTitle: string;
	
	/** An array of notes a song has */
	notes: ChartNote[]

	/** The bpm of the song */
	bpm: number

	/** The time signature of the song */
	timeSignature: [number, number];

	constructor() {
		this.title = "x"
		this.speedMultiplier = 1;
		this.idTitle = "x";
		this.notes = []
		this.bpm = 100;
		this.timeSignature = [4, 4];
	}
}

/** Holds the current tallies for the current song */
export type Tally = {
	awesomes: number,
	goods: number,
	ehhs: number,
	misses: number,
	score: number,
}

/** When a song ends pushes an object of this type with that song in mind idk */
export type saveSongScore = {
	score: number,
	tally: Tally,
}

// something like GameSave.songsPlayed["bopeebo"]
// and then you'll get the score of that song
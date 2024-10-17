import { ChartNote } from "./objects/note";

/** Class that holds the properties a chart file will have */
export type SongChart = {
	/** The title of the song (string) */
	title: string;

	/** The multiplier of the scroll speed */
	speedMultiplier: number;

	/** Id of the song (like title but id with - and all that) */
	idTitle: string;
	
	/** An array of notes a song has */
	notes: ChartNote[]

	/** The bpm of the song */
	bpm: number

	/** The time signature of the song */
	timeSignature: [number, number]
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
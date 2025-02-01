// # This file will manage the ranking system
import { utils } from "../../utils";
import { StateGame } from "../PlayState";
import { DANCER_POS, Move } from "./dancer";
import { ChartNote } from "./note";

/** Result of JudgeNote */
type verdict = {
	score: number;
	judgement: Judgement;
};

/** Rankings for the game */
export const rankings = ["S+", "S", "A", "B", "C", "F"] as const;

/** Ranking for a song */
export type Ranking = typeof rankings[number];

/** Judgements for the game */
export const judgements = ["Awesome", "Good", "Ehh", "Miss"] as const;

/** The judgement the player got when hitting a note */
export type Judgement = typeof judgements[number];

/** A class full of static methods and properties for everything related to scoring */
export class Scoring {
	/** The max score for a note */
	static MAX_SCORE = 10;
	/** The min score for a note */
	static MIN_SCORE = 5;
	/** The treshold (in time) in which a note can be hit in */
	static INPUT_TRESHOLD = 0.16;

	/** The max difference between the current time and the note of a song */
	static AWESOME_TIMING = 0.05;

	/** The max difference to get a good judgement */
	static GOOD_TIMING = 0.11;

	/** The max differnece to get an ehh timing */
	static EHH_TIMING = 0.1355;

	/** The max difference to get a miss timing */
	static MISS_TIMING = 0.166;

	/** Get the judgement the player did based on hit time
	 * @param timeInSeconds The time in seconds the judge was asked for
	 * @param note The ChartNote
	 * @returns An object that holds the score and the judgement (eg: { score: 50, judgement: "Awesome" })
	 */
	static judgeNote(timeInSeconds: number, note: ChartNote): verdict {
		const diff = timeInSeconds - note.time;
		const absDiff = Math.abs(timeInSeconds - note.time);

		let judgement: Judgement = null;
		if (absDiff <= Scoring.AWESOME_TIMING) judgement = "Awesome";
		else if (absDiff <= Scoring.GOOD_TIMING) judgement = "Good";
		else if (absDiff <= Scoring.EHH_TIMING) judgement = "Ehh";
		else if (absDiff <= Scoring.MISS_TIMING) judgement = "Miss";

		const score = Math.round(map(diff, 0, Scoring.INPUT_TRESHOLD, Scoring.MAX_SCORE, Scoring.MIN_SCORE));

		return {
			score: score,
			judgement: judgement,
		};
	}

	/** Get the closest note at a given time
	 * @param time The time in seconds to check for
	 * @param arr The array of ChartNotes
	 */
	static getClosestNote(time: number, arr: ChartNote[]): ChartNote {
		return arr.reduce((acc, obj) => Math.abs(time - obj.time) < Math.abs(time - acc.time) ? obj : acc);
	}

	/** Checks if a note with the move param has been hit in the given time */
	static checkForNoteHit(move: Move, time: number = StateGame.instance.conductor.timeInSeconds) {
		const closestNote = Scoring.getClosestNote(time, StateGame.instance.song.chart.notes);

		// if time in seconds is in range by input_treshold
		// to the hit note of any note in the chart
		const isNoteInRange = utils.isInRange(time, closestNote.time - Scoring.INPUT_TRESHOLD, closestNote.time + Scoring.INPUT_TRESHOLD);
		if (isNoteInRange && closestNote.move == move) {
			return closestNote;
		}

		// if no note found (the player is a dummy and didn't hit anything)
		return undefined;
	}
}

/** Class for the current tallies of a song */
export class Tally {
	awesomes: number = 0;
	goods: number = 0;
	ehhs: number = 0;
	misses: number = 0;
	score: number = 0;
	highestCombo: number = 0;

	/** Current hit notes */
	get hitNotes() {
		return this.awesomes + this.goods + this.ehhs;
	}

	/**
	 * Current total notes.
	 *
	 * (This should only be used in results sceen, because it's not accurate otherwise) */
	get totalNotes() {
		return this.awesomes + this.goods + this.ehhs + this.misses;
	}

	/** Returns number from 0 to 100 based on how many notes were hit */
	get clear() {
		const division = this.hitNotes / this.totalNotes;
		if (isNaN(division)) return 0;
		else return division * 100;
	}

	/** Gets the ranking for the current tally */
	get ranking() {
		if (this.awesomes == this.totalNotes && this.score > 1) return "S+";
		else if (this.misses == 0 && this.score > 1) return "S";
		else if (this.clear > 85) return "A";
		else if (this.clear > 70) return "B";
		else if (this.clear > 50) return "C";
		else return "F";
	}

	/** Wheter the player has gotten a 'not-awesome' */
	get isPerfect() {
		return this.awesomes == this.hitNotes && this.misses == 0;
	}
}

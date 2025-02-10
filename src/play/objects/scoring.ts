// # This file will manage the ranking system
import { utils } from "../../utils";
import { GameState } from "../GameState";
import { Move } from "./dancer";
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
	static MAX_SCORE = 50;

	/** The min score for a note */
	static MIN_SCORE = 5;

	// These timings are built in a way that they are
	// The min difference of time between the current time and the note time
	// To get that judgement

	/** The treshold (in time) in which a note can be hit in */
	static INPUT_TRESHOLD = 200 / 1000;

	/** The max difference between the current time and the note of a song */
	static AWESOME_TIMING = 45 / 1000;

	/** The max difference to get a good judgement */
	static GOOD_TIMING = 90 / 1000;

	/** The max differnece to get an ehh timing */
	static EHH_TIMING = 135 / 1000;

	/** Get the judgement the player did based on hit time
	 * @param timeInSeconds The time in seconds the judge was asked for
	 * @param note The ChartNote
	 * @returns An object that holds the score and the judgement (eg: { score: 50, judgement: "Awesome" })
	 *
	 * If the judgement was a miss you hit either too late or too early
	 */
	static judgeNote(timeInSeconds: number, note: ChartNote): verdict {
		const diff = timeInSeconds - note.time;
		const absDiff = Math.abs(timeInSeconds - note.time);

		let judgement: Judgement = "Miss";
		if (absDiff <= Scoring.AWESOME_TIMING) judgement = "Awesome";
		else if (absDiff <= Scoring.GOOD_TIMING) judgement = "Good";
		else if (absDiff <= Scoring.EHH_TIMING) judgement = "Ehh";
		else if (absDiff >= Scoring.INPUT_TRESHOLD) judgement = "Miss";

		const score = Math.round(map(absDiff, 0, Scoring.INPUT_TRESHOLD, Scoring.MAX_SCORE, Scoring.MIN_SCORE));

		return {
			score: score,
			judgement: judgement,
		};
	}

	/** Checks if a note with the move param has been hit in the given time */
	static checkForNote(time: number = GameState.instance.conductor.time, move?: Move) {
		function getClosestNote(time: number, arr: ChartNote[]): ChartNote {
			return arr.reduce((acc, obj) => Math.abs(time - obj.time) < Math.abs(time - acc.time) ? obj : acc);
		}

		const closestNote = getClosestNote(time, GameState.instance.song.chart.notes);

		// if time in seconds is in range by input_treshold
		// to the hit note of any note in the chart
		const isNoteInRange = utils.isInRange(time, closestNote.time - Scoring.INPUT_TRESHOLD, closestNote.time + Scoring.INPUT_TRESHOLD);
		if (isNoteInRange) {
			if (move) {
				if (closestNote.move == move) return closestNote;
				else return undefined;
			}
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
	static hitNotes(tally: Tally) {
		return tally.awesomes + tally.goods + tally.ehhs;
	}

	/**
	 * Current total notes.
	 *
	 * (This should only be used in results sceen, because it's not accurate otherwise) */
	static totalNotes(tally: Tally) {
		return Tally.hitNotes(tally) + tally.misses;
	}

	/** Returns number from 0 to 100 based on how many notes were hit */
	static cleared(tally: Tally) {
		const division = Tally.hitNotes(tally) / Tally.totalNotes(tally);
		if (isNaN(division)) return 0;
		else return Math.round(division * 100);
	}

	/** Gets the ranking for the current tally */
	static ranking(tally: Tally) {
		if (tally.awesomes == Tally.totalNotes(tally) && tally.score > 1) return "S+";
		else if (tally.misses == 0 && tally.score > 1) return "S";
		else if (Tally.cleared(tally) > 85) return "A";
		else if (Tally.cleared(tally) > 70) return "B";
		else if (Tally.cleared(tally) > 50) return "C";
		else return "F";
	}

	/** Wheter the player has gotten a 'not-awesome' */
	static isPerfect(tally: Tally) {
		return tally.awesomes == Tally.hitNotes(tally) && tally.misses == 0;
	}
}

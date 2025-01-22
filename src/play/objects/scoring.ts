// # This file will manage the ranking system
import { utils } from "../../utils";
import { INPUT_THRESHOLD, StateGame } from "../PlayState";
import { DANCER_POS, Move } from "./dancer";
import { ChartNote } from "./note";

/** Rankings for the game */
export const rankings = ["S+", "S", "A", "B", "C", "F"] as const;

/** Ranking for a song */
export type Ranking = typeof rankings[number];

/** Judgements for the game */
export const judgements = ["Awesome", "Good", "Ehh", "Miss"] as const;

/** The judgement the player got when hitting a note */
export type Judgement = typeof judgements[number];

export class Scoring {
	/** Get the judgement the player did based on hit time */
	static judgeNote(timeInSeconds: number, note: ChartNote): Judgement {
		const diff = timeInSeconds - note.time;
		const absDiff = Math.abs(diff);

		if (absDiff <= AWESOME_TIMING) return "Awesome";
		else if (absDiff <= GOOD_TIMING) return "Good";
		else if (absDiff <= EHH_TIMING) return "Ehh";
		else if (absDiff <= MISS_TIMING) return "Miss";
	}

	/** Maps the difference and gets score based on that */
	static getScorePerDiff(timeInSeconds: number, note: ChartNote): number {
		const max_score = 50;
		const min_score = 5;
		const diff = Math.abs(timeInSeconds - note.time);
		const score = Math.round(map(diff, 0, INPUT_THRESHOLD, max_score, min_score));
		return score;
	}

	/** Tally obj for tally utils */
	static tally(tally: Tally) {
		return {
			/** Current hit notes */
			hitNotes(): number {
				return tally.awesomes + tally.goods + tally.ehhs;
			},

			/**
			 * Current total notes.
			 *
			 * (This should only be used in results sceen, because it's not accurate otherwise) */
			totalNotes(): number {
				return tally.awesomes + tally.goods + tally.ehhs + tally.misses;
			},

			/** Returns number from 0 to 100 based on how many notes were hit */
			cleared(): number {
				let division = this.hitNotes(tally) / this.totalNotes(tally);
				if (isNaN(division)) return 0;
				else return division * 100;
			},

			/** Wheter the player has gotten a 'not-awesome' */
			isPerfect() {
				return tally.awesomes == this.hitNotes(tally) && tally.misses == 0;
			},

			/** Gets the ranking for the current tally */
			ranking(): Ranking {
				if (tally.awesomes == this.totalNotes(tally) && tally.score > 1) return "S+";
				else if (tally.misses == 0 && tally.score > 1) return "S";
				else if (this.cleared(tally) > 85) return "A";
				else if (this.cleared(tally) > 70) return "B";
				else if (this.cleared(tally) > 50) return "C";
				else return "F";
			},

			/** Returns a tally with random properties for a song */
			random(): Tally {
				return {
					awesomes: rand(0, 10),
					goods: rand(0, 10),
					ehhs: rand(0, 10),
					misses: rand(0, 10),
					score: 2000,
					highestCombo: 100,
				};
			},
		};
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
}

// # JUDGEMENT
export const AWESOME_TIMING = 0.05;
export const GOOD_TIMING = 0.11;
export const EHH_TIMING = 0.1355;
export const MISS_TIMING = 0.166;

/** Add judgement object */
export function addJudgement(judgement: Judgement) {
	function createJudgement() {
		let timeLeft = 1;

		const judgementObj = add([
			text(judgement, { align: "center" }),
			pos(DANCER_POS.x + 50, DANCER_POS.y),
			anchor("center"),
			opacity(1),
			scale(),
			"judgement",
			"game",
		]);

		let comboText = "";

		judgementObj.onUpdate(() => {
			timeLeft -= dt();
			judgementObj.opacity = timeLeft;
			if (judgementObj.opacity <= 0) judgementObj.destroy();
			if (judgement == "Miss") comboText = "BREAK";
			else comboText = StateGame.instance.combo.toString();
		});

		const onNoteHitEV = StateGame.instance.events.onNoteHit((note: ChartNote) => {
			timeLeft = 1;
		});

		const onNoteMiss = StateGame.instance.events.onMiss(() => {
			timeLeft = 1;
		});

		judgementObj.onDraw(() => {
			drawText({
				size: judgementObj.textSize,
				text: "\n" + comboText,
				opacity: judgementObj.opacity,
			});
		});

		judgementObj.onDestroy(() => {
			onNoteHitEV.cancel();
			onNoteMiss.cancel();
		});

		return judgementObj;
	}

	// this is called a singleton i think??????
	if (get("judgement").length > 0) {
		// since it already exists just bop it
		const judgementObj = get("judgement")[0] as ReturnType<typeof createJudgement>;

		if (Scoring.tally(StateGame.instance.tally).isPerfect()) judgementObj.text = judgement + "!!";
		else if (StateGame.instance.tally.misses < 1) judgementObj.text = judgement + "!";

		tween(vec2(1.15), vec2(1), 0.15, (p) => judgementObj.scale = p, easings.easeOutQuad);

		return judgementObj;
	}
	else {
		// this is when it's just being created
		const judgementObj = createJudgement();
		tween(0, 1, 0.15, (p) => judgementObj.opacity = p, easings.easeOutQuad);
		tween(vec2(1.15), vec2(1), 0.15, (p) => judgementObj.scale = p, easings.easeOutQuad);
		return judgementObj;
	}
}

// get the closest note to the current time
export function getClosestNote(arr: ChartNote[], time: number): ChartNote {
	return arr.reduce((acc, obj) => Math.abs(time - obj.time) < Math.abs(time - acc.time) ? obj : acc);
}

/** Runs when you press and returns the note hit or undefined if you didn't hit anything on time */
export function checkForNoteHit(move: Move): ChartNote {
	const time = StateGame.instance.conductor.timeInSeconds;
	const closestNote = getClosestNote(StateGame.instance.song.chart.notes, time);

	// if time in seconds is in range by input_treshold
	// to the hit note of any note in the chart
	const isNoteInRange = utils.isInRange(time, closestNote.time - INPUT_THRESHOLD, closestNote.time + INPUT_THRESHOLD);
	if (isNoteInRange && closestNote.move == move) {
		return closestNote;
	}

	// if no note found (the player is a dummy and didn't hit anything)
	return undefined;
}

// # This file will manage the ranking system
import { utils } from "../../utils";
import { StateGame, INPUT_THRESHOLD } from "../playstate";
import { getDancer, Move } from "./dancer";
import { ChartNote } from "./note";

/** The judgement the player did */
export type Judgement = "Awesome" | "Good" | "Ehh" | "Miss"

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

// # JUDGEMENT
export const AWESOME_TIMING = 0.088
export const GOOD_TIMING = 0.1
export const EHH_TIMING = 0.135
export const MISS_TIMING = 0.16

/** Maps the difference and gets score based on that */
export function getScorePerDiff(timeInSeconds: number, chartNote: ChartNote) {
	const max_score = 500
	const min_score = 5
	const diff = Math.abs(timeInSeconds - chartNote.hitTime)
	return Math.round(min_score + (max_score - min_score) * diff)
}

/** Get the judgement the player did based on hit time */
export function getJudgement(timeInSeconds: number, chartNote: ChartNote) : Judgement {
	const diff = timeInSeconds - chartNote.hitTime
	const absDiff = Math.abs(diff)

	if (absDiff <= AWESOME_TIMING) return "Awesome"
	else if (absDiff <= GOOD_TIMING) return "Good"
	else if (absDiff <= EHH_TIMING) return "Ehh"
	else if (absDiff <= MISS_TIMING) return "Miss"
}

/** Add judgement object */
export function addJudgement(judgement: Judgement) {
	const judgementObj = add([
		text(judgement),
		pos(getDancer().pos.x + 50, getDancer().pos.y),
		anchor("left"),
		opacity(1),
		"judgementObj"
	])

	let direction = randi(-2, 2)

	judgementObj.onUpdate(() => {
		judgementObj.pos.y += rand(1, 2)
		judgementObj.pos.x += direction * 0.1;
		if (judgementObj.opacity <= 0) judgementObj.destroy()
	})

	judgementObj.fadeOut(1)
	
	return judgementObj;
}

/** Add combo text */
export function addComboText(comboAmount: number | "break") {
	const judgementObj = get("judgementObj").reverse()[0]
	
	const comboText = judgementObj.add([
		text(comboAmount.toString()),
		pos(judgementObj.width / 2, judgementObj.height / 2),
		anchor(judgementObj.anchor),
		opacity(),
	])

	comboText.onUpdate(() => {
		comboText.opacity = judgementObj.opacity
	})

	judgementObj.onDestroy(() => comboText.destroy())
	
	return comboText;
}

/** Runs when you press and returns the note hit or null if you didn't hit anything on time */
export function checkForNoteHit(GameState:StateGame, move: Move) : ChartNote {
	function conditionsForHit(note: ChartNote) {
		// i have to check if the current time in the song is between the hittime of the note
		const t = GameState.conductor.timeInSeconds
		const lowest = note.hitTime - INPUT_THRESHOLD
		const highest = note.hitTime + INPUT_THRESHOLD

		return utils.isInRange(t, highest, lowest) && (note.dancerMove === move)
	}

	// if time in seconds is close by input_treshold to the hit note of any note in the chart
	if (GameState.song.notes.some((note) => conditionsForHit(note))) {
		return GameState.song.notes.find((note) => conditionsForHit(note))
	}
	
	// if no note found (the player is a dummy and didn't hit anything)
	else {
		return null;
	}
}
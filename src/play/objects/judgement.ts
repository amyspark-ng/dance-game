// # This file will manage the ranking system

import { GameState } from "../../game/gamestate";
import { getDancer } from "./dancer";
import { ChartNote } from "./note";

/** The judgement the player did */
export type Judgement = "Awesome" | "Good" | "Ehh" | "Miss"

export const AWESOME_TIMING = 0.045
export const GOOD_TIMING = 0.09
export const EHH_TIMING = 0.135
export const MISS_TIMING = 0.16

/** Maps the difference and gets score based on that */
export function getScorePerDiff(chartNote: ChartNote) {
	const max_score = 500
	const min_score = 5
	const diff = Math.abs(GameState.conductor.timeInSeconds - chartNote.hitTime)
	return min_score + (max_score - min_score) * diff
}

/** Get the judgement the player did based on hit time */
export function getJudgement(chartNote: ChartNote) : Judgement {
	const diff = GameState.conductor.timeInSeconds - chartNote.hitTime
	const absDiff = Math.abs(diff)

	// The lesser the difference the better the judgement
	if (absDiff <= AWESOME_TIMING) return "Awesome"
	else if (absDiff <= GOOD_TIMING) return "Good"
	else if (absDiff <= EHH_TIMING) return "Ehh"
	else return "Miss"
}

export function addJudgement(judgement: Judgement) {
	const judgementObj = add([
		text(judgement),
		pos(getDancer().pos.x + 50, getDancer().pos.y),
		anchor("left"),
		opacity(1),
	])

	let direction = randi(-2, 2)

	judgementObj.onUpdate(() => {
		judgementObj.pos.y += rand(1, 2)
		judgementObj.pos.x += direction * 0.1;
		if (judgementObj.opacity <= 0) judgementObj.destroy()
	})

	judgementObj.fadeOut(1)
}
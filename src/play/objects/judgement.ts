// # This file will manage the ranking system

import { GameState } from "../../game/gamestate";
import { getDancer } from "./dancer";
import { ChartNote } from "./note";

/** The judgement the player did */
export type Judgement = "Awesome" | "Good" | "Ehh" | "Miss"

// Taking in account that input treshold is 0.1 then the tighter the time is the better the judgement is
export const AWESOME_TIMING = 0.05
export const GOOD_TIMING = 0.07
export const EHH_TIMING = 0.9
export const MISS_TIMING = 0.16

/** Get the judgement the player did based on hit time */
export function getJudgement(chartNote: ChartNote) : Judgement {
	const difference = Math.abs(GameState.conductor.timeInSeconds - chartNote.hitTime)
	debug.log(difference)

	if (difference <= AWESOME_TIMING && difference <= GOOD_TIMING) return "Awesome"
	else if (difference <= GOOD_TIMING) return "Good"
	else if (difference <= EHH_TIMING) return "Ehh"
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
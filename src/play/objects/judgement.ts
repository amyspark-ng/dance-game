// # This file will manage the ranking system

import { GameState } from "../../game/gamestate";
import { INPUT_THRESHOLD } from "../input";
import { getDancer } from "./dancer";
import { ChartNote } from "./note";

/** The judgement the player did */
export type Judgement = "Awesome" | "Good" | "Ehh" | "Miss"

// Taking in account that input treshold is 0.1 then the tighter the time is the better the judgement is
export const AWESOME_TIMING = 0.015
export const GOOD_TIMING = 0.05
export const EHH_TIMING = 0.075
export const MISS_TIMING = 0.1

/** Get the judgement the player did based on hit time */
export function getJudgement(chartNote: ChartNote) : Judgement {
	const difference = GameState.conductor.timeInSeconds - chartNote.hitTime

	if (difference <= AWESOME_TIMING) return "Awesome"
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
	})

	judgementObj.fadeOut(1)
}
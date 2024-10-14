import { Comp } from "kaplay";
import { GameSave } from "../../game/gamesave"
import { utils } from "../../utils";
import { juice } from "../../plugins/graphics/juiceComponent";

export interface strumlineComp extends Comp {
	/** Presses/hits the strumline */
	press(noteToTry?: 1 | 2 | 3 | 4): void,

	/** Releases the strumline */
	release(): void,

	notesInLane: [],
}

export function strumline() : strumlineComp {
	return {
		id: "strumlineComp",
		require: [ "pos" ],

		notesInLane: [],

		press(noteToTry?: 1 | 2 | 3 | 4) {
			this.bop({
				startScale: vec2(1),
				endScale: vec2(1.5),
			})
		},

		release() {
			this.bop({
				startScale: vec2(1.5),
				endScale: vec2(1),
			})
		}
	}
}

/**
 * Adds a strumline, if the index
 */
export function addStrumline() {
	/** The pos of the single strum (1-strum-mode) */
	const ONE_STRUM_POS = vec2(center().x, height() - 50);
	
	const strumlineObj = add([
		rect(50, 50),
		color(BLACK),
		juice(),
		pos(vec2(0)),
		anchor("center"),
		strumline(),
		scale(),
		"strumlineObj",
	])
	
	strumlineObj.pos = ONE_STRUM_POS

	return strumlineObj;
}

export type strumlineObj = ReturnType<typeof addStrumline>

export function getStrumline() : strumlineObj {
	return get("strumlineObj", { recursive: true })[0] as strumlineObj
}
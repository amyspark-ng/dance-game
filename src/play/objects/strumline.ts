import { Comp } from "kaplay";
import { GameSave } from "../../game/gamesave"
import { utils } from "../../utils";
import { juice } from "../../plugins/graphics/juiceComponent";
import { Move } from "../objects/dancer"
import { GameState } from "../../game/gamestate";
import { pressStrumlineCheckForNote } from "../input";
import { addNote } from "./note";

export interface strumlineComp extends Comp {
	/** Presses/hits the strumline */
	press(moveToTry: Move): void,

	/** Releases the strumline */
	release(): void,
}

const PRESS_SCALE = 1.2

export function strumline() : strumlineComp {
	return {
		id: "strumlineComp",
		require: [ "pos" ],

		press(moveToTry?: Move) {
			this.bop({
				startScale: vec2(1),
				endScale: vec2(PRESS_SCALE),
			})

			pressStrumlineCheckForNote(moveToTry)
		},

		release() {
			this.bop({
				startScale: vec2(PRESS_SCALE),
				endScale: vec2(1),
			})
		},
	}
}

/** Adds the strumline */
export function addStrumline() {
	const STRUM_POS = vec2(center().x, height() - 60);
	
	const strumlineObj = add([
		juice(),
		pos(vec2(0)),
		anchor("center"),
		strumline(),
		scale(),
		"strumlineObj",
		{
			draw() {
				drawCircle({
					opacity: 0.9,
					radius: 40,
					outline: {
						color: BLACK,
						width: 6,
					},
					fill: false,
				})
			}
		}
	])
	
	strumlineObj.pos = STRUM_POS

	return strumlineObj;
}

export type strumlineObj = ReturnType<typeof addStrumline>

export function getStrumline() : strumlineObj {
	return get("strumlineObj", { recursive: true })[0] as strumlineObj
}
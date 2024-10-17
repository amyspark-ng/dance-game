import { Comp } from "kaplay";
import { GameSave } from "../../game/gamesave"
import { utils } from "../../utils";
import { juice } from "../../plugins/graphics/juiceComponent";
import { dancer, getDancer, Move } from "../objects/dancer"
import { GameState } from "../../game/gamestate";
import { checkForNote } from "../input";
import { addNote, NoteGameObj } from "./note";

export interface strumlineComp extends Comp {
	/** Presses/hits the strumline */
	press(): void,

	/** Releases the strumline */
	release(): void,
}

const PRESS_SCALE = 1.2

export function strumline() : strumlineComp {
	return {
		id: "strumlineComp",
		require: [ "pos" ],

		press() {
			this.bop({
				startScale: vec2(1),
				endScale: vec2(PRESS_SCALE),
			})

			const note = checkForNote()
			if (note != null) {
				// get the noteGameObj with the note
				const hitNote = get("noteObj", { recursive: true }).find((noteGameObj) => noteGameObj.chartNote == note)
				if (hitNote) {
					hitNote.destroy()
				}

				getDancer().doMove(note.dancerMove)
			}

			else if (note == null) {
				getDancer().miss()
			}
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
		rect(80, 80),
		juice(),
		pos(vec2(0)),
		anchor("center"),
		strumline(),
		scale(),
		color(WHITE.darken(80)),
		"strumlineObj",
	])
	
	strumlineObj.pos = STRUM_POS

	return strumlineObj;
}

export type StrumlineGameObj = ReturnType<typeof addStrumline>

export function getStrumline() : StrumlineGameObj {
	return get("strumlineObj", { recursive: true })[0] as StrumlineGameObj
}
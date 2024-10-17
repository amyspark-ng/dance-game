import { Comp } from "kaplay";
import { GameSave } from "../../game/gamesave"
import { utils } from "../../utils";
import { juice } from "../../plugins/graphics/juiceComponent";
import { dancer, getDancer, Move } from "../objects/dancer"
import { GameState } from "../../game/gamestate";
import { checkForNote } from "../input";
import { addNote, NoteGameObj } from "./note";
import { addJudgement, getJudgement } from "./judgement";

export interface strumlineComp extends Comp {
	/** Presses/hits the strumline */
	press(move: Move): void,

	/** Releases the strumline */
	release(): void,
}

const PRESS_SCALE = 1.2

export function strumline() : strumlineComp {
	return {
		id: "strumlineComp",
		require: [ "pos" ],

		press(move: Move) {
			this.bop({
				startScale: vec2(1),
				endScale: vec2(PRESS_SCALE),
			})

			const note = checkForNote(move)
			if (note != null) {
				// get the noteGameObj with the note
				const hitNote = get("noteObj", { recursive: true }).find((noteGameObj) => noteGameObj.chartNote == note) as NoteGameObj
				
				if (hitNote) {
					hitNote.destroy()
					let judgement = getJudgement(hitNote.chartNote)
					addJudgement(judgement)
					getDancer().doMove(note.dancerMove)
				}
			}

			else if (note == null) {
				getDancer().miss()
				addJudgement("Miss")
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
		rect(80, 80, { radius: 5 }),
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
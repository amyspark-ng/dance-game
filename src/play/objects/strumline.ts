import { Comp } from "kaplay";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { getDancer, Move } from "../objects/dancer"
import { getNotesOnScreen, NoteGameObj } from "./note";
import { addJudgement, checkForNoteHit, getJudgement, getScorePerDiff } from "./scoring";
import { triggerEvent } from "../../core/events";
import { StateGame } from "../playstate";

export interface strumlineComp extends Comp {
	/** Wheter the strumline is pressd */
	pressed: boolean;
	
	/** Presses/hits the strumline */
	press(move: Move): void,

	/** Releases the strumline */
	release(): void,
}

const PRESS_SCALE = 1.2

export function strumline(GameState:StateGame) : strumlineComp {
	return {
		id: "strumlineComp",
		require: [ "color", "juice" ],
		pressed: false,

		press(move: Move) {
			this.pressed = true;
			
			this.bop({
				startScale: vec2(1),
				endScale: vec2(PRESS_SCALE),
			})

			// there's notes on the screen
			if (getNotesOnScreen().length > 0) {
				const note = checkForNoteHit(GameState, move)
				if (note != null) {
					// get the noteGameObj with the note
					const hitNote = get("noteObj", { recursive: true }).find((noteGameObj) => noteGameObj.chartNote == note) as NoteGameObj
					
					if (hitNote) {
						hitNote.destroy()
						triggerEvent("onNoteHit", hitNote.chartNote)
					}
				}
	
				else if (note == null) {
					triggerEvent("onMiss")
				}
			}
		},

		release() {
			this.pressed = false;
			
			this.bop({
				startScale: vec2(PRESS_SCALE),
				endScale: vec2(1),
			})
		},
	}
}

/** Adds the strumline */
export function addStrumline(GameState:StateGame) {
	const STRUM_POS = vec2(center().x, height() - 60);
	
	const strumlineObj = add([
		rect(80, 80, { radius: 5 }),
		juice(),
		pos(vec2(0)),
		anchor("center"),
		strumline(GameState),
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
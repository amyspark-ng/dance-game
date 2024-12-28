import { Comp } from "kaplay";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { getDancer, Move } from "../objects/dancer"
import { ChartNote, getNotesOnScreen, moveToColor, NoteGameObj } from "./note";
import { checkForNoteHit } from "./scoring";
import { triggerEvent } from "../../core/events";
import { INPUT_THRESHOLD, StateGame } from "../PlayState";
import { utils } from "../../utils";

/** Scale of the strumline when pressed */
const PRESS_SCALE = 1.2
export function createStrumline(GameState:StateGame) {
	/** The position of the strumline */
	const STRUM_POS = vec2(center().x, height() - 60);
	
	const strumlineObj = add([
		rect(80, 80, { radius: 5}),
		juice(),
		pos(vec2(0)),
		anchor("center"),
		scale(),
		z(1),
		color(WHITE.darken(80)),
		"strumlineObj",
		{
			/** Wheter the strumline is pressd */
			pressed: false,
	
			/** Presses/hits the strumline */
			press(move: Move) {
				this.pressed = true;
			
				this.bop({
					startScale: vec2(1),
					endScale: vec2(PRESS_SCALE),
				})
	
				// there's notes on the screen
				if (getNotesOnScreen().length > 0) {
					const note = checkForNoteHit(GameState, move)
					
					// means it found a note that's between the input treshold
					if (note) {
						// get the noteGameObj with the note
						const hitNote = get("noteObj", { recursive: true }).find((noteGameObj) => noteGameObj.chartNote == note) as NoteGameObj
						
						if (hitNote) {
							if (!hitNote.chartNote.length) {
								hitNote.destroy()
							}

							else {
								hitNote.holding = true
							}
							
							tween(moveToColor(move), WHITE.darken(80), 0.5, (p) => this.color = p)
							triggerEvent("onNoteHit", hitNote.chartNote)
						}
					}
		
					else {
						// there's no close enough to be hit, but there ARE notes on the screen
						// so we have to check if there are any notes in twice the range of input treshold, if so then miss
						if (GameState.song.chart.notes.some((note) => utils.isInRange(GameState.conductor.timeInSeconds, note.time - INPUT_THRESHOLD * 2, note.time + INPUT_THRESHOLD * 2))) {
							triggerEvent("onMiss", false)
						}
					}
				}
			},

			release() {
				this.pressed = false;
				
				this.bop({
					startScale: vec2(PRESS_SCALE),
					endScale: vec2(1),
					// theTime: 0.25,
				})
			},
		}
	])
	
	strumlineObj.pos = STRUM_POS

	return strumlineObj;
}

export type StrumlineGameObj = ReturnType<typeof createStrumline>
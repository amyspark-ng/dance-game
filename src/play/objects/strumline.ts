import { GameObj, MaskComp, PosComp, RectComp } from "kaplay";
import { triggerEvent } from "../../core/events";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { utils } from "../../utils";
import { Move } from "../objects/dancer";
import { INPUT_THRESHOLD, StateGame } from "../PlayState";
import { ChartNote, getNotesOnScreen, moveToColor, NoteGameObj } from "./note";
import { checkForNoteHit } from "./scoring";

/** Scale of the strumline when pressed */
const PRESS_SCALE = vec2(1.2);
export function createStrumline(GameState: StateGame) {
	/** The position of the strumline */
	const STRUM_POS = vec2(center().x, height() - 60);

	const strumlineObj = add([
		rect(80, 80, { radius: 5 }),
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

			/** The current note in the strumline */
			currentNote: null as ChartNote,

			/** Presses/hits the strumline */
			press(move: Move) {
				this.pressed = true;

				// there's notes on the screen
				if (getNotesOnScreen().length > 0) {
					const note = checkForNoteHit(GameState, move);

					// means it found a note that's between the input treshold
					if (note) {
						this.currentNote = note;
						triggerEvent("onNoteHit", note);
					}
					else {
						// there's no close enough to be hit, but there ARE notes on the screen
						// so we have to check if there are any notes in twice the range of input treshold, if so then miss
						if (
							GameState.song.chart.notes.some((note) =>
								utils.isInRange(
									GameState.conductor.timeInSeconds,
									note.time - INPUT_THRESHOLD * 2,
									note.time + INPUT_THRESHOLD * 2,
								)
							)
						) {
							triggerEvent("onMiss", false);
						}
					}
				}
			},

			release() {
				this.pressed = false;
				this.currentNote = null;
			},
		},
	]);

	strumlineObj.onUpdate(() => {
		if (strumlineObj.pressed) {
			if (!strumlineObj.currentNote) return;
			strumlineObj.color = lerp(strumlineObj.color, moveToColor(strumlineObj.currentNote.move), 0.2);
			strumlineObj.scale = lerp(strumlineObj.scale, PRESS_SCALE, 0.2);
		}
		else {
			strumlineObj.color = lerp(strumlineObj.color, WHITE.darken(80), 0.2);
			strumlineObj.scale = lerp(strumlineObj.scale, vec2(1), 0.2);
		}
	});

	strumlineObj.pos = STRUM_POS;

	return strumlineObj;
}

export type StrumlineGameObj = ReturnType<typeof createStrumline>;

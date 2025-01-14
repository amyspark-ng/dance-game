import { triggerEvent } from "../../core/events";
import { GameSave } from "../../core/gamesave";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { utils } from "../../utils";
import { Move } from "../objects/dancer";
import { INPUT_THRESHOLD, StateGame } from "../PlayState";
import { ChartNote, getNotesOnScreen } from "./note";
import { checkForNoteHit } from "./scoring";

/** Scale of the strumline when pressed */
const PRESS_SCALE = vec2(1.2);
/** Dumb color for strumline */
const STRUMLINE_COLOR = WHITE.darken(60);
export function createStrumline(GameState: StateGame) {
	/** The position of the strumline */
	const STRUM_POS = vec2(center().x, height() - 60);

	/** A counter for when the strumline should be released */
	let counterForReleasing = 0.5;

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
						if (!this.currentNote.length) counterForReleasing = 0.5;
						else counterForReleasing = undefined;
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
		},
	]);

	strumlineObj.onUpdate(() => {
		if (strumlineObj.pressed) {
			// has an actual note
			if (strumlineObj.currentNote) {
				const colorOfNote = ChartNote.moveToColor(strumlineObj.currentNote.move);
				strumlineObj.color = lerp(strumlineObj.color, colorOfNote, 0.5);
				strumlineObj.scale = lerp(strumlineObj.scale, PRESS_SCALE, 0.5);
			}
			// doesn't have a note, shallow press
			else {
				const pressedKey = Object.values(GameSave.gameControls).find((gameKey) => isKeyDown(gameKey.kbKey));
				if (!pressedKey) return;
				const colorOfKey = ChartNote.moveToColor(pressedKey.move);
				strumlineObj.color = lerp(strumlineObj.color, colorOfKey.lerp(STRUMLINE_COLOR, 0.5), 0.5);
				strumlineObj.scale = lerp(strumlineObj.scale, vec2(0.9), 0.5);
			}
		}
		else {
			strumlineObj.color = lerp(strumlineObj.color, STRUMLINE_COLOR, 0.5);
			strumlineObj.scale = lerp(strumlineObj.scale, vec2(1), 0.5);
		}

		if (counterForReleasing == undefined) return;
		if (counterForReleasing > 0) counterForReleasing -= dt();
		if (counterForReleasing <= 0) {
			strumlineObj.currentNote = null;
		}
	});

	strumlineObj.pos = STRUM_POS;

	return strumlineObj;
}

export type StrumlineGameObj = ReturnType<typeof createStrumline>;

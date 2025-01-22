import { juice } from "../../core/juiceComp";
import { GameSave } from "../../core/save";
import { utils } from "../../utils";
import { Move } from "../objects/dancer";
import { INPUT_THRESHOLD, StateGame } from "../PlayState";
import { addNote, ChartNote } from "./note";
import { checkForNoteHit } from "./scoring";

/** Scale of the strumline when pressed */
const PRESS_SCALE = vec2(1.2);
/** Dumb color for strumline */
const STRUMLINE_COLOR = WHITE.darken(60);
export function createStrumline() {
	const GameState = StateGame.instance;

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
				if (ChartNote.getNotesOnScreen().length > 0) {
					const note = checkForNoteHit(move);

					// means it found a note that's between the input treshold
					if (note) {
						this.currentNote = note;
						if (!this.currentNote.length) counterForReleasing = 0.5;
						else counterForReleasing = undefined;
						GameState.events.trigger("notehit", note);
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
							GameState.events.trigger("miss");
						}
					}
				}
			},

			/** Spawns a note????' */
			spawnNote(chartnote: ChartNote) {
				addNote(chartnote, GameState, this);
			},
		},
	]);

	strumlineObj.onUpdate(() => {
		if (strumlineObj.pressed) {
			// has an actual note
			if (strumlineObj.currentNote) {
				const colorOfNote = ChartNote.moveToColor(strumlineObj.currentNote.move);
				const pressScale = strumlineObj.currentNote.move == "down" || strumlineObj.currentNote.move == "up"
					? PRESS_SCALE.scale(vec2(0.95, 1))
					: PRESS_SCALE.scale(vec2(1, 0.95));
				const offset = ChartNote.moveToOffset(strumlineObj.currentNote.move).scale(5);
				strumlineObj.color = lerp(strumlineObj.color, colorOfNote, 0.5);
				strumlineObj.scale = lerp(strumlineObj.scale, pressScale, 0.5);
				strumlineObj.pos = lerp(strumlineObj.pos, STRUM_POS.add(offset), 0.5);
			}
			// doesn't have a note, shallow press
			else {
				const pressedKey = Object.values(GameSave.gameControls).find((gameKey) => isKeyDown(gameKey));
				if (!pressedKey) return;
				const colorOfKey = ChartNote.moveToColor(GameSave.getMoveForKey(pressedKey));
				strumlineObj.color = lerp(strumlineObj.color, colorOfKey.lerp(STRUMLINE_COLOR, 0.5), 0.5);
				strumlineObj.scale = lerp(strumlineObj.scale, vec2(0.9), 0.5);
			}
		}
		else {
			strumlineObj.color = lerp(strumlineObj.color, STRUMLINE_COLOR, 0.5);
			strumlineObj.scale = lerp(strumlineObj.scale, vec2(1), 0.5);
			strumlineObj.pos = lerp(strumlineObj.pos, STRUM_POS, 0.5);
		}
	});

	strumlineObj.pos = STRUM_POS;

	return strumlineObj;
}

export type StrumlineGameObj = ReturnType<typeof createStrumline>;

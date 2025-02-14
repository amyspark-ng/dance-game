import { juice } from "../../core/juiceComp";
import { GameSave } from "../../core/save";
import { GameState } from "../GameState";
import { ChartNote, NOTE_WIDTH } from "./note";

export function createStrumline() {
	const STRUMLINE_COLOR = WHITE.darken(60);

	/** The position of the strumline */
	const STRUM_POS = vec2(center().x, height() - 60);

	/** A counter for when the strumline should be released */
	let counterForReleasing = 0.5;

	const state = GameState.instance;

	const stepsUntilStrumline = Math.floor(state.conductor.timeToStep(state.TIME_FOR_STRUM));

	add([
		rect(NOTE_WIDTH * stepsUntilStrumline, NOTE_WIDTH - 10, { radius: 10 }),
		color(BLACK),
		opacity(0.5),
		pos(STRUM_POS),
		anchor("left"),
		z(1),
	]);

	for (let i = 0; i < stepsUntilStrumline; i++) {
		add([
			opacity(1 - i / 10),
			circle(10),
			color(BLACK),
			pos(STRUM_POS.x + NOTE_WIDTH * i, STRUM_POS.y),
			z(1),
			anchor("center"),
		]);
	}

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
		},
	]);

	strumlineObj.onUpdate(() => {
		const pressedKey = Object.values(GameSave.gameControls).find((key) => isKeyDown(key));
		strumlineObj.pressed = pressedKey ? true : false;

		if (strumlineObj.pressed) {
			const colorOfKey = ChartNote.moveToColor(GameSave.getMoveForKey(pressedKey));
			strumlineObj.color = lerp(strumlineObj.color, colorOfKey.lerp(STRUMLINE_COLOR, 0.5), 0.5);
			strumlineObj.scale = lerp(strumlineObj.scale, vec2(0.9), 0.5);
		}
		else {
			strumlineObj.color = lerp(strumlineObj.color, STRUMLINE_COLOR, 0.5);
			strumlineObj.scale = lerp(strumlineObj.scale, vec2(1), 0.5);
		}
	});

	strumlineObj.pos = STRUM_POS;

	return strumlineObj;
}

export type StrumlineGameObj = ReturnType<typeof createStrumline>;

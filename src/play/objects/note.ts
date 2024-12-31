import { Color, Comp, KEventController } from "kaplay";
import { onReset, triggerEvent } from "../../core/events";
import { GameSave } from "../../core/gamesave";
import { utils } from "../../utils";
import { INPUT_THRESHOLD, StateGame } from "../PlayState";
import { Move } from "./dancer";

/** How much pixels per second does the note move at */
export const NOTE_PXPERSECOND = 5;

/** The width of the note */
export const NOTE_WIDTH = 80;

/** The spawn point of the note */
export const NOTE_SPAWNPOINT = 1024 + NOTE_WIDTH / 2;

/** Type that holds the properties a note in a chart file would have */
export class ChartNote {
	/** The time of the song (in seconds) that this note must be hit on */
	time: number = 0;
	/** The move (the color) the dancer will do upon hitting this note */
	move: Move = "up";
	/** How long the note is in steps */
	length?: number;
}

function getNoteSpawnTime(note: ChartNote) {
	return note.time - TIME_FOR_STRUM;
}

/** Converts a move to a color (based on fnf lol) */
export function moveToColor(move: Move): Color {
	switch (move) {
		case "left":
			return utils.blendColors(RED, BLUE, 0.5).lighten(10);
		case "down":
			return BLUE.lighten(50);
		case "up":
			return GREEN.lighten(25);
		case "right":
			return RED.lighten(25);
	}
}

/** How much time will take for the note to reach the strum */
export let TIME_FOR_STRUM = 1.25;

export function setTimeForStrum(value: number) {
	TIME_FOR_STRUM = value;
}

/** Adds a note to the game */
export function addNote(chartNote: ChartNote, GameState: StateGame) {
	let lengthDraw: KEventController = null;
	const noteObj = add([
		sprite(GameSave.noteskin + "_" + chartNote.move),
		pos(width() + NOTE_WIDTH, GameState.strumline.pos.y),
		anchor("center"),
		opacity(),
		z(2),
		"noteObj",
		{
			visualLength: 0,
			holding: chartNote.length ? false : null,
			chartNote: { time: 0, move: "left" } as ChartNote,
		},
	]);

	noteObj.chartNote = chartNote;
	noteObj.visualLength = noteObj.chartNote.length;

	/** if the time has already passed to hit a note and the note is not on spawned notes */
	function conditionsForPassedNote(note: ChartNote) {
		return GameState.conductor.timeInSeconds >= note.time + INPUT_THRESHOLD
			&& !hasMissedNote && GameState.spawnedNotes.includes(note) && !GameState.hitNotes.includes(note);
	}

	lengthDraw = onDraw(() => {
		for (let i = 0; i < noteObj.visualLength + 1; i++) {
			if (i == 0) {
				drawSprite({
					width: noteObj.width / 2,
					height: noteObj.height,
					sprite: GameSave.noteskin + "_" + "trail",
					pos: vec2(noteObj.pos.x + noteObj.width / 4, noteObj.pos.y),
					anchor: "center",
					shader: "replacecolor",
					// opacity: noteObj.opacity,
					uniform: {
						"u_targetcolor": moveToColor(noteObj.chartNote.move),
					},
				});
			}

			drawSprite({
				width: noteObj.width,
				height: noteObj.height,
				sprite: GameSave.noteskin + "_" + (i == noteObj.chartNote.length ? "tail" : "trail"),
				pos: vec2(noteObj.pos.x + ((i + 1) * noteObj.height), noteObj.pos.y),
				anchor: "center",
				shader: "replacecolor",
				// opacity: noteObj.opacity,
				uniform: {
					"u_targetcolor": moveToColor(noteObj.chartNote.move),
				},
			});
		}
	});

	let hasMissedNote = false;
	noteObj.onUpdate(() => {
		if (GameState.paused) return;

		if (!noteObj.holding) {
			let mapValue = (GameState.conductor.timeInSeconds - getNoteSpawnTime(noteObj.chartNote)) / TIME_FOR_STRUM;
			const xPos = map(mapValue, 0, 1, NOTE_SPAWNPOINT, GameState.strumline.pos.x - NOTE_WIDTH / 2);
			noteObj.pos.x = xPos;
		}

		if (conditionsForPassedNote(chartNote)) {
			hasMissedNote = true;
			triggerEvent("onMiss");
		}

		if (hasMissedNote) {
			noteObj.opacity -= 0.085;
			if (noteObj.pos.x < -noteObj.width) {
				noteObj.destroy();
			}
		}
	});

	noteObj.onDestroy(() => {
		lengthDraw?.cancel();
	});

	return noteObj;
}

export type NoteGameObj = ReturnType<typeof addNote>;

// MF you genius

/** Crucial function that handles the spawning of notes in the game */
export function notesSpawner(GameState: StateGame) {
	/** holds all the chart.notes that have not been spawned */
	let waiting: ChartNote[] = [];

	function resetWaiting() {
		waiting = GameState.song.chart.notes.toSorted((a, b) => getNoteSpawnTime(b) - getNoteSpawnTime(a));
	}

	resetWaiting();

	onReset(() => resetWaiting());

	function checkNotes() {
		const t = GameState.conductor.timeInSeconds;
		let index = waiting.length - 1;

		// while there are notes to spawn
		while (index >= 0) {
			const note = waiting[index];
			// If next note is in the future, stop
			if (getNoteSpawnTime(note) > t) {
				break;
			}
			addNote(note, GameState);
			index--;
		}

		// remove all the notes that have been spawned
		if (index < waiting.length - 1) {
			GameState.spawnedNotes.push(...waiting.slice(index + 1, waiting.length));
			waiting.splice(index + 1, waiting.length - 1 - index);
		}
	}

	onUpdate(() => {
		if (GameState.conductor.paused) return;
		checkNotes();
	});
}

/** Returns an array of all the notes currently on the screen */
export function getNotesOnScreen() {
	return get("noteObj", { recursive: true });
}

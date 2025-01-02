import { Color, Comp, KEvent, KEventController, Vec2 } from "kaplay";
import { onNoteHit, onReset, onStepHit, triggerEvent } from "../../core/events";
import { GameSave } from "../../core/gamesave";
import { utils } from "../../utils";
import { getKeyForMove, INPUT_THRESHOLD, StateGame } from "../PlayState";
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

	let stepHitEv: KEventController = null;
	const noteHitEv = onNoteHit((noteHit) => {
		if (noteHit != noteObj.chartNote) return;

		// this will only run when the note is hit
		noteObj.destroy();
		if (noteObj.chartNote.length) addTrail();
	});

	let hasMissedNote = false;
	noteObj.onUpdate(() => {
		if (GameState.paused) return;

		if (GameState.strumline.currentNote != noteObj.chartNote) {
			let mapValue = (GameState.conductor.timeInSeconds - getNoteSpawnTime(noteObj.chartNote)) / TIME_FOR_STRUM;
			const xPos = map(mapValue, 0, 1, NOTE_SPAWNPOINT, GameState.strumline.pos.x - NOTE_WIDTH / 2);
			noteObj.pos.x = xPos;
		}

		if (conditionsForPassedNote(chartNote)) {
			noteObj.visualLength = 0;
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

	// this is just a fake trail for when the real one comes
	if (noteObj.chartNote.length) {
		lengthDraw = onDraw(() => {
			for (let i = 0; i < noteObj.chartNote.length + 1; i++) {
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
	}

	// i should try having the one that comes with the note
	// and when the note is hit remove the note and add a trail sepparately and move it blah blah
	function addTrail() {
		const trailObj = add([
			sprite(GameSave.noteskin + "_trail", {
				tiled: true,
				height: noteObj.height,
				width: NOTE_WIDTH * noteObj.chartNote.length,
			}),
			pos(noteObj.pos),
			anchor("left"),
			opacity(),
			z(noteObj.z + 1),
			shader("replacecolor", () => ({
				"u_targetcolor": moveToColor(noteObj.chartNote.move),
			})),
			"trailObj",
			{
				visualLength: noteObj.chartNote.length,
			},
		]);

		// draws the tail
		trailObj.onDraw(() => {
			drawSprite({
				sprite: GameSave.noteskin + "_tail",
				pos: vec2(trailObj.width, 0),
				anchor: "left",
				opacity: trailObj.opacity,
				shader: "replacecolor",
				uniform: {
					"u_targetcolor": moveToColor(noteObj.chartNote.move),
				},
			});
		});

		trailObj.onUpdate(() => {
			trailObj.width = lerp(trailObj.width, NOTE_WIDTH * trailObj.visualLength, 0.25);
			trailObj.opacity = noteObj.opacity;
			if (!noteObj.exists()) noteObj.destroy();

			if (hasMissedNote) trailObj.visualLength = 0;
		});

		const stepHitEv = onStepHit(() => {
			if (hasMissedNote) return;
			if (!isKeyDown(getKeyForMove(noteObj.chartNote.move))) return;

			if (trailObj.visualLength == 0) trailObj.destroy();
			else trailObj.visualLength -= 1;
		});

		trailObj.onDestroy(() => {
			stepHitEv.cancel();
		});
	}

	noteObj.onDestroy(() => {
		noteHitEv.cancel();
		stepHitEv?.cancel();
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

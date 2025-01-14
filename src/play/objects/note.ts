import { onNoteHit, onReset, onStepHit, triggerEvent } from "../../core/events";
import { GameSave } from "../../core/gamesave";
import { utils } from "../../utils";
import { getKeyForMove, INPUT_THRESHOLD, StateGame } from "../PlayState";
import { Move } from "./dancer";
import { Scoring } from "./scoring";

/** The width of the note */
export const NOTE_WIDTH = 80;

/** The spawn point of the note */
export const NOTE_SPAWNPOINT = 1024 + NOTE_WIDTH / 2;

/** Type that holds the properties a note in a chart file would have */
export class ChartNote {
	/** The time of the song (in seconds) that this note must be hit on */
	time: number = 0;
	/** The move the dancer will do upon hitting this note */
	move: Move = "up";
	/** How long the note is in steps */
	length?: number = undefined;

	/** The spawn time of the note based on the time to reach the strum */
	static spawnTime(note: ChartNote): number {
		return note.time - TIME_FOR_STRUM;
	}

	/** Converts a move to a color */
	static moveToColor(move: Move) {
		switch (move) {
			case "left":
				return utils.blendColors(RED, BLUE, 0.5).lighten(10);
			case "down":
				return BLUE.lighten(50);
			case "up":
				return GREEN.lighten(25);
			case "right":
				return RED.lighten(25);
			default:
				return WHITE;
		}
	}

	/** Converts a move to an offset */
	static moveToOffset(move: Move) {
		switch (move) {
			case "left":
				return LEFT;
			case "down":
				return DOWN;
			case "up":
				return UP;
			case "right":
				return RIGHT;
			default:
				return vec2();
		}
	}

	/** Get the position of a note at a given time */
	static getPosAtTime(time: number, note: ChartNote, strumlineXpos: number) {
		let mapValue = (time - ChartNote.spawnTime(note)) / TIME_FOR_STRUM;
		const xPos = map(mapValue, 0, 1, NOTE_SPAWNPOINT, strumlineXpos - NOTE_WIDTH / 2);
		return xPos;
	}
}

/** How much time will take for the note to reach the strum */
export let TIME_FOR_STRUM = 1.25;

export function setTimeForStrum(value: number) {
	TIME_FOR_STRUM = value;
}

/** Adds a little mask for the long notes */
function addMasked() {
	const masked = add([
		rect(width() / 2, height()),
		pos(),
		z(10),
		mask("subtract"),
		"masked",
	]);
	return masked;
}

/** Adds a note to the game */
export function addNote(chartNote: ChartNote, GameState: StateGame) {
	let trail: ReturnType<typeof addTrail> = null;

	const noteObj = add([
		sprite(GameSave.noteskin + "_" + chartNote.move),
		pos(width() + NOTE_WIDTH, GameState.strumline.pos.y),
		anchor("center"),
		opacity(),
		z(2),
		"noteObj",
		{
			chartNote: { time: 0, move: "left" } as ChartNote,
		},
	]);

	noteObj.chartNote = chartNote;

	/** if the time has already passed to hit a note and the note is not on spawned notes */
	function conditionsForPassedNote(note: ChartNote) {
		return GameState.conductor.timeInSeconds >= note.time + INPUT_THRESHOLD
			&& !hasMissedNote && GameState.spawnedNotes.includes(note) && !GameState.hitNotes.includes(note);
	}

	const noteHitEv = onNoteHit((noteHit) => {
		if (noteHit != chartNote) return;

		// this will only run when the note is hit
		noteObj.destroy();
		noteHitEv.cancel();

		if (!noteHit.length) return;

		let hasFinishedHolding = false;
		trail.onUpdate(() => {
			if (trail.pos.x + trail.width < width() / 2 && !hasFinishedHolding) {
				hasFinishedHolding = true;
			}

			if (hasMissedNote) {
				trail.opacity = noteObj.opacity;
			}
		});

		const score = Scoring.getScorePerDiff(GameState.conductor.timeInSeconds, chartNote);
		const stepHitEv = onStepHit(() => {
			// will only run while the note is being held
			if (hasFinishedHolding) {
				stepHitEv.cancel();
				return;
			}

			GameState.addScore(Math.round(score / 2));
		});

		const keyReleaseEv = onKeyRelease(getKeyForMove(chartNote.move), () => {
			GameState.strumline.currentNote = null;

			// didn't finish holding, bad
			if (!hasFinishedHolding) {
				trail.hidden = true;
			}

			keyReleaseEv.cancel();
		});
	});

	let hasMissedNote = false;
	noteObj.onUpdate(() => {
		if (GameState.paused) return;

		if (GameState.strumline.currentNote != chartNote) {
			const xPos = ChartNote.getPosAtTime(
				GameState.conductor.timeInSeconds,
				chartNote,
				GameState.strumline.pos.x,
			);
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

	function addTrail() {
		const masked = get("masked")[0] as ReturnType<typeof addMasked>;

		const trail = masked.add([
			pos(noteObj.pos),
			anchor(noteObj.anchor),
			opacity(),
			{
				width: NOTE_WIDTH * chartNote.length,
			},
		]);

		trail.onDraw(() => {
			for (let i = 0; i < chartNote.length; i++) {
				if (i == 0) {
					drawSprite({
						sprite: GameSave.noteskin + "_" + "trail",
						width: NOTE_WIDTH / 2,
						height: NOTE_WIDTH,
						anchor: "left",
						shader: "replacecolor",
						opacity: trail.opacity,
						uniform: {
							"u_targetcolor": ChartNote.moveToColor(chartNote.move),
							"u_alpha": trail.opacity,
						},
					});
				}

				drawSprite({
					sprite: (i != chartNote.length - 1)
						? GameSave.noteskin + "_" + "trail"
						: GameSave.noteskin + "_" + "tail",
					pos: vec2(NOTE_WIDTH / 2 + (NOTE_WIDTH * i), 0),
					anchor: "left",
					shader: "replacecolor",
					opacity: trail.opacity,
					uniform: {
						"u_targetcolor": ChartNote.moveToColor(chartNote.move),
						"u_alpha": trail.opacity,
					},
				});

				// DEBUGGING purposes
				// drawRect({
				// 	width: NOTE_WIDTH,
				// 	height: NOTE_WIDTH,
				// 	outline: {
				// 		width: 1,
				// 		color: WHITE,
				// 	},
				// 	fill: false,
				// 	pos: vec2(NOTE_WIDTH / 2 + (NOTE_WIDTH * i), 0),
				// 	anchor: "left",
				// });
			}
		});

		trail.onUpdate(() => {
			const xPos = ChartNote.getPosAtTime(
				GameState.conductor.timeInSeconds,
				chartNote,
				GameState.strumline.pos.x,
			);
			trail.pos = vec2(xPos, noteObj.pos.y);
		});

		return trail;
	}

	// have to do the thing where if you release int he middle of the trail you can't pick it up again
	if (chartNote.length) {
		trail = addTrail();
	}

	return noteObj;
}

export type NoteGameObj = ReturnType<typeof addNote>;

// MF you genius
/** Crucial function that handles the spawning of notes in the game */
export function notesSpawner(GameState: StateGame) {
	addMasked();

	/** holds all the chart.notes that have not been spawned */
	let waiting: ChartNote[] = [];

	function resetWaiting() {
		waiting = GameState.song.chart.notes.toSorted((a, b) => ChartNote.spawnTime(b) - ChartNote.spawnTime(a));
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
			if (ChartNote.spawnTime(note) > t) {
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

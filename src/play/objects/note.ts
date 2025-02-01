import { Vec2 } from "kaplay";
import { GameSave } from "../../core/save";
import { getNoteskinSprite } from "../../data/noteskins";
import { utils } from "../../utils";
import { StateGame } from "../PlayState";
import { Move } from "./dancer";
import { Scoring } from "./scoring";

/** The width of the note */
export const NOTE_WIDTH = 80;

/** The spawn point of the note */
export const NOTE_SPAWNPOINT = 1024 + NOTE_WIDTH / 2;

/** Class that holds the properties a note in a chart file would have
 *
 * + Some static properties related to notes and moves
 */
export class ChartNote {
	/** The time of the song (in seconds) that this note must be hit on */
	time: number = 0;
	/** The move the dancer will do upon hitting this note */
	move: Move = "up";
	/** How long the note is in steps */
	length?: number = undefined;

	/** The spawn time of the note based on the time to reach the strum */
	static spawnTime(note: ChartNote): number {
		return note.time - StateGame.instance.TIME_FOR_STRUM;
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

	/** Converts a move to a detune */
	static moveToDetune(move: Move) {
		switch (move) {
			case "left":
				return -50;
			case "down":
				return -100;
			case "up":
				return 100;
			case "right":
				return 50;
		}
	}

	/** Get the position of a note at a given time */
	static getPosAtTime(time: number, note: ChartNote, strumlineXpos: number) {
		let mapValue = (time - ChartNote.spawnTime(note)) / StateGame.instance.TIME_FOR_STRUM;
		const xPos = map(mapValue, 0, 1, NOTE_SPAWNPOINT, strumlineXpos - NOTE_WIDTH / 2);
		return xPos;
	}

	/** Returns an array of all the notes currently on the screen (not counting trails) */
	static getNotesOnScreen(): NoteGameObj[] {
		return get("noteObj", { recursive: true });
	}
}

export function addBouncyNote(chartNote: ChartNote, startPos: Vec2 = vec2(), force: Vec2 = vec2(50, 50), rotation = -10) {
	const note = add([
		sprite(getNoteskinSprite(chartNote.move)),
		pos(startPos),
		anchor("center"),
		area(),
		body(),
		z(2),
		opacity(),
		rotate(0),
		"bouncyNote",
		"game",
	]);

	note.jump(force.y);
	note.onUpdate(() => {
		note.pos.x += force.x;
		if (note.pos.y >= height() + note.height) note.destroy();
		note.angle += rotation;
	});

	note.collisionIgnore = ["bouncyNote"];

	return note;
}

/** Adds a note to the game */
export function addNote(chartNote: ChartNote, GameState: StateGame) {
	let trail: ReturnType<typeof addTrail> = null;

	function addSillyNote(pos: Vec2) {
		const force = map(GameState.TIME_FOR_STRUM, 0.05, 1.25, -50, -10);
		return addBouncyNote(noteObj.chartNote, pos, vec2(force, noteObj.height * 3), 1);
	}

	function addFakeNote() {
		return add([
			sprite(getNoteskinSprite(chartNote.move)),
			pos(noteObj.pos),
			anchor("center"),
			opacity(),
			rotate(0),
			z(2),
			"game",
		]);
	}

	const noteObj = add([
		sprite(getNoteskinSprite(chartNote.move)),
		pos(width() + NOTE_WIDTH, GameState.strumline.pos.y),
		anchor("center"),
		opacity(),
		z(2),
		"noteObj",
		{
			moving: true,
			chartNote: chartNote,

			/** if the time has already passed to hit a note and the note is not on spawned notes */
			get hasPassed() {
				return GameState.conductor.timeInSeconds >= this.chartNote.time + Scoring.INPUT_TRESHOLD && !hasMissedNote && GameState.spawnedNotes.includes(this.chartNote)
					&& !GameState.hitNotes.includes(this.chartNote);
			},
		},
	]);

	const noteHitEv = GameState.events.onNoteHit((noteHit) => {
		if (noteHit != chartNote) return;
		noteHitEv.cancel();

		if (!noteHit.length) {
			noteObj.destroy();
			if (GameSave.sillyNotes) addSillyNote(noteObj.pos);
		}

		if (!noteHit.length) return; // the following will only run on long notes

		noteObj.destroy();
		const fakeNote = addFakeNote();

		trail.parent.width = fakeNote.pos.x; // hit the note with trail, so it should be masked
		let step = GameState.conductor.currentStep;
		let trailHasFinished = false;

		// do stuff to wait for the trail to finish
		trail.onUpdate(() => {
			if (GameState.conductor.currentStep >= (step + chartNote.length + 0.5) && !trailHasFinished) {
				trailHasFinished = true;
				if (fakeNote) {
					fakeNote.destroy();
					addSillyNote(fakeNote.pos);
				}
			}
		});

		const keyReleaseEv = onKeyRelease(GameSave.getKeyForMove(chartNote.move), () => {
			keyReleaseEv.cancel();
			GameState.strumline.currentNote = null;

			// didn't finish holding, bad
			if (!trailHasFinished) {
				trail.destroy();
				fakeNote.destroy();
				// adds a sad note
				const sadNote = addFakeNote();
				sadNote.use(area());
				sadNote.use(body());
				sadNote.onUpdate(() => {
					sadNote.angle -= 5;
					sadNote.pos.x -= 1;
					sadNote.opacity -= 0.05;
					if (sadNote.pos.y >= height() + sadNote.height) sadNote.destroy();
				});
			}
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

		if (noteObj.hasPassed) {
			hasMissedNote = true;
			GameState.events.trigger("miss", chartNote);
		}

		if (noteObj.pos.x < -noteObj.width) {
			noteObj.destroy();
		}

		if (hasMissedNote) {
			noteObj.opacity -= 0.085;
		}
	});

	function addTrail() {
		const masked = add([
			rect(0, height()),
			pos(),
			z(noteObj.z - 1),
			mask("subtract"),
			"masked",
		]);

		const trail = masked.add([
			pos(noteObj.pos),
			anchor("left"),
			opacity(),
			{
				width: NOTE_WIDTH * chartNote.length,
			},
		]);

		trail.onDestroy(() => masked.destroy());

		trail.onDraw(() => {
			// debugging
			// for (let i = 0; i < chartNote.length; i++) {
			// 	drawRect({
			// 		width: NOTE_WIDTH,
			// 		height: noteObj.height,
			// 		fill: false,
			// 		anchor: "left",
			// 		pos: vec2(NOTE_WIDTH / 2 + NOTE_WIDTH * i, 0),
			// 		outline: {
			// 			width: 5,
			// 			color: BLUE,
			// 		},
			// 	});
			// }

			// draws the base
			drawSprite({
				sprite: getNoteskinSprite("trail", chartNote.move),
				width: NOTE_WIDTH / 2,
				height: NOTE_WIDTH,
				anchor: "left",
				opacity: trail.opacity,
			});

			// draws the trail
			drawSprite({
				sprite: getNoteskinSprite("trail", chartNote.move),
				width: trail.width - NOTE_WIDTH, // removes 1 to account for the tail
				height: noteObj.height,
				// tiled: true,
				pos: vec2(NOTE_WIDTH / 2, 0),
				anchor: "left",
				opacity: trail.opacity,
			});

			// draws the tail
			drawSprite({
				sprite: getNoteskinSprite("tail", chartNote.move),
				pos: vec2(NOTE_WIDTH / 2 + trail.width - NOTE_WIDTH, 0),
				width: NOTE_WIDTH,
				height: noteObj.height,
				anchor: "left",
				opacity: trail.opacity,
			});
		});

		trail.onUpdate(() => {
			if (GameState.paused) return;
			const xPos = ChartNote.getPosAtTime(
				GameState.conductor.timeInSeconds,
				chartNote,
				GameState.strumline.pos.x,
			);
			trail.pos = vec2(xPos, noteObj.pos.y);
			trail.opacity = noteObj.opacity;
		});

		return trail;
	}

	// have to do the thing where if you release int he middle of the trail you can't pick it up again
	if (chartNote.length) {
		trail = addTrail();
	}

	return noteObj;
}

/** The type for the game object of a chartnote */
export type NoteGameObj = ReturnType<typeof addNote>;

// MF you genius
/** Crucial function that handles the spawning of notes in the game */
export function notesSpawner(GameState: StateGame) {
	/** holds all the chart.notes that have not been spawned */
	let waiting: ChartNote[] = [];

	/** Resets the queued notes */
	function resetWaiting() {
		waiting = GameState.song.chart.notes.toSorted((a, b) => ChartNote.spawnTime(b) - ChartNote.spawnTime(a));
	}

	resetWaiting();
	GameState.events.onRestart(() => resetWaiting());

	/** Check wheter a note should be spawned */
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

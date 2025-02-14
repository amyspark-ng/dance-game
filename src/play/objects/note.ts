import { GameObj, Quad, ScaleComp, Vec2 } from "kaplay";
import { GameSave } from "../../core/save";
import { Sound } from "../../core/sound";
import { getNoteskinSprite } from "../../data/noteskins";
import { utils } from "../../utils";
import { GameState } from "../GameState";
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
		return note.time - GameState.instance.TIME_FOR_STRUM;
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

	/** Gives the opposite direction of a move
	 * @param move The move to invert
	 */
	static invertMove(move: Move): Move {
		if (move == "left") return "right";
		else if (move == "down") return "up";
		else if (move == "up") return "down";
		else if (move == "right") return "left";
	}

	/** Gets the pos of a note at a given time
	 * @param hitTime
	 * @param spawnTime
	 * @param strumlinePos
	 */
	static getPosAtTime(hitTime: number, spawnTime: number, strumlinePos: Vec2 = GameState.instance.strumline.pos) {
		let mapValue = (hitTime - spawnTime) / GameState.instance.TIME_FOR_STRUM;
		return vec2(
			map(mapValue, 0, 1, NOTE_SPAWNPOINT, strumlinePos.x),
			map(mapValue, 0, 1, strumlinePos.y, strumlinePos.x),
		);
	}

	/** Returns an array of all the notes currently on the screen (not counting trails) */
	static getNotesOnScreen(): NoteGameObj[] {
		return get("noteObj", { recursive: true });
	}
}

function addBaseNote(chartNote: ChartNote, state: GameState) {
	let quad: Quad; // don't touch this

	getSprite("bean")?.then(quady => {
		quad = quady.frames[0];
	});

	const noteObj = add([
		sprite(getNoteskinSprite(chartNote.move)),
		pos(NOTE_SPAWNPOINT, state.strumline.pos.y),
		anchor("center"),
		scale(),
		rotate(0),
		opacity(),
		area(),
		body(),
		z(2),
		shader("saturate", () => ({
			"u_time": 0,
			"u_pos": vec2(quad.x, quad.y),
			"u_size": vec2(quad.x, quad.y),
			"u_color": WHITE,
		})),
		"noteObj",
		"game",
		{
			hasMissed: false,
			chartNote: chartNote,
			spawnTime: ChartNote.spawnTime(chartNote),
			flash: {
				opacity: 0,
				color: WHITE,
			},

			squish(direction: "x" | "y" = "x") {
				return tween(rand(0.35, 0.5), 1, rand(0.15, 0.35), (p) => this.scale[direction] = p, easings.easeOutQuad);
			},

			stretch(direction: "x" | "y" = "x") {
				return tween(rand(1.35, 1.55), 1, rand(0.15, 0.35), (p) => this.scale[direction] = p, easings.easeOutQuad);
			},

			coolFlash() {
				tween(ChartNote.moveToColor(chartNote.move), WHITE, 0.35, (p) => noteObj.flash.color = p, easings.easeOutQuad);
				tween(1, 0, 0.35, (p) => noteObj.flash.opacity = p, easings.easeOutQuad);
			},

			bounce(yForce: number, rotation: number = 1) {
				this.gravityScale = 1;
				this.jump(yForce);
				this.onUpdate(() => {
					this.angle += rotation;
				});
			},

			getX() {
				return ChartNote.getPosAtTime(state.conductor.time, this.spawnTime, state.strumline.pos).x;
			},

			/** if the time has already passed to hit a note and the note is not on spawned notes */
			get hasPassed() {
				return state.conductor.time >= this.chartNote.time + Scoring.INPUT_TRESHOLD && !this.hasMissed && state.spawnedNotes.includes(this.chartNote)
					&& !state.hitNotes.includes(this.chartNote);
			},
		},
	]);

	noteObj.gravityScale = 0;
	noteObj.collisionIgnore = ["noteObj"];

	noteObj.onUpdate(() => {
		if (state.paused) return;

		noteObj.uniform["u_time"] = noteObj.flash.opacity;
		noteObj.uniform["u_color"] = noteObj.flash.color;

		if (noteObj.hasPassed && !noteObj.hasMissed) {
			noteObj.hasMissed = true;
			state.events.trigger("miss", chartNote);
		}

		if (noteObj.pos.x < -noteObj.width || noteObj.pos.y >= height() + noteObj.height) noteObj.destroy();
		if (noteObj.hasMissed) noteObj.opacity -= 0.085;
	});

	return noteObj;
}

/** Adds a single note to the game
 * @param chartNote The chart note
 * @param state The game instance
 */
function addSingleNote(chartNote: ChartNote, state: GameState) {
	const noteObj = addBaseNote(chartNote, state);
	noteObj.onUpdate(() => {
		noteObj.pos.x = noteObj.getX();
	});

	const onNoteHitEV = state.events.onNoteHit((noteHit) => {
		if (noteHit != chartNote) return;
		onNoteHitEV.cancel();

		noteObj.coolFlash();
		noteObj.stretch("y");
		if (GameSave.sillyNotes) {
			noteObj.bounce(noteObj.height * 3);
			noteObj.onUpdate(() => {
				noteObj.opacity -= 0.05;
			});
		}
		else noteObj.destroy();
	});

	return noteObj;
}

/** Adds a long note to the game
 * @param chartNote The chart note
 * @param state The game instance
 */
function addLongNote(chartNote: ChartNote, state: GameState) {
	const noteObj = addBaseNote(chartNote, state);
	let trailHasFinished = false;

	noteObj.onUpdate(() => {
		noteObj.pos.x = lerp(noteObj.pos.x, noteObj.getX(), 0.5);
	});

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

	trail.onUpdate(() => {
		if (state.paused) return;
		trail.opacity = noteObj.opacity;
		const X = ChartNote.getPosAtTime(state.conductor.time, noteObj.spawnTime).x;
		trail.pos = vec2(X, noteObj.pos.y);
	});

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

	const onNoteHitEV = state.events.onNoteHit((hitNote) => {
		if (hitNote != chartNote) return;
		onNoteHitEV.cancel();

		noteObj.getX = () => noteObj.pos.x;
		noteObj.squish();
		const beatHitEV = state.conductor.onBeatHit((curBeat) => {
			noteObj.squish(curBeat % 2 == 0 ? "x" : "y");
		});

		trail.parent.width = noteObj.pos.x;
		let stepAtTime = state.conductor.currentStep;

		const finishChecker = trail.onUpdate(() => {
			// this only runs when the trail has finished
			const conditionForFinishingTrail = state.conductor.stepTime >= (stepAtTime + chartNote.length + 0.5) && !trailHasFinished;
			if (!conditionForFinishingTrail) return;
			trailHasFinished = true;
			beatHitEV.cancel();
			noteObj.getX = () => ChartNote.getPosAtTime(state.conductor.time - (state.conductor.stepInterval * chartNote.length), noteObj.spawnTime).x;
			noteObj.stretch("y");
			noteObj.coolFlash();
			if (GameSave.sillyNotes) {
				const jumpMult = clamp(state.conductor.currentStep - stepAtTime, 0, 5);
				noteObj.bounce(noteObj.height * jumpMult);
				noteObj.onUpdate(() => {
					noteObj.opacity -= 0.05;
				});
			}
			else {
				noteObj.destroy();
			}
		});

		const keyReleaseEv = onKeyRelease(GameSave.getKeyForMove(chartNote.move), () => {
			keyReleaseEv.cancel();
			state.strumline.currentNote = null;

			// didn't finish holding, bad
			if (trailHasFinished) return;

			finishChecker.cancel();
			beatHitEV.cancel();
			tween(trail.width, 0, 0.5, (p) => trail.width = p, easings.easeOutExpo);
			Sound.playSound("noteSnap");
			noteObj.gravityScale = 1;
			noteObj.onUpdate(() => {
				noteObj.angle -= 5;
				noteObj.opacity -= 0.1;
			});
		});
	});

	return noteObj;
}

/** The type for the game object of a chartnote */
export type NoteGameObj = ReturnType<typeof addBaseNote>;

// MF you genius
/** Crucial function that handles the spawning of notes in the game */
export function notesSpawner(state: GameState) {
	/** holds all the chart.notes that have not been spawned */
	let waiting: ChartNote[] = [];

	/** Resets the queued notes */
	function resetWaiting() {
		waiting = state.song.chart.notes.toSorted((a, b) => ChartNote.spawnTime(b) - ChartNote.spawnTime(a));
	}

	resetWaiting();
	state.events.onRestart(() => resetWaiting());

	/** Check wheter a note should be spawned */
	function checkNotes() {
		const t = state.conductor.time;
		let index = waiting.length - 1;

		// while there are notes to spawn
		while (index >= 0) {
			const note = waiting[index];
			// If next note is in the future, stop
			if (ChartNote.spawnTime(note) > t) {
				break;
			}
			if (!note.length) addSingleNote(note, state);
			else addLongNote(note, state);
			index--;
		}

		// remove all the notes that have been spawned
		if (index < waiting.length - 1) {
			state.spawnedNotes.push(...waiting.slice(index + 1, waiting.length));
			waiting.splice(index + 1, waiting.length - 1 - index);
		}
	}

	onUpdate(() => {
		if (state.conductor.paused) return;
		checkNotes();
	});
}

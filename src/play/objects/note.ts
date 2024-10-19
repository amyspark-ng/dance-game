import { Color, Comp, TimerController } from "kaplay";
import { getDancer, Move } from "./dancer";
import { utils } from "../../utils";
import { getStrumline, strumline } from "./strumline";
import { GameState } from "../../game/gamestate";
import { INPUT_THRESHOLD } from "../input";
import { onReset, triggerEvent } from "../../game/events";

/** How much pixels per second does the note move at */
export const NOTE_PXPERSECOND = 5;

/** The width of the note */
export const NOTE_WIDTH = 80

/** The spawn point of the note */
export const NOTE_SPAWNPOINT = 1024 + NOTE_WIDTH / 2

/** Type that holds the properties a note in a chart file would have */
export type ChartNote = {
	/** The time of the song (in seconds) that this note must be hit on */
	hitTime: number,
	/** The move (the color) the dancer will do upon hitting this note */
	dancerMove: Move,
	/** the time the note must be spawned at */
	spawnTime: number,
}

function moveToColor(move: Move) : Color {
	switch (move) {
		case "left": return utils.blendColors(RED, BLUE, 0.5).lighten(10)
		case "down": return BLUE.lighten(50)
		case "up": return GREEN.lighten(25)
		case "right": return RED.lighten(25)
	}
}

export interface noteComp extends Comp {
	/** The chartnote this note gameobj corresponds to */
	chartNote: ChartNote,
}

/** Component for note game objects */
export function note() : noteComp {
	return {
		id: "note",
		chartNote: { hitTime: 0, dancerMove: "left" } as ChartNote,
	}
}

/** How much time will take for the note to reach the strum */
export let TIME_FOR_STRUM = 1.25

export function setTimeForStrum(value: number) {
	TIME_FOR_STRUM = value;
}

export function addNote(chartNote: ChartNote) {
	const noteObj = add([
		rect(NOTE_WIDTH, NOTE_WIDTH, { radius: 5 }),
		pos(width() + NOTE_WIDTH, getStrumline().pos.y),
		note(),
		anchor("center"),
		color(moveToColor(chartNote.dancerMove)),
		opacity(),
		"noteObj",
	])

	noteObj.chartNote = chartNote;

	let hasMissedNote = false
	noteObj.onUpdate(() => {
		if (GameState.paused) return
		
		let mapValue = (GameState.conductor.timeInSeconds - chartNote.spawnTime) / TIME_FOR_STRUM
		const xPos = map(mapValue, 0, 1, NOTE_SPAWNPOINT, getStrumline().pos.x - NOTE_WIDTH / 2);
		noteObj.pos.x = xPos;

		if (GameState.conductor.timeInSeconds >= chartNote.hitTime + INPUT_THRESHOLD && !hasMissedNote) {
			hasMissedNote = true
			triggerEvent("onMiss")
		}

		if (hasMissedNote) {
			noteObj.opacity -= 0.085
			if (noteObj.opacity < 0) {
				noteObj.destroy()
			}
		}
	})

	return noteObj;
}

export type NoteGameObj = ReturnType<typeof addNote>

// MF you genius

/** Crucial function that spawns the note */
export function notesSpawner() {
	// sets the spawnTime
	GameState.currentSong.notes.forEach((note) => {
		note.spawnTime = note.hitTime - TIME_FOR_STRUM
	})

	/** holds all the notes that have not been spawned */
	let waiting: ChartNote[] = [];
	
	function resetWaiting() {
		waiting = GameState.currentSong.notes.toSorted((a, b) => b.spawnTime - a.spawnTime)
	}

	resetWaiting()

	onReset(() => resetWaiting())

	function checkNotes() {
		const t = GameState.conductor.timeInSeconds;
		let index = waiting.length - 1;
		
		// while there are notes to spawn
		while (index >= 0) {
			const note = waiting[index];
			// If next note is in the future, stop
			if (note.spawnTime > t) {
				break;
			}
			addNote(note);
			index--;
		}

		// remove all the notes that have been spawned
		if (index < waiting.length - 1) {
			GameState.spawnedNotes.push(...waiting.slice(index + 1, waiting.length))
			waiting.splice(index + 1, waiting.length - 1 - index)
		}
	}

	onUpdate(() => {
		if (GameState.paused) return;
		checkNotes()
	})
}
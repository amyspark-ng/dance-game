import { Color, Comp, TimerController } from "kaplay";
import { getDancer, Move } from "./dancer";
import { utils } from "../../utils";
import { getStrumline, strumline } from "./strumline";
import { GameState } from "../../game/gamestate";

/** How much pixels per second does the note move at */
export const NOTE_PXPERSECOND = 5;

/** The width of the note */
export const NOTE_WIDTH = 70

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

/** Get how much time will take for the note to reach the strum */
function timeForStrum() {
	// time = distance / speed
	const distance = (NOTE_SPAWNPOINT - getStrumline().pos.x) // 547
	const speed = NOTE_PXPERSECOND * GameState.currentSong.scrollSpeed // 5
	return distance / speed
}

export function addNote(chartNote: ChartNote) {
	const noteObj = add([
		rect(NOTE_WIDTH, NOTE_WIDTH),
		pos(width() + NOTE_WIDTH, getStrumline().pos.y),
		note(),
		anchor("center"),
		color(moveToColor(chartNote.dancerMove)),
		opacity(),
		"noteObj",
	])

	noteObj.pos.x = NOTE_SPAWNPOINT;
	noteObj.chartNote = chartNote;

	let hasMissedNote = false
	noteObj.onUpdate(() => {
		if (GameState.paused) return
		
		noteObj.pos.x -= NOTE_PXPERSECOND * GameState.currentSong.scrollSpeed;
	
		if (noteObj.pos.x < getStrumline().pos.x - NOTE_WIDTH - 5 && hasMissedNote == false) {
			hasMissedNote = true
			getDancer().miss()
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

/** Crucial function that spawns the note */
export function notesSpawner() {
	
}
import { Color, Comp } from "kaplay";
import { getDancer, Move } from "./dancer";
import { utils } from "../../utils";
import { getStrumline, strumline } from "./strumline";
import { GameState } from "../../game/gamestate";
import { songCharts } from "../../game/loader";
import { GameSave } from "../../game/gamesave";

export const NOTE_SPEED = 2;

/** Type that holds the properties a note in a chart file would have */
export type ChartNote = {
	/** The time of the song (in seconds) that this note must be hit on */
	hitTime: number,
	/** The move (the color) the dancer will do upon hitting this note */
	dancerMove: Move,
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
	dancerMove: Move,
	timeInSong: number,
}

export function note() : noteComp {
	return {
		id: "note",
		
		dancerMove: "left",
		timeInSong: 0,
	}
}

export function addNote(theMove: Move, timeInSong: number) {
	const noteObj = add([
		pos(width() + 50, getStrumline().pos.y),
		note(),
		anchor("center"),
		"noteObj",
	])

	noteObj.onDraw(() => {
		drawCircle({
			radius: 40,
			color: moveToColor(theMove)
		})
	})

	noteObj.onUpdate(() => {
		if (GameState.paused) return
		
		noteObj.pos.x -= NOTE_SPEED;
	
		if (noteObj.pos.x < getStrumline().pos.x - 50) {
			noteObj.destroy()
			getDancer().doMove("miss")
		}
	})

	noteObj.dancerMove = theMove;
	noteObj.timeInSong = timeInSong;

	return noteObj;
}

export type noteObj = ReturnType<typeof addNote>

/** Gets all songs in the gamescene by ordering them from the highest time in song to the lowest */
export function getAllNotesByTime() {
	return get("noteObj").sort((a, b) => b.timeInSong - a.timeInSong) as noteObj[]
}

function findClosestNote(notes:ChartNote[], currentTime:number) {
    let closestNote = null;
    let closestDifference = Infinity;

    notes.forEach(note => {
        const difference = Math.abs(note.hitTime - currentTime);
        if (difference < closestDifference) {
            closestDifference = difference;
            closestNote = note;
        }
    });

    return closestNote;
}

/** Crucial function that spawns the note */
export function notesSpawner() {
	// const NOTE_TRESHOLD = 0.01
	
	// onUpdate(() => {
	// 	if (GameState.currentSong.notes.some((note) => note.timeInSong - GameState.conductor.timeInSeconds < NOTE_TRESHOLD)) {
	// 		const note = GameState.currentSong.notes.find((note) => note.timeInSong - GameState.conductor.timeInSeconds < NOTE_TRESHOLD);
			
	// 		// if that note that was found is in the spawned notes array, don't spawn it again
	// 		if (!GameState.spawnedNotes.includes(note)) {
	// 			GameState.spawnedNotes.push(note)
	// 			addNote(note.dancerMove, note.timeInSong)
	// 			debug.log("note spawned")
	// 		}
	// 	}
	// })
}
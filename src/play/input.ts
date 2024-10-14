import { GameSave } from "../game/gamesave"
import { getDancer, Move } from "./objects/dancer"
import { GameState } from "../game/gamestate"
import { getStrumline, strumline, strumlineObj} from "./objects/strumline"
import { getAllNotesByTime, noteObj } from "./objects/note"
import { availableMonitors } from "@tauri-apps/api/window"

function indexToMove(index: number) : Move {
	switch (index) {
		case 1: return "left"
		case 2: return "down"
		case 3: return "up"
		case 4: return "right"
	}
}

/** The main function that manages inputs for the game */
export function setupInput() {
	Object.values(GameSave.preferences.gameControls).forEach((gameControl) => {
		onKeyPress(gameControl.keyboardKey, () => {
			if (!GameState.gameInputEnabled) return
			
			// TODO: Figure out why + 1 ?
			
			// bust a move
			const theMove = indexToMove(gameControl.index + 1)
			getDancer().doMove(theMove)
			getStrumline().press(theMove)
		});

		onKeyRelease(gameControl.keyboardKey, () => {
			if (!GameState.gameInputEnabled) return
			
			getStrumline().release()
		})
	});

	onKeyPress("escape", () => {
		if (!GameState.gameInputEnabled) return
		
		GameState.managePause();
	})
}

// TIMINGS
export const INPUT_THRESHOLD = 0.3

export function pressStrumlineCheckForNote(moveToTry: Move) {
	if (getAllNotesByTime().length == 0) {
		getDancer().doMove("miss")
		return;
	}

	const allNotes = getAllNotesByTime()
	// const differenceInTime = GameState.conductor.timeInSeconds - allNotes[0].timeInSong
	// let earlyOrLate:"early" | "late";

	// differenceInTime > 0 ? earlyOrLate = "early" : earlyOrLate = "late"
	
	const closestNote = allNotes.find((note) => note.pos.dist(getStrumline().pos) < 50)
	if (closestNote.pos.dist(getStrumline().pos) < 50) {
		if (moveToTry == closestNote.dancerMove) {
			closestNote.destroy()
			getDancer().doMove(closestNote.dancerMove)
		}
	}
	
	// Means you can still press it!!
	// if (differenceInTime > INPUT_THRESHOLD) {
	// 	if (moveToTry == allNotes[0].dancerMove) {
	// 		allNotes[0].destroy()
	// 		getDancer().doMove(allNotes[0].dancerMove)
	// 	}
	// }
	
	// // You can't press it anymore, you missed
	// else {

	// }
}
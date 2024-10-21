import { onBeatHit, onNoteHit, onStepHit, triggerEvent } from "../game/events"
import { moveToColor } from "../play/objects/note"
import { SongChart } from "../play/song"
import { playSound } from "../plugins/features/sound"
import { utils } from "../utils"
import { transitionToScene } from "../game/scenes"
import { fadeOut } from "../game/transitions/fadeOutTransition"
import { GameSceneParams } from "../play/gamescene"
import { Conductor, conductorUtils } from "../play/conductor"
import { Move } from "../play/objects/dancer"
import { gameCursor } from "../plugins/features/gameCursor"
import { moveChangeInputHandler, ChartEditorVars, drawAllNotes, drawCameraControlAndNotes, drawCheckerboard, drawCursor, drawSelectGizmo, drawStrumline, drawPlayBar, addDummyDancer, addTextBox, textBoxObj, setupManageTextboxes, addDownloadButton } from "./chartEditorElements"

export type chartEditorParams = {
	song: SongChart,
	playbackSpeed: number,
	seekTime: number,
}

export class ChartStateClass {
	bgColor: [number, number, number] = [67, 21, 122]
	song: SongChart;
	paused: boolean;
	conductor: Conductor;

	/** How many steps scrolled */
	scrollStep: number = 0;
}

export function moveToDetune(move: Move) {
	switch (move) {
		case "left": return -50	
		case "down": return -100	
		case "up": return 100	
		case "right": return 50	
	}
}

/** How lerped the scroll value is */
const SCROLL_LERP_VALUE = 0.5

/** How big will notes be when big */
const NOTE_BIG_SCALE = 1.4

export function ChartEditorScene() { scene("charteditor", (params: chartEditorParams) => {
	// had an issue with BPM being NaN but it was because since this wasn't defined then it was NaN
	params.playbackSpeed = params.playbackSpeed ?? 1
	params.seekTime = params.seekTime ?? 0
	params.seekTime = Math.abs(params.seekTime)

	const ChartState = new ChartStateClass()
	setBackground(Color.fromArray(ChartState.bgColor))

	ChartState.conductor = new Conductor({
		audioPlay: playSound(`${params.song.idTitle}-song`, { volume: 0.1, speed: params.playbackSpeed }),
		bpm: params.song.bpm * params.playbackSpeed,
		timeSignature: params.song.timeSignature,
		offset: 0,
	})

	ChartState.conductor.audioPlay.seek(params.seekTime)

	// IMPORTANT
	ChartState.paused = true
	ChartState.song = params.song;

	ChartState.scrollStep = conductorUtils.timeToStep(params.seekTime, ChartState.conductor.stepInterval)

	const vars = new ChartEditorVars(ChartState)

	onUpdate(() => {
		vars.ChartState = ChartState
		ChartState.conductor.paused = ChartState.paused;

		// SCROLL STEP
		if (!ChartState.paused) {
			ChartState.scrollStep = ChartState.conductor.currentStep
			vars.scrollTime = ChartState.conductor.timeInSeconds
		}
		
		else {
			vars.scrollTime = conductorUtils.stepToTime(ChartState.scrollStep + (vars.strumlineStepOffset), ChartState.conductor.stepInterval)
		}

		vars.smoothScrollStep = lerp(vars.smoothScrollStep, ChartState.scrollStep, SCROLL_LERP_VALUE)

		// MOUSE COLOR
		const currentColor = moveToColor(vars.currentMove)
		const mouseColor = utils.blendColors(WHITE, currentColor, 0.5)
		gameCursor.color = lerp(gameCursor.color, mouseColor, SCROLL_LERP_VALUE)

		// MANAGES some stuff for selecting
		vars.cursorYPos = Math.floor(mousePos().y / vars.SQUARE_SIZE.y) * vars.SQUARE_SIZE.y + vars.SQUARE_SIZE.y / 2 
		vars.cursorGridRow = Math.floor(vars.cursorYPos / vars.SQUARE_SIZE.y) - 0.5
		vars.smoothCursorYPos = lerp(vars.smoothCursorYPos, vars.cursorYPos, SCROLL_LERP_VALUE)
		vars.hoveredStep = ChartState.scrollStep + vars.cursorGridRow

		// Camera controller moving
		if (isMousePressed("left") && mousePos().x >= width() - 50 && vars.isMovingCamera == false) {
			vars.isMovingCamera = true
			if (!ChartState.paused) ChartState.paused = true
		}

		else if (isMouseReleased("left") && vars.isMovingCamera == true) {
			vars.isMovingCamera = false
		}

		if (vars.isMovingCamera) {
			vars.cameraControllerPos.y = mousePos().y
			vars.cameraControllerPos.y = clamp(vars.cameraControllerPos.y, 25, height() - 25)
			ChartState.scrollStep = mapc(vars.cameraControllerPos.y, 25, height() - 25, 0, ChartState.conductor.totalSteps)
			ChartState.scrollStep = Math.round(ChartState.scrollStep)
		}

		else {
			vars.cameraControllerPos.y = mapc(ChartState.scrollStep, 0, ChartState.conductor.totalSteps, 25, height() - 25)
		}

		// Prevent note stacking
		// if any note in the song has the same step as any other note in the song, remove the first note
		ChartState.song.notes = ChartState.song.notes.filter((note, index) => {
			const thisStep = conductorUtils.timeToStep(note.hitTime, ChartState.conductor.stepInterval)
			return ChartState.song.notes.findIndex((n) => conductorUtils.timeToStep(n.hitTime, ChartState.conductor.stepInterval) == thisStep) == index
		})

		// Handle move change input 
		moveChangeInputHandler(vars)
	
		// move up or down the selected note 
		if (vars.selectedNote) {
			const stepOfNote = conductorUtils.timeToStep(vars.selectedNote.hitTime, ChartState.conductor.stepInterval)
			
			if (isKeyPressedRepeat("w")) {
				if (stepOfNote - 1  < 0) return

				vars.selectedNote.hitTime -= ChartState.conductor.stepInterval
				playSound("ClickUp", { detune: rand(-25, 50) })
				ChartState.scrollStep -= 1
			}
			
			else if (isKeyPressedRepeat("s")) {
				if (stepOfNote + 1 > ChartState.conductor.totalSteps) return

				vars.selectedNote.hitTime += ChartState.conductor.stepInterval
				playSound("ClickUp", { detune: rand(-50, 25) })
				ChartState.scrollStep += 1
			}

			else if (isKeyPressed("backspace")) {
				vars.removeNoteFromChart(vars.selectedNote.hitTime, vars.selectedNote.dancerMove)
			}
		}
	})

	/** The main event, draws everything so i don't have to use objects */
	onDraw(() => {
		drawCheckerboard(vars)
		drawAllNotes(vars)
		drawStrumline(vars)
		drawCursor(vars)
		drawSelectGizmo(vars)
		drawCameraControlAndNotes(vars)
		drawPlayBar(vars)
	})

	/** Gets the current note that is being hovered */
	function getCurrentHoveredNote() {
		const time = conductorUtils.stepToTime(vars.hoveredStep, ChartState.conductor.stepInterval)
		return ChartState.song.notes.find((note) => conductorUtils.timeToStep(note.hitTime, ChartState.conductor.stepInterval) == conductorUtils.timeToStep(time, ChartState.conductor.stepInterval))
	}

	// Behaviour for placing and selecting notes
	onMousePress("left", () => {
		const time = conductorUtils.stepToTime(vars.hoveredStep, ChartState.conductor.stepInterval)
		const note = getCurrentHoveredNote()
		
		if (!vars.isCursorInGrid) vars.resetSelectedNote()

		// there's already a note in that place
		if (note) {
			if (!vars.isCursorInGrid) vars.resetSelectedNote()

			else {
				// select the note
				if (vars.selectedNote != note) {
					vars.selectedNote = note
					vars.startingStepForSelectedNote = conductorUtils.timeToStep(vars.selectedNote.hitTime, ChartState.conductor.stepInterval)	
				}
			}
		}

		// there's no note in that place
		else {
			if (!vars.isCursorInGrid) return;
			vars.addNoteToChart(time, vars.currentMove)
		}
	})

	// Resets the detune for moving notes
	onMouseRelease("left", () => {
		if (!vars.selectedNote) return 
		vars.startingStepForSelectedNote = 0
	})

	// Removing notes
	onMousePress("right", () => {
		if (!vars.isCursorInGrid) return
		const note = getCurrentHoveredNote()
		if (note) vars.removeNoteFromChart(note.hitTime, note.dancerMove)
		if (vars.selectedNote == note) vars.resetSelectedNote()
	})

	// Behaviour for moving notes
	onMouseDown("left", () => {
		if (vars.selectedNote == undefined) return
		
		const note = ChartState.song.notes.find((note) => note == vars.selectedNote)
		if (note) {
			const indexOfNote = ChartState.song.notes.indexOf(note)

			let oldStep = conductorUtils.timeToStep(ChartState.song.notes[indexOfNote].hitTime, ChartState.conductor.stepInterval)
			ChartState.song.notes[indexOfNote].hitTime = conductorUtils.stepToTime(vars.hoveredStep, ChartState.conductor.stepInterval)
			let newStep = conductorUtils.timeToStep(ChartState.song.notes[indexOfNote].hitTime, ChartState.conductor.stepInterval)

			const differenceInSteps = newStep - vars.startingStepForSelectedNote
			if (oldStep != newStep) playSound("ClickUp", { detune: 25 * differenceInSteps })

			// check if there was already a note at that position, if so we just move it one step ahead
			const occupiedNote = ChartState.song.notes.find(note => conductorUtils.stepToTime(newStep, ChartState.conductor.stepInterval) == note.hitTime)
			if (occupiedNote) {
				const indexOfOccupied = ChartState.song.notes.indexOf(occupiedNote)
				ChartState.song.notes[indexOfOccupied].hitTime = conductorUtils.stepToTime(newStep + 1, ChartState.conductor.stepInterval)
			}
		}
	})

	// Copies the color of a note
	onMousePress("middle", () => {
		const currentHoveredNote = getCurrentHoveredNote()
		if (currentHoveredNote && vars.currentMove != currentHoveredNote.dancerMove) {
			vars.changeMove(currentHoveredNote.dancerMove)
		}
	})

	// The scroll event
	onScroll((delta) => {
		let scrollPlus = 0
		if (!ChartState.paused) ChartState.paused = true
		
		if (ChartState.scrollStep == 0 && delta.y < 0) scrollPlus = 0
		else if (ChartState.scrollStep == ChartState.conductor.totalSteps && delta.y > 0) scrollPlus = 0
		else {
			if (delta.y >= 1) scrollPlus = 1
			else scrollPlus = -1
		}

		ChartState.scrollStep += scrollPlus
	})

	// Send you to the game
	onKeyPress("enter", () => {
		if (vars.focusedTextBox) return
		transitionToScene(fadeOut, "game", { song: ChartState.song, seekTime: vars.scrollTime } as GameSceneParams)
	})

	// Pausing unpausing behaviour
	onKeyPress("space", () => {
		if (vars.focusedTextBox) return
		ChartState.paused = !ChartState.paused
	
		if (ChartState.paused == false) {
			let newTime = conductorUtils.stepToTime(ChartState.scrollStep, ChartState.conductor.stepInterval)
			if (newTime == 0) newTime = 0.01
			ChartState.conductor.audioPlay.seek(newTime)
		}
	})

	const dummyDancer = addDummyDancer(vars)

	// makes the strumline BOP
	onBeatHit(() => {
		tween(vec2(4.5), vec2(1), 0.1, (p) => vars.strumlineScale = p)
		if (dummyDancer.currentMove == "idle") dummyDancer.moveBop()
	})

	// Scrolls the checkerboard
	onStepHit(() => {
		const someNote = ChartState.song.notes.find((note) => conductorUtils.timeToStep(note.hitTime, ChartState.conductor.stepInterval) == conductorUtils.timeToStep(ChartState.conductor.timeInSeconds, ChartState.conductor.stepInterval)) 
		if (someNote) {
			// get the note and make its scale bigger
			const indexOfNote = ChartState.song.notes.indexOf(someNote)
			tween(vec2(NOTE_BIG_SCALE), vec2(1), 0.1, (p) => vars.noteScales[indexOfNote] = p)
			playSound("ClickUp", { detune: moveToDetune(someNote.dancerMove) })
			triggerEvent("onNoteHit", someNote)
		}
	})

	// animate a dancer
	onNoteHit((note) => {
		dummyDancer.doMove(note.dancerMove)
	})

	onSceneLeave(() => {
		gameCursor.color = WHITE
	})

	setupManageTextboxes(vars)
	addDownloadButton(vars)
})}
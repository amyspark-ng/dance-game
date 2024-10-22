import { Conductor } from "../../conductor";
import { onBeatHit, onNoteHit, onStepHit, triggerEvent } from "../../core/events";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { playSound } from "../../core/plugins/features/sound";
import { transitionToScene } from "../../core/scenes";
import { fadeOut } from "../../core/transitions/fadeOutTransition";
import { utils } from "../../utils";
import { moveToColor } from "../objects/note";
import { paramsGameScene } from "../playstate";
import { addDownloadButton, addDummyDancer, paramsChartEditor, StateChart, drawAllNotes, drawCameraControlAndNotes, drawCheckerboard, drawCursor, drawPlayBar, drawSelectGizmo, drawStrumline, moveChangeInputHandler, moveToDetune, NOTE_BIG_SCALE, SCROLL_LERP_VALUE, setupManageTextboxes } from "./chartEditorBackend";

export function ChartEditorScene() { scene("charteditor", (params: paramsChartEditor) => {
	// had an issue with BPM being NaN but it was because since this wasn't defined then it was NaN
	params.playbackSpeed = params.playbackSpeed ?? 1
	params.seekTime = params.seekTime ?? 0
	params.seekTime = Math.abs(params.seekTime)

	const ChartState = new StateChart()
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
	ChartState.params = params;
	ChartState.scrollStep = ChartState.conductor.timeToStep(params.seekTime, ChartState.conductor.stepInterval)
	ChartState.noteScales = [].fill(vec2(1), 0, ChartState.song.notes.length)

	onUpdate(() => {
		ChartState.conductor.paused = ChartState.paused;

		// SCROLL STEP
		if (!ChartState.paused) {
			ChartState.scrollStep = ChartState.conductor.currentStep
			ChartState.scrollTime = ChartState.conductor.timeInSeconds
		}
		
		else {
			ChartState.scrollTime = ChartState.conductor.stepToTime(ChartState.scrollStep + (ChartState.strumlineStepOffset), ChartState.conductor.stepInterval)
		}

		ChartState.smoothScrollStep = lerp(ChartState.smoothScrollStep, ChartState.scrollStep, SCROLL_LERP_VALUE)

		// MOUSE COLOR
		const currentColor = moveToColor(ChartState.currentMove)
		const mouseColor = utils.blendColors(WHITE, currentColor, 0.5)
		gameCursor.color = lerp(gameCursor.color, mouseColor, SCROLL_LERP_VALUE)

		// MANAGES some stuff for selecting
		ChartState.cursorYPos = Math.floor(mousePos().y / ChartState.SQUARE_SIZE.y) * ChartState.SQUARE_SIZE.y + ChartState.SQUARE_SIZE.y / 2 
		ChartState.cursorGridRow = Math.floor(ChartState.cursorYPos / ChartState.SQUARE_SIZE.y) - 0.5
		ChartState.smoothCursorYPos = lerp(ChartState.smoothCursorYPos, ChartState.cursorYPos, SCROLL_LERP_VALUE)
		ChartState.hoveredStep = ChartState.scrollStep + ChartState.cursorGridRow

		// Camera controller moving
		if (isMousePressed("left") && mousePos().x >= width() - 50 && ChartState.isMovingCamera == false) {
			ChartState.isMovingCamera = true
			if (!ChartState.paused) ChartState.paused = true
		}

		else if (isMouseReleased("left") && ChartState.isMovingCamera == true) {
			ChartState.isMovingCamera = false
		}

		if (ChartState.isMovingCamera) {
			ChartState.cameraControllerPos.y = mousePos().y
			ChartState.cameraControllerPos.y = clamp(ChartState.cameraControllerPos.y, 25, height() - 25)
			ChartState.scrollStep = mapc(ChartState.cameraControllerPos.y, 25, height() - 25, 0, ChartState.conductor.totalSteps)
			ChartState.scrollStep = Math.round(ChartState.scrollStep)
		}

		else {
			ChartState.cameraControllerPos.y = mapc(ChartState.scrollStep, 0, ChartState.conductor.totalSteps, 25, height() - 25)
		}

		// Handle move change input 
		moveChangeInputHandler(ChartState)
	
		// move up or down the selected note 
		if (ChartState.selectedNote) {
			const stepOfNote = ChartState.conductor.timeToStep(ChartState.selectedNote.hitTime, ChartState.conductor.stepInterval)
			
			if (isKeyPressedRepeat("w")) {
				if (stepOfNote - 1  < 0) return

				ChartState.selectedNote.hitTime -= ChartState.conductor.stepInterval
				playSound("ClickUp", { detune: rand(-25, 50) })
				ChartState.scrollStep -= 1
			}
			
			else if (isKeyPressedRepeat("s")) {
				if (stepOfNote + 1 > ChartState.conductor.totalSteps) return

				ChartState.selectedNote.hitTime += ChartState.conductor.stepInterval
				playSound("ClickUp", { detune: rand(-50, 25) })
				ChartState.scrollStep += 1
			}

			else if (isKeyPressed("backspace")) {
				ChartState.removeNoteFromChart(ChartState.selectedNote.hitTime, ChartState.selectedNote.dancerMove)
			}
		}

		// mouse stuff
		if (ChartState.isCursorInGrid && !isMouseDown("left")) gameCursor.do("up")
		else if (ChartState.isCursorInGrid && isMouseDown("left")) gameCursor.do("down")
		else if (!ChartState.isCursorInGrid) gameCursor.do("default")
	})

	/** The main event, draws everything so i don't have to use objects */
	onDraw(() => {
		drawCheckerboard(ChartState)
		drawAllNotes(ChartState)
		drawStrumline(ChartState)
		drawCursor(ChartState)
		drawSelectGizmo(ChartState)
		drawCameraControlAndNotes(ChartState)
		drawPlayBar(ChartState)
	})

	/** Gets the current note that is being hovered */
	function getCurrentHoveredNote() {
		const time = ChartState.conductor.stepToTime(ChartState.hoveredStep, ChartState.conductor.stepInterval)
		return ChartState.song.notes.find((note) => ChartState.conductor.timeToStep(note.hitTime, ChartState.conductor.stepInterval) == ChartState.conductor.timeToStep(time, ChartState.conductor.stepInterval))
	}

	// Behaviour for placing and selecting notes
	onMousePress("left", () => {
		const time = ChartState.conductor.stepToTime(ChartState.hoveredStep, ChartState.conductor.stepInterval)
		const note = getCurrentHoveredNote()
		
		if (!ChartState.isCursorInGrid) ChartState.resetSelectedNote()

		// there's already a note in that place
		if (note) {
			if (!ChartState.isCursorInGrid) ChartState.resetSelectedNote()

			else {
				// select the note
				if (ChartState.selectedNote != note) {
					ChartState.selectedNote = note
					ChartState.startingStepForSelectedNote = ChartState.conductor.timeToStep(ChartState.selectedNote.hitTime, ChartState.conductor.stepInterval)	
				}
			}
		}

		// there's no note in that place
		else {
			if (!ChartState.isCursorInGrid) return;
			ChartState.addNoteToChart(time, ChartState.currentMove)
		}
	})

	// Resets the detune for moving notes
	onMouseRelease("left", () => {
		if (!ChartState.selectedNote) return 
		ChartState.startingStepForSelectedNote = 0
	})

	// Removing notes
	onMousePress("right", () => {
		if (!ChartState.isCursorInGrid) return
		const note = getCurrentHoveredNote()
		if (note) ChartState.removeNoteFromChart(note.hitTime, note.dancerMove)
		if (ChartState.selectedNote == note) ChartState.resetSelectedNote()
	})

	// Behaviour for moving notes
	onMouseDown("left", () => {
		if (ChartState.selectedNote == undefined) return
		
		const note = ChartState.song.notes.find((note) => note == ChartState.selectedNote)
		if (note) {
			const indexOfNote = ChartState.song.notes.indexOf(note)

			let oldStep = ChartState.conductor.timeToStep(ChartState.song.notes[indexOfNote].hitTime, ChartState.conductor.stepInterval)
			ChartState.song.notes[indexOfNote].hitTime = ChartState.conductor.stepToTime(ChartState.hoveredStep, ChartState.conductor.stepInterval)
			let newStep = ChartState.conductor.timeToStep(ChartState.song.notes[indexOfNote].hitTime, ChartState.conductor.stepInterval)

			const differenceInSteps = newStep - ChartState.startingStepForSelectedNote
			if (oldStep != newStep) playSound("ClickUp", { detune: 25 * differenceInSteps })

			// check if there was already a note at that position, if so we just move it one step ahead
			const occupiedNote = ChartState.song.notes.find(note => ChartState.conductor.stepToTime(newStep, ChartState.conductor.stepInterval) == note.hitTime)
			if (occupiedNote) {
				const indexOfOccupied = ChartState.song.notes.indexOf(occupiedNote)
				ChartState.song.notes[indexOfOccupied].hitTime = ChartState.conductor.stepToTime(newStep + 1, ChartState.conductor.stepInterval)
			}
		}
	})

	// Copies the color of a note
	onMousePress("middle", () => {
		const currentHoveredNote = getCurrentHoveredNote()
		if (currentHoveredNote && ChartState.currentMove != currentHoveredNote.dancerMove) {
			ChartState.changeMove(currentHoveredNote.dancerMove)
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
		if (ChartState.inputDisabled) return
		if (ChartState.focusedTextBox) return
		ChartState.inputDisabled = true
		ChartState.paused = true
		transitionToScene(fadeOut, "game", { song: ChartState.song, seekTime: ChartState.scrollTime, dancer: params.dancer } as paramsGameScene)
	})

	// Pausing unpausing behaviour
	onKeyPress("space", () => {
		if (ChartState.inputDisabled) return
		if (ChartState.focusedTextBox) return
		ChartState.paused = !ChartState.paused
	
		if (ChartState.paused == false) {
			let newTime = ChartState.conductor.stepToTime(ChartState.scrollStep, ChartState.conductor.stepInterval)
			if (newTime == 0) newTime = 0.01
			ChartState.conductor.audioPlay.seek(newTime)
		}
	})

	const dummyDancer = addDummyDancer(ChartState.params.dancer)

	// makes the strumline BOP
	onBeatHit(() => {
		tween(vec2(4.5), vec2(1), 0.1, (p) => ChartState.strumlineScale = p)
		if (dummyDancer.currentMove == "idle") dummyDancer.moveBop()
	})

	// Scrolls the checkerboard
	onStepHit(() => {
		const someNote = ChartState.song.notes.find((note) => ChartState.conductor.timeToStep(note.hitTime, ChartState.conductor.stepInterval) == ChartState.conductor.timeToStep(ChartState.conductor.timeInSeconds, ChartState.conductor.stepInterval)) 
		if (someNote) {
			// get the note and make its scale bigger
			const indexOfNote = ChartState.song.notes.indexOf(someNote)
			tween(vec2(NOTE_BIG_SCALE), vec2(1), 0.1, (p) => ChartState.noteScales[indexOfNote] = p)
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

	setupManageTextboxes(ChartState)
	addDownloadButton(ChartState)
})}
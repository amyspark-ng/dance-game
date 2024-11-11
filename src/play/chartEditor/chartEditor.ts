// The actual scene for the chart editor
import { Conductor } from "../../conductor";
import { onBeatHit, onNoteHit, onStepHit, triggerEvent } from "../../core/events";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { playSound } from "../../core/plugins/features/sound";
import { transitionToScene } from "../../core/scenes";
import { fadeOut } from "../../core/transitions/fadeOutTransition";
import { utils } from "../../utils";
import { moveToColor } from "../objects/note";
import { paramsGameScene } from "../playstate";
import { addDummyDancer, addFloatingText, cameraControllerHandling, handlerForChangingInput, mouseAnimationHandling, moveToDetune, paramsChartEditor, selectionBoxHandler, StateChart } from "./chartEditorBackend";
import { addTopLeftInfo, addDialogButtons, drawAllNotes, drawCameraControlAndNotes, drawCheckerboard, drawCursor, drawPlayBar, drawSelectGizmo, drawSelectionBox, drawStrumline, NOTE_BIG_SCALE, SCROLL_LERP_VALUE } from "./chartEditorElements";
import { handleAudioInput } from "../../fileManaging";
import { GameSave } from "../../core/gamesave";
import { gameDialog, openChartAboutDialog, openChartInfoDialog } from "../../ui/dialogs/gameDialog";

export function ChartEditorScene() { scene("charteditor", (params: paramsChartEditor) => {
	// had an issue with BPM being NaN but it was because since this wasn't defined then it was NaN
	params.playbackSpeed = params.playbackSpeed ?? 1
	params.seekTime = params.seekTime ?? 0
	params.seekTime = Math.abs(params.seekTime)
	params.dancer = params.dancer ?? "astri"

	const ChartState = new StateChart()
	setBackground(Color.fromArray(ChartState.bgColor))

	ChartState.conductor = new Conductor({
		audioPlay: playSound(`${params.song.manifest.uuid_DONT_CHANGE}-audio`, { channel: GameSave.sound.music, speed: params.playbackSpeed }),
		bpm: params.song.manifest.initial_bpm * params.playbackSpeed,
		timeSignature: params.song.manifest.time_signature,
		offset: 0,
	})

	ChartState.conductor.audioPlay.seek(params.seekTime)

	// IMPORTANT
	ChartState.paused = true
	ChartState.song = params.song;
	ChartState.params = params;
	ChartState.scrollStep = ChartState.conductor.timeToStep(params.seekTime, ChartState.conductor.stepInterval)
	ChartState.curSnapshotIndex = 0
	
	ChartState.snapshots = [JSON.parse(JSON.stringify(ChartState))];
	ChartState.selectedNotes = []
	ChartState.clipboard = []

	let songDuration = 0
	getSound(`${ChartState.song.manifest.uuid_DONT_CHANGE}-audio`).onLoad((data) => {
		songDuration = data.buf.duration
		ChartState.audioBuffer = data.buf
	})

	gameCursor.show()

	onUpdate(() => {
		ChartState.conductor.changeBpm(ChartState.song.manifest.initial_bpm)
		
		ChartState.song.chart.notes.forEach((note, index) => {
			note.time = clamp(note.time, 0, songDuration)
			
			if (!ChartState.noteProps[index]) {
				ChartState.noteProps[index] = { scale: vec2(1), angle: 0 }
			}
		})
		
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
		ChartState.cursorYPos = Math.floor(gameCursor.pos.y / ChartState.SQUARE_SIZE.y) * ChartState.SQUARE_SIZE.y + ChartState.SQUARE_SIZE.y / 2 
		ChartState.cursorGridRow = Math.floor(ChartState.cursorYPos / ChartState.SQUARE_SIZE.y) - 0.5
		ChartState.smoothCursorYPos = lerp(ChartState.smoothCursorYPos, ChartState.cursorYPos, SCROLL_LERP_VALUE)
		ChartState.hoveredStep = ChartState.scrollStep + ChartState.cursorGridRow

		// Handle move change input 
		handlerForChangingInput(ChartState)
		
		selectionBoxHandler(ChartState)
		cameraControllerHandling(ChartState)
		
		mouseAnimationHandling(ChartState)
		
		if (gameDialog.isOpen) return;

		let stepsToScroll = 0
		
		// move note up
		if (isKeyPressedRepeat("w") && ChartState.scrollStep > 0) {
			if (isKeyDown("shift")) stepsToScroll = -10
			else stepsToScroll = -1
			ChartState.scrollStep += stepsToScroll;
		}

		// move note down
		else if (isKeyPressedRepeat("s") && ChartState.scrollStep < ChartState.conductor.totalSteps - 1) {
			if (isKeyDown("shift")) stepsToScroll = 10
			else stepsToScroll = 1
			ChartState.scrollStep += stepsToScroll;
		}

		// remove all selected notes
		else if (isKeyPressed("backspace")) {
			if (ChartState.selectedNotes.length == 0) return
			ChartState.takeSnapshot()
			ChartState.selectedNotes.forEach((note) => {
				ChartState.removeNoteFromChart(note)
			})
			playSound("noteRemove", { detune: rand(-50, 50) })
		}

		// undo
		else if (isKeyDown("control") && isKeyPressedRepeat("z")) {
			let oldSongState = ChartState.song
			ChartState.undo()
			
			if (oldSongState != ChartState.song) {
				playSound("noteUndo", { detune: rand(-50, -25) })
			}
		}

		// redo
		else if (isKeyDown("control") && isKeyPressedRepeat("y")) {
			let oldSongState = ChartState.song
			ChartState.redo()
			
			if (oldSongState != ChartState.song) {
				playSound("noteUndo", { detune: rand(25, 50) })
			}
		}

		// copy
		else if (isKeyDown("control") && isKeyPressed("c")) {
			if (ChartState.selectedNotes.length == 0) return;
			playSound("noteCopy", { detune: rand(25, 50) })
			ChartState.clipboard = ChartState.selectedNotes
			addFloatingText(`Copied ${ChartState.selectedNotes.length} notes!`);
			
			ChartState.selectedNotes.forEach((note) => {
				const indexInNotes = ChartState.song.chart.notes.indexOf(note)
				tween(choose([-1, 1]) * 20, 0, 0.5, (p) => ChartState.noteProps[indexInNotes].angle = p, easings.easeOutExpo)
				tween(vec2(1.2), vec2(1), 0.5, (p) => ChartState.noteProps[indexInNotes].scale = p, easings.easeOutExpo)
			})
		}

		// cut
		else if (isKeyDown("control") && isKeyPressed("x")) {
			if (ChartState.selectedNotes.length == 0) return;
			playSound("noteCopy", { detune: rand(0, 25) })
			ChartState.clipboard = ChartState.selectedNotes
			addFloatingText(`Cut ${ChartState.selectedNotes.length} notes!`);
			ChartState.selectedNotes.forEach((note) => ChartState.removeNoteFromChart(note))
		}
		
		// paste
		else if (isKeyDown("control") && isKeyPressed("v")) {
			if (ChartState.clipboard.length == 0) return;
			playSound("noteCopy", { detune: rand(-50, -25) })
			addFloatingText(`Pasted ${ChartState.clipboard.length} notes!`);
			
			ChartState.selectedNotes = []

			const newStepToTime = ChartState.conductor.stepToTime(ChartState.hoveredStep - 3.5)
			ChartState.clipboard.forEach((note) => {
				const newNote = ChartState.addNoteToChart(newStepToTime + note.time, note.move)
				// i have to add it and thenn find  the index in notes :)
				const indexInNotes = ChartState.song.chart.notes.indexOf(newNote)
				if (indexInNotes == -1) return
				tween(choose([-1, 1]) * 20, 0, 0.5, (p) => ChartState.noteProps[indexInNotes].angle = p, easings.easeOutExpo)
			})

			// shickiiii
			ChartState.takeSnapshot();
		}

		// select all!
		else if (isKeyDown("control") && isKeyPressed("a")) {
			ChartState.song.chart.notes.forEach((note) => {
				if (ChartState.selectedNotes.includes(note)) return;
				ChartState.selectedNotes.push(note)
			})
		}

		if (isKeyPressed("q")) {
			handleAudioInput(ChartState)
		}

		else if (isKeyPressed("e")) {
			openChartInfoDialog(ChartState)
		}
		
		else if (isKeyPressed("r")) {
			openChartAboutDialog()
		}
	})

	// this is done like this so it's drawn on top of everything
	const selectDraw = add([
		z(1),
	])

	selectDraw.onDraw(() => {
		if (gameDialog.isOpen) return
		drawSelectionBox(ChartState)
	})

	/** The main event, draws everything so i don't have to use objects */
	onDraw(() => {
		drawCheckerboard(ChartState)
		drawAllNotes(ChartState)
		drawStrumline(ChartState)
		drawCameraControlAndNotes(ChartState)
		drawPlayBar(ChartState)
		
		if (gameDialog.isOpen) return
		drawCursor(ChartState)
		drawSelectGizmo(ChartState)
	})

	/** Gets the current note that is being hovered */
	function getCurrentHoveredNote() {
		const time = ChartState.conductor.stepToTime(ChartState.hoveredStep, ChartState.conductor.stepInterval)
		return ChartState.song.chart.notes.find((note) => ChartState.conductor.timeToStep(note.time, ChartState.conductor.stepInterval) == ChartState.conductor.timeToStep(time, ChartState.conductor.stepInterval))
	}

	/** When you press left this stores the difference of that note to the leading note, this way i can move several notes */
	let differencesToLeading = ChartState.song.chart.notes.map((note) => {
		if (ChartState.selectionBox.leadingNote == undefined) return
		return ChartState.conductor.timeToStep(note.time) - ChartState.conductor.timeToStep(ChartState.selectionBox.leadingNote.time)
	})

	// Behaviour for placing and selecting notes
	onMousePress("left", () => {
		if (gameDialog.isOpen) return;
		const time = ChartState.conductor.stepToTime(ChartState.hoveredStep, ChartState.conductor.stepInterval)
		let note = getCurrentHoveredNote()
	
		if (!ChartState.isCursorInGrid) {
			ChartState.resetSelectedNotes()
			return;	
		}

		// there's already a note in that place
		if (note) {
			// if the note is not already selected
			if (!ChartState.selectedNotes.includes(note)) {
				// if control is not down then reset the selected notes
				if (!isKeyDown("control")) ChartState.resetSelectedNotes()
				ChartState.selectedNotes.push(note) 
				ChartState.takeSnapshot();
			}
		}

		// there's no note in that place
		else {
			ChartState.resetSelectedNotes()
			note = ChartState.addNoteToChart(time, ChartState.currentMove)
			playSound("noteAdd", { detune: moveToDetune(note.move) })
			ChartState.takeSnapshot();
		}

		ChartState.selectionBox.leadingNote = note
		ChartState.stepForDetune = ChartState.conductor.timeToStep(note.time)
		differencesToLeading = ChartState.song.chart.notes.map((note) => {
			if (ChartState.selectionBox.leadingNote == undefined) return
			return ChartState.conductor.timeToStep(note.time) - ChartState.conductor.timeToStep(ChartState.selectionBox.leadingNote.time)
		})
	})

	// Resets the detune for moving notes
	onMouseRelease("left", () => {
		if (gameDialog.isOpen) return;
		ChartState.selectionBox.leadingNote = undefined;
	})

	// Removing notes
	onMousePress("right", () => {
		if (gameDialog.isOpen) return;
		if (!ChartState.isCursorInGrid) return
		const note = getCurrentHoveredNote()
		if (!note) return
		ChartState.removeNoteFromChart(note)
		playSound("noteRemove", { detune: moveToDetune(note.move) })
		ChartState.takeSnapshot();
	})

	// Behaviour for moving notes
	onMouseDown("left", () => {
		if (gameDialog.isOpen) return;
		if (!ChartState.selectionBox.leadingNote) return;
		
		let oldStepOfLeading = ChartState.conductor.timeToStep(ChartState.selectionBox.leadingNote.time)
		
		ChartState.selectedNotes.forEach((selectedNote, index) => {
			if (selectedNote == ChartState.selectionBox.leadingNote) {
				let newStep = ChartState.hoveredStep
				newStep = clamp(newStep, 0, ChartState.conductor.totalSteps - 1)

				selectedNote.time = ChartState.conductor.stepToTime(newStep)
				ChartState.selectionBox.leadingNote = selectedNote
			}

			else {
				const indexInNotes = ChartState.song.chart.notes.indexOf(selectedNote)
				const leadingNoteStep = ChartState.conductor.timeToStep(ChartState.selectionBox.leadingNote.time)

				// this is some big brain code i swear
				const stepDiff = differencesToLeading[indexInNotes]
				let newStep = leadingNoteStep + stepDiff
				newStep = clamp(newStep, 0, ChartState.conductor.totalSteps - 1)
				selectedNote.time = ChartState.conductor.stepToTime(newStep)
			}
		})
	
		let newStepOfLeading = ChartState.conductor.timeToStep(ChartState.selectionBox.leadingNote.time)
		
		if (newStepOfLeading != oldStepOfLeading) {
			// thinking WAY too hard for a simple sound effect lol!
			const diff = newStepOfLeading - ChartState.stepForDetune
			const baseDetune = Math.abs(moveToDetune(ChartState.selectionBox.leadingNote.move)) * 0.5
			playSound("noteMove", { detune: baseDetune * diff })
			ChartState.takeSnapshot();
		}
	})

	// Copies the color of a note
	onMousePress("middle", () => {
		if (gameDialog.isOpen) return;
		const currentHoveredNote = getCurrentHoveredNote()
		if (currentHoveredNote && ChartState.currentMove != currentHoveredNote.move) {
			ChartState.changeMove(currentHoveredNote.move)
		}
	})

	// The scroll event
	onScroll((delta) => {
		if (gameDialog.isOpen) return;
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
	onKeyPress("enter", async () => {
		if (gameDialog.isOpen) return;
		if (ChartState.inputDisabled) return
		ChartState.inputDisabled = true
		ChartState.paused = true
		
		const loadedNormally = await getSound(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio")
		
		// the song is not loaded with the id format name
		// or the buffer of the sound isn't the same as the buffer of the current song
		if (!loadedNormally || loadedNormally.buf != ChartState.audioBuffer) {
			// then gets the new title and loads it now with the good name
			await loadSound(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio", ChartState.audioBuffer)
		}

		// transition to scene normally
		transitionToScene(fadeOut, "game", { songZip: ChartState.song, seekTime: ChartState.scrollTime, dancer: params.dancer } as paramsGameScene)
	})

	// Pausing unpausing behaviour
	onKeyPress("space", () => {
		if (gameDialog.isOpen) return;
		if (ChartState.inputDisabled) return
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
		const someNote = ChartState.song.chart.notes.find((note) => ChartState.conductor.timeToStep(note.time, ChartState.conductor.stepInterval) == ChartState.conductor.timeToStep(ChartState.conductor.timeInSeconds, ChartState.conductor.stepInterval)) 
		if (someNote) {
			// get the note and make its scale bigger
			const indexOfNote = ChartState.song.chart.notes.indexOf(someNote)
			tween(vec2(NOTE_BIG_SCALE), vec2(1), 0.1, (p) => ChartState.noteProps[indexOfNote].scale = p)
			playSound("noteHit", { detune: moveToDetune(someNote.move) })
			triggerEvent("onNoteHit", someNote)
		}
	})

	// animate a dancer
	onNoteHit((note) => {
		dummyDancer.doMove(note.move)
	})

	onSceneLeave(() => {
		gameCursor.color = WHITE
	})

	addDialogButtons(ChartState)
	addTopLeftInfo(ChartState)

	getTreeRoot().on("dialogOpen", () => ChartState.paused = true)
})}
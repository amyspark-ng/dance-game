// The actual scene for the chart editor
import { version } from "@tauri-apps/api/os";
import { Conductor } from "../../conductor";
import { onBeatHit, onNoteHit, onStepHit, triggerEvent } from "../../core/events";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { playSound } from "../../core/plugins/features/sound";
import { transitionToScene } from "../../core/scenes";
import { fadeOut } from "../../core/transitions/fadeOutTransition";
import { utils } from "../../utils";
import { moveToColor } from "../objects/note";
import { paramsGameScene } from "../playstate";
import { addDownloadButton, addDummyDancer, addFloatingText, cameraControllerHandling, handlerForChangingInput, mouseAnimationHandling, moveToDetune, paramsChartEditor, selectionBoxHandler, setupManageTextboxes, StateChart, updateTextboxes } from "./chartEditorBackend";
import { drawAllNotes, drawCameraControlAndNotes, drawCheckerboard, drawCursor, drawPlayBar, drawSelectGizmo, drawSelectionBox, drawStrumline, NOTE_BIG_SCALE, SCROLL_LERP_VALUE } from "./chartEditorElements";
import { fileManager } from "../../core/initGame";
import JSZip from "jszip";
import { SongChart } from "../song";

export function ChartEditorScene() { scene("charteditor", (params: paramsChartEditor) => {
	// had an issue with BPM being NaN but it was because since this wasn't defined then it was NaN
	params.playbackSpeed = params.playbackSpeed ?? 1
	params.seekTime = params.seekTime ?? 0
	params.seekTime = Math.abs(params.seekTime)
	params.dancer = params.dancer ?? "astri"

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
	ChartState.curSnapshotIndex = 0
	
	ChartState.snapshots = [JSON.parse(JSON.stringify(ChartState))];
	ChartState.selectedNotes = []
	ChartState.clipboard = []

	let songDuration = 0
	getSound(`${ChartState.song.idTitle}-song`).onLoad((data) => {
		songDuration = data.buf.duration
	})

	onUpdate(() => {
		ChartState.song.notes.forEach((note, index) => {
			note.hitTime = clamp(note.hitTime, 0, songDuration)
			
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
		ChartState.cursorYPos = Math.floor(mousePos().y / ChartState.SQUARE_SIZE.y) * ChartState.SQUARE_SIZE.y + ChartState.SQUARE_SIZE.y / 2 
		ChartState.cursorGridRow = Math.floor(ChartState.cursorYPos / ChartState.SQUARE_SIZE.y) - 0.5
		ChartState.smoothCursorYPos = lerp(ChartState.smoothCursorYPos, ChartState.cursorYPos, SCROLL_LERP_VALUE)
		ChartState.hoveredStep = ChartState.scrollStep + ChartState.cursorGridRow

		// Handle move change input 
		handlerForChangingInput(ChartState)
	
		if (isKeyPressedRepeat("w") && ChartState.scrollStep > 0) ChartState.scrollStep--
		if (isKeyPressedRepeat("s") && ChartState.scrollStep < ChartState.conductor.totalSteps - 1) ChartState.scrollStep++

		selectionBoxHandler(ChartState)
		cameraControllerHandling(ChartState)
		
		mouseAnimationHandling(ChartState)

		if (isKeyPressed("backspace")) {
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
				const indexInNotes = ChartState.song.notes.indexOf(note)
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
				const newNote = ChartState.addNoteToChart(newStepToTime + note.hitTime, note.dancerMove)
				// i have to add it and thenn find  the index in notes :)
				const indexInNotes = ChartState.song.notes.indexOf(newNote)
				if (indexInNotes == -1) return
				tween(choose([-1, 1]) * 20, 0, 0.5, (p) => ChartState.noteProps[indexInNotes].angle = p, easings.easeOutExpo)
			})

			// shickiiii
			ChartState.takeSnapshot();
		}

		// select all!
		else if (isKeyDown("control") && isKeyPressed("a")) {
			ChartState.song.notes.forEach((note) => {
				if (ChartState.selectedNotes.includes(note)) return;
				ChartState.selectedNotes.push(note)
			})
		}

		if (isKeyPressed("q")) fileManager.click()
	})

	fileManager.onchange = async () => {
		ChartState.paused = true
		ChartState.inputDisabled = true
		
		/** The gotten zip */
		const gottenZip = fileManager.files[0]
		
		debug.log("got: " + gottenZip.name)
		const jsZip = new JSZip()
		
		const zipFile = await jsZip.loadAsync(gottenZip)
		
		// TODO: Have to do it a way so that it only picks the first jsons images and sounds
		// And doesn't load every single one
		zipFile.forEach(async (relativePath, zipEntry) => {
			// it's a folder
			if (zipEntry.dir) return
			type fileType = "img" | "song" | "json"

			// TODO: store the "id" to save stuff as the name of the zip
			// if it's already the name of any song just add a number

			let typeOfFile:fileType = null;
			if (relativePath.includes(".png")) typeOfFile = "img"
			else if (relativePath.includes(".ogg")) typeOfFile = "song"
			else if (relativePath.includes(".json")) typeOfFile = "json"

			if (typeOfFile == "song") {
				const fileArayBuffer = await zipEntry.async("arraybuffer")
				relativePath = "coolsong"
				await loadSound(relativePath, fileArayBuffer)
			
				// apparently at this time it has already loaden the chart so that's good
				ChartState.conductor = new Conductor({
					audioPlay: playSound(`coolsong`, { volume: 0.1, speed: params.playbackSpeed }),
					bpm: params.song.bpm * params.playbackSpeed,
					timeSignature: params.song.timeSignature,
					offset: 0,
				})

				ChartState.inputDisabled = false
			}

			else if (typeOfFile == "json") {
				const songAsObject = JSON.parse(await zipEntry.async("string")) as SongChart
				ChartState.song = songAsObject;
				
				get("textBoxComp").forEach((txtbox) => {
					updateTextboxes(ChartState, txtbox)
				})
			}
			
			else if (typeOfFile == "img") {
				const fileBase64 = await zipEntry.async("base64")
				await loadSprite(relativePath, fileBase64)
			}
		})
	}

	// this is done like this so it's drawn on top of everything
	const selectDraw = add([
		z(1),
	])

	selectDraw.onDraw(() => {
		drawSelectionBox(ChartState)
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

	/** When you press left this stores the difference of that note to the leading note, this way i can move several notes */
	let differencesToLeading = ChartState.song.notes.map((note) => {
		if (ChartState.selectionBox.leadingNote == undefined) return
		return ChartState.conductor.timeToStep(note.hitTime) - ChartState.conductor.timeToStep(ChartState.selectionBox.leadingNote.hitTime)
	})

	// Behaviour for placing and selecting notes
	onMousePress("left", () => {
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
			playSound("noteAdd", { detune: moveToDetune(note.dancerMove) })
			ChartState.takeSnapshot();
		}

		ChartState.selectionBox.leadingNote = note
		ChartState.stepForDetune = ChartState.conductor.timeToStep(note.hitTime)
		differencesToLeading = ChartState.song.notes.map((note) => {
			if (ChartState.selectionBox.leadingNote == undefined) return
			return ChartState.conductor.timeToStep(note.hitTime) - ChartState.conductor.timeToStep(ChartState.selectionBox.leadingNote.hitTime)
		})
	})

	// Resets the detune for moving notes
	onMouseRelease("left", () => {
		ChartState.selectionBox.leadingNote = undefined;
	})

	// Removing notes
	onMousePress("right", () => {
		if (!ChartState.isCursorInGrid) return
		const note = getCurrentHoveredNote()
		if (!note) return
		ChartState.removeNoteFromChart(note)
		playSound("noteRemove", { detune: moveToDetune(note.dancerMove) })
		ChartState.takeSnapshot();
	})

	// Behaviour for moving notes
	onMouseDown("left", () => {
		if (!ChartState.selectionBox.leadingNote) return;
		
		let oldStepOfLeading = ChartState.conductor.timeToStep(ChartState.selectionBox.leadingNote.hitTime)
		
		ChartState.selectedNotes.forEach((selectedNote, index) => {
			if (selectedNote == ChartState.selectionBox.leadingNote) {
				let newStep = ChartState.hoveredStep
				newStep = clamp(newStep, 0, ChartState.conductor.totalSteps - 1)

				selectedNote.hitTime = ChartState.conductor.stepToTime(newStep)
				ChartState.selectionBox.leadingNote = selectedNote
			}

			else {
				const indexInNotes = ChartState.song.notes.indexOf(selectedNote)
				const leadingNoteStep = ChartState.conductor.timeToStep(ChartState.selectionBox.leadingNote.hitTime)

				// this is some big brain code i swear
				const stepDiff = differencesToLeading[indexInNotes]
				let newStep = leadingNoteStep + stepDiff
				newStep = clamp(newStep, 0, ChartState.conductor.totalSteps - 1)
				selectedNote.hitTime = ChartState.conductor.stepToTime(newStep)
			}
		})
	
		let newStepOfLeading = ChartState.conductor.timeToStep(ChartState.selectionBox.leadingNote.hitTime)
		
		if (newStepOfLeading != oldStepOfLeading) {
			// thinking WAY too hard for a simple sound effect lol!
			const diff = newStepOfLeading - ChartState.stepForDetune
			const baseDetune = Math.abs(moveToDetune(ChartState.selectionBox.leadingNote.dancerMove)) * 0.5
			playSound("noteMove", { detune: baseDetune * diff })
			ChartState.takeSnapshot();
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
			tween(vec2(NOTE_BIG_SCALE), vec2(1), 0.1, (p) => ChartState.noteProps[indexOfNote].scale = p)
			playSound("noteHit", { detune: moveToDetune(someNote.dancerMove) })
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

	let controls = [
		"Left click - Place note",
		"Middle click - Copy note color",
		"Right click - Delete note",
		"1, 2, 3, 4 - Change the note color",
		"W, S - Moves up or down the camera",
		"Space - Pause/Unpause",
		"Ctrl + A - Select all notes",
		"Ctrl + C - Copy notes",
		"Ctrl + V - Paste notes",
		"Ctrl + X - Cut notes",
		"Ctrl + Z - Undo",
		"Ctrl + Y - Redo",
	]

	const controlsText = add([
		text(controls.join("\n"), { size: 16 }),
		pos(vec2(15, height() - 20)),
		opacity(0.5),
		anchor("botleft"),
	])
})}
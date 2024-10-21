import { Key, Vec2 } from "kaplay"
import { onBeatHit, onStepHit } from "../game/events"
import { ChartNote, moveToColor, notesSpawner } from "../play/objects/note"
import { SongChart } from "../play/song"
import { cam } from "../plugins/features/camera"
import { playSound } from "../plugins/features/sound"
import { utils } from "../utils"
import { transitionToScene } from "../game/scenes"
import { fadeOut } from "../game/transitions/fadeOutTransition"
import { GameSceneParams, GameStateClass } from "../play/gamescene"
import { Conductor } from "../play/conductor"
import { GameSave } from "../game/gamesave"
import { Move } from "../play/objects/dancer"
import { INPUT_THRESHOLD } from "../play/input"
import { gameCursor } from "../plugins/features/gameCursor"
import { dragger } from "../plugins/features/drag"
import { strumline } from "../play/objects/strumline"

export type chartEditorParams = {
	song: SongChart,
	playbackSpeed: number,
	seekTime: number,
}

/** Get which time of a song is a certain step */
function timeToStep(timeInSeconds: number, lengthOfStep: number) {
	return Math.floor(timeInSeconds / lengthOfStep)
}

/** Get which step of a song is a certain time */
function stepToTime(step: number, lengthOfStep: number) {
	return step * lengthOfStep
}

export function snapToGrid(num: number, SQUARE_SIZE = 50) {
	return Math.floor(num / SQUARE_SIZE) * SQUARE_SIZE + SQUARE_SIZE / 2
}

export class ChartStateClass {
	song: SongChart;
	paused: boolean;
	conductor: Conductor;

	/** How many steps scrolled */
	scrollStep: number = 0;
}

function moveToDetune(move: Move) {
	switch (move) {
		case "left": return -50	
		case "down": return -100	
		case "up": return 100	
		case "right": return 50	
	}
}

/** The keys used to change the current move */
const NOTE_KEYS = {
	"1": "left",
	"2": "down",
	"3": "up",
	"4": "right"
}

/** How lerped the scroll value is */
const SCROLL_LERP_VALUE = 0.5

/** How big will notes be when big */
const NOTE_BIG_SCALE = 1.4

export function ChartEditorScene() { scene("charteditor", (params: chartEditorParams) => {
	setBackground(utils.blendColors(RED, BLUE, 0.65).darken(70))
	
	// had an issue with BPM being NaN but it was because since this wasn't defined then it was NaN
	params.playbackSpeed = params.playbackSpeed ?? 1
	params.seekTime = params.seekTime ?? 0
	params.seekTime = Math.abs(params.seekTime)

	const ChartState = new ChartStateClass()

	ChartState.conductor = new Conductor({
		audioPlay: playSound(`${params.song.idTitle}-song`, { volume: 0.1, speed: params.playbackSpeed }),
		bpm: params.song.bpm * params.playbackSpeed,
		timeSignature: params.song.timeSignature,
	})

	ChartState.conductor.setup()
	ChartState.conductor.audioPlay.seek(params.seekTime)

	// IMPORTANT
	ChartState.paused = true
	ChartState.song = params.song;

	ChartState.scrollStep = timeToStep(params.seekTime, ChartState.conductor.stepInterval)

	/** Width and height of every square */
	const SQUARE_SIZE = vec2(50, 50)
	
	/** The initial pos of the first square */
	const INITIAL_POS = vec2(center().x, SQUARE_SIZE.y + SQUARE_SIZE.y / 2)

	/** The current time according to scroll step */
	let scrollTime = 0

	/** When you hold down a key, the cursor will change color to signify the move */
	let currentMove:Move = "up"
	
	/** The Y pos of the cursor (is the pos of the step you're currently hovering) */
	let cursorYPos = 0
	
	/** The row the cursor is in (the step) */
	let cursorGridRow = 0

	/** The step that is currently being hovered */
	let hoveredStep = 0

	/** Wheter the cursor is in a grid or not (allows for click) */
	let isCursorInGrid = false;

	/** The position of the camera controller */
	let cameraControllerPos = vec2(width() - 25, 25)

	/** Wheter the camera is being moved with the camera controller */
	let movingCamera = false

	/** The scale of the strumline line */
	let strumlineScale = vec2(1)
	
	/** An array with the scales of every note */
	let noteScales: Vec2[] = [].fill(vec2(1), 0, ChartState.song.notes.length)

	/** Is ChartState.scrollstep but it is constantly being lerped towards it */
	let smoothScrollStep = 0

	/** is the cursorYPos but it is constantly being lerped towards it */
	let smoothCursorYPos = 0

	/** The current selected note */
	let selectedNote:ChartNote = undefined;

	/** The step that selected note started in before it was moved */
	let startingStepForSelectedNote = 0

	/** Is by how many steps the strumline is offseted (from top to below, 0 to 12) */
	let strumlineStepOffset = 1; // this number determines where the strumline is and the time the song should start playing after unpausing

	const propsText = add([
		text("Time in song: ", { align: "left" }),
		pos(0, 0),
		anchor("topleft"),
		fixed(),
	])

	function addNoteToChart(time: number, move: Move) {
		const noteWithSameTimeButDifferentMove = ChartState.song.notes.find(note => note.hitTime == time && note.dancerMove != move || note.hitTime == time && note.dancerMove == move)
		// if there's a note already at that time but a different move, remove it
		if (noteWithSameTimeButDifferentMove) {
			removeNoteFromChart(noteWithSameTimeButDifferentMove.hitTime, noteWithSameTimeButDifferentMove.dancerMove)
		}
		
		const newNote:ChartNote = { hitTime: time, dancerMove: move }
		ChartState.song.notes.push(newNote)

		playSound("plap", { detune: moveToDetune(move) })
	
		// add it to note scales
		const indexInNotes = ChartState.song.notes.indexOf(newNote)
		tween(vec2(NOTE_BIG_SCALE), vec2(1), 0.1, (p) => noteScales[indexInNotes] = p)
	}
	
	function removeNoteFromChart(time: number, move: Move) {
		const oldNote = ChartState.song.notes.find(note => note.hitTime == time && note.dancerMove == move)
		ChartState.song.notes = utils.removeFromArr(oldNote, ChartState.song.notes)

		// remove it from note scales
		const indexInNotes = ChartState.song.notes.indexOf(oldNote)
		noteScales.splice(indexInNotes, 1)
		playSound("plop", { detune: moveToDetune(move) })
	}

	/** Changes the current move */
	function changeMove(newMove:Move) {
		currentMove = newMove;
	}

	function stepToPos(step: number) {
		return utils.getPosInGrid(INITIAL_POS, step, 0, SQUARE_SIZE)
	}

	function resetSelectedNote() {
		selectedNote = undefined
		startingStepForSelectedNote = 0
	}

	onUpdate(() => {
		ChartState.conductor.paused = ChartState.paused;
		smoothScrollStep = lerp(smoothScrollStep, ChartState.scrollStep, SCROLL_LERP_VALUE)
		
		if (!ChartState.paused) {
			ChartState.scrollStep = ChartState.conductor.currentStep
			scrollTime = ChartState.conductor.timeInSeconds
		}
		
		else {
			scrollTime = stepToTime(ChartState.scrollStep + (strumlineStepOffset), ChartState.conductor.stepInterval)
		}

		const currentColor = moveToColor(currentMove)
		const mouseColor = utils.blendColors(WHITE, currentColor, 0.5)
		gameCursor.color = lerp(gameCursor.color, mouseColor, SCROLL_LERP_VALUE)

		const scrollStepsToTime = utils.formatTime(scrollTime)
		const formattedTime = utils.formatTime(ChartState.conductor.timeInSeconds)

		const allProps = {
			"Time": ChartState.paused ? scrollStepsToTime : formattedTime,
			"Beat": Math.floor(scrollTime / ChartState.conductor.beatInterval),
			"scrollStep": ChartState.scrollStep
		}

		propsText.text = Object.entries(allProps).map(([key, value]) => `${key}: ${value}`).join("\n")

		if (isKeyDown("control") && isKeyPressed("s")) {
			downloadJSON(`${params.song.idTitle}-chart.json`, ChartState.song)
		}

		cursorYPos = Math.floor(mousePos().y / SQUARE_SIZE.y) * SQUARE_SIZE.y + SQUARE_SIZE.y / 2 
		cursorGridRow = Math.floor(cursorYPos / SQUARE_SIZE.y) - 0.5
		smoothCursorYPos = lerp(smoothCursorYPos, cursorYPos, SCROLL_LERP_VALUE)

		hoveredStep = ChartState.scrollStep + cursorGridRow

		// changes the current move
		Object.keys(NOTE_KEYS).forEach((key) => {
			if (isKeyPressed(key as Key)) changeMove(NOTE_KEYS[key])
		})

		// pause/unpause
		if (isKeyPressed("space")) {
			ChartState.paused = !ChartState.paused
	
			if (ChartState.paused == false) {
				const newTime = stepToTime(ChartState.scrollStep, ChartState.conductor.stepInterval)
				ChartState.conductor.audioPlay.seek(newTime)
			}
		}

		// camera controlling
		if (isMousePressed("left") && mousePos().x >= width() - 50 && movingCamera == false) {
			movingCamera = true
			if (!ChartState.paused) ChartState.paused = true
		}

		else if (isMouseReleased("left") && movingCamera == true) {
			movingCamera = false
		}

		if (movingCamera) {
			cameraControllerPos.y = mousePos().y
			cameraControllerPos.y = clamp(cameraControllerPos.y, 25, height() - 25)
			ChartState.scrollStep = mapc(cameraControllerPos.y, 25, height() - 25, 0, ChartState.conductor.totalSteps)
			ChartState.scrollStep = Math.round(ChartState.scrollStep)
		}

		else {
			cameraControllerPos.y = mapc(ChartState.scrollStep, 0, ChartState.conductor.totalSteps, 25, height() - 25)
		}

		// move conductor
		if (isKeyDown("control")) {
			if (isKeyPressed("down")) {
				if (!ChartState.paused) ChartState.paused = true
				strumlineStepOffset += 1
			}
			
			else if (isKeyPressed("up")) {
				if (!ChartState.paused) ChartState.paused = true
				strumlineStepOffset -= 1
			}
		}

		// prevents note stacking
	})

	/** The main event, draws everything so i don't have to use objects */
	onDraw(() => {
		// draws as many squares as steps in the song
		for (let i = 0; i < ChartState.conductor.totalSteps; i++) {
			const newPos = stepToPos(i)
			newPos.y -= 50 * smoothScrollStep

			const baseColor = WHITE.darken(100)
			const lighter = baseColor.darken(10)
			const darker = baseColor.darken(50)
			const col = i % 2 == 0 ? lighter : darker

			// draws the background chess board squares etc
			if (newPos.y <= height() + SQUARE_SIZE.y / 2) {
				drawRect({
					width: SQUARE_SIZE.x,
					height: SQUARE_SIZE.y,
					color: col,
					pos: vec2(newPos.x, newPos.y),
					anchor: "center",
				})
			}

			// draws a line on every beat
			if (i % ChartState.conductor.stepsPerBeat == 0) {
				if (newPos.y <= height()) {
					// the beat text
					drawText({
						text: `${i / ChartState.conductor.stepsPerBeat}`,
						color: WHITE,
						size: SQUARE_SIZE.x / 2,
						anchor: "center",
						pos: vec2(newPos.x + SQUARE_SIZE.x, newPos.y)
					})
					
					drawRect({
						width: SQUARE_SIZE.x,
						height: 5,
						color: darker.darken(70),
						anchor: "center",
						pos: vec2(newPos.x, newPos.y - SQUARE_SIZE.y / 2 - 2.5),
					})
				}
			}
		}

		// draws the notes
		ChartState.song.notes.forEach((note, index) => {
			let notePos = utils.getPosInGrid(INITIAL_POS, timeToStep(note.hitTime, ChartState.conductor.stepInterval), 0, SQUARE_SIZE)
			notePos.y -= 50 * smoothScrollStep

			const notePosLerped = lerp(notePos, notePos, SCROLL_LERP_VALUE)
			
			if (notePos.y <= height()) {
				drawSprite({
					width: SQUARE_SIZE.x,
					height: SQUARE_SIZE.y,
					scale: noteScales[index],
					sprite: GameSave.preferences.noteskin + "_" + note.dancerMove,
					pos: notePosLerped,
					opacity: scrollTime >= note.hitTime ? 1 : 0.5,
					anchor: "center",
				})
			}
		})

		// # strumlineline
		const strumlineYPos = SQUARE_SIZE.y * strumlineStepOffset
		drawLine({
			p1: vec2((center().x - SQUARE_SIZE.x / 2 * 3) - 5 * strumlineScale.x, strumlineYPos),
			p2: vec2((center().x + SQUARE_SIZE.x / 2 * 3) + 5 * strumlineScale.x, strumlineYPos),
			color: RED,
			width: 5,
			fixed: true,
		})

		// if the distance between the cursor and the square is small enough then highlight it
		if (mousePos().x <= center().x + SQUARE_SIZE.x / 2 && mousePos().x >= center().x - SQUARE_SIZE.x / 2) {
			if (ChartState.scrollStep == 0 && mousePos().y <= strumlineYPos) isCursorInGrid = false
			else if (ChartState.scrollStep == ChartState.conductor.totalSteps && mousePos().y >= strumlineYPos) isCursorInGrid = false
			else isCursorInGrid = true
		}
		
		else isCursorInGrid = false

		if (isCursorInGrid) {
			// cursor = the square you're hovering over
			// draws the cursor
			drawRect({
				width: SQUARE_SIZE.x - 5,
				height: SQUARE_SIZE.y - 5,
				color: WHITE,
				fill: false,
				outline: {
					width: 8, color: moveToColor(currentMove).darken(50)
				},
				pos: vec2(center().x, smoothCursorYPos),
				anchor: "center",
				fixed: true,
			})
		}

		// draws the camera controller
		drawRect({
			width: SQUARE_SIZE.x,
			height: SQUARE_SIZE.y,
			anchor: "center",
			pos: cameraControllerPos,
			color: YELLOW,
		})

		// draws the notes on the side of the camera controller
		if (movingCamera) {
			ChartState.song.notes.forEach((note, index) => {
				const initialPos = vec2(width() - 25, 0)
				const yPos = map(note.hitTime, 0, ChartState.conductor.audioPlay.duration(), initialPos.y, height())
				const xPos = initialPos.x
	
				drawRect({
					width: SQUARE_SIZE.x / 10,
					height: SQUARE_SIZE.y / 10,
					color: moveToColor(note.dancerMove),
					anchor: "center",
					pos: vec2(xPos, yPos),
					opacity: 0.5
				})
			})
		}

		// draw the selected gizmo
		if (selectedNote != undefined) {
			const stepOfSelectedNote = timeToStep(selectedNote.hitTime, ChartState.conductor.stepInterval) - ChartState.scrollStep
			const gizmoPos = stepToPos(stepOfSelectedNote)
			const celesteColor = BLUE.lighten(150)

			drawRect({
				width: SQUARE_SIZE.x,
				height: SQUARE_SIZE.y,
				anchor: "center",
				pos: vec2(gizmoPos.x, gizmoPos.y),
				opacity: 0.5,
				color: celesteColor,
				outline: {
					width: 5,
					opacity: 1,
					color: celesteColor
				},
			})
		}
	})

	/** Gets the current note that is being hovered */
	function getCurrentHoveredNote() {
		const time = stepToTime(hoveredStep, ChartState.conductor.stepInterval)
		return ChartState.song.notes.find((note) => timeToStep(note.hitTime, ChartState.conductor.stepInterval) == timeToStep(time, ChartState.conductor.stepInterval))
	}

	onMousePress("left", () => {
		const time = stepToTime(hoveredStep, ChartState.conductor.stepInterval)
		const note = getCurrentHoveredNote()
		
		if (!isCursorInGrid) resetSelectedNote()

		// there's already a note in that place
		if (note) {
			if (!isCursorInGrid) resetSelectedNote()

			else {
				// select the note
				if (selectedNote != note) {
					selectedNote = note
					startingStepForSelectedNote = timeToStep(selectedNote.hitTime, ChartState.conductor.stepInterval)	
				}
			}
		}

		// there's no note in that place
		else {
			if (!isCursorInGrid) return;
			addNoteToChart(time, currentMove)
		}
	})

	// restarts it
	onMouseRelease("left", () => {
		if (!selectedNote) return 
		startingStepForSelectedNote = stepToTime(selectedNote.hitTime, ChartState.conductor.stepInterval)
	})

	// removes a note
	onMousePress("right", () => {
		if (!isCursorInGrid) return
		const note = getCurrentHoveredNote()
		if (note) removeNoteFromChart(note.hitTime, note.dancerMove)
		if (selectedNote == note) resetSelectedNote()
	})

	// behaviour for moving notes
	onMouseDown("left", () => {
		if (selectedNote == undefined) return
		
		const note = ChartState.song.notes.find((note) => note == selectedNote)
		if (note) {
			const indexOfNote = ChartState.song.notes.indexOf(note)

			let oldStep = timeToStep(ChartState.song.notes[indexOfNote].hitTime, ChartState.conductor.stepInterval)
			ChartState.song.notes[indexOfNote].hitTime = stepToTime(hoveredStep, ChartState.conductor.stepInterval)
			let newStep = timeToStep(ChartState.song.notes[indexOfNote].hitTime, ChartState.conductor.stepInterval)

			const differenceInSteps = startingStepForSelectedNote - newStep
			if (oldStep != newStep) playSound("ClickUp", { detune: 25 * differenceInSteps })

			// check if there was already a note at that position, if so we just move it one step ahead
			const occupiedNote = ChartState.song.notes.find(note => stepToTime(newStep, ChartState.conductor.stepInterval) == note.hitTime)
			if (occupiedNote) {
				const indexOfOccupied = ChartState.song.notes.indexOf(occupiedNote)
				ChartState.song.notes[indexOfOccupied].hitTime = stepToTime(newStep + 1, ChartState.conductor.stepInterval)
			}
		
			// if (ChartState.scrollStep != 0 || ChartState.scrollStep != ChartState.conductor.totalSteps) {
			// 	if (gameCursor.pos.y <= SQUARE_SIZE.y * strumlineStepOffset) {
			// 		ChartState.scrollStep -= 1
			// 	}
	
			// 	else if (gameCursor.pos.y >= height() - SQUARE_SIZE.y / 2) {
			// 		ChartState.scrollStep += 1
			// 	}
			// }
		}
	})

	// copies the color of a note
	onMousePress("middle", () => {
		const currentHoveredNote = getCurrentHoveredNote()
		if (currentHoveredNote && currentMove != currentHoveredNote.dancerMove) {
			changeMove(currentHoveredNote.dancerMove)
		}
	})

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

	onKeyPress("enter", () => {
		transitionToScene(fadeOut, "game", { song: ChartState.song, seekTime: scrollTime } as GameSceneParams)
	})

	onKeyPress("f2", () => {
		debug.inspect = !debug.inspect
	})

	onBeatHit(() => {
		tween(vec2(4.5), vec2(1), 0.1, (p) => strumlineScale = p)
	})

	onStepHit(() => {
		const someNote = ChartState.song.notes.find((note) => timeToStep(note.hitTime, ChartState.conductor.stepInterval) == timeToStep(ChartState.conductor.timeInSeconds, ChartState.conductor.stepInterval)) 
		if (someNote) {
			// get the note and make its scale bigger
			const indexOfNote = ChartState.song.notes.indexOf(someNote)
			tween(vec2(NOTE_BIG_SCALE), vec2(1), 0.1, (p) => noteScales[indexOfNote] = p)
			playSound("ClickUp", { detune: moveToDetune(someNote.dancerMove) })
		}
	})

	onSceneLeave(() => {
		gameCursor.color = WHITE
	})
})}
// Extra stuff for the chart editor
import { Key, Vec2 } from "kaplay";
import { utils } from "../utils";
import { ChartStateClass, moveToDetune } from "./charteditorscene";
import { Move } from "../play/objects/dancer";
import { ChartNote, moveToColor } from "../play/objects/note";
import { GameSave } from "../game/gamesave";
import { conductorUtils } from "../play/conductor";
import { playSound } from "../plugins/features/sound";
import { gameCursor } from "../plugins/features/gameCursor";

/** Class for managing variables related to the Chart Editor */
export class ChartEditorVars {
	/** The ChartState instance corresponded */
	ChartState: ChartStateClass

	/** How lerped the scroll value is */
	SCROLL_LERP_VALUE = 0.5

	/** How big will notes be when big */
	NOTE_BIG_SCALE = 1.4

	/** Width and height of every square */
	SQUARE_SIZE = vec2(50, 50);

	/** The initial pos of the first square */
	INITIAL_POS = vec2(center().x, this.SQUARE_SIZE.y + this.SQUARE_SIZE.y / 2);
	
	/** The current time according to scroll step */
	scrollTime = 0;
	
	/** When you hold down a key, the cursor will change color to signify the move */
	currentMove: Move = "up"
	
	/** The Y pos of the cursor (is the pos of the step you're currently hovering) */
	cursorYPos = 0;
	
	/** The row the cursor is in (the step) */
	cursorGridRow = 0;
	
	/** The step that is currently being hovered */
	hoveredStep = 0;
	
	/** Wheter the cursor is in a grid or not (allows for click) */
	isCursorInGrid = false

	/** The position of the camera controller */
	cameraControllerPos = vec2(width() - 25, 25)

	/** Wheter the camera is being moved with the camera controller */
	isMovingCamera = false

	/** The scale of the strumline line */
	strumlineScale = vec2(1)

	/** An array with the scales of every note */
	noteScales: Vec2[] = []

	/** Is ChartState.scrollstep but it is constantly being lerped towards it */
	smoothScrollStep = 0

	/** is the cursorYPos but it is constantly being lerped towards it */
	smoothCursorYPos = 0

	/** The current selected note */
	selectedNote:ChartNote = undefined

	/** The step that selected note started in before it was moved */
	startingStepForSelectedNote = 0

	/** Is by how many steps the strumline is offseted (from top to below, 0 to 12) */
	strumlineStepOffset = 1

	/** Converts a step to a position (a hawk to a) */
	stepToPos(step: number) {
		return utils.getPosInGrid(this.INITIAL_POS, step, 0, this.SQUARE_SIZE)
	}

	/** Unselects any note and the detune */
	resetSelectedNote() {
		this.selectedNote = undefined
		this.startingStepForSelectedNote = 0
	}

	/** Changes the current move */
	changeMove(newMove:Move) {
		this.currentMove = newMove;
	}

	/** Add a note to the chart */
	addNoteToChart(time: number, move: Move) {
		const noteWithSameTimeButDifferentMove = this.ChartState.song.notes.find(note => note.hitTime == time && note.dancerMove != move || note.hitTime == time && note.dancerMove == move)
		// if there's a note already at that time but a different move, remove it
		if (noteWithSameTimeButDifferentMove) {
			this.removeNoteFromChart(noteWithSameTimeButDifferentMove.hitTime, noteWithSameTimeButDifferentMove.dancerMove)
		}
		
		const newNote:ChartNote = { hitTime: time, dancerMove: move }
		this.ChartState.song.notes.push(newNote)

		playSound("plap", { detune: moveToDetune(move) })
	
		// add it to note scales
		const indexInNotes = this.ChartState.song.notes.indexOf(newNote)
		tween(vec2(this.NOTE_BIG_SCALE), vec2(1), 0.1, (p) => this.noteScales[indexInNotes] = p)
	}
	
	/** Remove a note from the chart */
	removeNoteFromChart(time: number, move: Move) {
		const oldNote = this.ChartState.song.notes.find(note => note.hitTime == time && note.dancerMove == move)
		this.ChartState.song.notes = utils.removeFromArr(oldNote, this.ChartState.song.notes)

		// remove it from note scales
		const indexInNotes = this.ChartState.song.notes.indexOf(oldNote)
		this.noteScales.splice(indexInNotes, 1)
		playSound("plop", { detune: moveToDetune(move) })
	}

	constructor(ChartState:ChartStateClass) {
		this.ChartState = ChartState;
		this.noteScales = [].fill(vec2(1), 0, this.ChartState.song.notes.length)
	}
}

/** Draws as many steps for the song checkerboard */
export function drawCheckerboard(vars: ChartEditorVars) {
	for (let i = 0; i < vars.ChartState.conductor.totalSteps; i++) {
		const newPos = vars.stepToPos(i)
		newPos.y -= 50 * vars.smoothScrollStep

		const baseColor = WHITE.darken(100)
		const lighter = baseColor.darken(10)
		const darker = baseColor.darken(50)
		const col = i % 2 == 0 ? lighter : darker

		// draws the background chess board squares etc
		if (newPos.y <= height() + vars.SQUARE_SIZE.y / 2) {
			drawRect({
				width: vars.SQUARE_SIZE.x,
				height: vars.SQUARE_SIZE.y,
				color: col,
				pos: vec2(newPos.x, newPos.y),
				anchor: "center",
			})
		}

		// draws a line on every beat
		if (i % vars.ChartState.conductor.stepsPerBeat == 0) {
			if (newPos.y <= height()) {
				// the beat text
				drawText({
					text: `${i / vars.ChartState.conductor.stepsPerBeat}`,
					color: WHITE,
					size: vars.SQUARE_SIZE.x / 2,
					anchor: "center",
					pos: vec2(newPos.x + vars.SQUARE_SIZE.x, newPos.y)
				})
				
				drawRect({
					width: vars.SQUARE_SIZE.x,
					height: 5,
					color: darker.darken(70),
					anchor: "center",
					pos: vec2(newPos.x, newPos.y - vars.SQUARE_SIZE.y / 2 - 2.5),
				})
			}
		}
	}
}

/** Draw the hittable notes */
export function drawAllNotes(vars:ChartEditorVars) {
	// draws the notes
	vars.ChartState.song.notes.forEach((note, index) => {
		let notePos = utils.getPosInGrid(vars.INITIAL_POS, conductorUtils.timeToStep(note.hitTime, vars.ChartState.conductor.stepInterval), 0, vars.SQUARE_SIZE)
		notePos.y -= 50 * vars.smoothScrollStep

		const notePosLerped = lerp(notePos, notePos, vars.SCROLL_LERP_VALUE)
		
		if (notePos.y <= height()) {
			drawSprite({
				width: vars.SQUARE_SIZE.x,
				height: vars.SQUARE_SIZE.y,
				scale: vars.noteScales[index],
				sprite: GameSave.preferences.noteskin + "_" + note.dancerMove,
				pos: notePosLerped,
				opacity: vars.scrollTime >= note.hitTime ? 1 : 0.5,
				anchor: "center",
			})
		}
	})
}

/** Draw the strumline line */
export function drawStrumline(vars:ChartEditorVars) {
	// # strumlineline
	const strumlineYPos = vars.SQUARE_SIZE.y * vars.strumlineStepOffset
	drawLine({
		p1: vec2((center().x - vars.SQUARE_SIZE.x / 2 * 3) - 5 * vars.strumlineScale.x, strumlineYPos),
		p2: vec2((center().x + vars.SQUARE_SIZE.x / 2 * 3) + 5 * vars.strumlineScale.x, strumlineYPos),
		color: RED,
		width: 5,
		fixed: true,
	})
}

/** Draw the cursor to highlight notes */
export function drawCursor(vars:ChartEditorVars) {
	const strumlineYPos = vars.SQUARE_SIZE.y * vars.strumlineStepOffset
	
	// if the distance between the cursor and the square is small enough then highlight it
	if (mousePos().x <= center().x + vars.SQUARE_SIZE.x / 2 && mousePos().x >= center().x - vars.SQUARE_SIZE.x / 2) {
		if (vars.ChartState.scrollStep == 0 && mousePos().y <= strumlineYPos) vars.isCursorInGrid = false
		else if (vars.ChartState.scrollStep == vars.ChartState.conductor.totalSteps && mousePos().y >= strumlineYPos) vars.isCursorInGrid = false
		else vars.isCursorInGrid = true
	}
	
	else vars.isCursorInGrid = false

	if (vars.isCursorInGrid) {
		// cursor = the square you're hovering over
		// draws the cursor
		drawRect({
			width: vars.SQUARE_SIZE.x - 5,
			height: vars.SQUARE_SIZE.y - 5,
			color: WHITE,
			fill: false,
			outline: {
				width: 8, color: moveToColor(vars.currentMove).darken(50)
			},
			pos: vec2(center().x, vars.smoothCursorYPos),
			anchor: "center",
			fixed: true,
		})
	}
}

/** Draw the camera controller and the tiny notess */
export function drawCameraControlAndNotes(vars:ChartEditorVars) {
	// draws the camera controller
	drawRect({
		width: vars.SQUARE_SIZE.x,
		height: vars.SQUARE_SIZE.y,
		anchor: "center",
		pos: vars.cameraControllerPos,
		color: YELLOW,
	})

	// draws the notes on the side of the camera controller
	if (mousePos().x >= width() - vars.SQUARE_SIZE.x) {
		vars.ChartState.song.notes.forEach((note) => {
			const initialPos = vec2(width() - 25, 0)
			const yPos = map(note.hitTime, 0, vars.ChartState.conductor.audioPlay.duration(), initialPos.y, height())
			const xPos = initialPos.x

			drawRect({
				width: vars.SQUARE_SIZE.x / 10,
				height: vars.SQUARE_SIZE.y / 10,
				color: moveToColor(note.dancerMove),
				anchor: "center",
				pos: vec2(xPos, yPos),
				opacity: 0.5
			})
		})
	}
}

/** Draw the gizmo for the selected note */
export function drawSelectGizmo(vars:ChartEditorVars) {
	// draw the selected gizmo
	if (vars.selectedNote != undefined) {
		const stepOfSelectedNote = conductorUtils.timeToStep(vars.selectedNote.hitTime, vars.ChartState.conductor.stepInterval) - vars.ChartState.scrollStep
		const gizmoPos = vars.stepToPos(stepOfSelectedNote)
		const celesteColor = BLUE.lighten(150)

		drawRect({
			width: vars.SQUARE_SIZE.x,
			height: vars.SQUARE_SIZE.y,
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
}

/** Creates the 'isKeyPressed' event to change notes */
export function moveChangeInputHandler(vars: ChartEditorVars) {
	const keysAndMoves = {
		"1": "left",
		"2": "down",
		"3": "up",
		"4": "right"
	}

	Object.keys(keysAndMoves).forEach((key) => {
		if (isKeyPressed(key as Key)) {
			vars.changeMove(keysAndMoves[key])
		}
	})

	let currentIndex = Object.values(keysAndMoves).indexOf(vars.currentMove)
	if (isKeyPressed("q")) {
		if (currentIndex - 1 < 0) currentIndex = Object.keys(keysAndMoves).length - 1
		else currentIndex -= 1
		const newMove = Object.values(keysAndMoves)[currentIndex] as Move
		vars.changeMove(newMove)
	}
	
	else if (isKeyPressed("w")) {
		if (currentIndex + 1 > Object.values(keysAndMoves).length - 1) currentIndex = 0
		else currentIndex += 1
		const newMove = Object.values(keysAndMoves)[currentIndex] as Move
		vars.changeMove(newMove)
	}
}
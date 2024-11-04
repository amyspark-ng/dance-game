// File that draws all the chart editor stuff
import { DrawRectOpt, Vec2 } from "kaplay"
import { GameSave } from "../../core/gamesave"
import { utils } from "../../utils"
import { moveToColor } from "../objects/note"
import { StateChart } from "./chartEditorBackend"

/** Returns if a certain Y position mets the conditions to be drawn on the screen */
function conditionsForDrawing(YPos: number, square_size: Vec2) {
	return utils.isInRange(YPos, height() + square_size.y, -square_size.y)
}

/** How lerped the scroll value is */
export const SCROLL_LERP_VALUE = 0.5

/** How big will notes be when big */
export const NOTE_BIG_SCALE = 1.4

/** Draws the playbar and the text with the time */
export function drawPlayBar(ChartState: StateChart) {
	const bgColor = Color.fromArray(ChartState.bgColor)

	// why width * 2?
	let barWidth = map(ChartState.scrollTime, 0, ChartState.conductor.audioPlay.duration(), 0, width() * 2)
	let lerpedWidth = 0
	lerpedWidth = lerp(lerpedWidth, barWidth, ChartState.SCROLL_LERP_VALUE)

	drawRect({
		width: width(),
		height: 10,
		anchor: "botleft",
		pos: vec2(0, height()),
		color: bgColor.darken(50),
	})

	drawRect({
		width: lerpedWidth,
		height: 10,
		anchor: "botleft",
		pos: vec2(0, height()),
		color: bgColor.lighten(50),
	})

	const circleRad = 8
	drawCircle({
		radius: circleRad,
		anchor: "center",
		pos: vec2(lerpedWidth, height() - circleRad / 2),
		color: bgColor.lighten(80),
	})

	let textToPut = utils.formatTime(ChartState.scrollTime, true)
	if (ChartState.paused) textToPut += " (❚❚)"
	else textToPut += " (▶)"
	textToPut += ` - ${ChartState.scrollStep}`
	const size = 25

	drawText({
		text: textToPut,
		align: "right",
		anchor: "topright",
		size: size,
		pos: vec2(width() - 5, height() - size * 1.5),
	})
}

/** Draws as many steps for the song checkerboard */
export function drawCheckerboard(ChartState: StateChart) {
	for (let i = 0; i < ChartState.conductor.totalSteps; i++) {
		const newPos = ChartState.stepToPos(i)
		newPos.y -= 50 * ChartState.smoothScrollStep

		const baseColor = WHITE.darken(100)
		const lighter = baseColor.darken(10)
		const darker = baseColor.darken(50)
		const col = i % 2 == 0 ? lighter : darker

		// draws the background chess board squares etc
		if (conditionsForDrawing(newPos.y, ChartState.SQUARE_SIZE)) {
			// chessboard square
			drawRect({
				width: ChartState.SQUARE_SIZE.x,
				height: ChartState.SQUARE_SIZE.y,
				color: col,
				pos: vec2(newPos.x, newPos.y),
				anchor: "center",
			})
		}

		// draws a line on every beat
		if (i % ChartState.conductor.stepsPerBeat == 0) {
			if (conditionsForDrawing(newPos.y, ChartState.SQUARE_SIZE)) {
				// the beat text
				drawText({
					text: `${i / ChartState.conductor.stepsPerBeat}`,
					color: WHITE,
					size: ChartState.SQUARE_SIZE.x / 2,
					anchor: "center",
					pos: vec2(newPos.x + ChartState.SQUARE_SIZE.x, newPos.y)
				})
				
				// line beat
				drawRect({
					width: ChartState.SQUARE_SIZE.x,
					height: 5,
					color: darker.darken(70),
					anchor: "center",
					pos: vec2(newPos.x, newPos.y - ChartState.SQUARE_SIZE.y / 2 - 2.5),
				})
			}
		}
	}
}

/** Draw the hittable notes */
export function drawAllNotes(ChartState:StateChart) {
	// draws the notes
	ChartState.song.notes.forEach((note, index) => {
		let notePos = ChartState.stepToPos(ChartState.conductor.timeToStep(note.hitTime))
		notePos.y -= 50 * ChartState.smoothScrollStep

		const notePosLerped = lerp(notePos, notePos, ChartState.SCROLL_LERP_VALUE)
		
		if (conditionsForDrawing(notePos.y, ChartState.SQUARE_SIZE)) {
			drawSprite({
				width: ChartState.SQUARE_SIZE.x,
				height: ChartState.SQUARE_SIZE.y,
				scale: ChartState.noteProps[index].scale,
				angle: ChartState.noteProps[index].angle,
				sprite: GameSave.preferences.noteskin + "_" + note.dancerMove,
				pos: notePosLerped,
				opacity: ChartState.scrollTime >= note.hitTime ? 1 : 0.5,
				anchor: "center",
			})
		}
	})
}

/** Draw the strumline line */
export function drawStrumline(ChartState:StateChart) {
	// # strumlineline
	const strumlineYPos = ChartState.SQUARE_SIZE.y * ChartState.strumlineStepOffset
	drawLine({
		p1: vec2((center().x - ChartState.SQUARE_SIZE.x / 2 * 3) - 5 * ChartState.strumlineScale.x, strumlineYPos),
		p2: vec2((center().x + ChartState.SQUARE_SIZE.x / 2 * 3) + 5 * ChartState.strumlineScale.x, strumlineYPos),
		color: RED,
		width: 5,
		fixed: true,
	})
}

/** Draw the cursor to highlight notes */
export function drawCursor(ChartState:StateChart) {
	const strumlineYPos = ChartState.SQUARE_SIZE.y * ChartState.strumlineStepOffset
	
	// if the distance between the cursor and the square is small enough then highlight it
	if (mousePos().x <= center().x + ChartState.SQUARE_SIZE.x / 2 && mousePos().x >= center().x - ChartState.SQUARE_SIZE.x / 2) {
		if (ChartState.scrollStep == 0 && mousePos().y <= strumlineYPos) ChartState.isCursorInGrid = false
		else if (ChartState.scrollStep == ChartState.conductor.totalSteps && mousePos().y >= strumlineYPos) ChartState.isCursorInGrid = false
		else ChartState.isCursorInGrid = true
	}
	
	else ChartState.isCursorInGrid = false

	if (ChartState.isCursorInGrid) {
		// cursor = the square you're hovering over
		// draws the cursor
		drawRect({
			width: ChartState.SQUARE_SIZE.x - 5,
			height: ChartState.SQUARE_SIZE.y - 5,
			color: WHITE,
			fill: false,
			scale: ChartState.cursorScale,
			outline: {
				width: 8, color: moveToColor(ChartState.currentMove).darken(50)
			},
			pos: vec2(center().x, ChartState.smoothCursorYPos),
			anchor: "center",
			fixed: true,
		})
	}
}

/** Draw the camera controller and the tiny notess */
export function drawCameraControlAndNotes(ChartState:StateChart) {
	let cameraOp = 0

	if (ChartState.cameraController.isMovingCamera) cameraOp = 0.5
	else if (ChartState.cameraController.canMoveCamera) cameraOp = 0.25
	else cameraOp = 0.1
	
	// draws the camera controller
	drawRect({
		width: ChartState.SQUARE_SIZE.x,
		height: ChartState.SQUARE_SIZE.y,
		anchor: "center",
		pos: ChartState.cameraController.pos,
		opacity: cameraOp,
		color: YELLOW,
		outline: { 
			width: 5,
			color: utils.blendColors(RED, YELLOW, 0.5),
		}
	})

	// draws the notes on the side of the camera controller
	ChartState.song.notes.forEach((note) => {
		const noteStep = ChartState.conductor.timeToStep(note.hitTime)
		const xPos = width() - 25
		const yPos = map(noteStep, 0, ChartState.conductor.totalSteps, 0, height() - ChartState.SQUARE_SIZE.y)

		const isInSelected = ChartState.selectedNotes.includes(note)

		const selectColor = BLUE.lighten(50)
		let theColor = moveToColor(note.dancerMove)
		if (isInSelected) theColor = utils.blendColors(theColor, selectColor, 0.25)

		const noteOpts = {
			width: ChartState.SQUARE_SIZE.x / 5,
			height: ChartState.SQUARE_SIZE.y / 20,
			color: theColor,
			anchor: "center",
			pos: vec2(xPos, yPos),
			opacity: 0.5,
		} as DrawRectOpt

		if (isInSelected) {
			noteOpts.outline = {
				color: selectColor,
				width: 2,
			}
		}

		drawRect(noteOpts)
	})
}

/** Draw the gizmo for the selected note */
export function drawSelectGizmo(ChartState:StateChart) {
	// draw the selected gizmo
	
	ChartState.selectedNotes.forEach((note) => {
		const stepOfSelectedNote = ChartState.conductor.timeToStep(note.hitTime) - ChartState.scrollStep
		const gizmoPos = ChartState.stepToPos(stepOfSelectedNote)
		const celesteColor = BLUE.lighten(150)
	
		drawRect({
			width: ChartState.SQUARE_SIZE.x,
			height: ChartState.SQUARE_SIZE.y,
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
	})
}

export function drawSelectionBox(ChartState:StateChart) {
	if (ChartState.selectionBox.width > 0 && ChartState.selectionBox.height > 0) {
		drawRect({
			width: ChartState.selectionBox.width,
			height: ChartState.selectionBox.height,
			pos: vec2(ChartState.selectionBox.pos.x, ChartState.selectionBox.pos.y),
			color: BLUE,
			opacity: 0.1,
			outline: {
				color: BLUE,
				width: 5
			},
		})
	}
}
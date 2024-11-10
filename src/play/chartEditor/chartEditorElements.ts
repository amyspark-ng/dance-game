// File that draws all the chart editor stuff
import { Color, DrawRectOpt, Vec2 } from "kaplay"
import { GameSave } from "../../core/gamesave"
import { utils } from "../../utils"
import { moveToColor } from "../objects/note"
import { downloadChart, StateChart } from "./chartEditorBackend"
import { gameCursor } from "../../core/plugins/features/gameCursor"
import { openChartAboutDialog, openChartInfoDialog } from "../../ui/dialogs/gameDialog"
import { onBeatHit } from "../../core/events"

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
	const bgColor = rgb(ChartState.bgColor[0], ChartState.bgColor[1], ChartState.bgColor[2])

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
		newPos.y -= ChartState.SQUARE_SIZE.y * ChartState.smoothScrollStep

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
		notePos.y -= ChartState.SQUARE_SIZE.y * ChartState.smoothScrollStep

		const notePosLerped = lerp(notePos, notePos, ChartState.SCROLL_LERP_VALUE)
		
		if (conditionsForDrawing(notePos.y, ChartState.SQUARE_SIZE)) {
			drawSprite({
				width: ChartState.SQUARE_SIZE.x,
				height: ChartState.SQUARE_SIZE.y,
				scale: ChartState.noteProps[index].scale,
				angle: ChartState.noteProps[index].angle,
				sprite: GameSave.noteskin + "_" + note.dancerMove,
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
	if (gameCursor.pos.x <= center().x + ChartState.SQUARE_SIZE.x / 2 && gameCursor.pos.x >= center().x - ChartState.SQUARE_SIZE.x / 2) {
		if (ChartState.scrollStep == 0 && gameCursor.pos.y <= strumlineYPos) ChartState.isCursorInGrid = false
		else if (ChartState.scrollStep == ChartState.conductor.totalSteps && gameCursor.pos.y >= strumlineYPos) ChartState.isCursorInGrid = false
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
			width: 50 / 5,
			height: 50 / 20,
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

export function addDialogButtons(ChartState:StateChart) {
	function addDialogButton({ texting, action, icon, }: { texting: string, action: () => void, icon: string }) {
		const xPos = 30
		const actualIconWidth = 30

		const iconObj = add([
			sprite(icon + "_charticon"),
			pos(vec2()),
			opacity(),
			anchor("center"),
			color(),
			rotate(),
			"dialogbuttonicon",
		])

		const button = add([
			text(texting, { align: "left" }),
			pos(xPos, 0),
			area(),
			anchor("left"),
			opacity(),
			scale(),
			rotate(),
			{
				update() {
					if (this.isHovering()) {
						this.scale.x = lerp(this.scale.x, 1.1, 0.5)
						this.scale.y = lerp(this.scale.y, 1.1, 0.5)
						this.opacity = lerp(this.opacity, 1, 0.5)
						this.pos.x = lerp(this.pos.x, xPos + actualIconWidth, 0.5)
					
						if (isMousePressed("left")) {
							this.angle = rand(-5, 5)
						}
					}
					
					else {
						this.scale.x = lerp(this.scale.x, 1, 0.5)
						this.scale.y = lerp(this.scale.y, 1, 0.5)
						this.opacity = lerp(this.opacity, 0.6, 0.5)
						this.pos.x = lerp(this.pos.x, xPos, 0.5)
					}
					
					if (this.angle != 0) this.angle = lerp(this.angle, 0, 0.5)
				}
			}
		])

		// makes the scale slightly larger 
		button.area.scale = vec2(1.3)
		button.area.offset = vec2(-button.width * 0.3, 0)

		iconObj.onUpdate(() => {
			iconObj.pos.y = button.pos.y + iconObj.height * 0.2
			
			if (button.isHovering()) {
				iconObj.pos.x = lerp(iconObj.pos.x, xPos + iconObj.width * 0.1, 0.5)
				if (isMousePressed("left")) iconObj.angle = 360
			}
			
			else {
				iconObj.pos.x = lerp(iconObj.pos.x, button.pos.x, 0.5)
			}
			
			iconObj.opacity = button.opacity
			if (iconObj.angle != 0) iconObj.angle = lerp(iconObj.angle, 0, 0.25)
		})

		button.onClick(action)
		return button;
	}

	const initialYPos = height() - 50
	// the ones more on top will appear more on the bottom of the screen
	const things = [
		{ texting: "Create new chart", icon: "new", action: () => {} },
		{ texting: "Download chart", icon: "download", action: () => { downloadChart(ChartState) } },
		{ texting: "Song fields", icon: "fields", action: () => { openChartInfoDialog(ChartState) } },
		{ texting: "About", icon: "about", action: () => { openChartAboutDialog() } },
	]
	
	things.forEach((thing, index) => {
		const thingButton = addDialogButton(thing)
		thingButton.pos.y = initialYPos - (index * (thingButton.height * 1.4))
	})
}

export function addBeatCounter(ChartState:StateChart) {
	let beatIndex = -1
	
	type numberProp = {
		scale: number,
		color: Color,
		angle: number,
	}

	let props:numberProp[] = []

	onUpdate(() => {
		for (let i = 0; i < ChartState.conductor.stepsPerBeat; i++) {
			if (!props[i]) {
				props.push({
					scale: 1,
					color: WHITE,
					angle: 0,
				})
			}

			// limit props length to steps per beat
			props = props.slice(0, ChartState.conductor.stepsPerBeat)
		}
	})

	onBeatHit(() => {
		beatIndex++
		beatIndex = beatIndex % ChartState.conductor.stepsPerBeat;
		
		// if is the last prop in the list
		if (props[beatIndex] == props[props.length - 1]) {
			tween(YELLOW, WHITE, 0.25, (p) => props[beatIndex].color = p)
		}
	
		tween(randi(-10, 10), 0, 0.25, (p) => props[beatIndex].angle = p)
		tween(rand(1.1, 1.25), 1, 0.25, (p) => props[beatIndex].scale = p)
	})

	onDraw(() => {
		for (let i = 0; i < ChartState.conductor.stepsPerBeat; i++) {
			if (!props[i]) return;
			drawText({
				text: (i + 1).toString(),
				pos: vec2(10 + i * 30, 40),
				color: props[i].color,
				angle: props[i].angle,
				anchor: "center",
				scale: vec2(props[i].scale),
				size: 30,
			})
		}
	})
}
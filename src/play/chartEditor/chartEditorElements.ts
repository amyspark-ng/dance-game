// File that draws all the chart editor stuff
import { Color, DrawRectOpt, Vec2 } from "kaplay"
import { GameSave } from "../../core/gamesave"
import { utils } from "../../utils"
import { moveToColor, notesSpawner } from "../objects/note"
import { ChartStamp, concatStamps, downloadChart, isStampNote, StateChart } from "./chartEditorBackend"
import { gameCursor } from "../../core/plugins/features/gameCursor"
import { gameDialog, openChartAboutDialog, openChartInfoDialog } from "../../ui/dialogs/gameDialog"
import { onBeatHit } from "../../core/events"
import { playSound } from "../../core/plugins/features/sound"
import { event } from "@tauri-apps/api"

/** Returns if a certain Y position mets the conditions to be drawn on the screen */
function conditionsForDrawing(YPos: number, square_size: Vec2) {
	return utils.isInRange(YPos, -square_size.y, height() + square_size.y)
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
		newPos.y -= ChartState.SQUARE_SIZE.y * ChartState.lerpScrollStep
		newPos.x = width() / 2
		
		const baseColor = WHITE.darken(100)
		const lighter = baseColor.darken(10)
		const darker = baseColor.darken(50)
		const col = i % 2 == 0 ? lighter : darker
		const oppositeCol = col == lighter ? darker : lighter

		// draws the background chess board squares etc
		if (conditionsForDrawing(newPos.y, ChartState.SQUARE_SIZE)) {
			// note square
			drawRect({
				width: ChartState.SQUARE_SIZE.x,
				height: ChartState.SQUARE_SIZE.y,
				color: col,
				pos: vec2(newPos.x, newPos.y),
				anchor: "center",
			})

			// event square
			drawRect({
				width: ChartState.SQUARE_SIZE.x,
				height: ChartState.SQUARE_SIZE.y,
				color: oppositeCol,
				pos: vec2(newPos.x + ChartState.SQUARE_SIZE.x, newPos.y),
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
					pos: vec2(newPos.x - ChartState.SQUARE_SIZE.x, newPos.y)
				})
				
				// line beat
				drawRect({
					width: ChartState.SQUARE_SIZE.x * 2,
					height: 5,
					color: darker.darken(70),
					anchor: "left",
					pos: vec2(newPos.x - ChartState.SQUARE_SIZE.x / 2, newPos.y - ChartState.SQUARE_SIZE.y / 2 - 2.5),
				})
			}
		}
	}
}

/** Draw the stamps of the song */
export function drawAllNotes(ChartState:StateChart) {
	function drawStamp(stamp: ChartStamp, index: number) {
		const isNote = isStampNote(stamp)
		
		let stampPos = ChartState.stepToPos(ChartState.conductor.timeToStep(stamp.time))
		stampPos.y -= ChartState.SQUARE_SIZE.y * ChartState.lerpScrollStep
		if (!isNote) stampPos.x = ChartState.INITIAL_POS.x + ChartState.SQUARE_SIZE.x

		const notePosLerped = lerp(stampPos, stampPos, ChartState.SCROLL_LERP_VALUE)
		
		if (!ChartState.stampProps[isNote ? "notes" : "events"][index]) return

		if (conditionsForDrawing(stampPos.y, ChartState.SQUARE_SIZE)) {
			drawSprite({
				width: ChartState.SQUARE_SIZE.x,
				height: ChartState.SQUARE_SIZE.y,
				scale: ChartState.stampProps[isNote ? "notes" : "events"][index].scale,
				angle: ChartState.stampProps[isNote ? "notes" : "events"][index].angle,
				sprite: isNote ? GameSave.noteskin + "_" + stamp.move : stamp.id,
				pos: notePosLerped,
				opacity: ChartState.scrollTime >= stamp.time ? 1 : 0.5,
				anchor: "center",
			})
		}
	}

	ChartState.song.chart.notes.forEach((note, index) => drawStamp(note, index))
	ChartState.song.chart.events.forEach((ev, index) => drawStamp(ev, index))
}

/** Draw the strumline line */
export function drawStrumline(ChartState:StateChart) {
	// # strumlineline
	const strumlineYPos = ChartState.SQUARE_SIZE.y * ChartState.strumlineStepOffset
	drawRect({
		pos: vec2(center().x, strumlineYPos),
		anchor: "center",
		height: 5,
		radius: 5,
		color: RED,
		scale: vec2(ChartState.strumlineScale.x, 1),
		width: (ChartState.SQUARE_SIZE.x * 3),
		fixed: true,
	})
}

/** Draw the cursor to highlight notes */
export function drawCursor(ChartState:StateChart) {
	const strumlineYPos = ChartState.SQUARE_SIZE.y * ChartState.strumlineStepOffset
	
	const minLeft = center().x - ChartState.SQUARE_SIZE.x / 2
	const maxRight = (minLeft + ChartState.SQUARE_SIZE.x * 2) - 8

	/** It's a weird offseted version so it lines more with the actual mouse graphic */
	const weirdX = gameCursor.pos.x + 11

	// if the distance between the cursor and the square is small enough then highlight it
	if (utils.isInRange(weirdX, minLeft, maxRight)) {
		if (ChartState.scrollStep == 0 && gameCursor.pos.y <= strumlineYPos) {
			ChartState.isInEventGrid = false
			ChartState.isInNoteGrid = false
		}
		
		else if (ChartState.scrollStep == ChartState.conductor.totalSteps && gameCursor.pos.y >= strumlineYPos) {
			ChartState.isInEventGrid = false
			ChartState.isInNoteGrid = false
		}
		
		else {
			if (weirdX >= minLeft && weirdX <= maxRight - ChartState.SQUARE_SIZE.x) ChartState.isInNoteGrid = true
			else ChartState.isInNoteGrid = false
			
			if (weirdX >= minLeft + ChartState.SQUARE_SIZE.x && weirdX <= maxRight) ChartState.isInEventGrid = true
			else ChartState.isInEventGrid = false
		}
	}
	
	else {
		ChartState.isInEventGrid = false
		ChartState.isInNoteGrid = false
	}

	// if it's on either of them then it's in the grid
	ChartState.isCursorInGrid = ChartState.isInNoteGrid || ChartState.isInEventGrid

	if (ChartState.isCursorInGrid) {
		// cursor = the square you're hovering over
		// draws the cursor
		let theSprite = ""
		if (ChartState.isInNoteGrid) theSprite = GameSave.noteskin + "_" + ChartState.currentMove
		else theSprite = ChartState.currentEvent

		const curColor = ChartState.isInNoteGrid ? moveToColor(ChartState.currentMove) : WHITE

		drawRect({
			width: ChartState.SQUARE_SIZE.x - 5,
			height: ChartState.SQUARE_SIZE.y - 5,
			fill: false,
			outline: {
				width: 5,
				color: curColor,
				opacity: 1,
				cap: "round",
				join: "round",
			},
			radius: 5,
			pos: ChartState.lerpCursorPos,
			anchor: "center",
			fixed: true,
		})

		// if there's already a note or event in that space dont' draw the sprite
		if (ChartState.song.chart.notes.some((note) => ChartState.conductor.timeToStep(note.time) == ChartState.hoveredStep)
			|| ChartState.song.chart.events.some((ev) => ChartState.conductor.timeToStep(ev.time) == ChartState.hoveredStep)) return;

		drawSprite({
			sprite: theSprite,
			width: ChartState.SQUARE_SIZE.x - 5,
			height: ChartState.SQUARE_SIZE.y - 5,
			color: WHITE,
			opacity: wave(0.25, 0.75, time() * 6),
			scale: vec2(0.9),
			pos: ChartState.lerpCursorPos,
			anchor: "center",
			fixed: true,
		})
	}
}

/** Draw the camera controller and the tiny notess */
export function drawCameraController(ChartState:StateChart) {
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
	ChartState.song.chart.notes.forEach((note) => {
		const noteStep = ChartState.conductor.timeToStep(note.time)
		const xPos = ChartState.cameraController.pos.x
		const yPos = map(noteStep, 0, ChartState.conductor.totalSteps, 0, height() - ChartState.SQUARE_SIZE.y)

		const isInSelected = ChartState.selectedStamps.includes(note)

		const selectColor = BLUE.lighten(50)
		let theColor = moveToColor(note.move)
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

	ChartState.song.chart.events.forEach((ev) => {
		const noteStep = ChartState.conductor.timeToStep(ev.time)
		const xPos = ChartState.cameraController.pos.x
		const yPos = map(noteStep, 0, ChartState.conductor.totalSteps, 0, height() - ChartState.SQUARE_SIZE.y)

		const isInSelected = ChartState.selectedStamps.includes(ev)

		const selectColor = BLUE.lighten(50)
		let theColor = WHITE
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

/** Draw the thing for the selected note */
export function drawSelectSquares(ChartState:StateChart) {
	ChartState.selectedStamps.forEach((note) => {
		if (!("move" in note)) return;
		const stepOfSelectedNote = ChartState.conductor.timeToStep(note.time) - ChartState.scrollStep
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
	
	ChartState.selectedStamps.forEach((ev) => {
		if (("move" in ev)) return;
		const stepOfSelectedNote = ChartState.conductor.timeToStep(ev.time) - ChartState.scrollStep
		const gizmoPos = ChartState.stepToPos(stepOfSelectedNote)
		gizmoPos.x += ChartState.SQUARE_SIZE.x
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
					if (gameDialog.isOpen) return;
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
			if (gameDialog.isOpen) return;
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

		button.onClick(() => {
			if (gameDialog.isOpen) return;
			action()
		})

		return button;
	}

	const initialYPos = height() - 50
	// the ones more on top will appear more on the bottom of the screen
	const things = [
		{ texting: "Create new chart", icon: "new", action: () => ChartState.createNewSong() },
		{ texting: "Download chart", icon: "download", action: () => downloadChart(ChartState)  },
		{ texting: "Song fields", icon: "fields", action: () => openChartInfoDialog(ChartState) },
		{ texting: "About", icon: "about", action: () => openChartAboutDialog() },
	]
	
	things.forEach((thing, index) => {
		const thingButton = addDialogButton(thing)
		thingButton.pos.y = initialYPos - (index * (thingButton.height * 1.4))
	})
}

/** Adds all the info on the left side of the screen */
export function addLeftInfo(ChartState:StateChart) {
	const xPos = 15
	
	// maybe this shouldn't be here
	const infoText = add([
		pos(xPos, 5),
		text("", { size: 20, align: "left" }),
		anchor("topleft"),
		{
			update() {
				const info = {
					"You're charting": ChartState.song.manifest.name,
					"Produced by": ChartState.song.manifest.artist,
					"Charted by": ChartState.song.manifest.charter,
					"": null,
					// these things are wrong btw, except bpm at given time
					"Current step": utils.formatNumber(ChartState.scrollStep, { type: "simple" }),
					"Current beat": utils.formatNumber(ChartState.conductor.currentBeat, { type: "simple" }),
					"Current BPM": ChartState.conductor.BPM,
				}

				function formatTheInfo() {
					let theText = ""
					for (const [key, value] of Object.entries(info)) {
						if (value == null) {
							theText += "\n"
							continue;
						}
						
						theText += `${key}: ${value}\n`
					}
					return theText
				}

				this.text = formatTheInfo()
				this.pos.y = 5
			}
		}
	])
	
	// beat counter
	type numberProp = {
		scale: number,
		color: Color,
		angle: number,
	}

	const beatCounterY = infoText.textSize * 8.2
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
		const beatIndex = ChartState.conductor.currentBeat % ChartState.conductor.stepsPerBeat
		
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
				pos: vec2((xPos / 2) + xPos + i * 30, beatCounterY),
				color: props[i].color,
				angle: props[i].angle,
				anchor: "center",
				scale: vec2(props[i].scale),
				size: 30,
			})
		}
	})

	let bpmChangeButtons = []

	// buttons for skipping to time changes
	onUpdate(() => {
		ChartState.song.chart.events.forEach((ev, index) => {
			if (!bpmChangeButtons.includes(ev)) {
				bpmChangeButtons.push(ev)
				
				const skipBtn = add([
					text("", { size: 20, align: "left" }),
					pos(xPos, center().y + index * 20),
					area(),
					anchor("left"),
					opacity(),
					"hover",
					"skipBtn",
					{
						ev: ev,
						update() {
							this.text = `Step: ${ChartState.conductor.timeToStep(ev.time)} ${ChartState.conductor.timeInSeconds >= ev.time ? "✓" : "X"}`
						}
					}
				])

				skipBtn.onUpdate(() => {
					if (ChartState.conductor.timeInSeconds >= ev.time) {
						if (skipBtn.isHovering()) skipBtn.opacity = lerp(skipBtn.opacity, 1, 0.5)
						else skipBtn.opacity = lerp(skipBtn.opacity, 0.75, 0.5)
					}

					else { 
						if (skipBtn.isHovering()) skipBtn.opacity = lerp(skipBtn.opacity, 0.75, 0.5)
						else skipBtn.opacity = lerp(skipBtn.opacity, 0.5, 0.5)
					}

					// if the event doesn't exist anymore, auto destroy itself
					if (!ChartState.song.chart.events.includes(ev)) skipBtn.destroy()
			
					const indexInEvents = ChartState.song.chart.events.indexOf(ev)
					skipBtn.pos.y = lerp(skipBtn.pos.y, center().y + indexInEvents * 20, 0.5)
				})

				skipBtn.onClick(() => {
					ChartState.scrollToStep(Math.floor(ChartState.conductor.timeToStep(ev.time) - 1))
					playSound("mouseClick", { detune: rand(-50, 50) })
				})
			}
		})
	})
}

export function addEventsPanel(ChartState:StateChart) {
	const trayEvents = add([
		rect(1, 1, { radius: 5 }),
		pos(),
		anchor("topleft"),
		area(),
		opacity(0.5),
	])

	const spacingPerEvent = 65
	const eventsPerColumn = 3
	const padding = spacingPerEvent / 2

	trayEvents.onUpdate(() => {
		const trayPeekingWidth = trayEvents.width * 0.4
		const lerpValue = 0.3

		const event_ids = Object.keys(ChartState.events)

		// every 3 elelments, the tray width has to increase by 50
		let trayWidth = (Math.floor(event_ids.length / eventsPerColumn) * spacingPerEvent) + padding + (event_ids.length % eventsPerColumn != 0 ? spacingPerEvent : 0)
		let trayHeight = (spacingPerEvent * 3) + padding
		trayEvents.width = lerp(trayEvents.width, trayWidth, lerpValue)
		trayEvents.height = lerp(trayEvents.height, trayHeight, lerpValue)

		trayEvents.pos.y = height() / 2 - trayEvents.height
	
		if (trayEvents.isHovering()) {
			trayEvents.pos.x = lerp(trayEvents.pos.x, width() - (trayEvents.width), lerpValue)
			trayEvents.opacity = lerp(trayEvents.opacity, 0.5, lerpValue)
		}

		else {
			trayEvents.pos.x = lerp(trayEvents.pos.x, width() - trayPeekingWidth, lerpValue)
			trayEvents.opacity = lerp(trayEvents.opacity, 0.25, lerpValue)
		}
	})
	
	Object.keys(ChartState.events).forEach((id, index) => {
		const row = Math.floor(index / eventsPerColumn)
		const column = index % eventsPerColumn

		const eventPaddingThing = padding * 1.5
		const idButton = trayEvents.add([
			sprite(id),
			pos((row * spacingPerEvent) + eventPaddingThing, (column * spacingPerEvent) + eventPaddingThing),
			anchor("center"),
			area(),
			opacity(),
			scale(),
			"hover",
		])

		idButton.onUpdate(() => {
			if (trayEvents.isHovering()) {
				if (idButton.isHovering()) {
					idButton.opacity = lerp(idButton.opacity, 1, 0.5)
				}

				else {
					idButton.opacity = lerp(idButton.opacity, 0.75, 0.5)
				}
			}
		
			else {
				idButton.opacity = lerp(idButton.opacity, 0.5, 0.5)
			}
		})

		idButton.onClick(() => {
			playSound("mouseClick", { detune: rand(-50, 50) })
			ChartState.currentEvent = id
		})
	})
}
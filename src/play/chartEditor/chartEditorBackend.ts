// Extra stuff for the chart editor
import { Key, Vec2 } from "kaplay";
import { Move } from "../objects/dancer";
import { ChartNote, moveToColor } from "../objects/note";
import { utils } from "../../utils";
import { playSound } from "../../core/plugins/features/sound";
import { GameSave } from "../../core/gamesave";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { SongChart } from "../song";
import { Conductor } from "../../conductor";

/** Class that manages every important variable in the chart editor */
export class StateChart {
	bgColor: [number, number, number] = [67, 21, 122]
	song: SongChart;
	paused: boolean;
	conductor: Conductor;
	params: paramsChartEditor;

	inputDisabled: boolean = false;

	/** How many steps scrolled */
	scrollStep: number = 0;

	// SOME STUPID VARS

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

	/** The scale of the cursor */
	cursorScale = vec2(1)

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

	/** Focused textbox */
	focusedTextBox: textBoxObj = undefined

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
		tween(1.5, 1, 0.1, (p) => this.cursorScale.x = p)
	}

	/** Add a note to the chart */
	addNoteToChart(time: number, move: Move) {
		this.startingStepForSelectedNote = 0
		
		const noteWithSameTimeButDifferentMove = this.song.notes.find(note => note.hitTime == time && note.dancerMove != move || note.hitTime == time && note.dancerMove == move)
		// if there's a note already at that time but a different move, remove it
		if (noteWithSameTimeButDifferentMove) {
			this.removeNoteFromChart(noteWithSameTimeButDifferentMove.hitTime, noteWithSameTimeButDifferentMove.dancerMove)
		}
		
		const newNote:ChartNote = { hitTime: time, dancerMove: move }
		this.song.notes.push(newNote)

		playSound("noteAdd", { detune: moveToDetune(move) })
	
		// add it to note scales
		const indexInNotes = this.song.notes.indexOf(newNote)
		tween(vec2(this.NOTE_BIG_SCALE), vec2(1), 0.1, (p) => this.noteScales[indexInNotes] = p)
		this.selectedNote = newNote;
	}
	
	/** Remove a note from the chart */
	removeNoteFromChart(time: number, move: Move) {
		const oldNote = this.song.notes.find(note => note.hitTime == time && note.dancerMove == move)
		this.song.notes = utils.removeFromArr(oldNote, this.song.notes)

		// remove it from note scales
		const indexInNotes = this.song.notes.indexOf(oldNote)
		this.noteScales.splice(indexInNotes, 1)
		playSound("noteRemove", { detune: moveToDetune(move) })
	}
}

/** The params for the chart editor */
export type paramsChartEditor = {
	song: SongChart,
	playbackSpeed: number,
	seekTime: number,
	dancer: string,
}

/** Converts the move to a detune, sounds good i think */
export function moveToDetune(move: Move) {
	switch (move) {
		case "left": return -50	
		case "down": return -100	
		case "up": return 100	
		case "right": return 50	
	}
}


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

	let textToPut = utils.formatTime(ChartState.scrollTime)
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
		let notePos = utils.getPosInGrid(ChartState.INITIAL_POS, ChartState.conductor.timeToStep(note.hitTime, ChartState.conductor.stepInterval), 0, ChartState.SQUARE_SIZE)
		notePos.y -= 50 * ChartState.smoothScrollStep

		const notePosLerped = lerp(notePos, notePos, ChartState.SCROLL_LERP_VALUE)
		
		if (conditionsForDrawing(notePos.y, ChartState.SQUARE_SIZE)) {
			drawSprite({
				width: ChartState.SQUARE_SIZE.x,
				height: ChartState.SQUARE_SIZE.y,
				scale: ChartState.noteScales[index],
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
	let cameraControllerOpacity = 0.1
	
	// draws the camera controller
	drawRect({
		width: ChartState.SQUARE_SIZE.x,
		height: ChartState.SQUARE_SIZE.y,
		anchor: "center",
		pos: ChartState.cameraControllerPos,
		opacity: cameraControllerOpacity,
		color: YELLOW,
		outline: { 
			width: 5,
			color: utils.blendColors(RED, YELLOW, 0.5),
		}
	})

	// draws the notes on the side of the camera controller
	if (mousePos().x >= width() - ChartState.SQUARE_SIZE.x) {
		cameraControllerOpacity = 0.5

		ChartState.song.notes.forEach((note) => {
			const initialPos = vec2(width() - 25, 0)
			const yPos = map(note.hitTime, 0, ChartState.conductor.audioPlay.duration(), initialPos.y, height())
			const xPos = initialPos.x

			drawRect({
				width: ChartState.SQUARE_SIZE.x / 10,
				height: ChartState.SQUARE_SIZE.y / 10,
				color: moveToColor(note.dancerMove),
				anchor: "center",
				pos: vec2(xPos, yPos),
				opacity: 0.5
			})
		})
	}

	else cameraControllerOpacity = 0.1
}

/** Draw the gizmo for the selected note */
export function drawSelectGizmo(ChartState:StateChart) {
	// draw the selected gizmo
	if (ChartState.selectedNote != undefined) {
		const stepOfSelectedNote = ChartState.conductor.timeToStep(ChartState.selectedNote.hitTime, ChartState.conductor.stepInterval) - ChartState.scrollStep
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
	}
}

/** Creates the 'isKeyPressed' event to change notes */
export function moveChangeInputHandler(ChartState:StateChart) {
	const keysAndMoves = {
		"1": "left",
		"2": "down",
		"3": "up",
		"4": "right"
	}

	Object.keys(keysAndMoves).forEach((key) => {
		if (isKeyPressed(key as Key)) {
			ChartState.changeMove(keysAndMoves[key])
		}
	})
}

/** Adds a dummy dancer for moving to the fake notes in the chart */
export function addDummyDancer(dancerName: string) {
	const DANCER_POS = vec2(921, 519)
	const DANCER_SCALE = vec2(0.5)
	let waitEvent = wait(0)

	function fakeDancerComp() {
		return {
			moveBop() {
				return this.stretch({ XorY: "y", startScale: DANCER_SCALE.y * 0.9, endScale: DANCER_SCALE.y, theTime: 0.25 })
			},

			doMove(move:Move) {
				this.moveBop()
				this.play(move)

				if (waitEvent) {waitEvent.cancel(); waitEvent = null}
				waitEvent = wait(1, () => {
					// can't do doMove because then it'll turn into a loop
					this.play("idle")
				})
			},

			get currentMove() {
				return this.getCurAnim().name;
			}
		}
	}

	const dancer = add([
		sprite("dancer_" + dancerName),
		anchor("bot"),
		pos(DANCER_POS),
		area(),
		scale(DANCER_SCALE),
		juice(),
		fakeDancerComp(),
	])

	dancer.onClick(() => {
		dancer.moveBop()
	})

	dancer.doMove("idle")

	return dancer;
}

export type textBoxOpt = {
	label: string,
	typeofValue: "string" | "id" | "number",
}

export function addTextBox(opts:textBoxOpt) {
	function textBoxComp() {
		return {
			id: "textBoxComp",
			focus: false,
			label: opts.label,
			typeofValue: opts.typeofValue,
			value: "",
		}
	}
	
	let texting = add([
		text("", { align: "left" }),
		area(),
		pos(),
		anchor("left"),
		textBoxComp(),
		opacity(0),
	])

	texting.onUpdate(() => {
		if (texting.focus) texting.opacity = 1
		else if (texting.isHovering()) texting.opacity = 0.5
		else texting.opacity = 0.25

		texting.text = opts.label + ": " + (texting.value as string)
	})

	return texting;
}

export function setupManageTextboxes(ChartState:StateChart) {
	const initialTextBoxPos = vec2(15, 25)
	const sizeOfTxt = 30

	const ts1label = "Steps per beat (TS0)" 
	const ts2label = "Beats per measure (TS1)" 

	const textboxesarr: textBoxObj[] = [] 

	const textboxes = {
		"Display name": "string",
		"ID": "id",
		"BPM": "number",
		"Steps per beat (TS0)": "number",
		"Beats per measure (TS1)": "number",
		"Scroll speed": "number",
	}

	/** Gets the value of the textboxes and assigns it to the actual values on the chart */
	function updateSongState() {
		ChartState.song.title = textboxesarr["Display name"].value as string
		ChartState.song.idTitle = textboxesarr["ID"].value as string
		
		// bpm
		ChartState.song.bpm = Number(textboxesarr["BPM"].value)
		ChartState.conductor.changeBpm(ChartState.song.bpm)
		
		// other stuff
		ChartState.conductor.stepsPerBeat = Number(textboxesarr[ts1label].value)
		ChartState.conductor.beatsPerMeasure = Number(textboxesarr[ts2label].value)
		ChartState.song.speedMultiplier = Number(textboxesarr["Scroll speed"].value)
	}

	Object.keys(textboxes).forEach((label, index) => {
		const txtbox = addTextBox({
			label: label,
			typeofValue: textboxes[label as keyof typeof textboxes] as "string" | "id" | "number",
		})
		txtbox.textSize = sizeOfTxt
		txtbox.pos = vec2(initialTextBoxPos.x, initialTextBoxPos.y + sizeOfTxt * index)
		textboxesarr[label] = txtbox

		switch (label) {
			case "Display name":
				txtbox.value = ChartState.song.title;	
			break;

			case "ID":
				txtbox.value = ChartState.song.idTitle;	
			break;

			case "BPM":
				txtbox.value = ChartState.song.bpm.toString();
			break;

			case ts1label:
				txtbox.value = ChartState.conductor.stepsPerBeat.toString();
			break;

			case ts2label:
				txtbox.value = ChartState.conductor.beatsPerMeasure.toString();
			break;

			case "Scroll speed":
				txtbox.value = ChartState.song.speedMultiplier.toString();
			break;
		}
	})

	// manages some focus for textboxes
	onClick(() => {
		const allTextBoxes = get("textBoxComp") as textBoxObj[]

		const hoveredTextBox = allTextBoxes.find((textbox) => textbox.isHovering())
		if (hoveredTextBox) {
			ChartState.focusedTextBox = hoveredTextBox
			ChartState.focusedTextBox.focus = true
		}

		else {
			if (ChartState.focusedTextBox) ChartState.focusedTextBox.focus = false
			ChartState.focusedTextBox = undefined
			updateSongState()
		}
	
		// get all the textboxes that aren't that one and unfocus them
		allTextBoxes.filter((textbox) => textbox != ChartState.focusedTextBox).forEach((textbox) => {
			textbox.focus = false
		})
	})

	// manages the adding for stuff
	onCharInput((ch) => {
		if (ChartState.focusedTextBox == undefined) return

		if (isKeyDown("shift")) {
			ch = ch.toUpperCase()
		}
		
		if (ChartState.focusedTextBox.typeofValue == "number") {
			// if it's a number
			if (!isNaN(parseInt(ch)) || ch == ".") ChartState.focusedTextBox.value += ch
		}

		else if (ChartState.focusedTextBox.typeofValue == "id") {
			if (ch == " ") ChartState.focusedTextBox.value += "-"
			else {
				ChartState.focusedTextBox.value += ch.toLowerCase()
			}
		}

		else {
			ChartState.focusedTextBox.value += ch
		}
	})

	onKeyPress("enter", () => {
		if (ChartState.focusedTextBox == undefined) return
		ChartState.focusedTextBox.focus = false
		ChartState.focusedTextBox = undefined
		updateSongState()
	})

	onKeyPress("backspace", () => {
		if (ChartState.focusedTextBox == undefined) return
		ChartState.focusedTextBox.value = ChartState.focusedTextBox.value.toString().slice(0, -1)
	})

	let controls = [
		"Left click - Place note",
		"Middle click - Copy note color",
		"Right click - Delete note",
		"1, 2, 3, 4 - Change the note color",
		"W, S - Move up or down selected note",
		"Space - Pause/Unpause",
	]

	add([
		text(controls.join("\n"), { size: 16 }),
		pos(vec2(15, 450)),
		opacity(0.5),
		anchor("topleft"),
	])
}

export function addDownloadButton(ChartState:StateChart) {
	const bpos = vec2(760, 547)
	
	const btn = add([
		text("↓"),
		pos(bpos),
		area(),
		anchor("center"),
		opacity(),
		{
			update() {
				if (this.isHovering()) this.opacity = 1
				else this.opacity = 0.5
			}
		}
	])

	btn.onClick(() => {
		const filename = `${ChartState.song.idTitle}-chart.json`
		downloadJSON(filename, ChartState.song)
		debug.log(`filename: ${filename} - downloaded! :)`)
	})
}

export type textBoxObj = ReturnType<typeof addTextBox>
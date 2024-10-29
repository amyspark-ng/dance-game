// File that stores some of the chart editor behaviour backend
import { Key, Vec2 } from "kaplay";
import { Move } from "../objects/dancer";
import { ChartNote } from "../objects/note";
import { utils } from "../../utils";
import { playSound } from "../../core/plugins/features/sound";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { SongChart } from "../song";
import { Conductor } from "../../conductor";
import { gameCursor } from "../../core/plugins/features/gameCursor";

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

	/** Wheter the selection box is being shown */
	selectionBox = {
		/** The note that is the note the other notes move around when you're moving a bunch of notes */
		leadingNote: undefined as ChartNote,
		/** Wheter the selection box can be triggered */
		canSelect: false,
		width: 0,
		height: 0,
		/** The position it'll be drawn at (topleft) */
		pos: vec2(0),
		/** The last click position (initial pos) */
		clickPos: vec2(0),
		points: [vec2(), vec2(), vec2(), vec2()]
	};

	cameraController = {
		canMoveCamera: false,
		/** Wheter the camera is being moved by the camera controller */
		isMovingCamera: false,
		/** The position of the camera controller */
		pos: vec2(width() - 25, 25),
	}

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
	selectedNotes: ChartNote[] = []

	/** The step that selected note started in before it was moved */
	stepForDetune = 0

	/** Is by how many steps the strumline is offseted (from top to below, 0 to 12) */
	strumlineStepOffset = 1

	/** Focused textbox */
	focusedTextBox: textBoxObj = undefined

	/** Converts a step to a position (a hawk to a) */
	stepToPos(step: number) {
		return utils.getPosInGrid(this.INITIAL_POS, step, 0, this.SQUARE_SIZE)
	}

	/** Unselects any note and the detune */
	resetSelectedNotes() {
		this.selectedNotes = []
		this.stepForDetune = 0
	}

	/** Changes the current move */
	changeMove(newMove:Move) {
		this.currentMove = newMove;
		tween(1.5, 1, 0.1, (p) => this.cursorScale.x = p)
	}

	/** Add a note to the chart */
	addNoteToChart(time: number, move: Move) {
		this.stepForDetune = 0
		
		const noteWithSameTimeButDifferentMove = this.song.notes.find(note => note.hitTime == time && note.dancerMove != move || note.hitTime == time && note.dancerMove == move)
		// if there's a note already at that time but a different move, remove it
		if (noteWithSameTimeButDifferentMove) {
			this.removeNoteFromChart(noteWithSameTimeButDifferentMove)
		}
		
		const newNote:ChartNote = { hitTime: time, dancerMove: move }
		this.song.notes.push(newNote)

		playSound("noteAdd", { detune: moveToDetune(move) })
	
		// add it to note scales
		const indexInNotes = this.song.notes.indexOf(newNote)
		tween(vec2(this.NOTE_BIG_SCALE), vec2(1), 0.1, (p) => this.noteScales[indexInNotes] = p)
		this.selectedNotes.push(newNote)
		return newNote;
	}
	
	/** Remove a note from the chart */
	removeNoteFromChart(noteToRemove:ChartNote) {
		const oldNote = this.song.notes.find(note => note == noteToRemove)
		this.song.notes = utils.removeFromArr(oldNote, this.song.notes)

		// remove it from note scales
		const indexInNotes = this.song.notes.indexOf(oldNote)
		this.noteScales = utils.removeFromArr(this.noteScales[indexInNotes], this.noteScales)
		this.selectedNotes = utils.removeFromArr(oldNote, this.selectedNotes)
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

/** RUns on update */
export function selectionBoxHandler(ChartState:StateChart) {
	
	if (isMousePressed("left")) {
		if (ChartState.cameraController.canMoveCamera || ChartState.isCursorInGrid) {
			ChartState.selectionBox.canSelect = false
		} 
	
		else ChartState.selectionBox.canSelect = true
		ChartState.selectionBox.clickPos = mousePos()
	}
	
	if (isMouseDown("left") && ChartState.selectionBox.canSelect) {
		ChartState.selectionBox.width = Math.abs(mousePos().x - ChartState.selectionBox.clickPos.x)
		ChartState.selectionBox.height = Math.abs(mousePos().y - ChartState.selectionBox.clickPos.y)
	
		ChartState.selectionBox.pos.x = Math.min(ChartState.selectionBox.clickPos.x, mousePos().x)
		ChartState.selectionBox.pos.y = Math.min(ChartState.selectionBox.clickPos.y, mousePos().y)
	
		// # topleft
		// the pos will just be the pos of the selectionbox since it's anchor topleft
		ChartState.selectionBox.points[0] = ChartState.selectionBox.pos

		// # topright
		// the x will be the same as topleft.x + width
		ChartState.selectionBox.points[1].x = ChartState.selectionBox.pos.x + ChartState.selectionBox.width
		// y will be the same as topleft.y
		ChartState.selectionBox.points[1].y = ChartState.selectionBox.pos.y

		// # bottomleft
		// the x will be the same as points[0].x
		ChartState.selectionBox.points[2].x = ChartState.selectionBox.pos.x
		// the y will be pos.y + height
		ChartState.selectionBox.points[2].y = ChartState.selectionBox.pos.y + ChartState.selectionBox.height

		// # bottomright
		// the x will be the same as topright x pos
		ChartState.selectionBox.points[3].x = ChartState.selectionBox.points[1].x
		// the y will be the same as bottom left
		ChartState.selectionBox.points[3].y = ChartState.selectionBox.points[2].y
	}

	if (isMouseReleased("left")) {
		const theRect = new Rect(ChartState.selectionBox.pos, ChartState.selectionBox.width, ChartState.selectionBox.height)

		ChartState.song.notes.forEach((note) => {
			let notePos = ChartState.stepToPos(ChartState.conductor.timeToStep(note.hitTime))
			notePos.y -= 50 * ChartState.smoothScrollStep

			const posInScreen = vec2(
				notePos.x - ChartState.SQUARE_SIZE.x / 2,
				notePos.y - ChartState.SQUARE_SIZE.y / 2
			)
	
			if (theRect.contains(posInScreen)) {
				// ChartState.removeNoteFromChart(note)
				ChartState.selectedNotes.push(note)	
			}
		})
		
		ChartState.selectionBox.clickPos = vec2(0, 0)
		ChartState.selectionBox.points = [vec2(0, 0), vec2(0, 0), vec2(0, 0), vec2(0, 0)]
		ChartState.selectionBox.pos = vec2(0, 0)
		ChartState.selectionBox.width = 0
		ChartState.selectionBox.height = 0
	}
}

export function cameraControllerHandling(ChartState:StateChart) {
	if (mousePos().x >= width() - 50 && !ChartState.cameraController.isMovingCamera) ChartState.cameraController.canMoveCamera = true
	else if (mousePos().x < width() - 50 && !ChartState.cameraController.isMovingCamera) ChartState.cameraController.canMoveCamera = false

	if (!ChartState.cameraController.isMovingCamera) {
		ChartState.cameraController.pos.y = mapc(ChartState.scrollStep, 0, ChartState.conductor.totalSteps, 25, height() - 25)
	}

	if (ChartState.cameraController.canMoveCamera) {
		if (isMousePressed("left")) {
			ChartState.cameraController.isMovingCamera = true
			if (!ChartState.paused) ChartState.paused = true
		}

		else if (isMouseReleased("left") && ChartState.cameraController.isMovingCamera) {
			ChartState.cameraController.isMovingCamera = false
		}

		if (ChartState.cameraController.isMovingCamera) {
			ChartState.cameraController.pos.y = mousePos().y
			ChartState.cameraController.pos.y = clamp(ChartState.cameraController.pos.y, 25, height() - 25)
			ChartState.scrollStep = mapc(ChartState.cameraController.pos.y, 25, height() - 25, 0, ChartState.conductor.totalSteps)
			ChartState.scrollStep = Math.round(ChartState.scrollStep)
		}
	}
}

export function mouseAnimationHandling(ChartState:StateChart) {
	if (ChartState.focusedTextBox != undefined) gameCursor.do("text")
	else {
		if (!ChartState.isCursorInGrid) {
			if (isMouseDown("left") && ChartState.cameraController.isMovingCamera) gameCursor.do("down")
			else gameCursor.do("default")
		}

		else {
			if (!isMouseDown("left") && !isMouseDown("right")) gameCursor.do("up")
			else if (isMouseDown("left") && !isMouseDown("right")) gameCursor.do("down")
			else if (!isMouseDown("left") && isMouseDown("right")) gameCursor.do("x")
		}
	}
}

/** Creates the 'isKeyPressed' event to change notes */
export function handlerForChangingInput(ChartState:StateChart) {
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
		"W, S - Moves up or down the camera",
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
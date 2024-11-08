// File that stores some of the chart editor behaviour backend
import { GameObj, Key, Vec2 } from "kaplay";
import { Move } from "../objects/dancer";
import { ChartNote } from "../objects/note";
import { utils } from "../../utils";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { SongChart } from "../song";
import { Conductor } from "../../conductor";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import JSZip from "jszip";
import { gameDialog } from "../../ui/dialogs/gameDialog";

/** Class that manages the snapshots of the chart */
export class ChartSnapshot {
	song: SongChart;
	selectedNotes: ChartNote[];
	constructor(song: SongChart, selectedNotes: ChartNote[]) {
		this.song = song;
		this.selectedNotes = selectedNotes;
	}
}

/** Type for handling props of note drawing */
type notePropThing = { 
	angle: number,
	scale: Vec2,
}

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
	SQUARE_SIZE = vec2(52, 52);

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
	strumlineScale = vec2(1);

	/** Scale and angle of all notes */
	noteProps: notePropThing[] = [];

	/** The scale of the cursor */
	cursorScale = vec2(1)

	/** Is ChartState.scrollstep but it is constantly being lerped towards it */
	smoothScrollStep = 0

	/** is the cursorYPos but it is constantly being lerped towards it */
	smoothCursorYPos = 0

	/** Array of selected notes */
	selectedNotes: ChartNote[] = []

	/** Every time you do something, the new state will be pushed to this array */
	snapshots:StateChart[] = []
	
	/** The notes currently copied */
	clipboard:ChartNote[] = []

	/** The step that selected note started in before it was moved */
	stepForDetune = 0

	/** Is by how many steps the strumline is offseted (from top to below, 0 to 12) */
	strumlineStepOffset = 1

	/** Focused textbox */
	focusedTextBox: textBoxObj = undefined

	/** Current index of the current snapshot blah */
	curSnapshotIndex = 0;

	/** Buffer of the audio play in the conductor */
	audioBuffer: AudioBuffer = null;

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

	/** Add a note to the chart
	 * @returns The added note
	 */
	addNoteToChart(time: number, move: Move) {
		this.stepForDetune = 0
		
		const noteWithSameTimeButDifferentMove = this.song.notes.find(note => note.hitTime == time && note.dancerMove != move || note.hitTime == time && note.dancerMove == move)
		// if there's a note already at that time but a different move, remove it
		if (noteWithSameTimeButDifferentMove) {
			this.removeNoteFromChart(noteWithSameTimeButDifferentMove)
		}
		
		const newNote:ChartNote = { hitTime: time, dancerMove: move }
		this.song.notes.push(newNote)

		const indexInNotes = this.song.notes.indexOf(newNote)
		this.noteProps[indexInNotes] = { scale: vec2(1), angle: 0 }
		tween(vec2(this.NOTE_BIG_SCALE), vec2(1), 0.1, (p) => this.noteProps[indexInNotes].scale = p)
		this.selectedNotes.push(newNote)
		
		return newNote;
	}
	
	/** Remove a note from the chart
	 * @returns The removed note
	 */
	removeNoteFromChart(noteToRemove:ChartNote) : ChartNote {
		const oldNote = this.song.notes.find(note => note == noteToRemove)
		if (oldNote == undefined) return;
		
		this.song.notes = utils.removeFromArr(oldNote, this.song.notes)
		this.selectedNotes = utils.removeFromArr(oldNote, this.selectedNotes)
		
		return oldNote;
	}

	/** Pushes a snapshot of the current state of the chart */
	takeSnapshot() {
		const snapshot = new ChartSnapshot(this.song, this.selectedNotes);
		// Remove any states ahead of the current index for redo to behave correctly
		this.snapshots = this.snapshots.slice(0, this.curSnapshotIndex + 1);

		// Add new state as a deep copy to avoid reference issues
		this.snapshots.push(JSON.parse(JSON.stringify(snapshot)));
		this.curSnapshotIndex++;
	}

	/** Undos the song and selected notes to latest snapshot */
	undo() {
		if (this.curSnapshotIndex > 0) {
			this.curSnapshotIndex--;
			const newState = JSON.parse(JSON.stringify(this.snapshots[this.curSnapshotIndex])); // Return deep copy of the state
			this.selectedNotes = newState.selectedNotes
			this.song = newState.song
		}

		return null; // No more states to undo
	}

	/** Redoes the song and selected notes to latest snapshot */
	redo() {
		if (this.curSnapshotIndex < this.snapshots.length - 1) {
			this.curSnapshotIndex++;
			const newState = JSON.parse(JSON.stringify(this.snapshots[this.curSnapshotIndex])); // Return deep copy of the state
			this.selectedNotes = newState.selectedNotes
			this.song = newState.song
		}
		
		return null; // No more states to redo
	}

	/** Changes the song of the instance */
	setSong(song: SongChart) {
		this.scrollStep = 0
		this.snapshots = []
		this.curSnapshotIndex = 0
		this.selectedNotes = []
		
		this.song = song;
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
		ChartState.selectionBox.clickPos = gameCursor.pos
	}
	
	if (isMouseDown("left") && ChartState.selectionBox.canSelect) {
		ChartState.selectionBox.width = Math.abs(gameCursor.pos.x - ChartState.selectionBox.clickPos.x)
		ChartState.selectionBox.height = Math.abs(gameCursor.pos.y - ChartState.selectionBox.clickPos.y)
	
		ChartState.selectionBox.pos.x = Math.min(ChartState.selectionBox.clickPos.x, gameCursor.pos.x)
		ChartState.selectionBox.pos.y = Math.min(ChartState.selectionBox.clickPos.y, gameCursor.pos.y)
	
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

	if (isMouseReleased("left") && ChartState.selectionBox.canSelect) {
		const theRect = new Rect(ChartState.selectionBox.pos, ChartState.selectionBox.width, ChartState.selectionBox.height)
		const oldSelectedNotes = ChartState.selectedNotes
		ChartState.selectedNotes = []

		ChartState.song.notes.forEach((note) => {
			let notePos = ChartState.stepToPos(ChartState.conductor.timeToStep(note.hitTime))
			notePos.y -= ChartState.SQUARE_SIZE.y * ChartState.smoothScrollStep

			const posInScreen = vec2(
				notePos.x - ChartState.SQUARE_SIZE.x / 2,
				notePos.y - ChartState.SQUARE_SIZE.y / 2
			)
	
			if (theRect.contains(posInScreen)) {
				ChartState.selectedNotes.push(note)
			}
		})

		const newSelectedNotes = ChartState.selectedNotes
		if (oldSelectedNotes != newSelectedNotes) ChartState.takeSnapshot();
		
		ChartState.selectionBox.clickPos = vec2(0, 0)
		ChartState.selectionBox.points = [vec2(0, 0), vec2(0, 0), vec2(0, 0), vec2(0, 0)]
		ChartState.selectionBox.pos = vec2(0, 0)
		ChartState.selectionBox.width = 0
		ChartState.selectionBox.height = 0
	}
}

export function cameraControllerHandling(ChartState:StateChart) {
	if (gameDialog.isOpen) return;
	if (gameCursor.pos.x >= width() - ChartState.SQUARE_SIZE.x && !ChartState.cameraController.isMovingCamera) ChartState.cameraController.canMoveCamera = true
	else if (gameCursor.pos.x < width() - ChartState.SQUARE_SIZE.x && !ChartState.cameraController.isMovingCamera) ChartState.cameraController.canMoveCamera = false

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
			ChartState.cameraController.pos.y = gameCursor.pos.y
			ChartState.cameraController.pos.y = clamp(ChartState.cameraController.pos.y, 25, height() - 25)
			ChartState.scrollStep = mapc(ChartState.cameraController.pos.y, 25, height() - 25, 0, ChartState.conductor.totalSteps)
			ChartState.scrollStep = Math.round(ChartState.scrollStep)
		}
	}
}

export function mouseAnimationHandling(ChartState:StateChart) {
	// kinda hardcoded, this probably just means the player is loading something nothing  else
	if (!gameCursor.canMove && ChartState.inputDisabled) gameCursor.do("load")
	else if (ChartState.focusedTextBox != undefined) gameCursor.do("text")
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
		if (ChartState.focusedTextBox != undefined) return;
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

/** Updates all textboxes */
export function updateAllTextboxes(ChartState:StateChart) {
	get("textBoxComp").forEach((txtbox) => updateTextboxes(ChartState, txtbox))
}

/** Updates the value the textboxes are showcasing */
export function updateTextboxes(ChartState: StateChart, txtbox: GameObj) {
	const ts1label = "Steps per beat (TS0)" 
	const ts2label = "Beats per measure (TS1)" 

	switch (txtbox.label) {
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
			txtbox.value = ChartState.song.scrollSpeed.toString();
		break;
	}
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
	function updateSongValues() {
		ChartState.song.title = textboxesarr["Display name"].value as string
		ChartState.song.idTitle = textboxesarr["ID"].value as string
		
		// bpm
		ChartState.song.bpm = Number(textboxesarr["BPM"].value)
		ChartState.conductor.changeBpm(ChartState.song.bpm)
		
		// other stuff
		ChartState.conductor.stepsPerBeat = Number(textboxesarr[ts1label].value)
		ChartState.conductor.beatsPerMeasure = Number(textboxesarr[ts2label].value)
		ChartState.song.scrollSpeed = Number(textboxesarr["Scroll speed"].value)
	}

	Object.keys(textboxes).forEach((label, index) => {
		const txtbox = addTextBox({
			label: label,
			typeofValue: textboxes[label as keyof typeof textboxes] as "string" | "id" | "number",
		})
		txtbox.textSize = sizeOfTxt
		txtbox.pos = vec2(initialTextBoxPos.x, initialTextBoxPos.y + sizeOfTxt * index)
		textboxesarr[label] = txtbox
		updateTextboxes(ChartState, txtbox)
	})

	onUpdate(() => {
		const hoveredTextbox = get("textBoxComp").find((textbox) => textbox.focus)
		if (!hoveredTextbox) return;
		if (hoveredTextbox.focus) return;
		updateTextboxes(ChartState, hoveredTextbox)
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
			updateSongValues()
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

	onKeyPress(["escape", "enter"], () => {
		if (ChartState.focusedTextBox == undefined) return
		ChartState.focusedTextBox.focus = false
		ChartState.focusedTextBox = undefined
		updateSongValues()
		ChartState.takeSnapshot()
	})

	onKeyPressRepeat("backspace", () => {
		if (ChartState.focusedTextBox == undefined) return
		ChartState.focusedTextBox.value = ChartState.focusedTextBox.value.toString().slice(0, -1)
	})

	getTreeRoot().on("download", () => {
		updateSongValues()
	})
}

/** Adds a cool little floating text */
export function addFloatingText(texting: string) {
	const copyText = add([
		text(texting, { align: "left", size: 20 }),
		pos(gameCursor.pos),
		anchor("left"),
		fixed(),
		color(3, 252, 73),
		opacity(),
		timer(),
	])

	copyText.tween(copyText.pos.y, copyText.pos.y - rand(25, 35), 0.5, (p) => copyText.pos.y = p, easings.easeOutQuint).onEnd(() => {
		copyText.fadeOut(0.25).onEnd(() => copyText.destroy())
	})

	return copyText;
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

	btn.onClick(async () => {
		getTreeRoot().trigger("download")
		
		const jsZip = new JSZip()
		
		// the blob for the song 
		const oggBlob = utils.audioBufferToOGG(ChartState.audioBuffer)

		// stuff related to cover
		const defaultCover = "sprites/defaultCover.png"
		let pathToCover:string = undefined
		const coverAvailable = await getSprite(ChartState.song.idTitle + "-cover")
		if (!coverAvailable) pathToCover = defaultCover
		else pathToCover = `songs/${ChartState.song.idTitle}/${ChartState.song.idTitle}-cover.png`
		const imgBlob = await (await fetch(pathToCover)).blob()
		
		// creates the files
		jsZip.file(`${ChartState.song.idTitle}-chart.json`, JSON.stringify(ChartState.song))
		jsZip.file(`${ChartState.song.idTitle}-song.ogg`, oggBlob)
		jsZip.file(`${ChartState.song.idTitle}-cover.png`, imgBlob)
		
		// downloads the zip
		await jsZip.generateAsync({ type: "blob" }).then((content) => {
			downloadBlob(`${ChartState.song.idTitle}-chart.zip`, content)
		})

		debug.log(`${ChartState.song.idTitle}-chart.zip, DOWNLOADED! :)`)
	})
}

export type textBoxObj = ReturnType<typeof addTextBox>
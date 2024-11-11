// File that stores some of the chart editor behaviour backend
import { GameObj, Key, Vec2 } from "kaplay";
import { Move } from "../objects/dancer";
import { ChartNote } from "../objects/note";
import { utils } from "../../utils";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { Conductor } from "../../conductor";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { gameDialog } from "../../ui/dialogs/gameDialog";
import { SongZip } from "../song";
import JSZip from "jszip";
import TOML from "smol-toml"

/** Class that manages the snapshots of the chart */
export class ChartSnapshot {
	song: SongZip;
	selectedNotes: ChartNote[];
	constructor(song: SongZip, selectedNotes: ChartNote[]) {
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
	song: SongZip;
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
		
		const noteWithSameTimeButDifferentMove = this.song.chart.notes.find(note => note.time == time && note.move != move || note.time == time && note.move == move)
		// if there's a note already at that time but a different move, remove it
		if (noteWithSameTimeButDifferentMove) {
			this.removeNoteFromChart(noteWithSameTimeButDifferentMove)
		}
		
		const newNote:ChartNote = { time: time, move: move }
		this.song.chart.notes.push(newNote)

		const indexInNotes = this.song.chart.notes.indexOf(newNote)
		this.noteProps[indexInNotes] = { scale: vec2(1), angle: 0 }
		tween(vec2(this.NOTE_BIG_SCALE), vec2(1), 0.1, (p) => this.noteProps[indexInNotes].scale = p)
		this.selectedNotes.push(newNote)
		
		return newNote;
	}
	
	/** Remove a note from the chart
	 * @returns The removed note
	 */
	removeNoteFromChart(noteToRemove:ChartNote) : ChartNote {
		const oldNote = this.song.chart.notes.find(note => note == noteToRemove)
		if (oldNote == undefined) return;
		
		this.song.chart.notes = utils.removeFromArr(oldNote, this.song.chart.notes)
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
	setSong(song: SongZip) {
		this.scrollStep = 0
		this.snapshots = []
		this.curSnapshotIndex = 0
		this.selectedNotes = []
		
		this.song = song;
	}
}

/** The params for the chart editor */
export type paramsChartEditor = {
	song: SongZip,
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

		ChartState.song.chart.notes.forEach((note) => {
			let notePos = ChartState.stepToPos(ChartState.conductor.timeToStep(note.time))
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

/** Handles the animation of the mouse */
export function mouseAnimationHandling(ChartState:StateChart) {
	// higher priority type mode
	if (gameCursor.typeMode) {
		if (gameCursor.sprite != "cursor_text") gameCursor.do("text")
		return;
	}
	
	// then the animations for game dialog
	if (gameDialog.isOpen) {
		const hoveredObjects = get("hover", { recursive: true })
		hoveredObjects.forEach((obj) => {
			if (!obj.isHovering()) {
				if (obj.dragging) gameCursor.do("down")
				else {
					if (hoveredObjects.some((otherObj) => otherObj.isHovering())) return
					else gameCursor.do("default")
				}
			}

			else {
				if (obj.dragging || isMouseDown("left")) gameCursor.do("down")
				else gameCursor.do("up")
			}
		})

		return;
	}
	
	// then the ones for the actual charting state
	// kinda hardcoded, this probably just means the player is loading something nothing  else
	if (!gameCursor.canMove && ChartState.inputDisabled) gameCursor.do("load")
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
		if (gameDialog.isOpen) return;
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

export async function downloadChart(ChartState:StateChart) {
	getTreeRoot().trigger("download")
		
	const jsZip = new JSZip()
	
	// the blob for the song 
	const oggBlob = utils.audioBufferToOGG(ChartState.audioBuffer)

	async function spriteToDataURL(sprName: string) {
		const canvas = makeCanvas(396, 396)
		canvas.draw(() => {
			drawSprite({
				sprite: sprName,
				width: width(),
				height: height(),
				pos: center(),
				anchor: "center",
			})
		})

		const dataURL = canvas.toDataURL();
		return dataURL;
	}

	// stuff related to cover
	const defaultCover = "sprites/defaultCover.png"
	let pathToCover:string = undefined
	const coverAvailable = await getSprite(ChartState.song.manifest.uuid_DONT_CHANGE + "-cover")
	if (!coverAvailable) pathToCover = defaultCover
	else pathToCover = await spriteToDataURL(ChartState.song.manifest.uuid_DONT_CHANGE + "-cover")
	const imgBlob = await fetch(pathToCover).then((res) => res.blob())

	spriteToDataURL(ChartState.song.manifest.uuid_DONT_CHANGE + "-cover")

	const manifestString = TOML.stringify(ChartState.song.manifest)

	// creates the files
	const kebabCaseName = utils.kebabCase(ChartState.song.manifest.name)
	jsZip.file(`${kebabCaseName}-chart.json`, JSON.stringify(ChartState.song.chart))
	jsZip.file(`${kebabCaseName}-audio.ogg`, oggBlob)
	jsZip.file(`${kebabCaseName}-cover.png`, imgBlob)
	jsZip.file(`manifest.toml`, manifestString)
	
	// downloads the zip
	await jsZip.generateAsync({ type: "blob" }).then((content) => {
		downloadBlob(`${kebabCaseName}-chart.zip`, content)
	})

	debug.log(`${kebabCaseName}-chart.zip, DOWNLOADED! :)`)
}
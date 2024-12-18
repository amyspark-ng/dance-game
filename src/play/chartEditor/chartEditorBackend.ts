// File that stores some of the chart editor behaviour backend
import { GameObj, Key, Vec2 } from "kaplay";
import { Move } from "../objects/dancer";
import { ChartNote, moveToColor } from "../objects/note";
import { utils } from "../../utils";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { Conductor } from "../../conductor";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { GameDialog } from "../../ui/dialogs/gameDialog";
import { ChartEvent, SongContent } from "../song";
import { playSound } from "../../core/plugins/features/sound";
import JSZip from "jszip";
import TOML from "smol-toml"
import { v4 as uuidv4 } from 'uuid';
import { openChartInfoDialog } from "./chartEditorDialogs";
import { GameSave } from "../../core/gamesave";
import { dancers } from "../../core/loader";
import { finished } from "stream";

/** Is either a note or an event */
export type ChartStamp = (ChartNote | ChartEvent)
/** Wheter the stamp is a note or not */
export function isStampNote(stamp: ChartStamp) { return "move" in stamp }

/** Class that manages the snapshots of the chart */
export class ChartSnapshot {
	song: SongContent;
	selectedStamps: ChartStamp[] = [];
	constructor(song: SongContent, selectedStamps: ChartStamp[]) {
		this.song = song;
		this.selectedStamps = selectedStamps;
	}
}

/** Type for handling props of stuff drawing */
type stampPropThing = { 
	angle: number,
	scale: Vec2,
}

/** Concatenates the stamps */
export function concatStamps(notes: ChartNote[], events: ChartEvent[]) : ChartStamp[] {
	return [...notes, ...events]
}

/** Get the message for the clipboard */
export function clipboardMessage(action: "copy" | "cut" | "paste", clipboard:ChartStamp[]) {
	let message = ""
	
	const notesLength = clipboard.filter((thing) => isStampNote(thing)).length
	const eventsLength = clipboard.filter((thing) => !isStampNote(thing)).length
	const moreThanOneNote = notesLength > 1
	const moreThanOneEvent = eventsLength > 1

	const actionStr = action == "copy" ? "Copied" : action == "cut" ? "Cut" : "Pasted"

	if (notesLength > 0 && eventsLength == 0) message = `${actionStr} ${notesLength} ${moreThanOneNote ? "notes" : "note"}!`
	else if (notesLength == 0 && eventsLength > 0) message = `${actionStr} ${eventsLength} ${moreThanOneEvent ? "events" : "event"}!`
	else if (notesLength > 0 && eventsLength > 0) message = `${actionStr} ${notesLength} ${moreThanOneNote ? "notes" : "note"} and ${eventsLength} ${moreThanOneEvent ? "events" : "event"}!`
	else if (notesLength == 0 && eventsLength == 0) message = `${actionStr} nothing!`

	return message;
}

/** Class that manages every important variable in the chart editor */
export class StateChart {
	bgColor: [number, number, number] = [67, 21, 122]
	song: SongContent;
	paused: boolean;
	conductor: Conductor;
	params: paramsChartEditor;

	inputDisabled: boolean = false;

	/** How many steps scrolled */
	scrollStep: number = 0;

	/** Is ChartState.scrollstep but lerped */
	lerpScrollStep = 0

	/** Wheter the selection box is being shown */
	selectionBox = {
		/** The note that is the note the other notes move around when you're moving a bunch of notes */
		leadingStamp: undefined as ChartStamp,
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
		/** Wheter can move the camera */
		canMoveCamera: false,
		/** Wheter the camera is being moved by the camera controller */
		isMovingCamera: false,
		/** The position of the camera controller */
		pos: vec2(width() / 2 + 52 * 2, 25),
	}

	doneEvents: ChartEvent[] = [];

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
	currentMove: Move = "up";

	/** All the ids for the events */
	events = {
		"change-scroll": { duration: 0, speed: 1, easing: "linear" },
		"cam-move": { duration: 0, x: 0, y: 0, zoom: 1, angle: 0, easing: "linear" },
		"play-anim": { anim: "victory", speed: 1, force: false, looped: false, ping_pong: false },
		"change-dancer": { dancer: "astri", },
	};

	/** The current selected event */
	currentEvent: string = "change-scroll";
	
	/** The pos of the cursor (is the pos of the step you're currently hovering) */
	cursorPos = vec2(1);
	
	/** is the cursor pos but lerped */
	lerpCursorPos = vec2()

	/** What row the cursor is in (ranges from -0.5 to 9.5) */
	cursorGridRow = 0;
	
	/** The step that is currently being hovered */
	hoveredStep = 0;
	
	/** Wheter the cursor is in the grid at all */
	isCursorInGrid = false
	
	/** Wheter the cursor is in a grid or not */
	isInNoteGrid = false

	/** Wheter the cursor is in the events grid */
	isInEventGrid = false

	/** The scale of the strumline line */
	strumlineScale = vec2(1);

	/** Scale and angle of all stamps */
	stampProps = {
		notes: [] as stampPropThing[],
		events: [] as stampPropThing[],
	};

	/** The scale of the cursor */
	cursorScale = vec2(1)

	/** Array of all the selected things */
	selectedStamps: ChartStamp[] = []

	/** Every time you do something, the new state will be pushed to this array */
	snapshots:StateChart[] = []
	
	/** The things currently copied */
	clipboard:ChartStamp[] = []

	/** The step that selected note started in before it was moved */
	stepForDetune = 0

	/** Is by how many steps the strumline is offseted (from top to below, 0 to 12) */
	strumlineStepOffset = 1

	/** Current index of the current snapshot blah */
	curSnapshotIndex = 0;

	/** Buffer of the audio play in the conductor */
	audioBuffer: AudioBuffer = null;

	/** Sets scrollStep to a clamped and rounded value */
	scrollToStep(newStep: number) {
		newStep = Math.abs(Math.round(newStep))
		newStep = clamp(newStep, 0, this.conductor.totalSteps)
		this.scrollStep = newStep
	}

	/** Converts a step to a position (a hawk to a) */
	stepToPos(step: number) {
		return utils.getPosInGrid(this.INITIAL_POS, step, 0, this.SQUARE_SIZE)
	}

	/** Unselects any stamp and the detune */
	resetSelectedStamps() {
		this.selectedStamps = []
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
	placeNote(time: number, move: Move) {
		const noteWithSameTimeButDifferentMove = this.song.chart.notes.find(note => note.time == time && note.move != move || note.time == time && note.move == move)
		// if there's a note already at that time but a different move, remove it
		if (noteWithSameTimeButDifferentMove) {
			this.deleteNote(noteWithSameTimeButDifferentMove)
		}
		
		const newNote:ChartNote = { time: time, move: move }
		this.song.chart.notes.push(newNote)
		this.song.chart.events.sort((a, b) => a.time - b.time)

		const indexInNotes = this.song.chart.notes.indexOf(newNote)
		this.stampProps.notes[indexInNotes] = { scale: vec2(1), angle: 0 }
		tween(vec2(this.NOTE_BIG_SCALE), vec2(1), 0.1, (p) => this.stampProps.notes[indexInNotes].scale = p)
		this.selectedStamps.push(newNote)
		
		return newNote;
	}
	
	/** Remove a note from the chart
	 * @returns The removed note
	 */
	deleteNote(noteToRemove:ChartNote) : ChartNote {
		const oldNote = this.song.chart.notes.find(note => note == noteToRemove)
		if (oldNote == undefined) return;
		
		this.song.chart.notes = utils.removeFromArr(oldNote, this.song.chart.notes)
		this.selectedStamps = utils.removeFromArr(oldNote, this.selectedStamps)
		
		return oldNote;
	}

	/** Adds an event to the events array */
	placeEvent(time: number, id: string) {
		const newEvent:ChartEvent = { time: time, id: id, value: this.events[id] }
		this.song.chart.events.push(newEvent)
		// now sort them in time order
		this.song.chart.events.sort((a, b) => a.time - b.time)

		const indexInEvents = this.song.chart.events.indexOf(newEvent)
		this.stampProps.events[indexInEvents] = { scale: vec2(1), angle: 0 }
		tween(vec2(this.NOTE_BIG_SCALE), vec2(1), 0.1, (p) => this.stampProps.events[indexInEvents].scale = p)
		this.selectedStamps.push(newEvent)

		return newEvent;
	}

	/** Removes an event from the events array */
	deleteEvent(event: ChartEvent) {
		const oldEvent = event

		this.song.chart.events = utils.removeFromArr(oldEvent, this.song.chart.events)
		this.song.chart.events.sort((a, b) => a.time - b.time)

		this.selectedStamps = utils.removeFromArr(oldEvent, this.selectedStamps)
		return oldEvent;
	}

	/** Pushes a snapshot of the current state of the chart */
	takeSnapshot() {
		const snapshot = new ChartSnapshot(this.song, this.selectedStamps);
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
			// Return deep copy of the state
			const newState:ChartSnapshot = JSON.parse(JSON.stringify(this.snapshots[this.curSnapshotIndex])) 
			this.selectedStamps = newState.selectedStamps
			this.song = newState.song
		}

		return null; // No more states to undo
	}

	/** Redoes the song and selected notes to latest snapshot */
	redo() {
		if (this.curSnapshotIndex < this.snapshots.length - 1) {
			this.curSnapshotIndex++;
			const newState:ChartSnapshot = JSON.parse(JSON.stringify(this.snapshots[this.curSnapshotIndex])); // Return deep copy of the state
			this.selectedStamps = newState.selectedStamps
			this.song = newState.song
		}
		
		return null; // No more states to redo
	}

	/** Gets the dancer at a current time in the song */
	getDancerAtTime() {
		let dancerChangeEvents = this.song.chart.events.filter((event) => event.id == "change-dancer")
		
		// some stuff to remove faulty names from dancer list
		const dancersInEvents = dancerChangeEvents.map((ev) => ev.value.dancer)
		const allDancerNames = dancers.map((dancerFiles) => dancerFiles.dancerName)
		if (dancersInEvents.some((dancerInEvent) => allDancerNames.includes(dancerInEvent)) == false) {
			const indexOfFaultyDancer = dancerChangeEvents.findIndex((ev) => dancersInEvents.some((dancerInEvent) => ev.value.dancer == dancerInEvent))
			dancerChangeEvents = utils.removeFromArr(dancersInEvents[indexOfFaultyDancer], dancerChangeEvents)
		}

		if (dancerChangeEvents.length == 0 || this.conductor.timeInSeconds < dancerChangeEvents[0].time) return GameSave.dancer;

		for (const event in dancerChangeEvents) {
			if (dancerChangeEvents[event].time <= this.conductor.timeInSeconds) {
				return dancerChangeEvents[event].value.dancer
			}
		}
	}

	/** Changes the song of the instance */
	createNewSong() {
		this.scrollToStep(0)
		this.snapshots = []
		this.curSnapshotIndex = 0
		this.selectedStamps = []
		
		this.song = new SongContent()
		this.song.manifest.uuid_DONT_CHANGE = uuidv4()
	
		loadSprite(this.song.manifest.uuid_DONT_CHANGE + "-cover", "sprites/defaultCover.png")
		loadSound(this.song.manifest.uuid_DONT_CHANGE + "-audio", "new-song-audio.ogg")

		this.conductor = new Conductor({
			audioPlay: playSound(this.song.manifest.uuid_DONT_CHANGE + "-audio"),
			BPM: this.song.manifest.initial_bpm,
			timeSignature: this.song.manifest.time_signature,
		})

		openChartInfoDialog(this)
	}
}

/** The params for the chart editor */
export type paramsChartEditor = {
	song: SongContent,
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
		if (ChartState.cameraController.canMoveCamera || ChartState.isCursorInGrid || get("hover", { recursive: true }).some((obj) => obj.isHovering())) {
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
		
		const oldSelectStamps = ChartState.selectedStamps
		ChartState.selectedStamps = []

		const combined = concatStamps(ChartState.song.chart.notes, ChartState.song.chart.events)

		combined.forEach((stamp) => {
			let stampPos = ChartState.stepToPos(ChartState.conductor.timeToStep(stamp.time))
			stampPos.y -= ChartState.SQUARE_SIZE.y * ChartState.lerpScrollStep
			if (!isStampNote(stamp)) stampPos.x = ChartState.INITIAL_POS.x + ChartState.SQUARE_SIZE.x

			// is the topleft of the position
			const posInScreen = vec2(
				stampPos.x - ChartState.SQUARE_SIZE.x / 2,
				stampPos.y - ChartState.SQUARE_SIZE.y / 2
			)

			// these are the positions in all 4 corners
			const possiblePos = [ 
				posInScreen, // topleft
				vec2(posInScreen.x + ChartState.SQUARE_SIZE.x, posInScreen.y), // topright
				vec2(posInScreen.x, posInScreen.y + ChartState.SQUARE_SIZE.y), // bottomleft
				vec2(posInScreen.x + ChartState.SQUARE_SIZE.x, posInScreen.y + ChartState.SQUARE_SIZE.y), // bottomright
			]

			// goes through each one and seeis if they're in the selection box
			for (const posy in possiblePos) {
				if (theRect.contains(possiblePos[posy])) {
					ChartState.selectedStamps.push(stamp)
					break;
				}
			}
		})

		const newSelectStamps = ChartState.selectedStamps

		if (oldSelectStamps != newSelectStamps) ChartState.takeSnapshot();
		
		ChartState.selectionBox.clickPos = vec2(0, 0)
		ChartState.selectionBox.points = [vec2(0, 0), vec2(0, 0), vec2(0, 0), vec2(0, 0)]
		ChartState.selectionBox.pos = vec2(0, 0)
		ChartState.selectionBox.width = 0
		ChartState.selectionBox.height = 0
	}
}

export function cameraHandler(ChartState:StateChart) {
	if (GameDialog.isOpen) return;
	const minLeft = ChartState.cameraController.pos.x - ChartState.SQUARE_SIZE.x / 2
	const maxRight = ChartState.cameraController.pos.x + ChartState.SQUARE_SIZE.x / 2
	if (gameCursor.pos.x >= minLeft && gameCursor.pos.x <= maxRight) ChartState.cameraController.canMoveCamera = true
	else if ((gameCursor.pos.x < ChartState.cameraController.pos.x || gameCursor.pos.x > ChartState.cameraController.pos.x) && !ChartState.cameraController.isMovingCamera) ChartState.cameraController.canMoveCamera = false

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
			ChartState.scrollToStep(mapc(ChartState.cameraController.pos.y, 25, height() - 25, 0, ChartState.conductor.totalSteps))
		}
	}
}

/** Handles the animation of the mouse */
export function setMouseAnimConditions(ChartState:StateChart) {
	gameCursor.addAnimCondition(() => {
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
	})
}

const keysAndMoves = {
	"1": "left",
	"2": "down",
	"3": "up",
	"4": "right"
}

function finishMoveMenu() {
	get("moveSelector").forEach((moveThing) => {
		moveThing._pos.y = gameCursor.pos.y * 0.5
		moveThing._opacity = 0
		moveThing.area.scale = vec2(0)
		wait(1, () => {
			moveThing.destroy()
		})
	})
}

/** Creates the 'isKeyPressed' event to change notes */
export function moveHandler(ChartState:StateChart) {
	Object.keys(keysAndMoves).forEach((key) => {
		if (GameDialog.isOpen) return;
		if (isKeyPressed(key as Key)) {
			ChartState.changeMove(keysAndMoves[key])
		}
	})

	// if it exists, remove it
	if (isMousePressed("left") && !ChartState.isCursorInGrid && !gameCursor.isHoveringAnObject) {
		finishMoveMenu()
	}

	// creates cool menu
	else if (isMousePressed("right") && !ChartState.isCursorInGrid && !gameCursor.isHoveringAnObject) {

		finishMoveMenu()
		
		Object.values(keysAndMoves).forEach((move, index) => {
			const size = 30
			
			let startingMousePos = gameCursor.pos

			const sqThing = add([
				rect(size, size, { radius: 2.5 }),
				pos(gameCursor.pos.x + size + (size * 1.05) * index, startingMousePos.y),
				anchor("center"),
				color(BLACK.lighten(50)),
				area(),
				opacity(0),
				outline(1.5, WHITE),
				"moveSelector",
				"hover",
				{
					_pos: vec2(),
					_opacity: 1,
				}
			])

			sqThing._pos = vec2(sqThing.pos.x, startingMousePos.y + gameCursor.height)

			sqThing.onUpdate(() => {
				sqThing.opacity = lerp(sqThing.opacity, sqThing._opacity, 0.25 * (index + 1))
				sqThing.pos.y = lerp(sqThing.pos.y, sqThing._pos.y, 0.25 * (index + 1))
				const moveCoolColor = moveToColor(move as Move).lighten(30)
				sqThing.outline.color = lerp(sqThing.outline.color, sqThing.isHovering() ? moveCoolColor : sqThing.color.lighten(20), 0.8)
			})

			sqThing.onClick(() => {
				ChartState.currentMove = move as Move
				finishMoveMenu()
			})

			sqThing.onDraw(() => {
				drawSprite({
					sprite: GameSave.noteskin + "_" + move,
					anchor: "center",
					width: size,
					height: size,
					opacity: sqThing.opacity,
				})
			})
		})
	}
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
		{
			forcedAnim: false,
		}
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
	jsZip.file(ChartState.song.manifest.audio_file, oggBlob)
	jsZip.file(ChartState.song.manifest.cover_file, imgBlob)
	jsZip.file(`manifest.toml`, manifestString)
	
	// downloads the zip
	await jsZip.generateAsync({ type: "blob" }).then((content) => {
		downloadBlob(`${kebabCaseName}-chart.zip`, content)
	})

	debug.log(`${kebabCaseName}-chart.zip, DOWNLOADED! :)`)
}
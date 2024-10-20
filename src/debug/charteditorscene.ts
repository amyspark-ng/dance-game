import { Key } from "kaplay"
import { onStepHit } from "../game/events"
import { ChartNote, moveToColor } from "../play/objects/note"
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

export function ChartEditorScene() { scene("charteditor", (params: chartEditorParams) => {
	setBackground(utils.blendColors(RED, BLUE, 0.65).darken(70))
	
	// had an issue with BPM being NaN but it was because since this wasn't defined then it was NaN
	params.playbackSpeed = params.playbackSpeed ?? 1
	params.seekTime = params.seekTime ?? 0
	params.seekTime = Math.abs(params.seekTime)

	const ChartState = new ChartStateClass()

	ChartState.conductor = new Conductor({
		audioPlay: playSound(`${params.song.title}-song`, { volume: 0.1, speed: params.playbackSpeed }),
		bpm: params.song.bpm * params.playbackSpeed,
		timeSignature: params.song.timeSignature,
	})

	ChartState.conductor.setup()
	ChartState.conductor.audioPlay.seek(params.seekTime)

	// IMPORTANT
	ChartState.paused = true
	ChartState.song = params.song;

	let scrollStepToTime = stepToTime(ChartState.scrollStep, ChartState.conductor.stepInterval)

	/** When you hold down a key, the cursor will change color to signify the move */
	let currentMove:Move = "up"
	
	/** The Y pos of the cursor (divided in grid) */
	let cursorGridPos = 0
	
	/** The row the cursor is in (the step) */
	let cursorGridRow = 0

	let isCursorInGrid = false;

	let cameraControllerPos = vec2(width() - 25, 25)

	const keysAndMoves = {}
	Object.values(GameSave.preferences.gameControls).forEach((keyForMove) => {
		keysAndMoves[keyForMove.kbKey] = keyForMove.move
	})

	const propsText = add([
		text("Time in song: ", { align: "left" }),
		pos(0, 0),
		anchor("topleft"),
		fixed(),
	])

	const cameraController = add([ opacity() ])
	let movingCamera = false
	cameraController.onUpdate(() => {
		if (isMousePressed("left") && mousePos().x >= width() - 50 && movingCamera == false) {
			movingCamera = true
			if (!ChartState.paused) ChartState.paused = true
		}

		else if (isMouseReleased("left") && movingCamera == true) {
			movingCamera = false
		}

		if (ChartState.paused) cameraController.opacity = 0.5
		else cameraController.opacity = 0.4

		if (movingCamera) {
			cameraControllerPos.y = mousePos().y
			cameraControllerPos.y = clamp(cameraControllerPos.y, 25, height() - 25)
			ChartState.scrollStep = mapc(cameraControllerPos.y, 25, height() - 25, 0, ChartState.conductor.totalSteps)
			ChartState.scrollStep = Math.round(ChartState.scrollStep)
		}

		else {
			cameraControllerPos.y = mapc(ChartState.scrollStep, 0, ChartState.conductor.totalSteps, 25, height() - 25)
		}
	})

	function addNoteToChart(time: number, move: Move) {
		const noteWithSameTimeButDifferentMove = ChartState.song.notes.find(note => note.hitTime == time && note.dancerMove != move || note.hitTime == time && note.dancerMove == move)
		// if there's a note already at that time but a different move, remove it
		if (noteWithSameTimeButDifferentMove) {
			removeNoteFromChart(noteWithSameTimeButDifferentMove.hitTime, noteWithSameTimeButDifferentMove.dancerMove)
		}
		
		ChartState.song.notes.push({
			hitTime: time,
			dancerMove: move,
		})

		playSound("plap", { detune: moveToDetune(move) })
	}
	
	function removeNoteFromChart(time: number, move: Move) {
		ChartState.song.notes = ChartState.song.notes.filter(note => {
			return note.hitTime != time || note.dancerMove != move
		})

		playSound("plop", { detune: moveToDetune(move) })
	}

	onUpdate(() => {
		ChartState.conductor.paused = ChartState.paused;
		scrollStepToTime = stepToTime(ChartState.scrollStep, ChartState.conductor.stepInterval)
		ChartState.scrollStep = clamp(ChartState.scrollStep, 0, ChartState.conductor.totalSteps)

		if (!ChartState.paused) {
			ChartState.scrollStep = ChartState.conductor.currentStep
		}

		gameCursor.color = utils.blendColors(WHITE, moveToColor(currentMove), 0.5)

		const scrollStepsToTime = utils.formatTime(scrollStepToTime)
		const formattedTime = utils.formatTime(ChartState.conductor.timeInSeconds)

		const allProps = {
			"Time": ChartState.paused ? scrollStepsToTime : formattedTime,
			"Beat": Math.floor(scrollStepToTime / ChartState.conductor.beatInterval),
			"scrollStep": ChartState.scrollStep
		}

		propsText.text = Object.entries(allProps).map(([key, value]) => `${key}: ${value}`).join("\n")

		if (isKeyDown("control") && isKeyPressed("s")) {
			downloadJSON(`${params.song.idTitle}-chart.json`, ChartState.song)
		}

		Object.keys(keysAndMoves).forEach((kbKey) => {
			if (isKeyDown(kbKey as Key)) {
				currentMove = keysAndMoves[kbKey]
			}
		})
	
		cursorGridPos = Math.floor(mousePos().y / SQUARE_SIZE.y) * SQUARE_SIZE.y + SQUARE_SIZE.y / 2 
		cursorGridRow = Math.floor(cursorGridPos / SQUARE_SIZE.y) - 0.5
	})

	/** Width and height of every square */
	const SQUARE_SIZE = vec2(50, 50)
	/** The initial pos of the first square */
	const INITIAL_POS = vec2(center().x, SQUARE_SIZE.y + SQUARE_SIZE.y / 2)

	/** The main event, draws everything so i don't have to use objects */
	onDraw(() => {
		// draws as many squares as steps in the song
		for (let i = 0; i < ChartState.conductor.totalSteps; i++) {
			const newPos = utils.getPosInGrid(INITIAL_POS, i, 0, SQUARE_SIZE)
			newPos.y -= 50 * ChartState.scrollStep

			const baseColor = WHITE.darken(100)
			const lighter = baseColor.darken(10)
			const darker = baseColor.darken(50)
			const col = i % 2 == 0 ? lighter : darker

			// draws the background chess board squares etc
			drawRect({
				width: SQUARE_SIZE.x,
				height: SQUARE_SIZE.y,
				color: col,
				pos: vec2(newPos.x, newPos.y),
				anchor: "center",
			})
			
			// draws a line on every beat
			if (i % ChartState.conductor.stepsPerBeat == 0) {
				drawRect({
					width: SQUARE_SIZE.x,
					height: 5,
					color: BLACK.lighten(20),
					anchor: "center",
					pos: vec2(newPos.x, newPos.y - SQUARE_SIZE.y / 2 - 2.5),
				})
			}
		}

		ChartState.song.notes.forEach((note) => {
			const notePos = utils.getPosInGrid(INITIAL_POS, timeToStep(note.hitTime, ChartState.conductor.stepInterval), 0, SQUARE_SIZE)
			notePos.y -= 50 * ChartState.scrollStep

			drawSprite({
				width: SQUARE_SIZE.x,
				height: SQUARE_SIZE.y,
				sprite: GameSave.preferences.noteskin + note.dancerMove,
				pos: notePos,
				opacity: scrollStepToTime >= note.hitTime ? 1 : 0.5,
				anchor: "center",
			})
		})

		// # strumlineline
		const STRUMLINE_Y = 50
		drawLine({
			p1: vec2(center().x - SQUARE_SIZE.x / 2 * 3, STRUMLINE_Y),
			p2: vec2(center().x + SQUARE_SIZE.x / 2 * 3, STRUMLINE_Y),
			color: RED,
			width: 5,
			fixed: true,
		})

		// if the distance between the cursor and the square is small enough then highlight it
		if (mousePos().x <= center().x + SQUARE_SIZE.x / 2 && mousePos().x >= center().x - SQUARE_SIZE.x / 2) {
			
			if (ChartState.scrollStep == 0 && mousePos().y >= STRUMLINE_Y) isCursorInGrid = true
			else if (ChartState.scrollStep == ChartState.conductor.totalSteps && mousePos().y <= STRUMLINE_Y) isCursorInGrid = true
			else isCursorInGrid = true
		}
		
		else isCursorInGrid = false

		if (isCursorInGrid) {
			// cursor = the square you're hovering over
			drawRect({
				width: SQUARE_SIZE.x - 5,
				height: SQUARE_SIZE.y - 5,
				color: WHITE,
				fill: false,
				outline: {
					width: 8, color: moveToColor(currentMove).darken(50)
				},
				pos: vec2(center().x, cursorGridPos),
				anchor: "center",
				fixed: true,
			})
		}

		// draws the camera controller
		drawRect({
			width: SQUARE_SIZE.x,
			height: SQUARE_SIZE.y,
			anchor: "center",
			opacity: cameraController.opacity,
			pos: cameraControllerPos,
			color: YELLOW,
		})

		// draws the notes on the side of the camera controller
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
	})

	onClick(() => {
		if (!isCursorInGrid) return
		const time = stepToTime(ChartState.scrollStep + cursorGridRow, ChartState.conductor.stepInterval)

		// /** Finds a note with the same step as the current step */
		function findNoteByStep() {
			return ChartState.song.notes.find((note) => timeToStep(note.hitTime, ChartState.conductor.stepInterval) == timeToStep(time, ChartState.conductor.stepInterval))
		}
		
		const note = findNoteByStep()
		if (note) {
			removeNoteFromChart(note.hitTime, note.dancerMove)
		}

		else {
			addNoteToChart(time, currentMove)
		}
	})

	onKeyPress("space", () => {
		ChartState.paused = !ChartState.paused

		if (ChartState.paused == false) {
			let newTime = ChartState.scrollStep * ChartState.conductor.stepInterval
			if (newTime == 0) newTime = 0.01
			ChartState.conductor.audioPlay.seek(newTime)
		}
	})

	onScroll((delta) => {
		let scrollPlus = 1
		if (!ChartState.paused) ChartState.paused = true
		if (delta.y >= 1) scrollPlus = 1
		else scrollPlus = -1
		
		ChartState.scrollStep += scrollPlus
	})

	onKeyPress("enter", () => {
		transitionToScene(fadeOut, "game", { song: ChartState.song, seekTime: scrollStepToTime } as GameSceneParams)
	})

	onKeyPress("f2", () => {
		debug.inspect = !debug.inspect
	})

	onStepHit(() => {
		const someNote = ChartState.song.notes.find((note) => timeToStep(note.hitTime, ChartState.conductor.stepInterval) == timeToStep(ChartState.conductor.timeInSeconds, ChartState.conductor.stepInterval)) 
		if (someNote) {
			playSound("ClickUp", { detune: moveToDetune(someNote.dancerMove) })
		}
	})
})}
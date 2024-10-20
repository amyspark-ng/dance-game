import { Key } from "kaplay"
import { onStepHit } from "../game/events"
import { ChartNote, moveToColor } from "../play/objects/note"
import { SongChart } from "../play/song"
import { cam } from "../plugins/features/camera"
import { playSound } from "../plugins/features/sound"
import { utils } from "../utils"
import { transitionToScene } from "../game/scenes"
import { fadeOut } from "../game/transitions/fadeOutTransition"
import { GameSceneParams, GameState } from "../play/gamescene"
import { Conductor } from "../play/conductor"
import { GameSave } from "../game/gamesave"
import { Move } from "../play/objects/dancer"
import { INPUT_THRESHOLD } from "../play/input"

const CAM_Y_INITIAL = 88

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

/** Converts the cam.y pos to time */
function camPosToTime(camPosY: number, lengthOfStep: number) {
	return stepToTime(camPosY / 50, lengthOfStep)
}

export function snapToGrid(num: number, SQUARE_SIZE = 50) {
	return Math.floor(num / SQUARE_SIZE) * SQUARE_SIZE + SQUARE_SIZE * 0.5
}

export class ChartStateClass {
	song: SongChart;
	paused: boolean;
	conductor: Conductor;
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
	/** The time according to the camera */
	let viewedTime = 0
	/** When you hold down a key, the cursor will change color to signify the move */
	let currentMove:Move = "up"
	/** The Y pos of the cursor (in grid) */
	let cursorYGridPos = 0
	let isCursorInGrid = false;

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
		viewedTime = camPosToTime(cam.pos.y, ChartState.conductor.stepInterval)

		const allProps = {
			"Time": utils.formatTime(viewedTime),
			"Step": timeToStep(viewedTime, ChartState.conductor.stepInterval),
			"Beat": Math.floor(viewedTime / ChartState.conductor.beatInterval),
			"camPos": cam.pos.y
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
	
		cursorYGridPos = Math.floor(mousePos().y / SQUARE_SIZE.y) * SQUARE_SIZE.y + SQUARE_SIZE.y * 0.5 
	})

	/** The initial pos of the first square */
	const INITIAL_POS = vec2(center().x, 25)
	/** Width and height of every square */
	const SQUARE_SIZE = vec2(50, 50)

	/** The main event, draws everything so i don't have to use objects */
	onDraw(() => {
		// draws as many squares as steps in the song
		for (let i = 0; i < ChartState.conductor.totalSteps; i++) {
			const newPos = utils.getPosInGrid(INITIAL_POS, i, 0, SQUARE_SIZE)

			const baseColor = WHITE.darken(100)
			const col = i % 2 == 0 ? baseColor.darken(10) : baseColor.darken(50)

			// draws the background rect
			drawRect({
				width: SQUARE_SIZE.x,
				height: SQUARE_SIZE.y,
				color: col,
				pos: newPos,
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
			
			// thank you u/LambentLight
			const rad = (SQUARE_SIZE.y / 2) + ((SQUARE_SIZE.x) / (8 * SQUARE_SIZE.y)) 

			drawCircle({
				radius: rad - 2,
				color: moveToColor(note.dancerMove),
				pos: notePos,
				opacity: viewedTime >= note.hitTime ? 1 : 0.5,
				anchor: "center",
			})
		})

		// # strumline
		const STRUMLINE_Y = 250
		drawLine({
			p1: vec2(center().x - SQUARE_SIZE.x / 2 * 3, STRUMLINE_Y),
			p2: vec2(center().x + SQUARE_SIZE.x / 2 * 3, STRUMLINE_Y),
			color: RED,
			width: 5,
			fixed: true,
		})

		// if the distance between the cursor and the square is small enough then highlight it
		if (mousePos().x <= center().x + SQUARE_SIZE.x / 2 && mousePos().x >= center().x - SQUARE_SIZE.x / 2) {
			isCursorInGrid = true
			// cursor = the square you're hovering over
			drawRect({
				width: SQUARE_SIZE.x - 5,
				height: SQUARE_SIZE.y - 5,
				color: WHITE,
				fill: false,
				outline: {
					width: 8, color: moveToColor(currentMove).darken(50)
				},
				pos: vec2(center().x, cursorYGridPos),
				anchor: "center",
				fixed: true,
			})
		}

		else isCursorInGrid = false
	})

	onClick(() => {
		if (!isCursorInGrid) return
		// the reason why this doesn't work is because mouse y pos can only be from 0 to height()
		// meanwhile cam.pos.y can be a number between 0 and 50 * totalSteps, which can even reach like 20 thousand
		// so how do i convert mouse y pos to time
		
		// LOL i found a funny solution i should probably fix
		// when i did camPosToTime(cursorYGridPos + cam.pos.y) i noticed  the it was always 6 steps below the intended one
		// so i just substract 300px to the pos (the equivalent of 6 steps) and it works!!!! LOLLLL
		const time = camPosToTime(cursorYGridPos + cam.pos.y - SQUARE_SIZE.y * 6, ChartState.conductor.stepInterval)
		
		if (ChartState.song.notes.some((note) => note.hitTime == time)) {
			removeNoteFromChart(time, currentMove)
		}
	
		else {
			addNoteToChart(time, currentMove)
		}
	})

	onKeyPress("space", () => {
		ChartState.paused = !ChartState.paused
		ChartState.conductor.audioPlay.seek(camPosToTime(cam.pos.y, ChartState.conductor.stepInterval))
	})

	let scroll = 0
	onScroll((delta) => {
		if (!ChartState.paused) ChartState.paused = true
		if (delta.y >= 1) scroll = 50
		else scroll = -50
		
		cam.pos.y = clamp(cam.pos.y, 88, 50 * ChartState.conductor.totalSteps)
		cam.pos.y += scroll
	})

	onKeyPress("enter", () => {
		transitionToScene(fadeOut, "game", { song: ChartState.song, seekTime: viewedTime } as GameSceneParams)
	})

	onStepHit(() => {
		cam.pos.y += 50
	
		const someNote = ChartState.song.notes.find((note) => timeToStep(note.hitTime, ChartState.conductor.stepInterval) == timeToStep(ChartState.conductor.timeInSeconds, ChartState.conductor.stepInterval)) 
		if (someNote) {
			playSound("ClickUp", { detune: moveToDetune(someNote.dancerMove) })
		}
	})

	onSceneLeave(() => {
		cam.pos.y = center().y
	})
})}
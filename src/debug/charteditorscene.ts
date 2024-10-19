import { Key } from "kaplay"
import { onStepHit } from "../game/events"
import { moveToColor } from "../play/objects/note"
import { SongChart } from "../play/song"
import { cam } from "../plugins/features/camera"
import { playSound } from "../plugins/features/sound"
import { utils } from "../utils"
import { transitionToScene } from "../game/scenes"
import { fadeOut } from "../game/transitions/fadeOutTransition"
import { GameSceneParams } from "../play/gamescene"
import { Conductor } from "../play/conductor"

export type chartEditorParams = {
	song: SongChart,
	playbackSpeed: number,
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

export class ChartStateClass {
	song: SongChart;
	paused: boolean;
	conductor: Conductor;
}

export function ChartEditor() { scene("charteditor", (params: chartEditorParams) => {
	const purple = utils.blendColors(RED, BLUE, 0.65)
	setBackground(purple.darken(70))
	
	// had an issue with BPM being NaN but it was because since this wasn't defined then it was NaN
	params.playbackSpeed = params.playbackSpeed ?? 1

	const ChartState = new ChartStateClass()

	const audioPlay = playSound(`${params.song.title}-song`, { volume: 0.1, speed: params.playbackSpeed })
	const conductor = new Conductor({ audioPlay: audioPlay, bpm: params.song.bpm * params.playbackSpeed, timeSignature: params.song.timeSignature })
	ChartState.conductor = conductor;
	ChartState.conductor.setup()

	// IMPORTANT
	ChartState.paused = true
	ChartState.song = params.song;
	/** The time according to the camera */
	let viewedTime = 0

	const timeText = add([
		text("Time in song: ", { align: "left" }),
		pos(0, 50),
		anchor("left"),
		fixed(),
	])

	onUpdate(() => {
		ChartState.conductor.paused = ChartState.paused;
		viewedTime = camPosToTime(cam.pos.y, ChartState.conductor.lengthOfStep)
		timeText.text = utils.formatTime(viewedTime) + "\n" + `Current step: ${ChartState.conductor.currentStep}`
	
		if (isKeyDown("control") && isKeyPressed("s")) {
			downloadJSON(`${params.song.idTitle}-chart.json`, ChartState.song)
		}
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

			drawRect({
				width: SQUARE_SIZE.x,
				height: SQUARE_SIZE.y,
				color: col,
				pos: newPos,
				anchor: "center",
			})
		}

		ChartState.song.notes.forEach((note) => {
			const notePos = utils.getPosInGrid(INITIAL_POS, timeToStep(note.hitTime, ChartState.conductor.lengthOfStep), 0, SQUARE_SIZE)
			
			drawRect({
				width: SQUARE_SIZE.x - 5,
				height: SQUARE_SIZE.y - 5,
				color: moveToColor(note.dancerMove),
				pos: notePos,
				opacity: viewedTime >= note.hitTime ? 1 : 0.5,
				anchor: "center",
			})
		})

		// if the mouse pos is close to any square then highlight it
		// convert mouse pos to step
		// here i do the stuff to place notes
	})

	const keysAndMoves = {
		"1": "left",
		"2": "down",
		"3": "up",
		"4": "right"
	}

	Object.keys(keysAndMoves).forEach((key) => {
		onKeyPress(key as Key, () => {
			if (ChartState.song.notes.some((note) => note.hitTime == viewedTime)) {
				utils.removeFromArr(ChartState.song.notes.find((note) => note.hitTime == viewedTime), ChartState.song.notes)
			}

			else {
				ChartState.song.notes.push({
					hitTime: viewedTime,
					dancerMove: keysAndMoves[key],
				})
			}
		})
	})

	onKeyPress("space", () => {
		ChartState.paused = !ChartState.paused
		ChartState.conductor.audioPlay.seek(camPosToTime(cam.pos.y, ChartState.conductor.lengthOfStep))
	})

	let scroll = 0
	onScroll((delta) => {
		if (delta.y >= 1) scroll = 50
		else scroll = -50
		cam.pos.y = clamp(cam.pos.y, 288, 50 * ChartState.conductor.totalSteps)
		cam.pos.y += scroll
		if (!ChartState.paused) ChartState.paused = true
	})

	onKeyPress("enter", () => {
		transitionToScene(fadeOut, "game", { song: ChartState.song, seekTime: viewedTime } as GameSceneParams)
	})

	onStepHit(() => {
		cam.pos.y += 50
	})

	onSceneLeave(() => {
		cam.pos.y = center().y
	})
})}
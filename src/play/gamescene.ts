import { addDancer } from "./objects/dancer"
import { GameState } from "../game/gamestate"
import { playSound } from "../plugins/features/sound"
import { onBeatHit } from "../game/events"
import { checkForNote, setupInput } from "./input"
import { Conductor, setupConductor } from "./conductor"
import { addStrumline } from "./objects/strumline"
import { addNote, notesSpawner } from "./objects/note"
import { songCharts } from "../game/loader"
import { SongChart } from "./song"
import { goScene } from "../game/scenes"
import { resultsSceneParams } from "../ui/resultsscene"
import { unwatchVar, watchVar } from "../plugins/features/watcher"
import { cam } from "../plugins/features/camera"

export type GameSceneParams = {
	song: SongChart,
	/** The name of the dancer, i haven't done this yet so it will stay as optional */
	dancer?: string,
}

export function GameScene() { scene("game", (params: GameSceneParams) => {
	setBackground(RED.lighten(60))

	// ==== PLAYS THE AUDIO AND SETS UP THE CONDUCTOR ===
	const audioPlay = playSound(`${params.song.title}-song`, { channel: { volume: 0.1, muted: false } })
	const conductor = new Conductor({ audioPlay: audioPlay, bpm: params.song.bpm, timeSignature: params.song.timeSignature })
	setupConductor(conductor)
	GameState.currentSong = songCharts[params.song.idTitle]
	GameState.spawnedNotes = []

	// ==== SETS UP SOME IMPORTANT STUFF ====
	setupInput();
	addStrumline();
	notesSpawner();
	
	GameState.gameInputEnabled = true

	// ==== DANCER + UI =====
	const DANCER_POS = vec2(518, 377)
	const DANCER_SCALE = vec2(0.5) // placeholder
	const dancer = addDancer(DANCER_SCALE)
	dancer.pos = DANCER_POS

	onDraw(() => {
		if (GameState.paused) {
			drawRect({
				width: width(),
				height: height(),
				color: BLACK,
				opacity: 0.5,
				anchor: "center",
				pos: center(),
			})

			drawText({
				text: "PAUSED",
				anchor: "center",
				pos: center()
			})
		}
	})

	onHide(() => {
		GameState.managePause(true)
	})

	onBeatHit(() => {
		if (dancer.getMove() == "idle") {
			dancer.moveBop()
		}
	})

	// END SONG
	GameState.conductor.audioPlay.onEnd(() => {
		goScene("results", null, {
			dancer: params.dancer,
			songChart: params.song,
			tally: GameState.tally,
		} as resultsSceneParams)
	})

	onKeyPress("f2", () => {
		debug.inspect = !debug.inspect
	})

	// ==== debug ====
	GameState.managePause()

	onUpdate(() => {
		// debug.log(checkForNote())
		// cam.zoom = vec2(0.5)
	})
})}
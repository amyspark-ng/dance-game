import { addDancer } from "./objects/dancer"
import { GameState } from "../game/gamestate"
import { playSound } from "../plugins/features/sound"
import { onBeatHit } from "../game/events"
import { setupInput } from "./input"
import { Conductor, setupConductor } from "./conductor"
import { addStrumline } from "./objects/strumline"
import { addNote, notesSpawner } from "./objects/note"
import { songCharts } from "../game/loader"
import { SongChart } from "./objects/song"
import { goScene } from "../game/scenes"
import { resultsSceneParams } from "../ui/resultsscene"
import { unwatchVar, watchVar } from "../plugins/features/watcher"

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

	// ==== DANCER + UI =====
	const DANCER_POS = vec2(518, 377)
	const DANCER_SCALE = vec2(0.5) // placeholder
	const dancer = addDancer(DANCER_SCALE)
	dancer.pos = DANCER_POS

	dancer.onUpdate(() => {
		dancer.pos = mousePos()
	})

	onBeatHit(() => {
		if (dancer.getMove() == "idle") {
			dancer.moveBop()
		}

		addNote(choose(["down", "up", "left", "right"]), GameState.conductor.timeInSeconds)
	})

	watchVar(dancer, "pos", "astri.position")

	// ==== SETS UP SOME IMPORTANT STUFF ====
	setupInput();
	addStrumline();
	notesSpawner();
	
	GameState.gameInputEnabled = true

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
})}
import { addDancer } from "./objects/dancer"
import { GameState } from "../game/gamestate"
import { playSound } from "../plugins/features/sound"
import { onBeatHit } from "../game/events"
import { setupInput } from "./input"
import { Conductor, setupConductor } from "./conductor"
import { addStrumline } from "./objects/strumline"
import { notesSpawner } from "./objects/note"
import { songCharts } from "../game/loader"
import { SongChart } from "./song"
import { goScene } from "../game/scenes"
import { resultsSceneParams } from "../ui/resultsscene"

export type GameSceneParams = {
	song: SongChart,
	/** The name of the dancer, i haven't done this yet so it will stay as optional */
	dancer?: string,
}

export function startSong(params: GameSceneParams) {
	// ==== PLAYS THE AUDIO AND SETS UP THE CONDUCTOR ===
	GameState.conductor?.audioPlay?.stop()
	GameState.conductor = null;
	GameState.health = 100

	const audioPlay = playSound(`${params.song.title}-song`, { volume: 0.1 })
	const conductor = new Conductor({ audioPlay: audioPlay, bpm: params.song.bpm, timeSignature: params.song.timeSignature })
	setupConductor(conductor)

	GameState.currentSong = songCharts[params.song.idTitle]
	GameState.spawnedNotes = []
}

export function GameScene() { scene("game", (params: GameSceneParams) => {
	setBackground(RED.lighten(60))
	
	startSong(params)
	
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
		goScene("results", {} as resultsSceneParams)
	})

	onKeyPress("f2", () => {
		debug.inspect = !debug.inspect
	})

	// ==== debug ====
	// GameState.managePause()

	let keysForDebugging = {}

	const textin = add([
		text(""),
		pos(),
		color(BLACK),
	]);

	onUpdate(() => {
		function createKeys() {
			let text = Object.keys(keysForDebugging).map((key) => `${key}: ${keysForDebugging[key]}`).join("\n")
			return text
		}
	
		keysForDebugging["timeInSeconds"] = GameState.conductor.timeInSeconds.toFixed(3);
		keysForDebugging["currentBeat"] = GameState.conductor.currentBeat;
		keysForDebugging["health"] = GameState.health;
		textin.text = createKeys()
	})
})}
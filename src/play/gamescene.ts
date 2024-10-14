import { addDancer } from "./objects/dancer"
import { GameState } from "../game/gamestate"
import { playSound } from "../plugins/features/sound"
import { onBeatHit } from "../game/events"
import { setupInput } from "./input"
import { Conductor, setupConductor } from "./conductor"
import { addStrumline } from "./objects/strumline"
import { addNote, notesSpawner } from "./objects/note"
import { songCharts } from "../game/loader"

export function GameScene() { scene("game", () => {
	setBackground(RED.lighten(60))

	// ==== PLAYS THE AUDIO AND SETS UP THE CONDUCTOR ===
	const audioPlay = playSound("bopeebo-song", { channel: { volume: 0.1, muted: false } })
	const conductor = new Conductor({ audioPlay: audioPlay, bpm: 100, timeSignature: [4, 4] })
	setupConductor(conductor)
	GameState.currentSong = songCharts["bopeebo"]
	GameState.spawnedNotes = []

	// ==== DANCER + UI =====
	const DANCER_POS = vec2(518, 377)
	const DANCER_SCALE = vec2(0.5) // placeholder
	const dancer = addDancer(DANCER_SCALE)
	dancer.pos = DANCER_POS

	onBeatHit(() => {
		if (dancer.getMove() == "idle") {
			dancer.moveBop()
		}

		addNote(choose(["down", "up", "left", "right"]), GameState.conductor.timeInSeconds)
	})

	// ==== SETS UP SOME IMPORTANT STUFF ====
	setupInput();
	addStrumline();
	notesSpawner();
	
	GameState.gameInputEnabled = true

	// ==== debug ====
	GameState.managePause()
})}
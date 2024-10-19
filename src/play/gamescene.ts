import { addDancer, getDancer } from "./objects/dancer"
import { playSound } from "../plugins/features/sound"
import { onBeatHit, onMiss, onNoteHit, triggerEvent } from "../game/events"
import { getNotesOnScreen, setupInput } from "./input"
import { Conductor } from "./conductor"
import { addStrumline } from "./objects/strumline"
import { ChartNote, notesSpawner, setTimeForStrum, TIME_FOR_STRUM } from "./objects/note"
import { songCharts } from "../game/loader"
import { SongChart, Tally } from "./song"
import { goScene } from "../game/scenes"
import { resultsSceneParams } from "../ui/resultsscene"
import { addJudgement, getJudgement, getScorePerDiff } from "./objects/judgement"
import { onPause, onUnpause } from "./pausescreen"
import { cam } from "../plugins/features/camera"

export class GameStateClass {
	/** The current conductor */
	conductor: Conductor = null;

	/** Holds the current song chart */
	currentSong: SongChart = new SongChart();
	
	/** Holds the current tallies for the song */
	tally: Tally = new Tally();

	/** Holds all the notes that have been spawned */
	spawnedNotes: ChartNote[] = [];

	/** Current player health */
	health: number = 100;

	/** Dictates wheter the game is paused or not, please do not touch if not through the manage pause function */
	private _paused: boolean;
	
	/** Wheter the game is currently paused or not */
	get paused() {
		return this._paused;
	}

	/** Will set the pause to true or false, if a parameter isn't passed it will be toggled */
	managePause(newPause?:boolean) {
		newPause = newPause ?? !this.paused

		this._paused = newPause;
		this.conductor.paused = this._paused
		
		if (newPause) onPause()
		else onUnpause()
	};

	/** Wheter the player can press keys to play */
	gameInputEnabled: boolean = false
}

export type GameSceneParams = {
	song: SongChart,
	/** The name of the dancer, i haven't done this yet so it will stay as optional */
	dancer?: string,
	/** How fast to make the song :smiling_imp: */
	playbackSpeed?: number,

	/** If the song should start at a specific second */
	seekTime?: number,
}

/** Instance of the game scene */
export let GameState = new GameStateClass()

export function startSong(params: GameSceneParams) {
	// ==== PLAYS THE AUDIO AND SETS UP THE CONDUCTOR ===
	// Reset stuff related to gamestate
	GameState.conductor?.audioPlay?.stop()
	GameState.conductor = null;
	GameState.health = 100
	GameState.spawnedNotes = []
	GameState.tally = new Tally();
	GameState.currentSong = songCharts[params.song.idTitle]
	
	params.seekTime = params.seekTime ?? 0

	// now that we have the song we can get the scroll speed multiplier and set the playback speed for funzies
	params.playbackSpeed = params.playbackSpeed ?? 1;
	const speed = GameState.currentSong.speedMultiplier * params.playbackSpeed
	setTimeForStrum(TIME_FOR_STRUM / speed)
	
	// then we actually setup the conductor and play the song
	const audioPlay = playSound(`${params.song.title}-song`, { volume: 0.1, speed: params.playbackSpeed })
	const conductor = new Conductor({ audioPlay: audioPlay, bpm: params.song.bpm * params.playbackSpeed, timeSignature: params.song.timeSignature })
	conductor.setup();
	GameState.conductor = conductor;
	if (getDancer()) getDancer().doMove("idle")

	// all notes that should have already been spawned
	GameState.currentSong.notes.forEach((note) => {
		if (note.hitTime < params.seekTime) GameState.spawnedNotes.push(note)
	})

	GameState.conductor.audioPlay.seek(params.seekTime)
}

export function resetSong() {
	if (GameState.paused) GameState.managePause(false)

	getNotesOnScreen().forEach((noteObj) => {
		noteObj.destroy()
	})

	triggerEvent("onReset")
	startSong({ song: GameState.currentSong })
}

export function GameScene() { scene("game", (params: GameSceneParams) => {
	setBackground(RED.lighten(60))
	GameState = new GameStateClass()

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
		if (!GameState.paused) {
			GameState.managePause(true)
		}
	})

	onBeatHit(() => {
		if (dancer.getMove() == "idle") {
			dancer.moveBop()
		}
	})

	onNoteHit((chartNote:ChartNote) => {
		let judgement = getJudgement(chartNote)
		
		if (judgement == "Miss") {
			triggerEvent("onMiss")
			return;
		}

		// the judgement isn't a miss
		addJudgement(judgement)
		getDancer().doMove(chartNote.dancerMove)
	
		GameState.tally[judgement.toLowerCase() + "s"] += 1
		GameState.tally.score += getScorePerDiff(chartNote)
	})

	onMiss(() => {
		GameState.tally.misses += 1
		getDancer().miss()
		playSound("missnote", { volume: 0.1 });
		addJudgement("Miss")
	})

	// END SONG
	GameState.conductor.audioPlay.onEnd(() => {
		goScene("results", {} as resultsSceneParams)
	})

	onKeyPress("f2", () => {
		debug.inspect = !debug.inspect
	})

	// ==== debug ====
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
		keysForDebugging["totalBeats"] = GameState.conductor.totalBeats;
		keysForDebugging["currentStep"] = GameState.conductor.currentStep;
		keysForDebugging["totalSteps"] = GameState.conductor.totalSteps;
		keysForDebugging["health"] = GameState.health;
		textin.text = createKeys()
	})

	onSceneLeave(() => {
		GameState.conductor.audioPlay.stop()
		GameState.conductor.paused = true;
	})
})}
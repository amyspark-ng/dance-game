import { addDancer, getDancer } from "./objects/dancer"
import { playSound } from "../plugins/features/sound"
import { onBeatHit, onMiss, onNoteHit, triggerEvent } from "../game/events"
import { getNotesOnScreen, manageInput } from "./input"
import { Conductor } from "./conductor"
import { addStrumline } from "./objects/strumline"
import { ChartNote, notesSpawner, setTimeForStrum, TIME_FOR_STRUM } from "./objects/note"
import { songCharts } from "../game/loader"
import { saveScore, SongChart, Tally } from "./song"
import { goScene } from "../game/scenes"
import { resultsSceneParams } from "../ui/resultsscene"
import { addComboText, addJudgement, getJudgement, getScorePerDiff } from "./objects/judgement"
import { onPause, onUnpause } from "./pausescreen"
import { DeathSceneParams } from "../ui/deathscene"
import { GameSave } from "../game/gamesave"
import { addUI } from "./objects/gameUi"
import { utils } from "../utils"
import { ChartStateClass } from "../debug/charteditorscene"

export class GameStateClass {
	/** The current conductor */
	conductor: Conductor = null;

	/** Holds the current song chart */
	song: SongChart = new SongChart();
	
	/** Holds the current tallies for the song */
	tally: Tally = new Tally();

	/** The current combo */
	combo: number = 0;

	/** The current combo */
	highestCombo: number = 0;

	/** Holds all the notes that have been spawned */
	spawnedNotes: ChartNote[] = [];

	/** Holds all the notes that have been hit */
	hitNotes: ChartNote[] = [];

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

	params: GameSceneParams = null;

	/** Wheter the player can press keys to play */
	gameInputEnabled: boolean = false
}

export type GameSceneParams = {
	song: SongChart,
	/** The name of the dancer */
	dancer: string,
	/** How fast to make the song :smiling_imp: */
	playbackSpeed?: number,

	/** If the song should start at a specific second */
	seekTime?: number,
}

export function setupSong(params: GameSceneParams, GameState:GameStateClass) {
	// ==== PLAYS THE AUDIO AND SETS UP THE CONDUCTOR ===
	// Reset stuff related to gamestate
	
	// now that we have the song we can get the scroll speed multiplier and set the playback speed for funzies
	params.playbackSpeed = params.playbackSpeed ?? 1;
	const speed = GameState.song.speedMultiplier * params.playbackSpeed
	setTimeForStrum(TIME_FOR_STRUM / speed)	
	params.seekTime = params.seekTime ?? 0
	GameState.params.seekTime = params.seekTime

	// then we actually setup the conductor and play the song
	GameState.conductor = new Conductor({
		audioPlay: playSound(`${params.song.idTitle}-song`, { volume: 0.1, speed: params.playbackSpeed }),
		bpm: params.song.bpm * params.playbackSpeed,
		timeSignature: GameState.song.timeSignature,
		offset: TIME_FOR_STRUM
	})

	GameState.song.notes.filter((note) => note.hitTime).forEach((passedNote) => {
		GameState.spawnedNotes.push(passedNote)
		GameState.hitNotes.push(passedNote)
	})

	GameState.conductor.audioPlay.seek(params.seekTime)
	if (getDancer()) getDancer().doMove("idle")
}

export function resetSong(GameState:GameStateClass) {
	if (GameState.paused) GameState.managePause(false)

	GameState.conductor.audioPlay.stop()

	GameState.health = 100
	GameState.spawnedNotes = []
	GameState.hitNotes = []
	GameState.tally = new Tally();
	GameState.combo = 0
	GameState.highestCombo = 0

	GameState.song.notes.forEach((note) => {
		if (note.hitTime < GameState.params.seekTime) {
			GameState.hitNotes.push(note)
			GameState.spawnedNotes.push(note)
		}
	})

	if (GameState.params.seekTime > 0) {
		GameState.conductor.audioPlay.seek(GameState.params.seekTime)
	}

	getNotesOnScreen().forEach((noteObj) => {
		noteObj.destroy()
	})

	triggerEvent("onReset")
}

export function GameScene() { scene("game", (params: GameSceneParams) => {
	setBackground(RED.lighten(60))

	const GameState = new GameStateClass()
	GameState.params = params;
	GameState.song = params.song;
	setupSong(params, GameState)

	// ==== SETS UP SOME IMPORTANT STUFF ====
	addStrumline(GameState);
	notesSpawner(GameState);

	GameState.gameInputEnabled = true

	// ==== DANCER + UI =====
	const DANCER_POS = vec2(518, 377)
	const DANCER_SCALE = vec2(0.5) // placeholder
	const dancer = addDancer(params.dancer)
	dancer.scale = DANCER_SCALE
	dancer.pos = DANCER_POS
	dancer.onUpdate(() => {
		if (dancer.waitForIdle) dancer.waitForIdle.paused = GameState.paused;
	})

	const ui = addUI()

	onUpdate(() => {
		manageInput(GameState);
		ui.missesText.text = `X | ${GameState.tally.misses}`;
		
		const time = GameState.conductor.timeInSeconds < 0 ? 0 : GameState.conductor.timeInSeconds
		ui.timeText.text = `${utils.formatTime(time)}`;
		
		ui.healthText.text = GameState.health.toString();
	
		ui.scoreText.text = GameState.tally.score.toString();
	})
	
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
		let judgement = getJudgement(GameState.conductor.timeInSeconds, chartNote)
		
		if (judgement == "Miss") {
			triggerEvent("onMiss")
			return;
		}

		// the judgement isn't a miss
		addJudgement(judgement)
		addComboText(GameState.combo)
		getDancer().doMove(chartNote.dancerMove)
	
		GameState.tally[judgement.toLowerCase() + "s"] += 1
		GameState.combo += 1
		if (GameState.combo > GameState.highestCombo) GameState.highestCombo = GameState.combo

		GameState.tally.score += getScorePerDiff(GameState.conductor.timeInSeconds, chartNote)
		GameState.hitNotes.push(chartNote)
		
		if (GameState.health < 100) GameState.health += 5
	})

	onMiss(() => {
		GameState.tally.misses += 1
		GameState.combo = 0
		GameState.health -= 5
		
		// if (getDancer().getCurAnim().name == "miss") {
			getDancer().miss()
			playSound("missnote", { volume: 0.1 });
			addJudgement("Miss")
			addComboText("break")
		// }

		if (GameState.health <= 0) goScene("death", { GameState: GameState } as DeathSceneParams)
	})

	// END SONG
	GameState.conductor.audioPlay.onEnd(() => {
		const songSaveScore = new saveScore()
		songSaveScore.idTitle = params.song.idTitle
		songSaveScore.tally = GameState.tally
		GameSave.songsPlayed.push(songSaveScore)
		goScene("results", { GameState: GameState } as resultsSceneParams)
	})

	onSceneLeave(() => {
		GameState.conductor.paused = true;
		GameState.conductor.audioPlay.stop()
	})
})}
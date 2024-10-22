// Handles the setup for the game scene and some other important stuff
import { Conductor } from "../conductor";
import { triggerEvent } from "../core/events";
import { GameSave } from "../core/gamesave";
import { playSound } from "../core/plugins/features/sound";
import { transitionToScene } from "../core/scenes";
import { fadeOut } from "../core/transitions/fadeOutTransition";
import { paramsChartEditor } from "./chartEditor/chartEditorBackend";
import { getDancer } from "./objects/dancer";
import { ChartNote, getNotesOnScreen, setTimeForStrum, TIME_FOR_STRUM } from "./objects/note";
import { Tally } from "./objects/scoring";
import { getStrumline } from "./objects/strumline";
import { SongChart } from "./song";
import { pauseGame, onUnpause as unPauseGame } from "./ui/pausescreen";

/** Class that holds and manages some important variables in the game scene */
export class StateGame {
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
		
		if (newPause) pauseGame()
		else unPauseGame()
	};

	params: paramsGameScene = null;

	/** Wheter the player can press keys to play */
	gameInputEnabled: boolean = false
}

export type paramsGameScene = {
	song: SongChart,
	/** The name of the dancer */
	dancer: string,
	/** How fast to make the song :smiling_imp: */
	playbackSpeed?: number,

	/** If the song should start at a specific second */
	seekTime?: number,
}

export function setupSong(params: paramsGameScene, GameState:StateGame) {
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

export function resetSong(GameState:StateGame) {
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

/** The function that manages input functions inside the game, must be called onUpdate */
export function manageInput(GameState: StateGame) {
	Object.values(GameSave.preferences.gameControls).forEach((gameKey) => {
		if (GameState.paused) return

		if (isKeyPressed(gameKey.kbKey)) {
			// bust a move
			getStrumline().press(gameKey.move)
		}

		else if (isKeyReleased(gameKey.kbKey)) {
			getStrumline().release()
		}
	});

	if (!GameState.gameInputEnabled) return
	if (isKeyPressed(GameSave.preferences.controls.pause)) {
		GameState.managePause();
	}

	else if (isKeyPressed(GameSave.preferences.controls.reset)) {
		resetSong(GameState)
	}

	else if (isKeyPressed(GameSave.preferences.controls.debug)) {
		transitionToScene(fadeOut, "charteditor", { song: GameState.song, seekTime: GameState.conductor.timeInSeconds, dancer: GameState.params.dancer } as paramsChartEditor)
	}
}

// TIMINGS
export const INPUT_THRESHOLD = 0.16
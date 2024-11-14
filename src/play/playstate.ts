// Handles the setup for the game scene and some other important stuff
import { Conductor } from "../conductor";
import { triggerEvent } from "../core/events";
import { GameSave } from "../core/gamesave";
import { PRODUCT } from "../core/initGame";
import { playSound } from "../core/plugins/features/sound";
import { goScene, transitionToScene } from "../core/scenes";
import { fadeOut } from "../core/transitions/fadeOutTransition";
import { paramsSongSelect } from "../ui/songselectscene";
import { paramsChartEditor } from "./chartEditor/chartEditorBackend";
import { getDancer } from "./objects/dancer";
import { ChartNote, getNotesOnScreen, setTimeForStrum, TIME_FOR_STRUM } from "./objects/note";
import { Tally } from "./objects/scoring";
import { getStrumline } from "./objects/strumline";
import { SongContent } from "./song";
import { managePauseUI } from "./ui/pauseScreen";

/** Class that holds and manages some important variables in the game scene */
export class StateGame {
	/** The current conductor */
	conductor: Conductor = null;

	/** Holds the current song chart */
	song: SongContent = null;
	
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
		newPause = newPause ?? !this._paused

		this._paused = newPause;
		this.conductor.paused = this._paused

		managePauseUI(newPause, this)
	};

	params: paramsGameScene = null;

	/** Wheter the player can press keys to play */
	gameInputEnabled: boolean = true

	/** Wheter the player can press keys to pause */
	menuInputEnabled: boolean = true
}

export type paramsGameScene = {
	songZip: SongContent,
	/** The name of the dancer */
	dancer: string,
	/** How fast to make the song :smiling_imp: */
	playbackSpeed?: number,

	/** If the song should start at a specific second */
	seekTime?: number,

	/** Wheter the player is coming from the chart editor or from regular gameplay */
	fromChartEditor: boolean,
}

export function setupSong(params: paramsGameScene, GameState:StateGame) {
	// ==== PLAYS THE AUDIO AND SETS UP THE CONDUCTOR ===
	// Reset stuff related to gamestate
	
	// now that we have the song we can get the scroll speed multiplier and set the playback speed for funzies
	params.playbackSpeed = params.playbackSpeed ?? 1;
	
	const speed = (GameState.song.manifest.initial_scrollspeed * GameSave.scrollSpeed)

	// Set it back to the original value
	setTimeForStrum(1.25)
	setTimeForStrum(TIME_FOR_STRUM / speed)
	params.seekTime = params.seekTime ?? 0
	GameState.params.seekTime = params.seekTime

	const bpmEvents = [
		{ time: 125, bpm: 180 },
	]

	// then we actually setup the conductor and play the song
	GameState.conductor = new Conductor({
		audioPlay: playSound(`${params.songZip.manifest.uuid_DONT_CHANGE}-audio`, { volume: GameSave.sound.music.volume, speed: params.playbackSpeed }),
		bpm: params.songZip.manifest.initial_bpm * params.playbackSpeed,
		timeSignature: GameState.song.manifest.time_signature,
		offset: TIME_FOR_STRUM,
		bpmChanges: bpmEvents,
	})

	// there are the notes that have been spawned yet
	GameState.song.chart.notes.filter((note) => note.time <= params.seekTime).forEach((passedNote) => {
		GameState.spawnedNotes.push(passedNote)
		GameState.hitNotes.push(passedNote)
	})

	GameState.conductor.audioPlay.seek(params.seekTime)
	if (getDancer()) getDancer().doMove("idle")
}

export function restartSong(GameState:StateGame) {
	if (GameState.paused) GameState.managePause(false)

	GameState.conductor.audioPlay.stop()

	GameState.health = 100
	GameState.spawnedNotes = []
	GameState.hitNotes = []
	GameState.tally = new Tally();
	GameState.combo = 0
	GameState.highestCombo = 0

	GameState.song.chart.notes.forEach((note) => {
		if (note.time <= GameState.params.seekTime) {
			GameState.hitNotes.push(note)
			GameState.spawnedNotes.push(note)
		}
	})

	if (GameState.params.seekTime > 0) {
		GameState.conductor.audioPlay.seek(GameState.params.seekTime)
	}

	else {
		GameState.conductor.timeInSeconds = -TIME_FOR_STRUM
	}

	getNotesOnScreen().forEach((noteObj) => {
		noteObj.destroy()

		let rotationDirection = choose([-10, 10])
		const newdumbnote = add([
			sprite(GameSave.noteskin +  "_" + noteObj.chartNote.dancerMove),
			pos(noteObj.pos),
			anchor(noteObj.anchor),
			opacity(noteObj.opacity),
			z(noteObj.z),
			body(),
			area(),
			rotate(0),
			{
				update() {
					this.angle += rotationDirection
					if (this.pos.y >= height() + this.height) this.destroy()
				}
			}
		])

		newdumbnote.fadeOut(TIME_FOR_STRUM)
		newdumbnote.jump(rand(250, 500))
	})

	triggerEvent("onReset")
}

export function stopPlay(GameState:StateGame) {
	GameState.conductor.paused = true
	GameState.conductor.audioPlay.stop()
	GameState.menuInputEnabled = true
}

/** Function to exit to the song select menu from the gamescene */
export function exitToMenu(GameState:StateGame) {
	// let song = getSong(GameState.songZip.)
	// let index = song ? allSongCharts.indexOf(song) : 0
	// TODO: Find a way to comfortably get a song
	transitionToScene(fadeOut, "songselect", { index: 0 } as paramsSongSelect)
}

/** Function to exit to the song select menu from the gamescene */
export function exitToChartEditor(GameState:StateGame) {
	stopPlay(GameState)
	GameState.menuInputEnabled = false
	transitionToScene(fadeOut, "charteditor", { song: GameState.song, seekTime: GameState.conductor.timeInSeconds, dancer: GameState.params.dancer } as paramsChartEditor)
}

export function introGo() {
	playSound("introGo", { volume: 1 })
	const goText = add([
		pos(center()),
		text("GO!", { size: height() / 4 }),
		color(RED),
		rotate(rand(-20, 20)),
		anchor("center"),
		opacity(),
		z(1),
		timer(),
	])

	// goText.tween(goText.pos.y, height() + goText.height, TIME_FOR_STRUM / 2, (p) => goText.pos.y = p).onEnd(() => goText.destroy())
	goText.fadeIn(TIME_FOR_STRUM / 4).onEnd(() => {
		goText.fadeOut()
	})
}

/** The function that manages input functions inside the game, must be called onUpdate */
export function manageInput(GameState: StateGame) {
	Object.values(GameSave.gameControls).forEach((gameKey, index) => {
		if (GameState.paused) return

		const kbKey = gameKey.kbKey
		const defaultKey = Object.keys(GameSave.gameControls)[index]

		if (isKeyPressed(kbKey) || isKeyPressed(defaultKey)) {
			// bust a move
			getStrumline().press(gameKey.move)
		}

		else if (isKeyReleased(kbKey) || isKeyReleased(defaultKey)) {
			getStrumline().release()
		}
	});

	if (!GameState.menuInputEnabled) return

	if (isKeyPressed("escape")) {
		GameState.managePause();
	}

	else if (isKeyDown("shift") && isKeyDown("r")) {
		restartSong(GameState)
	}

	// if no game key is 7 then it will exit to the chart editor
	if (!Object.values(GameSave.gameControls).some((gameKey) => gameKey.kbKey == "7")) {
		if (isKeyPressed("7")) {
			exitToChartEditor(GameState)
		}
	}
}

// TIMINGS
export const INPUT_THRESHOLD = 0.16
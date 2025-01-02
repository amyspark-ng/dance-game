// Handles the setup for the game scene and some other important stuff
import { Conductor } from "../conductor";
import { triggerEvent } from "../core/events";
import { GameSave } from "../core/gamesave";
import { GAME } from "../core/initGame";
import { cam } from "../core/plugins/features/camera";
import { playSound } from "../core/plugins/features/sound";
import { transitionToScene } from "../core/scenes";
import { fadeOut } from "../core/transitions/fadeOutTransition";
import { paramsSongSelect } from "../ui/SongSelectScene";
import { paramsChartEditor } from "./chartEditor/chartEditorBackend";
import { createDancer, DancerGameObj, Move } from "./objects/dancer";
import { ChartNote, getNotesOnScreen, setTimeForStrum, TIME_FOR_STRUM } from "./objects/note";
import { Tally } from "./objects/scoring";
import { createStrumline, StrumlineGameObj } from "./objects/strumline";
import { ChartEvent, SongContent } from "./song";
import { addUI } from "./ui/gameUi";
import { addPauseUI } from "./ui/pauseScreen";

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

	/** All the events that are done */
	eventsDone: ChartEvent[] = [];

	/** Holds all the notes that have been hit */
	hitNotes: ChartNote[] = [];

	/** Current player health */
	health: number = 100;

	params: paramsGameScene = null;

	/** Wheter the player can press keys to play */
	gameInputEnabled: boolean = true;

	/** Wheter the player can press keys to pause */
	menuInputEnabled: boolean = true;

	/** The ui for the gameplay */
	gameUI: ReturnType<typeof addUI> = null;

	/** The ui for the pause screen */
	pauseUI: ReturnType<typeof addPauseUI> = null;

	/** The dancer in the gameplay */
	dancer: DancerGameObj = null;

	/** The strumline in the gameplay */
	strumline: StrumlineGameObj = null;

	/** Dictates wheter the game is paused or not, please do not touch if not through the manage pause function */
	private _paused: boolean = false;

	/** Wheter the game is currently paused or not */
	get paused() {
		return this._paused;
	}

	/** Will set the pause to true or false, if a parameter isn't passed it will be toggled */
	setPause(newPause: boolean) {
		newPause = newPause ?? !this._paused;

		this._paused = newPause;
		this.conductor.paused = this._paused;
		getTreeRoot().trigger("pauseChange", this._paused);
	}

	/** Add score to the tally (animates the ui too)
	 * @param amount The amount to add
	 */
	addScore(amount: number) {
		this.tally.score += amount;
		this.gameUI.scoreDiffText.value = amount;
		this.gameUI.scoreDiffText.opacity = 1;
		this.gameUI.scoreDiffText.bop({ startScale: vec2(1.1), endScale: vec2(1) });
	}

	/** Runs when the pause has changed */
	onPauseChange(action: () => void) {
		return getTreeRoot().on("pauseChange", action);
	}

	constructor(params: paramsGameScene) {
		params.playbackSpeed = params.playbackSpeed ?? 1;
		params.seekTime = params.seekTime ?? 0;
		params.dancer = params.dancer ?? "astri";
		params.songZip = params.songZip ?? null;

		this.params = params;
		this.song = this.params.songZip;

		// now that we have the song we can get the scroll speed multiplier and set the playback speed for funzies
		const speed = this.song.manifest.initial_scrollspeed * GameSave.scrollSpeed;
		setTimeForStrum(1.25);
		setTimeForStrum(TIME_FOR_STRUM / speed);

		// then we actually setup the conductor and play the song
		this.conductor = new Conductor({
			audioPlay: playSound(`${this.params.songZip.manifest.uuid_DONT_CHANGE}-audio`, {
				volume: GameSave.sound.music.volume,
				speed: this.params.playbackSpeed,
			}),
			BPM: this.params.songZip.manifest.initial_bpm * this.params.playbackSpeed,
			timeSignature: this.song.manifest.time_signature,
			offset: TIME_FOR_STRUM,
		});

		// adds the ui to the game
		this.strumline = createStrumline(this);
		this.dancer = createDancer(this.params.dancer);
		this.gameUI = addUI();
		this.pauseUI = addPauseUI(this);

		// there are the notes that have been spawned yet
		this.song.chart.notes.filter((note) => note.time <= this.params.seekTime).forEach((passedNote) => {
			this.spawnedNotes.push(passedNote);
			this.hitNotes.push(passedNote);
		});

		this.conductor.audioPlay.seek(this.params.seekTime);
		if (this.dancer) this.dancer.doMove("idle");
	}
}

export type paramsGameScene = {
	songZip: SongContent;
	/** The name of the dancer */
	dancer: string;
	/** How fast to make the song :smiling_imp: */
	playbackSpeed?: number;

	/** If the song should start at a specific second */
	seekTime?: number;

	/** Wheter the player is coming from the chart editor or from regular gameplay */
	fromChartEditor: boolean;
};

export function restartSong(GameState: StateGame) {
	if (GameState.paused) GameState.setPause(false);

	GameState.conductor.audioPlay.stop();

	GameState.health = 100;
	GameState.spawnedNotes = [];
	GameState.eventsDone = [];
	GameState.hitNotes = [];
	GameState.tally = new Tally();
	GameState.combo = 0;
	GameState.highestCombo = 0;

	GameState.song.chart.notes.forEach((note) => {
		if (note.time <= GameState.params.seekTime) {
			GameState.hitNotes.push(note);
			GameState.spawnedNotes.push(note);
		}
	});

	if (GameState.params.seekTime > 0) {
		GameState.conductor.audioPlay.seek(GameState.params.seekTime);
	}
	else {
		GameState.conductor.timeInSeconds = -TIME_FOR_STRUM;
	}

	tween(cam.pos, center(), 0.1, (p) => cam.pos = p, easings.easeOutExpo);
	tween(cam.zoom, vec2(1), 0.1, (p) => cam.zoom = p, easings.easeOutExpo);
	tween(cam.rotation, 0, 0.1, (p) => cam.rotation = p, easings.easeOutExpo);

	getNotesOnScreen().forEach((noteObj) => {
		noteObj.destroy();

		let rotationDirection = choose([-10, 10]);
		const newdumbnote = add([
			sprite(GameSave.noteskin + "_" + noteObj.chartNote.move),
			pos(noteObj.pos),
			anchor(noteObj.anchor),
			opacity(noteObj.opacity),
			z(noteObj.z),
			body(),
			area({ collisionIgnore: ["dumbNote"] }),
			rotate(0),
			"dumbNote",
			{
				update() {
					this.angle += rotationDirection;
					if (this.pos.y >= height() + this.height) this.destroy();
				},
			},
		]);

		newdumbnote.fadeOut(TIME_FOR_STRUM);
		newdumbnote.jump(rand(250, 500));
	});

	get("trailObj").forEach((obj) => {
		obj.destroy();
	});

	triggerEvent("onReset");
}

export function stopPlay(GameState: StateGame) {
	GameState.conductor.paused = true;
	GameState.conductor.audioPlay.stop();
	GameState.menuInputEnabled = true;
}

/** Function to exit to the song select menu from the gamescene */
export function exitToMenu(GameState: StateGame) {
	// let song = getSong(GameState.songZip.)
	// let index = song ? allSongCharts.indexOf(song) : 0
	// TODO: Find a way to comfortably get a song
	transitionToScene(fadeOut, "songselect", { index: 0 } as paramsSongSelect);
}

/** Function to exit to the song select menu from the gamescene */
export function exitToChartEditor(GameState: StateGame) {
	stopPlay(GameState);
	GameState.menuInputEnabled = false;
	transitionToScene(
		fadeOut,
		"charteditor",
		{
			song: GameState.song,
			seekTime: GameState.conductor.timeInSeconds,
			dancer: GameState.params.dancer,
		} as paramsChartEditor,
	);
}

export function introGo() {
	playSound("introGo", { volume: 1 });
	const goText = add([
		pos(center()),
		text("GO!", { size: height() / 4 }),
		color(RED),
		rotate(rand(-20, 20)),
		anchor("center"),
		opacity(),
		z(1),
		timer(),
	]);

	// goText.tween(goText.pos.y, height() + goText.height, TIME_FOR_STRUM / 2, (p) => goText.pos.y = p).onEnd(() => goText.destroy())
	goText.fadeIn(TIME_FOR_STRUM / 4).onEnd(() => {
		goText.fadeOut();
	});
}

/** Returns the user key for a given move */
export function getKeyForMove(move: Move) {
	return Object.values(GameSave.gameControls).find((gameKey) => gameKey.move == move).kbKey;
}

/** The function that manages input functions inside the game, must be called onUpdate */
export function inputHandler(GameState: StateGame) {
	Object.values(GameSave.gameControls).forEach((gameKey, index) => {
		if (GameState.paused) return;

		const kbKey = gameKey.kbKey;
		const defaultKey = Object.keys(GameSave.gameControls)[index];

		if (isKeyPressed(kbKey) || isKeyPressed(defaultKey)) {
			// bust a move
			GameState.strumline.press(gameKey.move);
		}
		else if (isKeyReleased(kbKey) || isKeyReleased(defaultKey)) {
			GameState.strumline.release();
		}
	});

	if (!GameState.menuInputEnabled) return;

	if (isKeyPressed("escape")) {
		GameState.setPause(!GameState.paused);
	}
	else if (isKeyDown("shift") && isKeyDown("r")) {
		restartSong(GameState);
	}

	// if no game key is 7 then it will exit to the chart editor
	if (!Object.values(GameSave.gameControls).some((gameKey) => gameKey.kbKey == "7")) {
		if (isKeyPressed("7")) {
			exitToChartEditor(GameState);
		}
	}
}

// TIMINGS
export const INPUT_THRESHOLD = 0.16;

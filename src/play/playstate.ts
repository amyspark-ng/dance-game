// Handles the setup for the game scene and some other important stuff
import { Conductor } from "../conductor";
import { GameSave } from "../core/gamesave";
import { cam } from "../core/plugins/features/camera";
import { playSound } from "../core/plugins/features/sound";
import { transitionToScene } from "../core/scenes";
import { fadeOut } from "../core/transitions/fadeOutTransition";
import { paramsSongSelect } from "../ui/SongSelectScene";
import { paramsChartEditor } from "./chartEditor/EditorState";
import { ChartEvent } from "./event";
import { DancerGameObj, makeDancer, Move } from "./objects/dancer";
import { ChartNote, getNotesOnScreen, setTimeForStrum, TIME_FOR_STRUM } from "./objects/note";
import { Tally } from "./objects/scoring";
import { createStrumline, StrumlineGameObj } from "./objects/strumline";
import { SongContent } from "./song";
import { addUI } from "./ui/gameUi";
import { addPauseUI } from "./ui/pauseScreen";

/** Type to store the parameters for the game scene */
export type paramsGameScene = {
	/** The song passed for gameplay */
	song: SongContent;
	/** The name of the dancer */
	dancer: string;
	/** How fast to make the song :smiling_imp: */
	playbackSpeed?: number;

	/** If the song should start at a specific second */
	seekTime?: number;

	/** Wheter the player is coming from the chart editor or from regular gameplay */
	fromChartEditor: boolean;
};

/** Class that holds and manages some important variables in the game scene */
export class StateGame {
	/** Static instance of the class */
	static instance: StateGame = null;

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

	/** The params this was initialized with */
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

	private lastTimeOnPause: number = 0;

	/** Wheter the game is currently paused or not */
	get paused() {
		return this._paused;
	}

	/** Will set the pause to true or false, if a parameter isn't passed it will be toggled */
	set paused(newPause: boolean) {
		newPause = newPause ?? !this._paused;
		this._paused = newPause;

		// these tweens somehow are spam-proof! good :)
		// unpaused
		if (this._paused == false) {
			this.conductor.paused = this._paused;
			this.conductor.timeInSeconds = this.lastTimeOnPause;
			this.conductor.audioPlay.seek(this.lastTimeOnPause);
			tween(this.conductor.audioPlay.detune, 0, 0.15 / 2, (p) => this.conductor.audioPlay.detune = p);
			tween(
				this.conductor.audioPlay.volume,
				GameSave.sound.music.volume,
				0.15,
				(p) => this.conductor.audioPlay.volume = p,
			);
		}
		// paused
		else {
			this.lastTimeOnPause = this.conductor.timeInSeconds;
			tween(this.conductor.audioPlay.detune, -150, 0.15 / 2, (p) => this.conductor.audioPlay.detune = p);
			tween(this.conductor.audioPlay.volume, 0, 0.15, (p) => this.conductor.audioPlay.volume = p);

			// Waits 15 seconds so the audio isn't paused inmediately
			wait(0.15, () => {
				this.conductor.paused = this._paused;
			});
		}

		// After half the time the menu is brought up
		wait(0.15 / 2, () => {
			getTreeRoot().trigger("pauseChange", this._paused);
		});
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
	onPauseChange(action: (newPause: boolean) => void) {
		return getTreeRoot().on("pauseChange", action);
	}

	/** Restarts the song */
	restart() {
		if (this.paused) this.paused = false;

		this.conductor.audioPlay.stop();

		this.health = 100;
		this.spawnedNotes = [];
		this.eventsDone = [];
		this.hitNotes = [];
		this.tally = new Tally();
		this.combo = 0;
		this.highestCombo = 0;

		this.song.chart.notes.forEach((note) => {
			if (note.time <= this.params.seekTime) {
				this.hitNotes.push(note);
				this.spawnedNotes.push(note);
			}
		});

		if (this.params.seekTime > 0) {
			this.conductor.audioPlay.seek(this.params.seekTime);
		}
		else {
			this.conductor.timeInSeconds = -TIME_FOR_STRUM;
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

		this.events.trigger("restart");
	}

	/** I don't remember what this was for?? */
	stop() {
		this.conductor.paused = true;
		this.conductor.audioPlay.stop();
		this.menuInputEnabled = true;
	}

	/** Function to exit to the song select menu from the gamescene */
	exitMenu() {
		// let song = getSong(this.songZip.)
		// let index = song ? allSongCharts.indexOf(song) : 0
		// TODO: Find a way to comfortably get a song
		transitionToScene(fadeOut, "songselect", { index: 0 } as paramsSongSelect);
	}

	/** Function to exit to the editor menu from the gamescene */
	exitEditor() {
		this.stop();
		this.menuInputEnabled = false;
		transitionToScene(
			fadeOut,
			"charteditor",
			{
				song: this.song,
				seekTime: this.conductor.timeInSeconds,
				dancer: this.params.dancer,
			} as paramsChartEditor,
		);
	}

	/** Collection of event related functions */
	events = {
		/** Triggers one of the possible events in the state
		 * @param arg CAN ONLY PASS ONE OBJECT GOMENASAI
		 */
		trigger(event: "notehit" | "miss" | "restart", arg?: any) {
			return getTreeRoot().trigger(event, arg);
		},

		/** Runs when player hit a note, you can grab the note in action */
		onNoteHit(action: (note: ChartNote) => void) {
			return getTreeRoot().on("notehit", action);
		},
		/** Runs when player misses */
		onMiss(action: (harm: boolean) => void) {
			return getTreeRoot().on("miss", action);
		},
		/** Runs when the players selects restart */
		onRestart(action: () => void) {
			return getTreeRoot().on("restart", action);
		},
	};

	constructor(params: paramsGameScene) {
		StateGame.instance = this;
		params.playbackSpeed = params.playbackSpeed ?? 1;
		params.seekTime = params.seekTime ?? 0;
		params.dancer = params.dancer ?? "astri";
		params.song = params.song ?? null;

		this.params = params;
		this.song = this.params.song;

		// now that we have the song we can get the scroll speed multiplier and set the playback speed for funzies
		const speed = this.song.manifest.initial_scrollspeed * GameSave.scrollSpeed;
		setTimeForStrum(1.25);
		setTimeForStrum(TIME_FOR_STRUM / speed);

		// then we actually setup the conductor and play the song
		this.conductor = new Conductor({
			audioPlay: playSound(`${this.params.song.manifest.uuid_DONT_CHANGE}-audio`, {
				volume: GameSave.sound.music.volume,
				speed: this.params.playbackSpeed,
			}),
			BPM: this.params.song.manifest.initial_bpm * this.params.playbackSpeed,
			timeSignature: this.song.manifest.time_signature,
			offset: TIME_FOR_STRUM,
		});

		// adds the ui to the game
		this.strumline = createStrumline();
		this.dancer = add(makeDancer(this.params.dancer));
		this.gameUI = addUI();
		this.pauseUI = addPauseUI();

		// there are the notes that have been spawned yet
		this.song.chart.notes.filter((note) => note.time <= this.params.seekTime).forEach((passedNote) => {
			this.spawnedNotes.push(passedNote);
			this.hitNotes.push(passedNote);
		});

		this.conductor.audioPlay.seek(this.params.seekTime);
		if (this.dancer) this.dancer.doMove("idle");
	}
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
			GameState.strumline.pressed = false;
		}
	});

	if (!GameState.menuInputEnabled) return;

	if (isKeyPressed("escape")) {
		// this will trigger some stuff, check the 'paused' setter
		if (GameState.conductor.timeInSeconds < 0) return;
		GameState.paused = !GameState.paused;
	}
	else if (isKeyDown("shift") && isKeyDown("r")) {
		GameState.restart();
	}

	// if no game key is 7 then it will exit to the chart editor
	if (!Object.values(GameSave.gameControls).some((gameKey) => gameKey.kbKey == "7")) {
		if (isKeyPressed("7")) {
			GameState.exitEditor();
		}
	}
}

// TIMINGS
export const INPUT_THRESHOLD = 0.16;

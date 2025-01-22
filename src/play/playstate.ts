// Handles the setup for the game scene and some other important stuff
import { Conductor } from "../Conductor";
import { cam } from "../core/camera";
import { GameSave } from "../core/save";
import { KaplayState } from "../core/scenes/KaplayState";
import { BlackBarsTransition } from "../core/scenes/transitions/blackbar";
import { StateSongSelect } from "../ui/menu/songselect/SongSelectScene";
import { StateChart } from "./editor/EditorState";
import { ChartEvent } from "./event";
import { DancerGameObj, makeDancer } from "./objects/dancer";
import { ChartNote, setTimeForStrum, TIME_FOR_STRUM } from "./objects/note";
import { Tally } from "./objects/scoring";
import { createStrumline, StrumlineGameObj } from "./objects/strumline";
import { addUI } from "./objects/ui/gameUi";
import { addPauseUI } from "./objects/ui/pauseUi";
import { SongContent } from "./song";
import "./GameScene";
import { Content } from "../core/loading/content";
import { Sound } from "../core/sound";

/** Type to store the parameters for the game scene */
export type paramsGameScene = {
	/** The song passed for gameplay */
	song: SongContent;

	/** The name of the dancer */
	dancerName?: string;

	/** How fast to make the song :smiling_imp: */
	playbackSpeed?: number;

	/** If the song should start at a specific second */
	seekTime?: number;

	/** Wheter the player is coming from the chart editor or from regular gameplay */
	fromEditor?: boolean;
};

/** Class that holds and manages some important variables in the game scene
 * @param song The song that you're going to play
 * @param dancerName The name of the dancer to start as
 * @param playbackSpeed How fast the song will go
 * @param seekTime At what time the song will start
 * @param fromEditor Wheter you're coming from the editor or not
 */
export class StateGame extends KaplayState {
	/** Static instance of the class */
	static instance: StateGame = null;

	/** The params this was initialized with */
	params: paramsGameScene = null;

	/** The current conductor */
	conductor: Conductor = null;

	/** Holds the current song chart */
	song: SongContent = null;

	/** Holds the current tallies for the song */
	tally: Tally = new Tally();

	/** The current combo */
	combo: number = 0;

	/** The current highest combo achieved */
	highestCombo: number = 0;

	/** Holds all the notes that have been spawned */
	spawnedNotes: ChartNote[] = [];

	/** All the events that are done */
	eventsDone: ChartEvent[] = [];

	/** Holds all the notes that have been hit */
	hitNotes: ChartNote[] = [];

	/** Current player health */
	health: number = 100;

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

	/** Private property that manages the game paused state, it's actually getted and setted */
	private _paused: boolean = false;

	/** property that manages the last time the game was paused (for a cool effect) */
	lastTimeOnPause: number = 0;

	get paused() {
		return this._paused;
	}

	/** Wheter the game is currently paused or not */
	set paused(newPause: boolean) {
		newPause = newPause ?? !this._paused;
		this._paused = newPause;
		getTreeRoot().trigger("pauseChange", this.paused);
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

	/** Runs when the game has been paused or unpaused (mainly for the pause ui) */
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
		tween(cam.angle, 0, 0.1, (p) => cam.angle = p, easings.easeOutExpo);

		ChartNote.getNotesOnScreen().forEach((noteObj) => {
			noteObj.destroy();

			let rotationDirection = choose([-10, 10]);
			const newdumbnote = add([
				sprite(Content.getNoteskinSprite(noteObj.chartNote.move)),
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
	private stop() {
		this.conductor.paused = true;
		this.conductor.audioPlay.stop();
		this.menuInputEnabled = true;
	}

	/** Function to exit to the song select menu from the gamescene */
	exitMenu() {
		KaplayState.switchState(new StateSongSelect(this.song), BlackBarsTransition);
	}

	/** Function to exit to the editor menu from the gamescene */
	exitEditor() {
		this.stop();
		this.menuInputEnabled = false;
		KaplayState.switchState(
			new StateChart({
				playbackSpeed: this.params.playbackSpeed,
				seekTime: this.conductor.timeInSeconds,
				song: this.song,
			}),
		);
	}

	/** Collection of events called in the state */
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

	/** Think of it as a second constructor */
	add() {
		// now that we have the song we can get the scroll speed multiplier and set the playback speed for funzies
		const speed = this.song.manifest.initial_scrollspeed * GameSave.scrollSpeed;
		setTimeForStrum(1.25);
		setTimeForStrum(TIME_FOR_STRUM / speed);

		// then we actually setup the conductor and play the song
		this.conductor = new Conductor({
			audioPlay: Sound.playMusic(`${this.params.song.manifest.uuid_DONT_CHANGE}-audio`, {
				speed: this.params.playbackSpeed,
			}),
			BPM: this.params.song.manifest.initial_bpm * this.params.playbackSpeed,
			timeSignature: this.song.manifest.time_signature,
			offset: TIME_FOR_STRUM,
		});

		// adds the ui to the game
		this.strumline = createStrumline();
		this.dancer = add(makeDancer(this.params.dancerName));
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

	constructor(params: paramsGameScene) {
		super("game");
		StateGame.instance = this;
		params.playbackSpeed = params.playbackSpeed ?? 1;
		params.seekTime = params.seekTime ?? 0;
		params.dancerName = params.dancerName ?? "astri";
		params.fromEditor = params.fromEditor ?? false;

		this.params = params;
		this.song = this.params.song;
	}
}

export function introGo() {
	Sound.playSound("introGo", { volume: 1 });
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

/** The function that manages input functions inside the game, must be called onUpdate */
export function inputHandler(GameState: StateGame) {
	// goes through each gamekey
	Object.values(GameSave.gameControls).forEach((gameKey, index) => {
		if (GameState.paused) return;
		const moveForKey = GameSave.getMoveForKey(gameKey);

		if (isKeyPressed(gameKey)) {
			GameState.strumline.press(moveForKey);
		}
		else if (isKeyReleased(gameKey)) {
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
	if (!Object.values(GameSave.gameControls).some((gameKey) => gameKey == "7")) {
		if (isKeyPressed("7")) {
			GameState.exitEditor();
		}
	}
}

// TIMINGS
export const INPUT_THRESHOLD = 0.16;

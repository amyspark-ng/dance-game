import { Color, Vec2 } from "kaplay";
import { cloneDeep, isEqual } from "lodash";
import { v4 } from "uuid";
import { Conductor } from "../../Conductor";
import { IScene, switchScene } from "../../core/scenes/KaplayState";
import { Sound } from "../../core/sound";
import { ChartEvent, eventId } from "../../data/event/event";
import EventSchema from "../../data/event/schema";
import { SongAssets, SongContent, SongManifest } from "../../data/song";
import { FileManager } from "../../FileManager";
import { MenuState } from "../../ui/menu/MenuState";
import { addNotification } from "../../ui/objects/notification";
import { utils } from "../../utils";
import { Move } from "../objects/dancer";
import { ChartNote } from "../objects/note";
import { commands, IEditorCommand } from "./backend/commands";
import { editorUtils } from "./backend/utils";
import { EditorScene } from "./EditorScene";
import { EventLane, NoteLane } from "./objects/lane";
import { EditorMinimap } from "./objects/minimap";
import { EditorSelectionBox } from "./objects/selectionbox";
import { EditorEvent, EditorNote, EditorStamp } from "./objects/stamp";

/** The params for the chart editor */
export type paramsEditor = {
	/** The song */
	song: SongContent;
	playbackSpeed?: number;
	seekTime?: number;
};

/** Is either a note or an event */
export type ChartStamp = ChartNote | ChartEvent;

/** Class that manages the snapshots of the chart */
export class ChartSnapshot {
	/** The content of the song at the moment the snapshot was taking */
	song: SongContent;
	/** Notes at time */
	notes: EditorNote[];
	/** Events at time */
	events: EditorEvent[];
	/** The command you were goinge to execute in the moment the snapshot was taken */
	command: string = undefined;
	constructor(state: EditorState, command?: string) {
		this.song = state.song;
		this.notes = state.notes;
		this.events = state.events;
		this.command = command;
	}
}

/** Scene where A LOT of the magic happens, coolest thing ever, scene that allows you to chart the notes and events in a song :)
 * @param song The song you're going to be editing
 * @param playbackSpeed How fast it will be gooing
 * @param seekTime The time the scene will start at
 */
export class EditorState implements IScene {
	/** Static instance of the statechart */
	static instance: EditorState = null;

	/** How lerped the scene will be */
	static LERP = 0.5;

	/** Width and height of every square */
	static SQUARE_SIZE = vec2(52, 52);

	/** How many squares in the screen (vertically) */
	static get SQUARES_IN_SCREEN() {
		return Math.floor(height() / EditorState.SQUARE_SIZE.y);
	}

	/** The initial pos of the first square */
	static INITIAL_POS = vec2(center().x, this.SQUARE_SIZE.y - this.SQUARE_SIZE.y / 2);

	/** Certain functions that can help in some small things */
	static utils = editorUtils;

	/** The color of the backgroun (determined by the hue on the game save) */
	bgColor: Color = rgb(92, 50, 172);

	/** The song that's currently being edited */
	song: SongContent;

	/** Wheter the state is paused or not */
	paused: boolean;

	/** The conductor to manage music stuff */
	conductor: Conductor;

	/** The parameters of the state */
	params: paramsEditor;

	/** Wheter you can do anything */
	inputEnabled: boolean = true;

	/** Wheter you can do shortcuts or not */
	shortcutsEnabled: boolean = true;

	/** How many steps scrolled */
	scrollStep: number = 0;

	/** Is EditorState.scrollstep but lerped */
	lerpScrollStep = 0;

	/** The current selected move to place a note */
	currentMove: Move = "up";

	/** The current selected event */
	currentEvent: eventId = "cam-move";

	/** The step that is currently being hovered */
	hoveredStep = 0;

	/** Wheter the cursor is in the grid at all */
	isCursorInGrid = false;

	/** Wheter the cursor is in a grid or not */
	get isInNoteLane() {
		return this.noteLane && this.noteLane.isHovering();
	}

	/** Wheter the cursor is in the events grid */
	get isInEventLane() {
		return this.eventLane && this.eventLane.isHovering();
	}

	/** Everytime you save this is setted to the current song */
	lastSavedChanges: SongContent = null;

	/** Wheter the song has unsaved changes */
	get unsavedChanges() {
		return !isEqual(this.song, this.lastSavedChanges);
	}

	/** The scale of the strumline line */
	strumlineScale = vec2(1);

	/** Contains an array of certain snapshots of every "state" the scene has been in
	 *
	 * All elements in this array are deep copies!!
	 */
	snapshots: ChartSnapshot[] = [];

	/** The index of the current snapshot in the scene */
	snapshotIndex: number = 0;

	/** The things currently copied */
	clipboard: EditorStamp[] = [];

	/** The currently selected notes and events */
	get selected() {
		return EditorStamp.mix(this.notes.filter((note) => note.selected), this.events.filter((event) => event.selected));
	}

	editorEvents = new KEventHandler();

	onStampHit(action: (stamp: EditorStamp) => void) {
		return this.editorEvents.on("stampHit", action);
	}

	/** Determines the current time in the song */
	strumlineStep = 1;

	/** Minimap instance to control the time of the song more comfortably */
	minimap: EditorMinimap = null;

	/** Note lane to put notes */
	noteLane: NoteLane = null;

	/** Event lane to put events */
	eventLane: EventLane = null;

	/** Selection box to select notes and stamps */
	selectionBox: EditorSelectionBox = null;

	/** Runs when the sound for the soundPlay has changed */
	updateAudio() {
		this.conductor.audioPlay.stop();
		this.conductor.audioPlay = Sound.playMusic(this.song.getAudioName());
	}

	/** Sets scrollStep to a clamped and rounded value
	 * @param newStep The new step to scroll to
	 * @param round? Wheter to round the value
	 */
	scrollToStep(newStep: number, round: boolean = true) {
		newStep = clamp(newStep, 0, this.conductor.totalSteps);
		newStep = Math.abs(newStep);
		if (round) newStep = Math.round(newStep);
		this.scrollStep = newStep;
		return newStep;
	}

	/** The notes in the editor */
	notes: EditorNote[] = [];

	/** The events in the editor */
	events: EditorEvent[] = [];

	/** Creates a new song */
	async NewSong() {
		const loading = FileManager.loadingScreen();
		await EditorState.instance.changeSong(new SongContent());
		loading.cancel();
	}

	/** Triggers a dialog to open a song zip */
	async OpenSong() {
		const loading = FileManager.loadingScreen("Receiving song");
		const songFile = await FileManager.receiveFile("mod");
		if (!songFile) {
			loading.cancel();
			return;
		}

		const assets = await SongContent.parseFromFile(songFile);
		const content = await SongContent.load(assets, false, false);

		// TODO: What...
		if (content.isDefault) {
			this.changeSong(cloneDeep(content), assets);
			addNotification(`Editor: Editing ${content.manifest.name}`);
		}
		else if (content.manifest.uuid_DONT_CHANGE == this.song.manifest.uuid_DONT_CHANGE) {
			this.changeSong(content, assets);
			addNotification(`[warning]Warning:[/warning] Overwrote "${this.song.manifest.name}" by "${content.manifest.name}" since they have the same UUID`, 5);
		}
		// what????
		else {
			this.changeSong(content, assets);
			addNotification(`[warning]Warning:[/warning] Overwriting "${this.song.manifest.name}"`);
		}

		loading.cancel();
	}

	async RequestExit() {
		if (this.unsavedChanges) {
			debug.log("Are you sure you want to exit");
		}
		else {
			await this.ExitDefinetely();
		}
	}

	/** Exits the state */
	async ExitDefinetely() {
		const loading = FileManager.loadingScreen(`Saving '${this.song.manifest.name}...'`);
		await this.SaveSong(true);
		EditorState.instance.conductor.destroy();
		switchScene(MenuState, "editor");
		loading.cancel();
	}

	/** Downloads the current song */
	async DownloadSong() {
		getTreeRoot().trigger("download");

		// downloads the zip
		const songBlob = await this.song.writeToBlob();
		downloadBlob(`${this.song.manifest.name}.zip`, songBlob);
		addNotification(`EDITOR: ${this.song.manifest.name}.zip, DOWNLOADED! :)`);
	}

	/** Saves the current song */
	async SaveSong(writeSave: boolean = false) {
		if (!this.unsavedChanges && !writeSave) return;
		addNotification(`EDITOR: Saved '${this.song.manifest.name}' succesfully`);
		this.lastSavedChanges = cloneDeep(this.song);
		SongContent.addToLoaded(this.song);

		if (writeSave) {
			await SongContent.writeToSave(true, true, this.song);
		}

		return new Promise((resolve, reject) => resolve("ok"));
	}

	/** Adds a noteto the Chart
	 * @param data The ChartNote
	 * @returns The object
	 */
	placeNote(data: ChartNote) {
		const editorNote = new EditorNote(data);
		this.notes.push(editorNote);

		// this happens in the start
		if (!this.song.chart.notes.includes(data)) this.song.chart.notes.push(data);

		editorNote.onHit(() => {
			Sound.playSound("noteHit", { detune: ChartNote.moveToDetune(data.move) + rand(10, 20) });
		});

		return editorNote;
	}

	/** Deletes a note of the Chart
	 * @param note The EditorNote to remove
	 * @returns The deleted note
	 */
	deleteNote(note: EditorNote) {
		this.notes = utils.removeFromArr(note, this.notes);
		this.song.chart.notes = utils.removeFromArr(note.data, this.song.chart.notes);
		note.destroy();
		return note;
	}

	/** Adds an event to the Chart
	 * @param data The ChartEvent
	 * @returns The object
	 */
	placeEvent(data: ChartEvent) {
		const editorEvent = new EditorEvent(data);
		this.events.push(editorEvent);
		// this happens in the start
		if (!this.song.chart.events.includes(data)) this.song.chart.events.push(data);

		editorEvent.onHit(() => {
			Sound.playSound("noteHit", { detune: Object.keys(EventSchema).indexOf(data.id) + rand(10, 20) });
		});

		return editorEvent;
	}

	/** Deletes an event of the Chart
	 * @param event The EditorEvent to remove
	 * @returns The deleted event
	 */
	deleteEvent(event: EditorEvent) {
		this.events = utils.removeFromArr(event, this.events);
		this.song.chart.events = utils.removeFromArr(event.data, this.song.chart.events);
		event.destroy();
		return event;
	}

	/** Takes a snapshot before doing an action */
	takeSnapshot(action: string) {
		// // debug.log(`did action ${action} at index ${this.snapshotIndex}`);
		// const snapshot = new ChartSnapshot(this, action);
		// // Remove any states ahead of the current index for redo to behave correctly
		// this.snapshots = this.snapshots.slice(0, this.snapshotIndex + 1);
		// // Add new state as a deep copy to avoid reference issues
		// this.snapshots.push(cloneDeep(snapshot));
		// this.snapshotIndex++;
		// return snapshot;
	}

	/** Reverts state to latest snapshot
	 * @returns Returns the new state
	 */
	undo(): ChartSnapshot {
		if (this.snapshotIndex > 0) {
			this.snapshotIndex--;

			const previousState = this.snapshots[this.snapshotIndex];
			this.song = previousState.song;
			this.notes = previousState.notes;
			this.events = previousState.events;

			return previousState;
		}

		return null;
	}

	/** Redoes the song and selected notes to latest snapshot */
	redo(): ChartSnapshot {
		if (this.snapshotIndex < this.snapshots.length - 1) {
			this.snapshotIndex++;
			const nextState = this.snapshots[this.snapshotIndex];
			this.song = nextState.song;
			this.notes = nextState.notes;
			this.events = nextState.events;

			return nextState;
		}

		return null;
	}

	/** Changes the current song, removes notes and adds the new ones */
	async changeSong(newSong: SongContent, endAssets?: SongAssets) {
		const loading = FileManager.loadingScreen(`Opening '${newSong.manifest.name}'...`);
		this.notes.forEach((note) => this.deleteNote(note));
		this.events.forEach((event) => this.deleteEvent(event));

		// it's a default song, you can't overwrite it, make a copy
		if (newSong.isDefault) {
			this.song = cloneDeep(newSong);

			this.song.manifest.name = this.song.manifest.name + " (copy)";
			this.song.manifest.uuid_DONT_CHANGE = v4();
			endAssets = await SongContent.extractFromLoaded(newSong);
			endAssets.manifest = JSON.stringify(this.song.manifest);

			addNotification(`Editing: ${this.song.manifest.name}`, 3);
		}
		// overwrite it for all i care!!
		else {
			// TODO: Have to make a dialog here about you're about to overwrite unsaved change you're ok with that etc etc
			this.song = newSong;
			if (!this.song.manifest.uuid_DONT_CHANGE) {
				// it's a new song
				this.song.manifest.uuid_DONT_CHANGE = v4();
			}

			// reload assets
			if (await SongContent.hasAssetsLoaded(newSong)) {
				const assets = await SongContent.extractFromLoaded(newSong);
				endAssets = assets;
				endAssets.manifest = JSON.stringify(this.song.manifest);
			}
			// has to load first time
			else {
				if (!endAssets) {
					const assets = await SongContent.extractFromUnloaded(newSong);
					endAssets = assets;
					endAssets.manifest = JSON.stringify(this.song.manifest);
				}
			}

			addNotification(`[warning]WARNING[/warning]: You'll be overwriting "${this.song.manifest.name}"`, 5);
		}

		loading.message = `Loading ${this.song.manifest.name}'s assets...`;
		await SongContent.load(endAssets, false, false);
		this.updateAudio();
		this.scrollToStep(0);

		this.song.chart.notes.forEach((chartNote) => this.placeNote(chartNote));
		this.song.chart.events.forEach((ChartEvent) => this.placeEvent(ChartEvent));
		loading.message = `Success loading ${this.song.manifest.name}`;
		loading.cancel();
	}

	// TODO: Fix this typing
	// @ts-ignore
	/**
	 * Performs a command in the editor, is typed to a commands array object in the commands file
	 * @param commandKey The key to pass
	 * @param args Some args
	 * @returns The thing the do() function inside the command would return
	 */
	performCommand<T extends keyof typeof commands>(commandKey: T, ...args: Parameters<typeof commands[T]["do"]>): ReturnType<typeof commands[T]["do"]> {
		const command = commands[commandKey];
		const before = this.snapshotIndex == 0
			? cloneDeep(new ChartSnapshot(this, "starting point"))
			: cloneDeep(this.snapshots[this.snapshotIndex]);
		// @ts-ignore
		const stringAction = command.toString(...args); // have to do it before so the data still exists before the command is done

		// @ts-ignore
		const returnValue = command.do(...args);

		if (command.addToHistory) {
			this.snapshotIndex++;
			const snapshot = new ChartSnapshot(this, stringAction);
			this.snapshots[this.snapshotIndex - 1] = before;
			this.snapshots[this.snapshotIndex] = snapshot;
		}

		// @ts-ignore
		return returnValue;
	}

	scene(instance: EditorState): void {
		EditorScene(instance);
	}

	constructor(params: paramsEditor) {
		EditorState.instance = this;

		params.playbackSpeed = params.playbackSpeed ?? 1;
		params.playbackSpeed = Math.abs(clamp(params.playbackSpeed, 0, Infinity));
		params.seekTime = Math.abs(params.seekTime) ?? 0;
		if (params.seekTime < 0) params.seekTime = 0;
		else if (isNaN(params.seekTime)) params.seekTime = 0;

		params.song = params.song ?? new SongContent();
		this.params = params;

		// This has to run after the asset reloading
		Sound.musics.forEach((music) => music.stop());
		this.conductor = new Conductor({
			audioPlay: Sound.playMusic("new-song-audio", {
				speed: this.params.playbackSpeed,
			}),
			BPM: this.params.song.manifest.initial_bpm * this.params.playbackSpeed,
			timeSignature: this.params.song.manifest.time_signature,
			offset: 0,
		});
		this.conductor.audioPlay?.stop();
		this.conductor.audioPlay.seek(this.params.seekTime);
		this.paused = true;
		this.scrollToStep(this.conductor.timeToStep(this.params.seekTime));
		this.changeSong(this.params.song);
	}
}

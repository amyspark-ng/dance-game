import { Color, Vec2 } from "kaplay";
import { v4 } from "uuid";
import { Conductor } from "../../Conductor";
import { GameSave } from "../../core/save";
import { KaplayState } from "../../core/scenes/KaplayState";
import { Sound } from "../../core/sound";
import { SongContent, SongManifest } from "../../data/song";
import { FileManager } from "../../FileManager";
import { addNotification } from "../../ui/objects/notification";
import { utils } from "../../utils";
import { ChartEvent, eventId } from "../event";
import { Move } from "../objects/dancer";
import { ChartNote } from "../objects/note";
import { editorCommands } from "./backend/commands";
import { editorUtils } from "./backend/utils";
import { EventLane, NoteLane } from "./objects/lane";
import { EditorMinimap } from "./objects/minimap";
import { EditorSelectionBox } from "./objects/selectionbox";
import { EditorEvent, EditorNote, EditorStamp } from "./objects/stamp";
import "./EditorScene";

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
	constructor(ChartState: StateChart, command: string) {
		this.song = ChartState.song;
		this.notes = ChartState.notes;
		this.events = ChartState.events;
		this.command = command;
	}
}

/** Scene where A LOT of the magic happens, coolest thing ever, scene that allows you to chart the notes and events in a song :)
 * @param song The song you're going to be editing
 * @param playbackSpeed How fast it will be gooing
 * @param seekTime The time the scene will start at
 */
export class StateChart extends KaplayState {
	/** Static instance of the statechart */
	static instance: StateChart = null;

	/** How lerped the scene will be */
	static LERP = 0.5;

	/** Width and height of every square */
	static SQUARE_SIZE = vec2(52, 52);

	/** The initial pos of the first square */
	static INITIAL_POS = vec2(center().x, this.SQUARE_SIZE.y - this.SQUARE_SIZE.y / 2);

	/** Certain functions that can help in some small things */
	static utils = editorUtils;

	/** Commands you might do to edit or do things with the result file */
	static commands = editorCommands;

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

	/** Is ChartState.scrollstep but lerped */
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
	strumlineStep = 0;

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

	/** Sets scrollStep to a clamped and rounded value */
	scrollToStep(newStep: number) {
		newStep = clamp(newStep, 0, this.conductor.totalSteps);
		newStep = Math.abs(Math.round(newStep));
		this.scrollStep = newStep;
	}

	/** Changes the current move */
	changeMove(newMove: Move) {
		this.currentMove = newMove;
	}

	/** The notes in the editor */
	notes: EditorNote[] = [];

	/** The events in the editor */
	events: EditorEvent[] = [];

	/** Adds a noteto the Chart
	 * @param data The ChartNote
	 * @returns The object
	 */
	placeNote(data: ChartNote) {
		const editorNote = new EditorNote(data);
		this.notes.push(editorNote);
		this.song.chart.notes.push(editorNote.data);

		editorNote.onHit(() => {
			Sound.playSound("noteHit", { detune: ChartNote.moveToDetune(editorNote.data.move) + rand(10, 20) });
		});

		return editorNote;
	}

	/** Deletes a note of the Chart
	 * @param note The EditorNote to remove
	 * @returns The deleted note
	 */
	deleteNote(note: EditorNote) {
		this.notes.splice(this.notes.indexOf(note), 1);
		this.song.chart.notes.splice(this.song.chart.notes.indexOf(note.data), 1);
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
		this.song.chart.events.push(editorEvent.data);

		editorEvent.onHit(() => {
			Sound.playSound("noteHit", { detune: Object.keys(ChartEvent.eventSchema).indexOf(data.id) + rand(10, 20) });
		});

		return editorEvent;
	}

	/** Deletes an event of the Chart
	 * @param event The EditorEvent to remove
	 * @returns The deleted event
	 */
	deleteEvent(event: EditorEvent) {
		this.events.splice(this.events.indexOf(event), 1);
		this.song.chart.events.splice(this.song.chart.events.indexOf(event.data), 1);
		event.destroy();
		return event;
	}

	/** Takes a snapshot before doing an action */
	takeSnapshot(action: string) {
		// debug.log(`did action ${action} at index ${this.snapshotIndex}`);
		const snapshot = new ChartSnapshot(this, action);
		// Remove any states ahead of the current index for redo to behave correctly
		this.snapshots = this.snapshots.slice(0, this.snapshotIndex + 1);
		// Add new state as a deep copy to avoid reference issues
		this.snapshots.push(utils.deepClone(snapshot));
		this.snapshotIndex++;
		return snapshot;
	}

	/** Reverts state to latest snapshot
	 * @returns Returns the new state
	 */
	undo() {
		if (this.snapshotIndex > 0) {
			this.snapshotIndex--;

			const previousState = this.snapshots[this.snapshotIndex];
			this.song = previousState.song;
			this.notes = previousState.notes;
			this.events = previousState.events;

			return this;
		}

		return null;
	}

	/** Redoes the song and selected notes to latest snapshot */
	redo() {
		if (this.snapshotIndex < this.snapshots.length - 1) {
			this.snapshotIndex++;
			const nextState = this.snapshots[this.snapshotIndex];
			this.song = nextState.song;
			this.notes = nextState.notes;
			this.events = nextState.events;

			return this;
		}

		return null;
	}

	/** Creates a new song */
	createNewSong() {
		const params: paramsEditor = {
			playbackSpeed: 1,
			seekTime: 0,
			song: new SongContent(),
		};
		params.song.manifest.uuid_DONT_CHANGE = v4();
		Object.assign(this, new StateChart(params));
	}

	/** Downloads the chart for the current song */
	async downloadChart() {
		getTreeRoot().trigger("download");

		const SongFolder = await FileManager.writeSongZip(this.song);

		// downloads the zip
		downloadBlob(`${this.song.manifest.name}.zip`, SongFolder);
		debug.log(`${this.song.manifest.name}.zip, DOWNLOADED! :)`);
	}

	add() {
		// This has to run after the asset reloading
		Sound.musics.forEach((music) => music.stop());
		this.conductor = new Conductor({
			audioPlay: Sound.playMusic(this.song.getAudioName(), {
				speed: this.params.playbackSpeed,
			}),
			BPM: this.song.manifest.initial_bpm * this.params.playbackSpeed,
			timeSignature: this.song.manifest.time_signature,
			offset: 0,
		});
		this.conductor.audioPlay?.stop();
		this.conductor.audioPlay.seek(this.params.seekTime);
		this.paused = true;
		this.scrollToStep(this.conductor.timeToStep(this.params.seekTime));

		this.song.chart.notes.forEach((chartNote) => this.placeNote(chartNote));
		this.song.chart.events.forEach((ChartEvent) => this.placeEvent(ChartEvent));
	}

	constructor(params: paramsEditor) {
		super("editor");

		StateChart.instance = this;
		params.playbackSpeed = params.playbackSpeed ?? 1;
		params.playbackSpeed = Math.abs(clamp(params.playbackSpeed, 0, Infinity));

		params.seekTime = Math.abs(params.seekTime) ?? 0;
		if (params.seekTime < 0) params.seekTime = 0;
		params.song = params.song ?? new SongContent();
		this.params = params;

		// it's a default song, you can't overwrite it, make a copy
		if (SongContent.defaultUUIDS.includes(this.params.song.manifest.uuid_DONT_CHANGE)) {
			// TODO: There's a case where you'll need the default content, what is it?

			this.song = utils.deepClone(this.params.song);
			this.song.manifest.name = this.song.manifest.name + " (copy)";
			this.song.manifest.uuid_DONT_CHANGE = v4();
			const oldUUID = params.song.manifest.uuid_DONT_CHANGE;

			// reload assets

			// have to reload the audio i don't know how much this would work since this loading takes time so
			const soundBuffer = getSound(`${oldUUID}-audio`).data.buf;
			loadSound(this.song.getAudioName(), soundBuffer as any);

			// also have to reload the cover this sucks
			FileManager.spriteToDataURL(`${oldUUID}-cover`).then((dataurl) => {
				loadSprite(this.song.getCoverName(), dataurl);
			});

			addNotification(`Editing: ${this.song.manifest.name}`, 3);
		}
		// overwrite it for all i care!!
		else {
			this.song = this.params.song;
			addNotification(`[warning]WARNING[/warning]: You'll be overwriting ${this.song.manifest.name}`, 5);
		}
	}
}

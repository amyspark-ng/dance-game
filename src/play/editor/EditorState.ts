import { Color, Vec2 } from "kaplay";
import { v4 } from "uuid";
import { Conductor } from "../../Conductor";
import { GameSave } from "../../core/save";
import { KaplayState } from "../../core/scenes/KaplayState";
import { Sound } from "../../core/sound";
import { FileManager } from "../../FileManager";
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
import { SongContent } from "../../data/song";

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
	song: SongContent;
	selectedStamps: EditorStamp[] = [];
	command: string = undefined;
	constructor(song: SongContent, selectedStamps: EditorStamp[], command?: string) {
		this.song = song;
		this.selectedStamps = selectedStamps;
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
	currentEvent: keyof typeof ChartEvent.eventSchema = "change-scroll";

	/** The step that is currently being hovered */
	hoveredStep = 0;

	/** Wheter the cursor is in the grid at all */
	isCursorInGrid = false;

	/** Wheter the cursor is in a grid or not */
	isInNoteGrid = false;

	/** Wheter the cursor is in the events grid */
	isInEventGrid = false;

	/** The scale of the strumline line */
	strumlineScale = vec2(1);

	/** Every time you do something, the new state will be pushed to this array */
	snapshots: ChartSnapshot[] = [];

	/** Current index of the current snapshot blah */
	snapshotIndex = 0;

	/** The things currently copied */
	clipboard: EditorStamp[] = [];

	/** The currently selected notes and events */
	get selected() {
		return EditorStamp.mix(this.notes.filter((note) => note.selected), this.events.filter((event) => event.selected));
	}

	/** The step the selected note started in before it was moved */
	lastLeaderStep = 0;

	/** Determines the current time in the song */
	strumlineStep = 0;

	/** Minimap instance to control the time of the song more comfortably */
	minimap: EditorMinimap;

	/** Note lane to put notes */
	noteLane: NoteLane;

	/** Event lane to put events */
	eventLane: EventLane;

	/** Selection box to select notes and stamps */
	selectionBox: EditorSelectionBox;

	/** Runs when the sound for the soundPlay has changed */
	updateAudio() {
		this.conductor.audioPlay.stop();
		this.conductor.audioPlay = Sound.playMusic(this.song.manifest.uuid_DONT_CHANGE + "-audio");
	}

	/** Sets scrollStep to a clamped and rounded value */
	scrollToStep(newStep: number) {
		newStep = clamp(newStep, 0, this.conductor.totalSteps);
		newStep = Math.abs(Math.round(newStep));
		this.scrollStep = newStep;
	}

	/** Converts a step to a position (a hawk to a) */
	stepToPos(step: number) {
		return utils.getPosInGrid(StateChart.INITIAL_POS, step, 0, StateChart.SQUARE_SIZE);
	}

	/** Changes the current move */
	changeMove(newMove: Move) {
		this.currentMove = newMove;
	}

	/** The notes in the editor */
	notes: EditorNote[] = [];

	/** The events in the editor */
	events: EditorEvent[] = [];

	/** Stamp that the other stamps move around */
	leaderStamp: EditorStamp = undefined;

	/** Adds a note or event to the Chart
	 * @param data The ChartNote or ChartEvent to add
	 * @returns The object (EditorNote or EditorEvent)
	 */
	place(type: "note", data: ChartNote): EditorNote;
	place(type: "event", data: ChartEvent): EditorEvent;
	place(type: "note" | "event", data: ChartNote | ChartEvent) {
		if (type == "note" && "move" in data) {
			const editorNote = new EditorNote(data);
			this.notes.push(editorNote); // pushes to editorNotes array
			this.notes.sort((a, b) => b.data.time - a.data.time); // sorts the editorNotes array
			this.song.chart.notes[this.notes.indexOf(editorNote)] = editorNote.data; // pushes to chartNote array
			this.song.chart.notes.sort((a, b) => b.time - a.time); // sorts the chartNote array

			// little effect
			editorNote.onHit(() => {
				if (this.paused) return;
				Sound.playSound("noteHit", { detune: StateChart.utils.moveToDetune(editorNote.data.move) });
			});

			return editorNote;
		}
		else if (type == "event" && "id" in data) {
			const editorEvent = new EditorEvent(data);
			this.events.push(editorEvent); // pushes to editorEvents arrray
			this.events.sort((a, b) => b.data.time - a.data.time); // sorts the editorEvents arrray
			this.song.chart.events[this.events.indexOf(editorEvent)] = editorEvent.data; // pushes to chartEvents arrary
			this.song.chart.events.sort((a, b) => b.time - a.time); // sorts the chartEvents array

			editorEvent.onHit(() => {
				if (this.paused) return;
				Sound.playSound("noteHit", { detune: Object.keys(ChartEvent.eventSchema).indexOf(editorEvent.data.id) });
			});

			return editorEvent;
		}
		else return undefined as any;
	}

	/** Deletes a note or event of the Chart
	 * @param stampToDelete The EditorStamp to remove (If one is not passed it will simply remove the hovered one)
	 * @returns The delete stamp
	 */
	delete(type: "note", stampToDelete?: EditorNote): EditorNote;
	delete(type: "event", stampToDelete?: EditorEvent): EditorEvent;
	delete(type: "note" | "event", stampToDelete?: EditorNote | EditorEvent) {
		if (type == "note") {
			stampToDelete = stampToDelete ?? this.notes.find((note) => note.isHovering());
			if (stampToDelete == undefined) return;
			if (!stampToDelete.is("note")) return;

			this.takeSnapshot(`delete ${stampToDelete.data.move} note`);
			this.notes.splice(this.notes.indexOf(stampToDelete), 1); // remove from editornotes array
			this.notes.sort((a, b) => b.data.time - a.data.time); // sorts the editorNotes array
			this.song.chart.notes.splice(this.song.chart.notes.indexOf(stampToDelete.data), 1); // remove from chartnote array
			this.song.chart.notes.sort((a, b) => b.time - a.time); // sorts the editorNotes array
			stampToDelete.destroy();

			if (this.leaderStamp == stampToDelete) this.leaderStamp = undefined;
			return stampToDelete;
		}
		else if (type == "event") {
			stampToDelete = stampToDelete ?? this.events.find((event) => event.isHovering());
			if (stampToDelete == undefined) return;
			if (!stampToDelete.is("event")) return;
			this.takeSnapshot(`delete ${stampToDelete.data.id} event`);
			this.events.splice(this.events.indexOf(stampToDelete), 1); // remove from editorEvent array
			this.events.sort((a, b) => b.data.time - a.data.time); // sorts the editorEvent array
			this.song.chart.events.splice(this.song.chart.events.indexOf(stampToDelete.data), 1); // remove from chartEvent array
			this.song.chart.events.sort((a, b) => b.time - a.time); // sorts the editorEvent array
			stampToDelete.destroy();

			if (this.leaderStamp == stampToDelete) this.leaderStamp = undefined;
			return stampToDelete;
		}
		else return undefined as any;
	}

	/** Pushes a snapshot of the current state of the chart */
	takeSnapshot(action?: string) {
		const snapshot = new ChartSnapshot(this.song, this.selected, action);
		// Remove any states ahead of the current index for redo to behave correctly
		this.snapshots = this.snapshots.slice(0, this.snapshotIndex + 1);

		// Add new state as a deep copy to avoid reference issues
		this.snapshots.push(JSON.parse(JSON.stringify(snapshot)));
		this.snapshotIndex++;
	}

	/** Undos the song and selected notes to latest snapshot */
	undo() {
		if (this.snapshotIndex > 0) {
			this.snapshotIndex--;
			// Return deep copy of the state
			const newState: ChartSnapshot = JSON.parse(JSON.stringify(this.snapshots[this.snapshotIndex]));
			// TODO: FIX THE SELECTION THING WITH SNAPSHOTS
			// this.selectedStamps = newState.selectedStamps;
			this.song = newState.song;
		}

		return null; // No more states to undo
	}

	/** Redoes the song and selected notes to latest snapshot */
	redo() {
		if (this.snapshotIndex < this.snapshots.length - 1) {
			this.snapshotIndex++;
			const newState: ChartSnapshot = JSON.parse(JSON.stringify(this.snapshots[this.snapshotIndex])); // Return deep copy of the state
			// this.selectedStamps = newState.selectedStamps;
			this.song = newState.song;
		}

		return null; // No more states to redo
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

		const SongFolder = await FileManager.writeSongFolder(this.song);

		// downloads the zip
		downloadBlob(`${this.song.manifest.name}.zip`, SongFolder);
		debug.log(`${this.song.manifest.name}.zip, DOWNLOADED! :)`);
	}

	constructor(params: paramsEditor) {
		super("editor");
		StateChart.instance = this;
		params.playbackSpeed = params.playbackSpeed ?? 1;
		params.playbackSpeed = Math.abs(clamp(params.playbackSpeed, 0, Infinity));
		params.seekTime = params.seekTime ?? 0;
		params.seekTime = Math.abs(clamp(params.seekTime, 0, Infinity));
		params.song = params.song ?? new SongContent();
		this.params = params;

		// Creates a deep copy of the song so it doesn't overwrite the current song
		this.song = JSON.parse(JSON.stringify(this.params.song));

		const oldUUID = params.song.manifest.uuid_DONT_CHANGE;

		const uuidAlreadyExists = SongContent.loaded.map((song) => song.manifest.uuid_DONT_CHANGE).includes(this.song.manifest.uuid_DONT_CHANGE);
		// the uuid alreaddy exists
		if (uuidAlreadyExists) {
			this.song.manifest.name = this.song.manifest.name + " (copy)";
			this.song.manifest.uuid_DONT_CHANGE = v4();
			// have to reload the audio i don't know how much this would work since this loading takes time so
			const soundBuffer = getSound(`${oldUUID}-audio`).data.buf;
			loadSound(`${this.song.manifest.uuid_DONT_CHANGE}-audio`, soundBuffer as any);

			// also have to reload the cover this sucks
			FileManager.spriteToDataURL(`${oldUUID}-cover`).then((dataurl) => {
				loadSprite(`${this.song.manifest.uuid_DONT_CHANGE}-cover`, dataurl);
			});
		}
		else {
			// load default sound
			const newSoundBuffer = getSound("new-song-audio").data.buf;
			loadSound(`${this.song.manifest.uuid_DONT_CHANGE}-audio`, newSoundBuffer as any);

			// load default cover
			FileManager.spriteToDataURL("new-song-cover").then((dataurl) => {
				loadSprite(`${this.song.manifest.uuid_DONT_CHANGE}-cover`, dataurl);
			});
		}

		this.snapshotIndex = 0;
		this.snapshots = [JSON.parse(JSON.stringify(this))];
	}
}

// File that stores some of the chart editor behaviour backend
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
import { SongContent } from "../song";
import { PROP_BIG_SCALE } from "./EditorRenderer";
import "./EditorScene";
import { Content } from "../../core/loading/content";

/** The params for the chart editor */
export type paramsEditor = {
	/** The song */
	song: SongContent;
	playbackSpeed: number;
	seekTime: number;
};

/** Is either a note or an event */
export type ChartStamp = ChartNote | ChartEvent;

export type EditorAction = {
	shortcut: string;
	type: "File" | "Edit";
	action: (ChartState?: StateChart) => void;
};

/** Class that manages the snapshots of the chart */
export class ChartSnapshot {
	song: SongContent;
	selectedStamps: ChartStamp[] = [];
	command: string = undefined;
	constructor(song: SongContent, selectedStamps: ChartStamp[], command?: string) {
		this.song = song;
		this.selectedStamps = selectedStamps;
		this.command = command;
	}
}

/** Type for handling props of stuff drawing */
export type stampPropThing = {
	angle: number;
	scale: Vec2;
};

/** Class that manages every important variable in the chart editor
 * @param song The song you're going to be editing
 * @param playbackSpeed How fast it will be gooing
 * @param seekTime The time the scene will start at
 */
export class StateChart extends KaplayState {
	/** Static instance of the statechart */
	static instance: StateChart = null;

	bgColor: Color = rgb(92, 50, 172);
	song: SongContent;
	paused: boolean;
	conductor: Conductor;
	params: paramsEditor;

	inputDisabled: boolean = false;

	/** How many steps scrolled */
	scrollStep: number = 0;

	/** Is ChartState.scrollstep but lerped */
	lerpScrollStep = 0;

	/** Wheter the selection box is being shown */
	selectionBox = {
		/** The note that is the note the other notes move around when you're moving a bunch of notes */
		leadingStamp: undefined as ChartStamp,
		/** Wheter the selection box can be triggered */
		canSelect: false,
		width: 0,
		height: 0,
		/** The position it'll be drawn at (topleft) */
		pos: vec2(0),
		/** The last click position (initial pos) */
		clickPos: vec2(0),
		points: [vec2(), vec2(), vec2(), vec2()],
	};

	minimap = {
		/** Wheter can move the minimap */
		canMove: false,
		/** Wheter the minimap is being moved by the minimap controller */
		isMoving: false,
		/** The top position of the minimap controller */
		pos: vec2(width() / 2 + 52 * 2, 25),
	};

	doneEvents: ChartEvent[] = [];

	/** How much lerp to generally use */
	LERP = 0.5;

	/** Width and height of every square */
	SQUARE_SIZE = vec2(52, 52);

	/** The initial pos of the first square */
	INITIAL_POS = vec2(center().x, this.SQUARE_SIZE.y - this.SQUARE_SIZE.y / 2);

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

	/** Scale and angle of all stamps */
	stampProps = {
		notes: [] as stampPropThing[],
		events: [] as stampPropThing[],
	};

	/** The scale of the cursor */
	cursorScale = vec2(1);

	/** Array of all the selected things */
	selectedStamps: ChartStamp[] = [];

	/** Every time you do something, the new state will be pushed to this array */
	snapshots: ChartSnapshot[] = [];

	/** Current index of the current snapshot blah */
	snapshotIndex = 0;

	/** The things currently copied */
	clipboard: ChartStamp[] = [];

	/** The step that selected note started in before it was moved */
	stepForDetune = 0;

	/** Determines the current time in the song */
	strumlineStep = 0;

	input = {
		/** Click to place, click to drag and move, click to delete */
		trackEnabled: true,
		/** Ctrl + C, Ctrl + V, Etc */
		shortcutEnabled: true,
	};

	/** Object that holds some of the events in the state */
	events = {
		trigger(event: "notehit", arg?: any) {
			return getTreeRoot().trigger(event, arg);
		},

		onNoteHit(action: (note: ChartNote) => void) {
			return getTreeRoot().on("notehit", action);
		},
	};

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
		return utils.getPosInGrid(this.INITIAL_POS, step, 0, this.SQUARE_SIZE);
	}

	/** Unselects any stamp and the detune */
	resetSelectedStamps() {
	}

	/** Changes the current move */
	changeMove(newMove: Move) {
		this.currentMove = newMove;
		tween(1.5, 1, 0.1, (p) => this.cursorScale.x = p);
	}

	/** Add a note to the chart
	 * @returns The added note
	 */
	placeNote(time: number, move: Move) {
		this.takeSnapshot(`add ${move} note`);

		const noteWithSameTimeButDifferentMove = this.song.chart.notes.find(note =>
			note.time == time && note.move != move || note.time == time && note.move == move
		);
		// if there's a note already at that time but a different move, remove it
		if (noteWithSameTimeButDifferentMove) {
			this.deleteNote(noteWithSameTimeButDifferentMove);
		}

		// @ts-ignore
		const newNote: ChartNote = { time: time, move: move };
		this.song.chart.notes.push(newNote);
		this.song.chart.events.sort((a, b) => a.time - b.time);

		const indexInNotes = this.song.chart.notes.indexOf(newNote);
		this.stampProps.notes[indexInNotes] = { scale: vec2(1), angle: 0 };
		tween(PROP_BIG_SCALE, vec2(1), 0.1, (p) => this.stampProps.notes[indexInNotes].scale = p);
		this.selectedStamps.push(newNote);

		return newNote;
	}

	/** Remove a note from the chart
	 * @returns The removed note
	 */
	deleteNote(noteToRemove: ChartNote): ChartNote {
		this.takeSnapshot(`delete ${noteToRemove.move} note`);

		const oldNote = this.song.chart.notes.find(note => note == noteToRemove);
		if (oldNote == undefined) return;

		this.song.chart.notes = utils.removeFromArr(oldNote, this.song.chart.notes);
		this.selectedStamps = utils.removeFromArr(oldNote, this.selectedStamps);

		return oldNote;
	}

	/** Adds an event to the events array */
	placeEvent(time: number, id: eventId) {
		const newEvent: ChartEvent = { time: time, id: id, value: ChartEvent.eventSchema[id] };
		this.song.chart.events.push(newEvent);
		// now sort them in time order
		this.song.chart.events.sort((a, b) => a.time - b.time);

		const indexInEvents = this.song.chart.events.indexOf(newEvent);
		this.stampProps.events[indexInEvents] = { scale: vec2(1), angle: 0 };
		tween(PROP_BIG_SCALE, vec2(1), 0.1, (p) => this.stampProps.events[indexInEvents].scale = p);
		this.selectedStamps.push(newEvent);

		return newEvent;
	}

	/** Removes an event from the events array */
	deleteEvent(event: ChartEvent) {
		const oldEvent = event;

		this.song.chart.events = utils.removeFromArr(oldEvent, this.song.chart.events);
		this.song.chart.events.sort((a, b) => a.time - b.time);

		this.selectedStamps = utils.removeFromArr(oldEvent, this.selectedStamps);
		return oldEvent;
	}

	/** Pushes a snapshot of the current state of the chart */
	takeSnapshot(action?: string) {
		const snapshot = new ChartSnapshot(this.song, this.selectedStamps, action);
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
			this.selectedStamps = newState.selectedStamps;
			this.song = newState.song;
		}

		return null; // No more states to undo
	}

	/** Redoes the song and selected notes to latest snapshot */
	redo() {
		if (this.snapshotIndex < this.snapshots.length - 1) {
			this.snapshotIndex++;
			const newState: ChartSnapshot = JSON.parse(JSON.stringify(this.snapshots[this.snapshotIndex])); // Return deep copy of the state
			this.selectedStamps = newState.selectedStamps;
			this.song = newState.song;
		}

		return null; // No more states to redo
	}

	/** Gets the dancer at a current time in the song */
	getDancerAtTime(time: number = this.conductor.timeInSeconds): string {
		let dancerChangeEvents = this.song.chart.events.filter((event) => event.id == "change-dancer");

		// some stuff to remove faulty names from dancer list
		const dancersInEvents = dancerChangeEvents.map((ev) => ev.value.dancer);
		const allDancerNames = Content.loadedDancers.map((dancerFiles) => dancerFiles.dancerName);
		if (dancersInEvents.some((dancerInEvent) => allDancerNames.includes(dancerInEvent)) == false) {
			const indexOfFaultyDancer = dancerChangeEvents.findIndex((ev) =>
				dancersInEvents.some((dancerInEvent) => ev.value.dancer == dancerInEvent)
			);
			dancerChangeEvents = utils.removeFromArr(dancersInEvents[indexOfFaultyDancer], dancerChangeEvents);
		}

		if (dancerChangeEvents.length == 0 || time < dancerChangeEvents[0].time) {
			return GameSave.dancer;
		}

		for (const event in dancerChangeEvents) {
			if (dancerChangeEvents[event].time <= time) {
				return dancerChangeEvents[event].value.dancer;
			}
		}
	}

	/** Triggers an event for the game */
	triggerEvent(event: keyof typeof ChartEvent.eventSchema, args?: any) {
		getTreeRoot().trigger(event, args);
	}

	/** Runs when an event is triggered */
	onEvent(event: keyof typeof ChartEvent.eventSchema, action: (ev: any) => void) {
		return getTreeRoot().on(event, action);
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

		// the uuid alreaddy exists
		if (
			Content.loadedSongs.map((song) => song.manifest.uuid_DONT_CHANGE).includes(
				this.song.manifest.uuid_DONT_CHANGE,
			)
		) {
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
			FileManager.spriteToDataURL("defaultCover").then((dataurl) => {
				loadSprite(`${this.song.manifest.uuid_DONT_CHANGE}-cover`, dataurl);
			});
		}

		this.snapshotIndex = 0;
		this.snapshots = [JSON.parse(JSON.stringify(this))];
	}
}

// File that stores some of the chart editor behaviour backend
import { Color, Key, Vec2 } from "kaplay";
import { v4 } from "uuid";
import { Conductor } from "../../conductor";
import { GameSave } from "../../core/gamesave";
import { dancers, loadedSongs } from "../../core/loader";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { playMusic, playSound } from "../../core/plugins/features/sound";
import { transitionToScene } from "../../core/scenes";
import { fadeOut } from "../../core/transitions/fadeOutTransition";
import { FileManager } from "../../fileManaging";
import { utils } from "../../utils";
import { Move } from "../objects/dancer";
import { ChartNote } from "../objects/note";
import { ChartEvent, SongContent } from "../song";
import { PROP_BIG_SCALE } from "./editorRenderer";

/** Is either a note or an event */
export type ChartStamp = ChartNote | ChartEvent;
/** Wheter the stamp is a note or not */
export function isStampNote(stamp: ChartStamp) {
	return "move" in stamp;
}

export type EditorAction = {
	shortcut: string;
	type: "File" | "Edit";
	action: (ChartState?: StateChart) => void;
};

/** Class that manages the snapshots of the chart */
export class ChartSnapshot {
	song: SongContent;
	selectedStamps: ChartStamp[] = [];
	constructor(song: SongContent, selectedStamps: ChartStamp[]) {
		this.song = song;
		this.selectedStamps = selectedStamps;
	}
}

/** Type for handling props of stuff drawing */
export type stampPropThing = {
	angle: number;
	scale: Vec2;
};

/** Concatenates the stamps */
export function concatStamps(notes: ChartNote[], events: ChartEvent[]): ChartStamp[] {
	return [...notes, ...events];
}

/** Gets the closest stamp at a certain step
 *
 * If it's note it will account for trails of note [length]
 * @param step The step to find the note at
 */
export function findStampAtStep(step: number, ChartState: StateChart) {
	return {
		note() {
			const note = ChartState.song.chart.notes.find((note) =>
				Math.round(ChartState.conductor.timeToStep(note.time)) == step
			);
			if (note) return note;
			else {
				const longNotes = ChartState.song.chart.notes.filter((note) => note.length != undefined);
				const noteWithTrailAtStep = longNotes.find((note) => {
					const noteStep = Math.round(ChartState.conductor.timeToStep(note.time));
					if (utils.isInRange(step, noteStep, noteStep + note.length)) {
						return note;
					}
					else return undefined;
				});
				return noteWithTrailAtStep;
			}
		},
		event() {
			const event = ChartState.song.chart.events.find((event) => {
				Math.round(ChartState.conductor.timeToStep(event.time)) == step;
			});
			return event;
		},
	};
}

export function fixStamp(stamp: ChartStamp, ChartState: StateChart) {
	const isNote = isStampNote(stamp);
	const songDuration = ChartState.conductor.audioPlay.duration();
	// clamps from 0 to time
	stamp.time = clamp(stamp.time, 0, songDuration);

	function snapToClosestTime(t: number) {
		const stampStep = ChartState.conductor.timeToStep(t);
		const closestStep = Math.round(stampStep);
		return parseFloat(ChartState.conductor.stepToTime(closestStep).toFixed(2));
	}

	// clamps to closest step
	stamp.time = snapToClosestTime(stamp.time);

	if (isNote) {
		stamp.length = Math.round(stamp.length);
		if (isNaN(stamp.length)) stamp.length = undefined;
	}
}

/** Determins wheter there's a trail at a certain step
 * @param step The step to find the trail at
 */
export function trailAtStep(step: number, ChartState: StateChart): boolean {
	const note = findStampAtStep(step, ChartState).note();
	if (note) {
		const noteStep = Math.round(ChartState.conductor.timeToStep(note.time));
		if (note.length) {
			return utils.isInRange(step, noteStep + 1, noteStep + 1 + note.length);
		}
		else return false;
	}
	else return false;
}

/** Get the message for the clipboard */
export function clipboardMessage(action: "copy" | "cut" | "paste", clipboard: ChartStamp[]) {
	let message = "";

	const notesLength = clipboard.filter((thing) => isStampNote(thing)).length;
	const eventsLength = clipboard.filter((thing) => !isStampNote(thing)).length;
	const moreThanOneNote = notesLength > 1;
	const moreThanOneEvent = eventsLength > 1;

	const stringForAction = action == "copy" ? "Copied" : action == "cut" ? "Cut" : "Pasted";

	if (notesLength > 0 && eventsLength == 0) {
		message = `${stringForAction} ${notesLength} ${moreThanOneNote ? "notes" : "note"}!`;
	}
	else if (notesLength == 0 && eventsLength > 0) {
		message = `${stringForAction} ${eventsLength} ${moreThanOneEvent ? "events" : "event"}!`;
	}
	else if (notesLength > 0 && eventsLength > 0) {
		message = `${stringForAction} ${notesLength} ${moreThanOneNote ? "notes" : "note"} and ${eventsLength} ${
			moreThanOneEvent ? "events" : "event"
		}!`;
	}
	else if (notesLength == 0 && eventsLength == 0) message = `${stringForAction} nothing!`;

	return message;
}

/** Class that manages every important variable in the chart editor */
export class StateChart {
	bgColor: Color = rgb(92, 50, 172);
	song: SongContent;
	paused: boolean;
	conductor: Conductor;
	params: paramsChartEditor;

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

	/** All the ids for the events */
	events = {
		"change-scroll": { duration: 0, speed: 1.0, easing: ["linear"] },
		"cam-move": { duration: 0, x: 0, y: 0, zoom: 1, angle: 0, easing: ["linear"] },
		"play-anim": { anim: "victory", speed: 1, force: false, looped: false, ping_pong: false },
		"change-dancer": { dancer: "astri" },
	};

	/** The current selected event */
	currentEvent: keyof typeof this.events = "change-scroll";

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
	snapshots: StateChart[] = [];

	/** The things currently copied */
	clipboard: ChartStamp[] = [];

	/** The step that selected note started in before it was moved */
	stepForDetune = 0;

	/** Determines the current time in the song */
	strumlineStep = 0;

	/** Current index of the current snapshot blah */
	curSnapshotIndex = 0;

	/** Is an object that holds all the possible commands in the chart editor */
	commands = {
		"New": {
			shortcut: "Ctrl + N",
			type: "File",
			action: () => {
				this.createNewSong();
			},
		},

		"Open Chart": {
			shortcut: "Ctrl + O",
			type: "File",
			action: async (ChartState: StateChart) => {
				debug.log("wip");
			},
		},

		"Save chart\n": {
			shortcut: "Ctrl + Shift + S",
			type: "File",
			action: () => {
				downloadChart(this);
			},
		},

		"Exit": {
			shortcut: "Ctrl + Q",
			type: "File",
			action: () => {
				transitionToScene(fadeOut, "menu", { index: 0 });
			},
		},

		"Select all": {
			shortcut: "Ctrl + A",
			type: "Edit",
			action: () => {
				this.selectedStamps = concatStamps(this.song.chart.notes, this.song.chart.events);
			},
		},

		"Deselect": {
			shortcut: "Ctrl + D",
			type: "Edit",
			action: () => {
				this.selectedStamps = [];
			},
		},

		"Invert selection\n": {
			shortcut: "Ctrl + I",
			type: "Edit",
			action: () => {
				const allStamps = concatStamps(this.song.chart.notes, this.song.chart.events);
				this.selectedStamps = allStamps.filter((stamp) => !this.selectedStamps.includes(stamp));
			},
		},

		"Delete": {
			shortcut: "Backspace",
			type: "Edit",
			action: () => {
				if (this.selectedStamps.length == 0) return;
				this.takeSnapshot();

				this.selectedStamps.forEach((stamp) => {
					if (isStampNote(stamp)) this.deleteNote(stamp);
					else this.deleteEvent(stamp);
				});

				playSound("noteRemove", { detune: rand(-50, 50) });
				// there was an event in there
				if (this.selectedStamps.some((stamp) => !isStampNote(stamp))) {
					playSound("eventCog", { detune: rand(-50, 50) });
				}

				this.commands.Deselect.action();
			},
		},

		"Copy": {
			shortcut: "Ctrl + C",
			type: "Edit",
			action: () => {
				if (this.selectedStamps.length == 0) return;

				this.clipboard = this.selectedStamps;
				addFloatingText(clipboardMessage("copy", this.clipboard));
				playSound("noteCopy", { detune: rand(25, 50) });

				this.selectedStamps.forEach((stamp) => {
					if (isStampNote(stamp)) {
						const indexInNotes = this.song.chart.notes.indexOf(stamp);
						tween(
							choose([-1, 1]) * 20,
							0,
							0.5,
							(p) => this.stampProps.notes[indexInNotes].angle = p,
							easings.easeOutExpo,
						);
						tween(
							vec2(1.2),
							vec2(1),
							0.5,
							(p) => this.stampProps.notes[indexInNotes].scale = p,
							easings.easeOutExpo,
						);
					}
					else {
						const indexInEvents = this.song.chart.events.indexOf(stamp);
						tween(
							choose([-1, 1]) * 20,
							0,
							0.5,
							(p) => this.stampProps.events[indexInEvents].angle = p,
							easings.easeOutExpo,
						);
						tween(
							vec2(1.2),
							vec2(1),
							0.5,
							(p) => this.stampProps.events[indexInEvents].scale = p,
							easings.easeOutExpo,
						);
					}
				});
			},
		},

		"Cut": {
			shortcut: "Ctrl + X",
			type: "Edit",
			action: (() => {
				if (this.selectedStamps.length == 0) return;
				this.takeSnapshot();

				// some code from the copy action
				this.clipboard = this.selectedStamps;
				addFloatingText(clipboardMessage("cut", this.clipboard));
				playSound("noteCopy", { detune: rand(0, 25) });

				this.selectedStamps.forEach((stamp) => {
					if (isStampNote(stamp)) {
						this.deleteNote(stamp);
					}
					else {
						this.deleteEvent(stamp);
					}
				});
			}),
		},

		"Paste\n": {
			shortcut: "Ctrl + V",
			type: "Edit",
			action: () => {
				if (this.clipboard.length == 0) return;
				playSound("noteCopy", { detune: rand(-50, -25) });
				addFloatingText(clipboardMessage("paste", this.clipboard));

				this.clipboard.forEach((stamp) => {
					const newTime = stamp.time + this.conductor.stepToTime(this.hoveredStep);

					if (isStampNote(stamp)) {
						const newNote = this.placeNote(newTime, stamp.move);
						const indexInNotes = this.song.chart.notes.indexOf(newNote);
						if (indexInNotes == -1) return;
						tween(
							choose([-1, 1]) * 20,
							0,
							0.5,
							(p) => this.stampProps.notes[indexInNotes].angle = p,
							easings.easeOutExpo,
						);
					}
					else {
						const newEvent = this.placeEvent(newTime, stamp.id);
						const indexInEvents = this.song.chart.events.indexOf(newEvent);
						if (indexInEvents == -1) return;
						tween(
							choose([-1, 1]) * 20,
							0,
							0.5,
							(p) => this.stampProps.events[indexInEvents].angle = p,
							easings.easeOutExpo,
						);
					}
				});

				// shickiiii
				this.takeSnapshot();
			},
		},

		"Undo": {
			shortcut: "Ctrl + Z",
			type: "Edit",
			action: () => {
				let oldSongState = this.song;
				this.undo();

				if (oldSongState != this.song) {
					playSound("noteUndo", { detune: rand(-50, -25) });
				}
			},
		},

		"Redo": {
			shortcut: "Ctrl + Y",
			type: "Edit",
			action: () => {
				let oldSongState = this.song;
				this.redo();

				if (oldSongState != this.song) {
					playSound("noteUndo", { detune: rand(25, 50) });
				}
			},
		},
	};

	input = {
		/** Click to place, click to drag and move, click to delete */
		trackEnabled: true,
		/** Ctrl + C, Ctrl + V, Etc */
		shortcutEnabled: true,
	};

	/** Runs when the sound for the soundPlay has changed */
	updateAudio() {
		this.conductor.audioPlay.stop();
		this.conductor.audioPlay = playMusic(this.song.manifest.uuid_DONT_CHANGE + "-audio");
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
		this.selectedStamps = [];
		this.stepForDetune = 0;
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
		const oldNote = this.song.chart.notes.find(note => note == noteToRemove);
		if (oldNote == undefined) return;

		this.song.chart.notes = utils.removeFromArr(oldNote, this.song.chart.notes);
		this.selectedStamps = utils.removeFromArr(oldNote, this.selectedStamps);

		return oldNote;
	}

	/** Adds an event to the events array */
	placeEvent(time: number, id: string) {
		const newEvent: ChartEvent = { time: time, id: id, value: this.events[id] };
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
	takeSnapshot() {
		const snapshot = new ChartSnapshot(this.song, this.selectedStamps);
		// Remove any states ahead of the current index for redo to behave correctly
		this.snapshots = this.snapshots.slice(0, this.curSnapshotIndex + 1);

		// Add new state as a deep copy to avoid reference issues
		this.snapshots.push(JSON.parse(JSON.stringify(snapshot)));
		this.curSnapshotIndex++;
	}

	/** Undos the song and selected notes to latest snapshot */
	undo() {
		if (this.curSnapshotIndex > 0) {
			this.curSnapshotIndex--;
			// Return deep copy of the state
			const newState: ChartSnapshot = JSON.parse(JSON.stringify(this.snapshots[this.curSnapshotIndex]));
			this.selectedStamps = newState.selectedStamps;
			this.song = newState.song;
		}

		return null; // No more states to undo
	}

	/** Redoes the song and selected notes to latest snapshot */
	redo() {
		if (this.curSnapshotIndex < this.snapshots.length - 1) {
			this.curSnapshotIndex++;
			const newState: ChartSnapshot = JSON.parse(JSON.stringify(this.snapshots[this.curSnapshotIndex])); // Return deep copy of the state
			this.selectedStamps = newState.selectedStamps;
			this.song = newState.song;
		}

		return null; // No more states to redo
	}

	/** Gets the dancer at a current time in the song */
	getDancerAtTime(time: number = this.conductor.timeInSeconds) {
		let dancerChangeEvents = this.song.chart.events.filter((event) => event.id == "change-dancer");

		// some stuff to remove faulty names from dancer list
		const dancersInEvents = dancerChangeEvents.map((ev) => ev.value.dancer);
		const allDancerNames = dancers.map((dancerFiles) => dancerFiles.dancerName);
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
	triggerEvent(event: keyof typeof this.events, args?: any) {
		getTreeRoot().trigger(event, args);
	}

	/** Runs when an event is triggered */
	onEvent(event: keyof typeof this.events, action: (ev: any) => void) {
		return getTreeRoot().on(event, action);
	}

	/** Creates a new song */
	createNewSong() {
		const params: paramsChartEditor = {
			playbackSpeed: 1,
			seekTime: 0,
			dancer: GameSave.dancer ?? "astri",
			song: new SongContent(),
		};
		params.song.manifest.uuid_DONT_CHANGE = v4();
		Object.assign(this, new StateChart(params));
	}

	constructor(params: paramsChartEditor) {
		params.dancer = params.dancer ?? "astri";
		params.playbackSpeed = params.playbackSpeed ?? 1;
		params.playbackSpeed = Math.abs(clamp(params.playbackSpeed, 0, Infinity));
		params.seekTime = params.seekTime ?? 0;
		params.seekTime = Math.abs(clamp(params.seekTime, 0, Infinity));
		params.song = params.song ?? new SongContent();
		this.params = params;

		const oldUUID = params.song.manifest.uuid_DONT_CHANGE;

		// Creates a deep copy of the song so it doesn't overwrite the current song
		this.song = JSON.parse(JSON.stringify(this.params.song));

		// the uuid alreaddy exists
		if (loadedSongs.map((song) => song.manifest.uuid_DONT_CHANGE).includes(this.song.manifest.uuid_DONT_CHANGE)) {
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

		this.conductor = new Conductor({
			audioPlay: playMusic(`${this.song.manifest.uuid_DONT_CHANGE}-audio`, {
				speed: this.params.playbackSpeed,
			}),
			BPM: this.song.manifest.initial_bpm * this.params.playbackSpeed,
			timeSignature: this.song.manifest.time_signature,
			offset: 0,
		});
		this.conductor.audioPlay.seek(this.params.seekTime);
		this.paused = true;
		this.scrollToStep(this.conductor.timeToStep(this.params.seekTime));

		this.curSnapshotIndex = 0;
		this.snapshots = [JSON.parse(JSON.stringify(this))];
	}
}

/** The params for the chart editor */
export type paramsChartEditor = {
	song: SongContent;
	playbackSpeed: number;
	seekTime: number;
	dancer: string;
};

/** Converts the move to a detune, sounds good i think */
export function moveToDetune(move: Move) {
	switch (move) {
		case "left":
			return -50;
		case "down":
			return -100;
		case "up":
			return 100;
		case "right":
			return 50;
	}
}

/** RUns on update */
export function selectionBoxHandler(ChartState: StateChart) {
	if (isMousePressed("left")) {
		const canSelect = !get("hover", { recursive: true }).some((obj) => obj.isHovering())
			&& !ChartState.isCursorInGrid
			&& !get("editorTab").some((obj) => obj.isHovering)
			&& !ChartState.minimap.canMove;

		ChartState.selectionBox.canSelect = canSelect;
		if (ChartState.selectionBox.canSelect) {
			ChartState.selectionBox.clickPos = gameCursor.pos;
		}
	}

	if (isMouseDown("left") && ChartState.selectionBox.canSelect) {
		ChartState.selectionBox.width = Math.abs(gameCursor.pos.x - ChartState.selectionBox.clickPos.x);
		ChartState.selectionBox.height = Math.abs(gameCursor.pos.y - ChartState.selectionBox.clickPos.y);

		ChartState.selectionBox.pos.x = Math.min(ChartState.selectionBox.clickPos.x, gameCursor.pos.x);
		ChartState.selectionBox.pos.y = Math.min(ChartState.selectionBox.clickPos.y, gameCursor.pos.y);

		// # topleft
		// the pos will just be the pos of the selectionbox since it's anchor topleft
		ChartState.selectionBox.points[0] = ChartState.selectionBox.pos;

		// # topright
		// the x will be the same as topleft.x + width
		ChartState.selectionBox.points[1].x = ChartState.selectionBox.pos.x + ChartState.selectionBox.width;
		// y will be the same as topleft.y
		ChartState.selectionBox.points[1].y = ChartState.selectionBox.pos.y;

		// # bottomleft
		// the x will be the same as points[0].x
		ChartState.selectionBox.points[2].x = ChartState.selectionBox.pos.x;
		// the y will be pos.y + height
		ChartState.selectionBox.points[2].y = ChartState.selectionBox.pos.y + ChartState.selectionBox.height;

		// # bottomright
		// the x will be the same as topright x pos
		ChartState.selectionBox.points[3].x = ChartState.selectionBox.points[1].x;
		// the y will be the same as bottom left
		ChartState.selectionBox.points[3].y = ChartState.selectionBox.points[2].y;
	}

	if (isMouseReleased("left") && ChartState.selectionBox.canSelect) {
		const theRect = new Rect(
			ChartState.selectionBox.pos,
			ChartState.selectionBox.width,
			ChartState.selectionBox.height,
		);

		const oldSelectStamps = ChartState.selectedStamps;
		// ChartState.selectedStamps = [];

		const combined = concatStamps(ChartState.song.chart.notes, ChartState.song.chart.events);

		combined.forEach((stamp) => {
			let stampPos = ChartState.stepToPos(ChartState.conductor.timeToStep(stamp.time));
			stampPos.y -= ChartState.SQUARE_SIZE.y * ChartState.lerpScrollStep;
			if (!isStampNote(stamp)) stampPos.x = ChartState.INITIAL_POS.x + ChartState.SQUARE_SIZE.x;

			// is the topleft of the position
			const posInScreen = vec2(
				stampPos.x - ChartState.SQUARE_SIZE.x / 2,
				stampPos.y - ChartState.SQUARE_SIZE.y / 2,
			);

			// this is for long notes
			let otherPossiblePos = posInScreen;

			if (isStampNote(stamp) && stamp.length) {
				otherPossiblePos.y += ChartState.SQUARE_SIZE.y * stamp.length;
			}

			// these are the positions in all 4 corners
			const possiblePos = [
				posInScreen, // topleft
				vec2(posInScreen.x + ChartState.SQUARE_SIZE.x, posInScreen.y), // topright
				vec2(posInScreen.x, posInScreen.y + ChartState.SQUARE_SIZE.y), // bottomleft
				vec2(posInScreen.x + ChartState.SQUARE_SIZE.x, posInScreen.y + ChartState.SQUARE_SIZE.y), // bottomright
			];

			// goes through each one and seeis if they're in the selection box
			for (const posy in possiblePos) {
				if (theRect.contains(possiblePos[posy]) || theRect.contains(otherPossiblePos)) {
					ChartState.selectedStamps.push(stamp);
					break;
				}
			}
		});

		const newSelectStamps = ChartState.selectedStamps;

		if (oldSelectStamps != newSelectStamps) ChartState.takeSnapshot();

		ChartState.selectionBox.clickPos = vec2(0, 0);
		ChartState.selectionBox.points = [vec2(0, 0), vec2(0, 0), vec2(0, 0), vec2(0, 0)];
		ChartState.selectionBox.pos = vec2(0, 0);
		ChartState.selectionBox.width = 0;
		ChartState.selectionBox.height = 0;
	}
}

export function minimapHandler(ChartState: StateChart) {
	const minLeft = ChartState.minimap.pos.x - ChartState.SQUARE_SIZE.x / 2;
	const maxRight = ChartState.minimap.pos.x + ChartState.SQUARE_SIZE.x / 2;

	/** How big a note is depending on the amount of total steps */
	const SIZE = vec2(ChartState.SQUARE_SIZE.x / 3, height() / ChartState.conductor.totalSteps);
	const heightOfMinimap = SIZE.y * 11;

	if (gameCursor.pos.x >= minLeft && gameCursor.pos.x <= maxRight) ChartState.minimap.canMove = true;
	else if (
		(gameCursor.pos.x < ChartState.minimap.pos.x || gameCursor.pos.x > ChartState.minimap.pos.x)
		&& !ChartState.minimap.isMoving
	) ChartState.minimap.canMove = false;

	if (!ChartState.minimap.isMoving) {
		ChartState.minimap.pos.y = mapc(
			ChartState.scrollStep,
			0,
			ChartState.conductor.totalSteps,
			0,
			height() - heightOfMinimap,
		);
	}

	if (ChartState.minimap.canMove) {
		if (isMousePressed("left")) {
			ChartState.minimap.isMoving = true;
			if (!ChartState.paused) ChartState.paused = true;
		}
		else if (isMouseReleased("left") && ChartState.minimap.isMoving) {
			ChartState.minimap.isMoving = false;
		}

		if (ChartState.minimap.isMoving) {
			ChartState.minimap.pos.y = gameCursor.pos.y;
			ChartState.minimap.pos.y = clamp(ChartState.minimap.pos.y, 0, height() - heightOfMinimap);

			const newStep = mapc(
				ChartState.minimap.pos.y,
				0,
				height() - heightOfMinimap,
				0,
				ChartState.conductor.totalSteps,
			);

			ChartState.scrollToStep(newStep);
		}
	}
}

/** Handles the animation of the mouse */
export function setMouseAnimConditions(ChartState: StateChart) {
	gameCursor.addAnimCondition(() => {
		// then the ones for the actual charting state
		// kinda hardcoded, this probably just means the player is loading something nothing  else
		if (!gameCursor.canMove && ChartState.inputDisabled) gameCursor.do("load");
		else {
			if (!ChartState.isCursorInGrid) {
				if (isMouseDown("left") && ChartState.minimap.isMoving) gameCursor.do("down");
				else gameCursor.do("default");
			}
			else {
				if (!isMouseDown("left") && !isMouseDown("right")) gameCursor.do("up");
				else if (isMouseDown("left") && !isMouseDown("right")) gameCursor.do("down");
				else if (!isMouseDown("left") && isMouseDown("right")) gameCursor.do("x");
			}
		}
	});
}

const keysAndMoves = {
	"1": "left",
	"2": "down",
	"3": "up",
	"4": "right",
};

/** Creates the 'isKeyPressed' event to change notes */
export function moveHandler(ChartState: StateChart) {
	Object.keys(keysAndMoves).forEach((key) => {
		if (isKeyPressed(key as Key)) {
			ChartState.changeMove(keysAndMoves[key]);
		}
	});
}

/** Goes through each shortcut in the commands object and checks if it's pressed, if its run the command */
export function parseActions(ChartState: StateChart) {
	Object.values(ChartState.commands).forEach((action) => {
		const keys: Key[] = [];

		action.shortcut.split("+").forEach((key) => {
			key = key.toLowerCase();
			key = key.replace(" ", "");
			if (key == "ctrl") key = "control";
			keys.push(key);
		});

		const condition = () => {
			if (!ChartState.input.shortcutEnabled) return false;

			if (
				keys.every((key) => {
					return (key == "control" || key == "shift") ? isKeyDown(key) : isKeyPressedRepeat(key);
				})
			) return true;
			else return false;
		};

		if (condition()) {
			action.action(ChartState);
		}
	});
}

/** Adds a cool little floating text */
export function addFloatingText(texting: string) {
	const copyText = add([
		text(texting, { align: "left", size: 20 }),
		pos(gameCursor.pos),
		anchor("left"),
		fixed(),
		color(3, 252, 73),
		opacity(),
		timer(),
	]);

	copyText.tween(copyText.pos.y, copyText.pos.y - rand(25, 35), 0.5, (p) => copyText.pos.y = p, easings.easeOutQuint)
		.onEnd(() => {
			copyText.fadeOut(0.25).onEnd(() => copyText.destroy());
		});

	return copyText;
}

export async function downloadChart(ChartState: StateChart) {
	getTreeRoot().trigger("download");

	const SongFolder = await FileManager.writeSongFolder(ChartState.song);

	// downloads the zip
	downloadBlob(`${ChartState.song.manifest.name}.zip`, SongFolder);
	debug.log(`${ChartState.song.manifest.name}.zip, DOWNLOADED! :)`);
}

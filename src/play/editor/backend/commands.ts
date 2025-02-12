import { cloneDeep } from "lodash";
import { switchScene } from "../../../core/scenes/KaplayState";
import { Sound } from "../../../core/sound";
import { ChartEvent, EventDataDefaults, eventId } from "../../../data/event/event";
import { SongContent } from "../../../data/song";
import { FileManager } from "../../../FileManager";
import { MenuState } from "../../../ui/menu/MenuState";
import { addNotification } from "../../../ui/objects/notification";
import { Move } from "../../objects/dancer";
import { ChartNote } from "../../objects/note";
import { EditorState } from "../EditorState";
import { EditorEvent, EditorNote, EditorStamp } from "../objects/stamp";
import { addFloatyText, editorUtils } from "./utils";

// thank you StackOverflow user ford04
// export type DropFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;

/** Interface containing the properties of a command */
export interface IEditorCommand {
	do(...args: any[]): any;
	toString(...args: any[]): string;
	addToHistory: boolean;
}

/** Object containing the most important commands of the chart editor */
export const commands = {
	"Copy": {
		do(stamps: EditorStamp[] = EditorState.instance.selected) {
			if (stamps.length == 0) return;

			EditorState.instance.clipboard = cloneDeep(stamps);
			addFloatyText(EditorState.utils.clipboardMessage("copy", EditorState.instance.clipboard));
			Sound.playSound("noteCopy", { detune: rand(25, 50) });

			stamps.forEach((stamp) => {
				stamp.twist();
				stamp.bop();
			});
		},
		toString(stamps: EditorStamp[] = EditorState.instance.selected) {
			return "copied" + EditorState.utils.boxSortStamps(stamps).toString();
		},
		addToHistory: false,
	},
	"Cut": {
		do(stamps: EditorStamp[] = EditorState.instance.selected) {
			if (stamps.length == 0) return;

			// some code from the copy action
			EditorState.instance.clipboard = stamps;
			addFloatyText(EditorState.utils.clipboardMessage("cut", EditorState.instance.clipboard));
			Sound.playSound("noteCopy", { detune: rand(0, 25) });

			stamps.forEach((stamp) => {
				if (stamp.is("note")) EditorState.instance.deleteNote(stamp);
				else if (stamp.is("event")) EditorState.instance.deleteEvent(stamp);
			});
		},
		toString(stamps: EditorStamp[] = EditorState.instance.selected) {
			return `cut ${EditorState.utils.boxSortStamps(stamps).toString()}`;
		},
		addToHistory: true,
	},
	"Paste": {
		do(stamps: EditorStamp[] = EditorState.instance.clipboard) {
			if (stamps.length == 0) return;
			stamps = cloneDeep(stamps);

			Sound.playSound("noteCopy", { detune: rand(-50, -25) });
			addFloatyText(EditorState.utils.clipboardMessage("paste", stamps));

			// sorts them timely
			stamps.sort((b, a) => b.data.time - a.data.time);
			const ogSteps = stamps.map((stamp) => stamp.step);
			stamps.forEach((stamp, index) => {
				if (stamp.step == stamps[0].step) stamp.step = 0; // if the stamp is at the lowest step turn it to 0
				else stamp.step = stamps[index].step - ogSteps[0]; // if not, get the difference to the lowest

				// this turns them to low value range, which i can sum hoveredStep to, then it will work :)
				const newStep = stamp.step + EditorState.instance.hoveredStep;
				if (stamp.is("note")) commands.PlaceNote.do(false, newStep, stamp.data.move, stamp.data.length);
				else if (stamp.is("event")) commands.PlaceEvent.do(false, newStep, stamp.data.id, stamp.data.data);
				stamp.twist();
			});
		},
		toString(stamps: EditorStamp[] = EditorState.instance.selected) {
			return `pasted ${EditorState.utils.boxSortStamps(stamps).toString()}`;
		},
		addToHistory: true,
	},
	/** Place a note (cooler)
	 * @param doSound Wheter to play a sound when it's added
	 * @param step? The step to place te note in
	 * @param move The move the note will be
	 */
	"PlaceNote": {
		do(doSound: boolean = true, step: number = EditorState.instance.hoveredStep, move: Move = EditorState.instance.currentMove, length: number = undefined) {
			const note = EditorState.instance.placeNote({ time: EditorState.instance.conductor.stepToTime(step), move, length });
			note.selected = true;
			note.bop();

			// do some other things :)
			if (doSound) note.addSound();

			return note;
		},
		toString(doSound: boolean = true, step: number = EditorState.instance.hoveredStep, move: Move = EditorState.instance.currentMove) {
			return `place ${move} note`;
		},
		addToHistory: true,
	},
	/** Delete note (cooler)
	 * @param doSound Wheter to do the sound
	 * @param note The note to remove
	 */
	"DeleteNote": {
		do(doSound: boolean = true, note: EditorNote) {
			EditorState.instance.deleteNote(note);
			if (doSound) note.deleteSound();
			return note;
		},
		toString(doSound: boolean = true, note: EditorNote) {
			return `delete ${note.data.move} note`;
		},
		addToHistory: true,
	},
	/** Place am event (cooler)
	 * @param doSound Wheter to play a sound when it's added
	 * @param step? The step to place the event in
	 * @param move The move the event will be
	 */
	"PlaceEvent": {
		do<T extends eventId = eventId>(
			doSound: boolean = true,
			step: number = EditorState.instance.hoveredStep,
			id: eventId = EditorState.instance.currentEvent,
			data?: EventDataDefaults[T],
		) {
			data = data ?? ChartEvent.getDefault(id);
			const event = EditorState.instance.placeEvent({ time: EditorState.instance.conductor.stepToTime(step), id, data: data });
			event.selected = true;
			event.bop();

			// do some other things :)
			if (doSound) event.addSound();

			return event;
		},
		toString<T extends eventId = eventId>(
			doSound: boolean = true,
			step: number = EditorState.instance.hoveredStep,
			id: eventId = EditorState.instance.currentEvent,
			data?: EventDataDefaults[T],
		) {
			return `place ${id} event`;
		},
		addToHistory: true,
	},
	"DeleteEvent": {
		do(doSound: boolean = true, event: EditorEvent) {
			EditorState.instance.takeSnapshot(`deleted ${event.data.id} event`);
			EditorState.instance.deleteEvent(event);
			if (doSound) event.deleteSound();
			return event;
		},
		toString(doSound: boolean = true, event: EditorEvent) {
			return `delete ${event.data.id} event`;
		},
		addToHistory: true,
	},
	/**
	 * Selects an array of stamps, if nothing is passed all will be selected
	 * @param stamps Stamps to select
	 */
	"SelectStamps": {
		do(stamps: EditorStamp[] = EditorStamp.mix(EditorState.instance.notes, EditorState.instance.events)) {
			stamps.forEach((stamp) => stamp.selected = true);
		},
		toString(stamps: EditorStamp[] = EditorStamp.mix(EditorState.instance.notes, EditorState.instance.events)) {
			return `selected ${EditorState.utils.boxSortStamps(stamps).toString()}`;
		},
		addToHistory: true,
	},
	/** Deselect stamps, if nothing is passed will deselect all selected */
	"DeselectStamps": {
		do(stamps: EditorStamp[] = EditorState.instance.selected) {
			stamps.forEach((stamp) => stamp.selected = false);
		},
		toString(stamps: EditorStamp[] = EditorState.instance.selected) {
			return `deselected ${EditorState.utils.boxSortStamps(stamps).toString()}`;
		},
		addToHistory: false,
	},
	"InvertSelection": {
		do() {
			EditorState.instance.takeSnapshot("invert selection");
			const allStamps = EditorStamp.mix(EditorState.instance.notes, EditorState.instance.events);
			allStamps.forEach((stamp) => stamp.selected = !stamp.selected);
		},
		toString() {
			return "inverted selection";
		},
		addToHistory: true,
	},
	"DeleteStamps": {
		do(stamps: EditorStamp[] = EditorState.instance.selected) {
			if (stamps.length == 0) return;

			stamps.forEach((stamp) => {
				if (stamp.is("note")) EditorState.instance.deleteNote(stamp);
				else if (stamp.is("event")) EditorState.instance.deleteEvent(stamp);
			});

			Sound.playSound("noteDelete", { detune: rand(-50, 50) });

			// there was an event in there
			if (stamps.some((stamp) => stamp.is("event"))) {
				Sound.playSound("eventCog", { detune: rand(-50, 50) });
			}
		},
		toString(stamps: EditorStamp[] = EditorState.instance.selected) {
			if (stamps.length == 0) return;
			return `delete ${EditorState.utils.boxSortStamps(stamps).toString()}`;
		},
		addToHistory: true,
	},
	"FlipMoves": {
		do(notes: EditorNote[] = EditorState.instance.selected.filter((stamp) => stamp.is("note"))) {
			if (notes.length < 1) return;
			notes.forEach((note) => {
				note.data.move = ChartNote.invertMove(note.data.move);
				note.twist();
				note.bop();
			});

			const sound = notes[0].addSound();
			sound.detune -= rand(500, 600);
		},
		addToHistory: true,
		toString(notes: EditorNote[] = EditorState.instance.selected.filter((stamp) => stamp.is("note"))) {
			return `inverted ${notes.length} notes`;
		},
	},
} as const satisfies Record<string, IEditorCommand>; // thank you reddit user u/musical_bear

export function coolUndo() {
	const oldSong = EditorState.instance.song;
	const newSong = EditorState.instance.undo()?.song;
	if (!newSong) return;

	if (oldSong != newSong) {
		Sound.playSound("undo", { detune: rand(-50, -25) });
		addNotification(`undid: "${EditorState.instance.snapshots[EditorState.instance.snapshotIndex + 1].command}"`);
	}
}

export function coolRedo() {
	const oldSong = EditorState.instance.song;
	const newSong = EditorState.instance.redo()?.song;
	if (!newSong) return;

	if (oldSong != newSong) {
		Sound.playSound("undo", { detune: rand(25, 50) });
		addNotification(`redid: "${EditorState.instance.snapshots[EditorState.instance.snapshotIndex].command}"`);
	}
}

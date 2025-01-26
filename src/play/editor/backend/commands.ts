import { KaplayState } from "../../../core/scenes/KaplayState";
import { Sound } from "../../../core/sound";
import { StateMenu } from "../../../ui/menu/MenuScene";
import { ChartEvent, eventId } from "../../event";
import { Move } from "../../objects/dancer";
import { ChartNote } from "../../objects/note";
import { StateChart } from "../EditorState";
import { EditorEvent, EditorNote, EditorStamp } from "../objects/stamp";
import { addFloatyText, addLogText } from "./utils";

export const editorCommands = {
	NewChart: () => {
		StateChart.instance.createNewSong();
	},

	OpenChart: () => {
		debug.log("wip");
	},

	SaveChart: () => {
		StateChart.instance.downloadChart();
	},

	Exit: () => {
		KaplayState.switchState(new StateMenu("editor"));
	},

	SelectAll: () => {
		StateChart.instance.takeSnapshot("selected all");
		EditorStamp.mix(StateChart.instance.notes, StateChart.instance.events).forEach((stamp) => stamp.selected = true);
	},

	/** Place a note (cooler)
	 * @param doSound Wheter to play a sound when it's added
	 * @param step? The step to place te note in
	 * @param move The move the note will be
	 */
	PlaceNote(doSound: boolean = true, step: number = StateChart.instance.hoveredStep, move: Move = StateChart.instance.currentMove) {
		StateChart.instance.takeSnapshot(`added ${move} note`);
		const note = StateChart.instance.placeNote({ time: StateChart.instance.conductor.stepToTime(step), move: move });
		note.selected = true;
		note.bop();

		// do some other things :)
		if (doSound) note.addSound();
		note.onHit(() => {
			Sound.playSound("noteHit", { detune: ChartNote.moveToDetune(note.data.move) + rand(10, 20) });
		});

		return note;
	},

	/** Delete note (cooler)
	 * @param doSound Wheter to do the sound
	 * @param note The note to remove
	 */
	DeleteNote(doSound: boolean = true, note: EditorNote) {
		StateChart.instance.takeSnapshot(`deleted ${note.data.move} note`);
		StateChart.instance.deleteNote(note);
		if (doSound) note.deleteSound();
		return note;
	},

	/** Place am event (cooler)
	 * @param doSound Wheter to play a sound when it's added
	 * @param step? The step to place the event in
	 * @param move The move the event will be
	 */
	PlaceEvent(doSound: boolean = true, step: number = StateChart.instance.hoveredStep, id: eventId = StateChart.instance.currentEvent) {
		StateChart.instance.takeSnapshot(`added ${id} event`);
		const defaultValue = ChartEvent.eventSchema[id];
		const event = StateChart.instance.placeEvent({ time: StateChart.instance.conductor.stepToTime(step), id, value: defaultValue });
		event.selected = true;
		event.bop();

		// do some other things :)
		if (doSound) event.addSound();
		event.onHit(() => {
			Sound.playSound("noteHit", { detune: Object.keys(ChartEvent.eventSchema).indexOf(id) + rand(10, 20) });
		});

		return event;
	},

	/** Delete Event (cooler)
	 * @param doSound Wheter to do the sound
	 * @param Event The Event to remove
	 */
	DeleteEvent(doSound: boolean = true, event: EditorEvent) {
		StateChart.instance.takeSnapshot(`deleted ${event.data.id} event`);
		StateChart.instance.deleteEvent(event);
		if (doSound) event.deleteSound();
		return Event;
	},

	DeselectAll: () => {
		StateChart.instance.selected.forEach((stamp) => stamp.selected = false);
	},

	InvertSelection: () => {
		StateChart.instance.takeSnapshot("invert selection");
		const allStamps = EditorStamp.mix(StateChart.instance.notes, StateChart.instance.events);
		allStamps.forEach((stamp) => stamp.selected = !stamp.selected);
	},

	DeleteMultiple(stamps?: EditorStamp[]) {
		const ChartState = StateChart.instance;
		stamps = stamps ?? ChartState.selected;
		if (stamps.length == 0) return;
		ChartState.takeSnapshot(`delete ${stamps.length} stamps`);

		stamps.forEach((stamp) => {
			if (stamp.is("note")) ChartState.deleteNote(stamp);
			else if (stamp.is("event")) ChartState.deleteEvent(stamp);
		});

		Sound.playSound("noteDelete", { detune: rand(-50, 50) });

		// there was an event in there
		if (stamps.some((stamp) => stamp.is("event"))) {
			Sound.playSound("eventCog", { detune: rand(-50, 50) });
		}
	},

	Copy(stamps?: EditorStamp[]) {
		stamps = stamps ?? StateChart.instance.selected;
		if (stamps.length == 0) return;

		StateChart.instance.clipboard = stamps;
		addFloatyText(StateChart.utils.clipboardMessage("copy", StateChart.instance.clipboard));
		Sound.playSound("noteCopy", { detune: rand(25, 50) });

		stamps.forEach((stamp) => {
			stamp.twist();
			stamp.bop();
		});
	},

	Cut(stamps?: EditorStamp[]) {
		const ChartState = StateChart.instance;
		stamps = stamps ?? StateChart.instance.selected;
		if (stamps.length == 0) return;
		ChartState.takeSnapshot(`cut ${stamps.length} stamps`);

		// some code from the copy action
		ChartState.clipboard = stamps;
		addFloatyText(StateChart.utils.clipboardMessage("cut", ChartState.clipboard));
		Sound.playSound("noteCopy", { detune: rand(0, 25) });

		stamps.forEach((stamp) => {
			if (stamp.is("note")) ChartState.deleteNote(stamp);
			else if (stamp.is("event")) ChartState.deleteEvent(stamp);
		});
	},

	Paste(stamps?: EditorStamp[]) {
		const ChartState = StateChart.instance;
		stamps = stamps ?? ChartState.clipboard;
		if (stamps.length == 0) return;

		// shickiiii
		ChartState.takeSnapshot(`pasted ${stamps.length} stamps`);

		Sound.playSound("noteCopy", { detune: rand(-50, -25) });
		addFloatyText(StateChart.utils.clipboardMessage("paste", stamps));

		stamps.forEach((stamp) => {
			const newTime = stamp.data.time + ChartState.conductor.stepToTime(ChartState.hoveredStep);
			const newStep = StateChart.instance.conductor.timeToStep(newTime);
			if (stamp.is("note")) StateChart.commands.PlaceNote(false, newStep, stamp.data.move);
			// else if (stamp.is("event")) ChartState.placeEvent({ time: newTime, ...stamp.data });
			stamp.twist();
		});
	},

	Undo: () => {
		const oldSong = StateChart.instance.song;
		const newSong = StateChart.instance.undo()?.song;
		if (!newSong) return;

		if (oldSong != newSong) {
			Sound.playSound("undo", { detune: rand(-50, -25) });
			addLogText(`undid: "${StateChart.instance.snapshots[StateChart.instance.snapshotIndex].command}"`);
		}
	},

	Redo: () => {
		const oldSong = StateChart.instance.song;
		const newSong = StateChart.instance.redo()?.song;
		if (!newSong) return;

		if (oldSong != newSong) {
			Sound.playSound("undo", { detune: rand(25, 50) });
			addLogText(`redid: "${StateChart.instance.snapshots[StateChart.instance.snapshotIndex].command}"`);
		}
	},
};

import { cloneDeep } from "lodash";
import { KaplayState } from "../../../core/scenes/KaplayState";
import { Sound } from "../../../core/sound";
import { ChartEvent, EventDataDefaults, eventId } from "../../../data/event/event";
import { SongContent } from "../../../data/song";
import { FileManager } from "../../../FileManager";
import { StateMenu } from "../../../ui/menu/MenuScene";
import { addNotification } from "../../../ui/objects/notification";
import { Move } from "../../objects/dancer";
import { StateChart } from "../EditorState";
import { EditorEvent, EditorNote, EditorStamp } from "../objects/stamp";
import { addFloatyText } from "./utils";

export const editorCommands = {
	NewChart: async () => {
		const loading = FileManager.loadingScreen();
		await StateChart.instance.changeSong(new SongContent());
		loading.cancel();
	},

	OpenChart: async () => {
		const loading = FileManager.loadingScreen();
		const songFile = await FileManager.receiveFile("mod");
		if (!songFile) {
			loading.cancel();
			return;
		}

		const assets = await SongContent.parseFromFile(songFile);
		const content = await SongContent.load(assets);

		// TODO: What...
		if (content.isDefault) {
			StateChart.instance.changeSong(cloneDeep(content));
			addNotification(`Editor: Editing ${content.manifest.name}`);
		}
		else if (content.manifest.uuid_DONT_CHANGE == StateChart.instance.song.manifest.uuid_DONT_CHANGE) {
			StateChart.instance.changeSong(content);
			addNotification(`[warning]Warning:[/warning] Overwrote "${StateChart.instance.song.manifest.name}" by "${content.manifest.name}" since they have the same UUID`, 5);
		}
		// else {
		// 	StateChart.instance.changeSong(cloneDeep(content));
		// }

		loading.cancel();
	},

	SaveChart: () => {
		StateChart.instance.downloadChart();
	},

	Exit: () => {
		StateChart.instance.conductor.destroy();
		KaplayState.switchState(StateMenu, "editor");
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
	PlaceEvent<T extends eventId = eventId>(
		doSound: boolean = true,
		step: number = StateChart.instance.hoveredStep,
		id: eventId = StateChart.instance.currentEvent,
		data?: EventDataDefaults[T],
	) {
		StateChart.instance.takeSnapshot(`added ${id} event`);
		data = data ?? ChartEvent.getDefault(id);
		const event = StateChart.instance.placeEvent({ time: StateChart.instance.conductor.stepToTime(step), id, data: data });
		event.selected = true;
		event.bop();

		// do some other things :)
		if (doSound) event.addSound();

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
		ChartState.takeSnapshot(`deleted ${StateChart.utils.boxSortStamps(stamps).toString()}`);

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

		return stamps;
	},

	Cut(stamps?: EditorStamp[]) {
		const ChartState = StateChart.instance;
		stamps = stamps ?? StateChart.instance.selected;
		if (stamps.length == 0) return;
		ChartState.takeSnapshot(`cut ${StateChart.utils.boxSortStamps(stamps).toString()}`);

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
		stamps = cloneDeep(stamps);
		if (stamps.length == 0) return;

		// shickiiii
		ChartState.takeSnapshot(`pasted ${StateChart.utils.boxSortStamps(stamps).toString()}`);

		Sound.playSound("noteCopy", { detune: rand(-50, -25) });
		addFloatyText(StateChart.utils.clipboardMessage("paste", stamps));

		// sorts them timely
		stamps.sort((b, a) => b.data.time - a.data.time);
		const ogSteps = stamps.map((stamp) => stamp.step);
		stamps.forEach((stamp, index) => {
			if (stamp.step == stamps[0].step) stamp.step = 0; // if the stamp is at the lowest step turn it to 0
			else stamp.step = stamps[index].step - ogSteps[0]; // if not, get the difference to the lowest

			// this turns them to low value range, which i can sum hoveredStep to, then it will work :)
			const newStep = stamp.step + ChartState.hoveredStep;
			if (stamp.is("note")) StateChart.commands.PlaceNote(false, newStep, stamp.data.move);
			else if (stamp.is("event")) StateChart.commands.PlaceEvent(false, newStep, stamp.data.id, stamp.data.data);
			stamp.twist();
		});

		return stamps;
	},

	Undo: () => {
		const oldSong = StateChart.instance.song;
		const newSong = StateChart.instance.undo()?.song;
		if (!newSong) return;

		if (oldSong != newSong) {
			Sound.playSound("undo", { detune: rand(-50, -25) });
			addNotification(`undid: "${StateChart.instance.snapshots[StateChart.instance.snapshotIndex].command}"`);
		}
	},

	Redo: () => {
		const oldSong = StateChart.instance.song;
		const newSong = StateChart.instance.redo()?.song;
		if (!newSong) return;

		if (oldSong != newSong) {
			Sound.playSound("undo", { detune: rand(25, 50) });
			addNotification(`redid: "${StateChart.instance.snapshots[StateChart.instance.snapshotIndex].command}"`);
		}
	},
};

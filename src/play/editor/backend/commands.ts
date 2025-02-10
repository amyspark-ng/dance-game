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
import { addFloatyText } from "./utils";

export const editorCommands = {
	NewChart: async () => {
		const loading = FileManager.loadingScreen();
		await EditorState.instance.changeSong(new SongContent());
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
		const content = await SongContent.load(assets, true);

		// TODO: What...
		if (content.isDefault) {
			EditorState.instance.changeSong(cloneDeep(content));
			addNotification(`Editor: Editing ${content.manifest.name}`);
		}
		else if (content.manifest.uuid_DONT_CHANGE == EditorState.instance.song.manifest.uuid_DONT_CHANGE) {
			EditorState.instance.changeSong(content);
			addNotification(`[warning]Warning:[/warning] Overwrote "${EditorState.instance.song.manifest.name}" by "${content.manifest.name}" since they have the same UUID`, 5);
		}
		// else {
		// 	StateChart.instance.changeSong(cloneDeep(content));
		// }

		loading.cancel();
	},

	SaveChart: () => {
		EditorState.instance.downloadChart();
	},

	Exit: () => {
		EditorState.instance.conductor.destroy();
		switchScene(MenuState, "editor");
	},

	SelectAll: () => {
		EditorState.instance.takeSnapshot("selected all");
		EditorStamp.mix(EditorState.instance.notes, EditorState.instance.events).forEach((stamp) => stamp.selected = true);
	},

	/** Place a note (cooler)
	 * @param doSound Wheter to play a sound when it's added
	 * @param step? The step to place te note in
	 * @param move The move the note will be
	 */
	PlaceNote(doSound: boolean = true, step: number = EditorState.instance.hoveredStep, move: Move = EditorState.instance.currentMove) {
		EditorState.instance.takeSnapshot(`added ${move} note`);
		const note = EditorState.instance.placeNote({ time: EditorState.instance.conductor.stepToTime(step), move: move });
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
		EditorState.instance.takeSnapshot(`deleted ${note.data.move} note`);
		EditorState.instance.deleteNote(note);
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
		step: number = EditorState.instance.hoveredStep,
		id: eventId = EditorState.instance.currentEvent,
		data?: EventDataDefaults[T],
	) {
		EditorState.instance.takeSnapshot(`added ${id} event`);
		data = data ?? ChartEvent.getDefault(id);
		const event = EditorState.instance.placeEvent({ time: EditorState.instance.conductor.stepToTime(step), id, data: data });
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
		EditorState.instance.takeSnapshot(`deleted ${event.data.id} event`);
		EditorState.instance.deleteEvent(event);
		if (doSound) event.deleteSound();
		return Event;
	},

	DeselectAll: () => {
		EditorState.instance.selected.forEach((stamp) => stamp.selected = false);
	},

	InvertSelection: () => {
		EditorState.instance.takeSnapshot("invert selection");
		const allStamps = EditorStamp.mix(EditorState.instance.notes, EditorState.instance.events);
		allStamps.forEach((stamp) => stamp.selected = !stamp.selected);
	},

	DeleteMultiple(stamps?: EditorStamp[]) {
		const ChartState = EditorState.instance;
		stamps = stamps ?? ChartState.selected;
		if (stamps.length == 0) return;
		ChartState.takeSnapshot(`deleted ${EditorState.utils.boxSortStamps(stamps).toString()}`);

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

	InvertNotes(notes?: EditorNote[]) {
		notes = notes ?? EditorState.instance.selected.filter((stamp) => stamp.is("note"));
		if (notes.length < 1) return;
		notes.forEach((note) => {
			note.data.move = ChartNote.invertMove(note.data.move);
			note.twist();
			note.bop();
		});

		const sound = notes[0].addSound();
		sound.detune -= rand(500, 600);
	},

	Copy(stamps?: EditorStamp[]) {
		stamps = stamps ?? EditorState.instance.selected;
		if (stamps.length == 0) return;

		EditorState.instance.clipboard = stamps;
		addFloatyText(EditorState.utils.clipboardMessage("copy", EditorState.instance.clipboard));
		Sound.playSound("noteCopy", { detune: rand(25, 50) });

		stamps.forEach((stamp) => {
			stamp.twist();
			stamp.bop();
		});

		return stamps;
	},

	Cut(stamps?: EditorStamp[]) {
		const ChartState = EditorState.instance;
		stamps = stamps ?? EditorState.instance.selected;
		if (stamps.length == 0) return;
		ChartState.takeSnapshot(`cut ${EditorState.utils.boxSortStamps(stamps).toString()}`);

		// some code from the copy action
		ChartState.clipboard = stamps;
		addFloatyText(EditorState.utils.clipboardMessage("cut", ChartState.clipboard));
		Sound.playSound("noteCopy", { detune: rand(0, 25) });

		stamps.forEach((stamp) => {
			if (stamp.is("note")) ChartState.deleteNote(stamp);
			else if (stamp.is("event")) ChartState.deleteEvent(stamp);
		});
	},

	Paste(stamps?: EditorStamp[]) {
		const ChartState = EditorState.instance;
		stamps = stamps ?? ChartState.clipboard;
		stamps = cloneDeep(stamps);
		if (stamps.length == 0) return;

		// shickiiii
		ChartState.takeSnapshot(`pasted ${EditorState.utils.boxSortStamps(stamps).toString()}`);

		Sound.playSound("noteCopy", { detune: rand(-50, -25) });
		addFloatyText(EditorState.utils.clipboardMessage("paste", stamps));

		// sorts them timely
		stamps.sort((b, a) => b.data.time - a.data.time);
		const ogSteps = stamps.map((stamp) => stamp.step);
		stamps.forEach((stamp, index) => {
			if (stamp.step == stamps[0].step) stamp.step = 0; // if the stamp is at the lowest step turn it to 0
			else stamp.step = stamps[index].step - ogSteps[0]; // if not, get the difference to the lowest

			// this turns them to low value range, which i can sum hoveredStep to, then it will work :)
			const newStep = stamp.step + ChartState.hoveredStep;
			if (stamp.is("note")) EditorState.commands.PlaceNote(false, newStep, stamp.data.move);
			else if (stamp.is("event")) EditorState.commands.PlaceEvent(false, newStep, stamp.data.id, stamp.data.data);
			stamp.twist();
		});

		return stamps;
	},

	Undo: () => {
		const oldSong = EditorState.instance.song;
		const newSong = EditorState.instance.undo()?.song;
		if (!newSong) return;

		if (oldSong != newSong) {
			Sound.playSound("undo", { detune: rand(-50, -25) });
			addNotification(`undid: "${EditorState.instance.snapshots[EditorState.instance.snapshotIndex].command}"`);
		}
	},

	Redo: () => {
		const oldSong = EditorState.instance.song;
		const newSong = EditorState.instance.redo()?.song;
		if (!newSong) return;

		if (oldSong != newSong) {
			Sound.playSound("undo", { detune: rand(25, 50) });
			addNotification(`redid: "${EditorState.instance.snapshots[EditorState.instance.snapshotIndex].command}"`);
		}
	},
};

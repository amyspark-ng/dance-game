import { KaplayState } from "../../../core/scenes/KaplayState";
import { Sound } from "../../../core/sound";
import { StateMenu } from "../../../ui/menu/MenuScene";
import { StateChart } from "../EditorState";
import { EditorStamp } from "../objects/stamp";
import { addFloatyText } from "./utils";

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
		StateChart.instance.takeSnapshot("select all");
		EditorStamp.mix(StateChart.instance.notes, StateChart.instance.events).forEach((stamp) => stamp.selected = true);
	},

	DeselectAll: () => {
		StateChart.instance.selected.forEach((stamp) => {
			// if (stamp.is("note")) StateChart.instance.delete("note", stamp);
			// else if (stamp.is("event")) StateChart.instance.delete("event", stamp);

			// @ts-ignore
			// TODO: Figure out why this doesn't work??
			// StateChart.instance.delete(stamp.type, stamp);
		});
		StateChart.instance.takeSnapshot("deselect all");
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
			// if (stamp.is("note")) ChartState.delete("note", stamp);
			// else if (stamp.is("event")) ChartState.delete("event", stamp);
		});

		Sound.playSound("noteDelete", { detune: rand(-50, 50) });

		// there was an event in there
		if (stamps.some((stamp) => stamp.is("event"))) {
			Sound.playSound("eventCog", { detune: rand(-50, 50) });
		}
	},

	Copy(stamps?: EditorStamp[]) {
		const ChartState = StateChart.instance;
		stamps = stamps ?? ChartState.selected;
		if (stamps.length == 0) return;

		ChartState.clipboard = stamps;
		addFloatyText(StateChart.utils.clipboardMessage("copy", ChartState.clipboard));
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
			// if (stamp.is("note")) ChartState.delete("note", stamp);
			// else if (stamp.is("event")) ChartState.delete("event", stamp);
		});
	},

	Paste(stamps?: EditorStamp[]) {
		const ChartState = StateChart.instance;
		stamps = stamps ?? ChartState.clipboard;
		if (stamps.length == 0) return;

		// shickiiii
		ChartState.takeSnapshot(`paste ${stamps.length} stamps`);

		Sound.playSound("noteCopy", { detune: rand(-50, -25) });
		addFloatyText(StateChart.utils.clipboardMessage("paste", stamps));

		stamps.forEach((stamp) => {
			const newTime = stamp.data.time + ChartState.conductor.stepToTime(ChartState.hoveredStep);

			// if (stamp.is("note")) ChartState.place("note", { time: newTime, ...stamp.data });
			// else if (stamp.is("event")) ChartState.place("event", { time: newTime, ...stamp.data });
			stamp.twist();
		});
	},

	Undo: () => {
		let oldSongState = StateChart.instance.song;
		StateChart.instance.undo();

		if (oldSongState != StateChart.instance.song) {
			Sound.playSound("undo", { detune: rand(-50, -25) });
		}
	},

	Redo: () => {
		let oldSongState = StateChart.instance.song;
		StateChart.instance.redo();

		if (oldSongState != StateChart.instance.song) {
			Sound.playSound("undo", { detune: rand(25, 50) });
		}
	},
};

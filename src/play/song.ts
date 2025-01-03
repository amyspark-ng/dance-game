import { EaseFunc } from "kaplay";
import { utils } from "../utils";
import { ChartNote } from "./objects/note";
import { Tally } from "./objects/scoring";

/** When a song ends, an object of this type gets pushed to GameSave.songsPlayed*/
export class SaveScore {
	/** The uuid of the song */
	uuid: string;
	/** The tally of the score */
	tally: Tally;
	constructor() {
		this.uuid = undefined;
		this.tally = new Tally();
	}
}

/** The content of the manifest in the song zip */
export class SongManifest {
	/** Name of the song */
	name: string;
	/** Artist of the song */
	artist: string;
	/** Charter of the song */
	charter: string;
	/** The initial bpm of the song */
	initial_bpm: number;
	/** The initial scroll speed of the song */
	initial_scrollspeed: number;
	/** The time signature of the song */
	time_signature: [number, number];
	/** The UUID (universally unique identifier) of the song, please don't change */
	uuid_DONT_CHANGE: string;
	/** The path/url of the chart file */
	chart_file: string;
	/** The path/url of the audio file */
	audio_file: string;
	/** The path/url of the cover file */
	cover_file: string;
	constructor(param?: SongManifest) {
		Object.assign(this, {
			name: "New song",
			artist: "Someone",
			charter: "Someone else",
			audio_file: "new-song.ogg",
			chart_file: "new-song-chart.json",
			cover_file: "new-song-cover.png",
			initial_bpm: 100,
			initial_scrollspeed: 1,
			time_signature: [4, 4],
			uuid_DONT_CHANGE: "",
		});

		if (param) Object.assign(this, param);
	}
}

/** An event in the chart */
export class ChartEvent {
	/** The time of the song the event must be triggered at */
	time: number;
	/** The event id, string to know what is it */
	id: string;
	/** The value the event contains, might be an object or something else idk */
	value: any;
}

/** The content of the chart file */
export class SongChart {
	/** Array of chart notes */
	notes: ChartNote[];
	/** Array of chart events */
	events: ChartEvent[];

	constructor(param?: SongChart) {
		Object.assign(this, {
			notes: [
				{ time: 1, move: "up" },
			],
			events: [],
		});

		if (param) {
			Object.assign(this, param);
		}
	}
}

/** The content of a song zip */
export class SongContent {
	/** The content of the manifest.toml in the zip */
	manifest: SongManifest = new SongManifest();
	/** The content of the chart.json in the zip */
	chart: SongChart = new SongChart();

	constructor(param?: SongContent) {
		if (param) {
			Object.assign(this, param);
		}
	}
}

import { ChartNote } from "./objects/note";
import { Tally } from "./objects/scoring";

/** When a song ends, an object of this type gets pushed to GameSave.songsPlayed*/
export class SaveScore {
	/** The uuid of the song */
	uuid: string;
	/** The tally of the score */
	tally: Tally = new Tally();
}

/** The content of the manifest in the song zip */
export class SongManifest {
	/** Name of the song */
	name:string;
	/** Artist of the song */
	artist:string;
	/** Charter of the song */
	charter:string;
	/** The initial bpm of the song */
	initial_bpm:number;
	/** The initial scroll speed of the song */
	initial_scrollspeed:number;
	/** The time signature of the song */
	time_signature:[number, number];
	/** The UUID (universally unique identifier) of the song, please don't change */
	uuid_DONT_CHANGE: string;
	/** The path/url of the chart file */
	chart_file:string;
	/** The path/url of the audio file */
	audio_file:string;
	/** The path/url of the cover file */
	cover_file:string;
}

/** An event in the chart */
export class ChartEvent {
	/** The time of the song the event must be triggered at */
	time: number;
	/** The event id, will be one of 3 values
	 * 
	 * 1. change-scrollspeed
	 * 2. change-bpm
	 * 3. play-anim
	 */
	id: string;
	/** The new value the event will set
	 * 
	 * If it's the play anim event the value may be something like "victory"
	 * 
	 * Else if the event it's something like change-bpmp the value may be something like 180
	 */
	value: string | number;
	/** 
	 * The time it'll the event to occur, this is mainly for numbered value events
	 */
	duration: number;
}

/** The content of the chart file */
export class Chart {
	/** Array of chart notes */
	notes: ChartNote[];
	/** Array of chart events */
	events: ChartEvent[];
}

/** The content of a song zip */
export class SongZip {
	/** The content of the manifest.toml in the zip */
	manifest: SongManifest;
	/** The content of the chart.json in the zip */
	chart: Chart;
	constructor() {
		this.manifest = {
			name: "New song",
			artist: "Someone",
			charter: "Someone else",
			audio_file: "pathToAudio",
			chart_file: "pathToChart",
			cover_file: "pathToCover",
			initial_bpm: 100,
			initial_scrollspeed: 1,
			time_signature: [4, 4],
			uuid_DONT_CHANGE: ""
		}

		this.chart = {
			notes: [
				{ time: 1, move: "up" },
			],
			events: [
				
			]
		}
	}
}
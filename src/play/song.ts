import JSZip from "jszip";
import TOML from "smol-toml";
import { Content } from "../core/loading/content";
import { _GameSave, GameSave } from "../core/save";
import { ChartEvent } from "./event";
import { ChartNote } from "./objects/note";
import { Tally } from "./objects/scoring";

/** Holds the content to a song folder */
export type songFolder = {
	manifest: SongManifest;
	audio: Blob;
	cover: Blob;
	chart: SongChart;
};

/** When a song ends, an object of this type gets pushed to {@link `_GameSave.songsPlayed`}*/
export class SaveScore {
	/** The uuid of the song */
	uuid: string;
	/** The tally of the score */
	tally: Tally;

	/** Gets the saveScore for a song name */
	static getHighscore(uuid: string): SaveScore {
		const scoresOfSong = GameSave.songsPlayed.filter((song) => song.uuid == uuid);

		if (scoresOfSong.length < 1) {
			return new SaveScore();
		}
		else {
			// get the highest song save score
			return scoresOfSong.reduce((a, b) => a.tally.score > b.tally.score ? a : b);
		}
	}

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

	/** Load the assets of a song to make it playable
	 * @param songFolder Receives the contents of a song folder
	 */
	static async loadAssets(songFolder: songFolder): Promise<SongContent> {
		// cover
		const cover64 = URL.createObjectURL(songFolder.cover);
		await loadSprite(songFolder.manifest.uuid_DONT_CHANGE + "-cover", cover64);

		// audio
		const arrayBuffer = await songFolder.audio.arrayBuffer();
		await loadSound(songFolder.manifest.uuid_DONT_CHANGE + "-audio", arrayBuffer);

		const songContent: SongContent = {
			manifest: songFolder.manifest,
			chart: songFolder.chart,
		};

		// songContent
		const songIsAlreadyLoaded = Content.loadedSongs.find((song) => song.manifest.uuid_DONT_CHANGE == songContent.manifest.uuid_DONT_CHANGE);
		const isDefaultSong = Content.defaultUUIDS.includes(songContent.manifest.uuid_DONT_CHANGE);

		if (songIsAlreadyLoaded) {
			if (isDefaultSong) console.error("You're trying to overwrite a default song, don't do that!");
			else {
				console.log("The song you were trying to load is already loaded, will overwrite");
				Content.loadedSongs[Content.loadedSongs.indexOf(songIsAlreadyLoaded)] = songContent;
			}
		}
		else {
			Content.loadedSongs.push(songContent);
		}

		return new Promise((resolve) => resolve(songContent));
	}

	/** Fetch a song folder given a path
	 * @param folderPath The path to the folder
	 *
	 * Used mostly for default songs
	 */
	static async fetchPath(folderPath: string): Promise<songFolder> {
		const manifest = await fetch(`content/songs/${folderPath}/manifest.toml`).then((thing) => thing.text()).then((text) => TOML.parse(text)) as SongManifest;
		const chart = await fetch(`content/songs/${folderPath}/${manifest.chart_file}`).then((thing) => thing.json()) as SongChart;
		const audio = await fetch(`content/songs/${folderPath}/${manifest.audio_file}`).then((thing) => thing.blob()) as Blob;
		const cover = await fetch(`content/songs/${folderPath}/${manifest.cover_file}`).then((thing) => thing.blob()) as Blob;
		return { audio: audio, cover: cover, manifest: manifest, chart: chart } as songFolder;
	}

	/** Get the content of a song folder */
	static async getContentFromFile(zipFile: File): Promise<songFolder> {
		const songFolder: songFolder = {} as songFolder;

		const jsZip = new JSZip();
		const zipContent = await jsZip.loadAsync(zipFile);

		const manifestFile = zipContent.file("manifest.toml");
		if (!manifestFile) return new Promise((_, reject) => reject("No manifest file found in zip"));
		else {
			const manifestContent = TOML.parse(await manifestFile.async("string"));

			// if the keys don't match
			if (JSON.stringify(Object.keys(manifestContent)) !== JSON.stringify(Object.keys(new SongManifest()))) {
				return new Promise((_, reject) => reject("Manifest file has wrong keys"));
			}

			songFolder.manifest = manifestContent as any;
		}

		const audio_file = zipContent.file(songFolder.manifest.audio_file);
		if (!audio_file) {
			return new Promise((_, reject) => reject("No audio file found in zip or wrong name in manifest"));
		}
		else songFolder.audio = await audio_file.async("blob");

		const cover_file = zipContent.file(songFolder.manifest.cover_file);
		if (!cover_file) {
			return new Promise((_, reject) => reject("No cover file found in zip or wrong name in manifest"));
		}
		else songFolder.cover = await cover_file.async("blob");

		const chart_file = zipContent.file(songFolder.manifest.chart_file);
		if (!chart_file) {
			return new Promise((_, reject) => reject("No chart file found in zip or wrong name in manifest"));
		}
		else songFolder.chart = JSON.parse(await chart_file.async("string")) as SongChart;

		// this will run at the end because all the foolproof returns have been returned
		return new Promise((resolve) => resolve(songFolder));
	}

	constructor(param?: SongContent) {
		if (param) {
			Object.assign(this, param);
		}
	}
}

import audioBufferToBlob from "audiobuffer-to-blob";
import JSZip from "jszip";
import TOML, { TomlPrimitive } from "smol-toml";
import { FileManager } from "../FileManager";
import { ChartEvent } from "../play/event";
import { ChartNote } from "../play/objects/note";

type SongAssets = {
	manifest: SongManifest;
	cover: string;
	audio: string | ArrayBuffer;
	chart: SongChart;
};

export class SongManifest {
	/** Name of the song */
	name: string = "Song name";
	/** Artist of the song */
	artist: string = "Someone else";
	/** Charter of the song */
	charter: string = "A person";
	/** The initial bpm of the song */
	initial_bpm: number = 100;
	/** The initial scroll speed of the song */
	initial_scrollspeed: number = 1;
	/** The time signature of the song */
	time_signature: [number, number] = [4, 4];
	/** The UUID (universally unique identifier) of the song, please don't change */
	uuid_DONT_CHANGE: string;
	/** The path/url of the chart file */
	chart_file: string;
	/** The path/url of the audio file */
	audio_file: string;
	/** The path/url of the cover file */
	cover_file: string;

	get steps_per_beat() {
		return this.time_signature[0];
	}

	set steps_per_beat(val: number) {
		this.time_signature[0] = val;
	}

	get beats_per_measure() {
		return this.time_signature[1];
	}

	set beats_per_measure(val: number) {
		this.time_signature[1] = val;
	}

	assignFromTOML(tomlRecord: Record<string, TomlPrimitive>) {
		Object.keys(tomlRecord).forEach((key) => {
			if (!(tomlRecord[key] == "undefined" || tomlRecord[key] == "")) {
				this[key] = tomlRecord[key];
			}
		});
	}
}

/** The content of the chart file */
export class SongChart {
	/** Array of chart notes */
	notes: ChartNote[] = [];
	/** Array of chart events */
	events: ChartEvent[] = [];

	constructor(notes: ChartNote[] = [], events: ChartEvent[] = []) {
		this.notes = notes;
		this.events = events;
	}
}

export class SongContent {
	/**
	 * Fetch a manifest from a path
	 * @param path (eg: "content/songs/bopeebo" would do "content/songs/bopeebo/manifest.toml")
	 * @returns A song manifest
	 *
	 * The next step is pass it through {@link parseFromManifest()}
	 */
	static async fetchManifestFromPath(path: string): Promise<SongManifest> {
		const stringedTOML = await (await fetch(path + "/manifest.toml")).text();
		const manifestContent = TOML.parse(stringedTOML);

		const manifest = new SongManifest();
		manifest.assignFromTOML(manifestContent);

		return new Promise((resolve) => resolve(manifest));
	}

	/** Parses manifest data to Assets
	 *
	 * The next step is pass it through {@link load()}
	 */
	static async parseFromManifest(manifest: SongManifest, path: string): Promise<SongAssets> {
		const assets: SongAssets = {} as any;
		assets.manifest = manifest;

		function getPath(otherPath: string) {
			return path + "/" + otherPath;
		}

		const audio = await FileManager.getFileAtUrl(getPath(manifest.audio_file));
		const cover = await FileManager.getFileAtUrl(getPath(manifest.cover_file));
		const chart = await FileManager.getFileAtUrl(getPath(manifest.chart_file));

		if (audio) assets.audio = await audio.blob().then((thing) => thing.arrayBuffer());
		if (cover) assets.cover = await cover.blob().then((thing) => URL.createObjectURL(thing));
		if (chart) assets.chart = JSON.parse(await chart.blob().then((thing) => thing.text()));

		return new Promise((resolve) => resolve(assets));
	}

	/** Parses file data to Assets
	 *
	 * The next step is pass it through {@link load()}
	 */
	static async parseFromFile(file: File): Promise<SongAssets> {
		const jsZip = new JSZip();
		const zipFile = await jsZip.loadAsync(file);

		const manifestFile = zipFile.file("manifest.toml");
		const manifest = new SongManifest();
		manifest.assignFromTOML(TOML.parse(await manifestFile.async("string")));

		const assets: SongAssets = {} as any;
		assets.manifest = manifest;

		const audio = await zipFile.file(manifest.audio_file).async("arraybuffer");
		const cover = await zipFile.file(manifest.cover_file).async("blob");
		const chart = await zipFile.file(manifest.chart_file).async("text");

		if (audio) assets.audio = audio;
		if (cover) assets.cover = URL.createObjectURL(cover);
		if (chart) assets.chart = JSON.parse(chart);

		return new Promise((resolve) => resolve(assets));
	}

	static async load(assets: SongAssets): Promise<SongContent> {
		await loadSound(assets.manifest.uuid_DONT_CHANGE + "-audio", assets.audio);
		await loadSprite(assets.manifest.uuid_DONT_CHANGE + "-cover", assets.cover);
		const content = new SongContent(assets.chart, assets.manifest);
		return new Promise((resolve) => resolve(content));
	}

	static async loadAll() {
		loadSound("new-song-audio", "content/songs/new-song-audio.ogg");
		loadSprite("new-song-cover", "content/songs/new-song-cover.png");

		await load(
			new Promise(async (resolve, reject) => {
				try {
					SongContent.defaultPaths.forEach(async (path, index) => {
						try {
							const manifest = await SongContent.fetchManifestFromPath(path);
							const assets = await SongContent.parseFromManifest(manifest, path);
							const content = await SongContent.load(assets);
							SongContent.loaded.push(content);
						}
						catch (err) {
							console.error(err);
							throw new Error("There was an error loading the default songs");
						}

						if (index == SongContent.defaultPaths.length - 1) resolve("ok");
					});
				}
				catch (e) {
					reject(e);
				}
			}),
		);
	}

	static getByName(name: string) {
		return SongContent.loaded.find((song) => song.manifest.name == name);
	}

	static defaultUUIDS: string[] = [
		"1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
		// "14e1c3e9-b24f-4aaa-8401-d772d8725f51",
	];

	static defaultPaths: string[] = [
		"content/songs/bopeebo",
		// "content/songs/unholy-blight",
	];

	static loaded: SongContent[] = [];

	/** The content of the manifest.toml in the zip */
	manifest: SongManifest = new SongManifest();
	/** The content of the chart.json in the zip */
	chart: SongChart = new SongChart();

	/** Will return a blob to download a zip with the song */
	async writeToBlob(): Promise<Blob> {
		/** This is the folder where everything will be stored */
		const zipFolder = new JSZip();

		// chart
		this.manifest.chart_file = this.manifest.name + "-chart.json";
		zipFolder.file(this.manifest.chart_file, JSON.stringify(this.chart));

		// manifest
		zipFolder.file("manifest.toml", TOML.stringify(this.manifest));

		// cover
		const defaultCover = "sprites/defaultCover.png";
		let pathToCover: string = undefined;
		const cover = await getSprite(this.manifest.uuid_DONT_CHANGE + "-cover");
		if (!cover) pathToCover = defaultCover;
		else pathToCover = await FileManager.spriteToDataURL(this.manifest.uuid_DONT_CHANGE + "-cover");
		const imageBlob = await fetch(pathToCover).then((r) => r.blob());
		zipFolder.file(this.manifest.cover_file, imageBlob);

		// audio
		const defaultAudio = "audio/new-song-audio.ogg";
		const audio = await getSound(this.manifest.uuid_DONT_CHANGE + "-audio");
		let audioBlob = await fetch(defaultAudio).then((r) => r.blob());
		if (!audio) audioBlob = await fetch(defaultAudio).then((r) => r.blob());
		else {
			const blob = audioBufferToBlob(audio.buf);
			audioBlob = blob;
		}
		zipFolder.file(this.manifest.audio_file, audioBlob);

		return zipFolder.generateAsync({ type: "blob" });
	}

	getAudioName() {
		return this.manifest.uuid_DONT_CHANGE + "-audio";
	}

	getCoverName() {
		return this.manifest.uuid_DONT_CHANGE + "-cover";
	}

	constructor(chart: SongChart = new SongChart(), manifest: SongManifest = new SongManifest()) {
		this.chart = chart;
		this.manifest = manifest;
	}
}

export function getSongByName(name: string) {
	return SongContent.loaded.find((song) => song.manifest.name == name);
}

export function getSongByUUID(uuid: string) {
	return SongContent.loaded.find((song) => song.manifest.uuid_DONT_CHANGE == uuid);
}

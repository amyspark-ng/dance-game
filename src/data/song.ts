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
	/** Prefix path the manifest was found at */
	path: string;

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

	getPath(path: string) {
		return this.path + "/" + path;
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
		manifest.path = path;
		manifest.assignFromTOML(manifestContent);

		return new Promise((resolve) => resolve(manifest));
	}

	/** Parses manifest data to Assets
	 *
	 * The next step is pass it through {@link load()}
	 */
	static async parseFromManifest(manifest: SongManifest): Promise<SongAssets> {
		const endData: SongAssets = {} as any;
		endData.manifest = manifest;

		const audio = await FileManager.getFileAtUrl(manifest.getPath(manifest.audio_file));
		const cover = await FileManager.getFileAtUrl(manifest.getPath(manifest.cover_file));
		const chart = await FileManager.getFileAtUrl(manifest.getPath(manifest.chart_file));

		if (audio) endData.audio = await audio.blob().then((thing) => thing.arrayBuffer());
		if (cover) endData.cover = await cover.blob().then((thing) => URL.createObjectURL(thing));
		if (chart) endData.chart = JSON.parse(await chart.blob().then((thing) => thing.text()));

		return new Promise((resolve) => resolve(endData));
	}

	static async parseFromFile(file: File): Promise<SongAssets> {
		return new Promise((resolve) => resolve({} as SongAssets));
	}

	static async load(assets: SongAssets): Promise<SongContent> {
		await loadSound(assets.manifest.uuid_DONT_CHANGE + "-audio", assets.audio);
		await loadSprite(assets.manifest.uuid_DONT_CHANGE + "-cover", assets.cover);
		const content = new SongContent({ chart: assets.chart, manifest: assets.manifest } as SongContent);
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
							const assets = await SongContent.parseFromManifest(manifest);
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

	getAudioName() {
		return this.manifest.uuid_DONT_CHANGE + "-audio";
	}

	getCoverName() {
		return this.manifest.uuid_DONT_CHANGE + "-cover";
	}

	constructor(instance?: SongContent) {
		if (instance) Object.assign(this, instance);
	}
}

export function getSongByName(name: string) {
	return SongContent.loaded.find((song) => song.manifest.name == name);
}

export function getSongByUUID(uuid: string) {
	return SongContent.loaded.find((song) => song.manifest.uuid_DONT_CHANGE == uuid);
}

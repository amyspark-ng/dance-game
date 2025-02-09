import audioBufferToBlob from "audiobuffer-to-blob";
import JSZip from "jszip";
import TOML, { TomlPrimitive } from "smol-toml";
// import { request, songsDB } from "../core/game";
import { Zip } from "@zenfs/archives";
import fs, { resolveMountConfig } from "@zenfs/core";
import { GAME } from "../core/game";
import { GameSave } from "../core/save";
import { FileManager } from "../FileManager";
import { ChartNote } from "../play/objects/note";
import { utils } from "../utils";
import { ChartEvent } from "./event/event";

const IMAGE_HELPER = "data:image/png;base64,";
const AUDIO_HELPER = "data:audio/wav;base64,";

export const songSchema = {
	"name": { label: "Name", description: "The name of the song", type: "string", default: "Song name" },
	"artist": { label: "Artist", description: "Who made the song", type: "string", default: "Someone else" },
	"charter": { label: "Charter", description: "Who charted the song (probably you)", type: "string", default: "Another person" },
	"initial_bpm": { label: "Initial BPM", description: "The initial bpm of the song", type: "number", default: 100, range: [-Infinity, Infinity] },
	"initial_scrollspeed": { label: "Scroll-Speed", description: "The initial scrollspeed of the song", type: "number", default: 1, range: [-Infinity, Infinity] },
	"steps_per_beat": { label: "Steps per beat", description: "The steps per beat (top number of time signature)", type: "number", default: 4, range: [-Infinity, Infinity] },
	"beats_per_measure": {
		label: "Beats per measure",
		description: "The beats per measure (bottom number of time signature)",
		type: "number",
		default: 4,
		range: [-Infinity, Infinity],
	},
	"cover_file": {
		label: "Cover path",
		description: "The path to the cover",
		type: "action",
		default: "song-cover.png",
	},
	"audio_file": {
		label: "Audio path",
		description: "The path to the audio",
		type: "action",
		default: "song-audio.ogg",
	},
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
	uuid_DONT_CHANGE: string = undefined;

	/** The path/url of the chart file */
	get chart_file() {
		return utils.kebabCase(this.name) + "-chart.json";
	}

	set chart_file(value: string) {
		return;
	}

	static get default_audio_file() {
		return "content/songs/new-song-audio.ogg";
	}

	static get default_cover_file() {
		return "content/songs/new-song-cover.png";
	}

	/** The path/url of the audio file */
	audio_file: string = "new-song-audio.ogg";
	/** The path/url of the cover file */
	cover_file: string = "new-song-cover.png";

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

export class SongAssets {
	cover: string = "";
	audio: string = "";
	chart: string = "";
	manifest: string = "";
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
		const assets = new SongAssets();

		function getPath(otherPath: string) {
			return path + "/" + otherPath;
		}

		const audio = await FileManager.getFileAtUrl(getPath(manifest.audio_file));
		const cover = await FileManager.getFileAtUrl(getPath(manifest.cover_file));
		const chart = await FileManager.getFileAtUrl(getPath(manifest.chart_file));

		// no need for audio/image helper with this method apparently
		if (audio) assets.audio = await FileManager.blobToDataURL(await audio.blob());
		if (cover) assets.cover = await FileManager.blobToDataURL(await cover.blob());
		if (chart) assets.chart = await chart.blob().then((thing) => thing.text());
		assets.manifest = JSON.stringify(manifest);

		return new Promise((resolve) => resolve(assets));
	}

	/** Parses file data to Assets
	 *
	 * The next step is pass it through {@link load()}
	 */
	static async parseFromFile(file: File): Promise<SongAssets> {
		const zipFs = await resolveMountConfig({ backend: Zip, data: await file.arrayBuffer() });
		fs.mount("/mnt/zip", zipFs);

		const stringManifest = fs.readFileSync("/mnt/zip/manifest.toml", "utf-8");
		const manifest = new SongManifest();
		manifest.assignFromTOML(TOML.parse(stringManifest));

		const coverPath = manifest.cover_file;
		const coverBase64 = fs.readFileSync("/mnt/zip/" + coverPath, "base64");

		const audioPath = manifest.audio_file;
		const audioBase64 = fs.readFileSync("/mnt/zip/" + audioPath, "base64");

		const chartPath = manifest.chart_file;
		const stringChart = fs.readFileSync("/mnt/zip/" + chartPath, "utf-8");
		const chartObject = JSON.parse(stringChart);

		const assets = new SongAssets();
		assets.cover = IMAGE_HELPER + coverBase64;
		assets.audio = AUDIO_HELPER + audioBase64;
		assets.manifest = JSON.stringify(manifest);
		assets.chart = JSON.stringify(chartObject);

		fs.umount("/mnt/zip");

		return new Promise((resolve) => resolve(assets));
	}

	/** Loads a song to the game
	 * @param assets The SongAssets to load
	 * @param pushToIndexedDB Wheter to push the song to indexedDB (defaults to false)
	 * @param pushToLoaded Wheter to push the song to the loaded array (available songs) (defalts to true)
	 */
	static async load(assets: SongAssets, pushToIndexedDB = false, pushToLoaded = true): Promise<SongContent> {
		const manifest = JSON.parse(assets.manifest);
		const content = new SongContent(JSON.parse(assets.chart), JSON.parse(assets.manifest));
		console.log(`${GAME.NAME}: Loading ${content.isDefault ? "default" : "extra"} song with the UUID ${content.manifest.uuid_DONT_CHANGE}...`);
		await loadSprite(content.getCoverName(), assets.cover);
		await loadSound(content.getAudioName(), assets.audio);

		if (!content.isDefault) {
			if (GameSave.extraSongs.includes(manifest.uuid_DONT_CHANGE)) {
				const index = GameSave.extraSongs.indexOf(manifest.uuid_DONT_CHANGE);
				GameSave.extraSongs[index] = manifest.uuid_DONT_CHANGE;
			}
			else {
				GameSave.extraSongs.push(manifest.uuid_DONT_CHANGE);
			}
		}

		if (pushToIndexedDB) {
			const file_path = `/home/songs/${content.manifest.uuid_DONT_CHANGE}`;
			const data = JSON.stringify(assets);

			if (!fs.existsSync("/home/songs")) fs.mkdirSync("/home/songs");
			fs.writeFileSync(file_path, data);
			console.log(">GTHIS RUND AND WRITES TO FOLERDER");
			if (GameSave.save) GameSave.save();
		}

		if (pushToLoaded) {
			const songWithSameUUID = SongContent.loaded.find((song) => song.manifest.uuid_DONT_CHANGE == content.manifest.uuid_DONT_CHANGE);
			if (songWithSameUUID) SongContent.loaded[SongContent.loaded.indexOf(songWithSameUUID)] = content;
			else SongContent.loaded.push(content);
		}

		return new Promise((resolve) => resolve(content));
	}

	static async loadAll() {
		await loadSound("new-song-audio", "content/songs/new-song-audio.ogg");
		await loadSprite("new-song-cover", "content/songs/new-song-cover.png");

		await load(
			new Promise(async (resolve, reject) => {
				try {
					SongContent.defaultPaths.forEach(async (path, index) => {
						try {
							const manifest = await SongContent.fetchManifestFromPath(path);
							const assets = await SongContent.parseFromManifest(manifest, path);
							await SongContent.load(assets);
						}
						catch (err) {
							throw new Error("There was an error loading the default songs, was trying to load: " + path);
						}

						if (index == SongContent.defaultPaths.length - 1) {
							console.log(`${GAME.NAME}: Loaded default songs successfully`);
							resolve("ok");
						}
					});
				}
				catch (e) {
					reject(e);
				}
			}),
		);

		if (GameSave.extraSongs.length < 1) return;
		await load(
			new Promise(async (resolve, reject) => {
				try {
					// now load the extra ones
					GameSave.extraSongs.forEach(async (uuid, index) => {
						if (fs.existsSync(`/home/songs/${uuid}`)) {
							const stringAssets = fs.readFileSync(`/home/songs/${uuid}`, "utf8");
							const assets = JSON.parse(stringAssets);
							await SongContent.load(assets);
						}
						else {
							console.log(`${GAME.NAME}: There's no song with the UUID: '${uuid}' stored in the file system, removed UUID from list`);
							GameSave.extraSongs.splice(GameSave.extraSongs.indexOf(uuid), 1);
						}

						if (index == GameSave.extraSongs.length - 1) {
							console.log(`${GAME.NAME}: Loaded extra songs successfully`);
							resolve("ok");
						}
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
		"1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed", // bopeebo
		"be4c3897-5e37-4f93-81ab-e5262dbe11a5", // secret
		// "14e1c3e9-b24f-4aaa-8401-d772d8725f51",
	];

	static defaultPaths: string[] = [
		"content/songs/bopeebo",
		"content/songs/secret",
		// "content/songs/unholy-blight",
	];

	static loaded: SongContent[] = [];

	/** The content of the manifest.toml in the zip */
	manifest: SongManifest = new SongManifest();
	/** The content of the chart.json in the zip */
	chart: SongChart = new SongChart();

	get isDefault() {
		return SongContent.defaultUUIDS.includes(this.manifest.uuid_DONT_CHANGE);
	}

	/** Will return a blob to download a zip with the song */
	async writeToBlob(): Promise<Blob> {
		/** This is the folder where everything will be stored */
		const zipFolder = new JSZip();

		// chart
		zipFolder.file(this.manifest.chart_file, JSON.stringify(this.chart));

		// manifest
		zipFolder.file("manifest.toml", TOML.stringify(this.manifest));

		// cover
		let pathToCover: string = undefined;
		const cover = await getSprite(this.getCoverName());
		if (!cover) {
			pathToCover = SongManifest.default_cover_file;
		}
		else pathToCover = await FileManager.spriteToDataURL(this.getCoverName());
		const imageBlob = await fetch(pathToCover).then((r) => r.blob());
		zipFolder.file(this.manifest.cover_file, imageBlob);

		// audio
		const audio = await getSound(this.getAudioName());
		let audioBlob = await fetch(SongManifest.default_audio_file).then((r) => r.blob());
		if (!audio) audioBlob = await fetch(SongManifest.default_audio_file).then((r) => r.blob());
		else {
			const blob = audioBufferToBlob(audio.buf);
			audioBlob = blob;
		}
		zipFolder.file(this.manifest.audio_file, audioBlob);

		return zipFolder.generateAsync({ type: "blob" });
	}

	getAudioName() {
		if (!this.manifest.uuid_DONT_CHANGE) return this.manifest.audio_file;
		else return this.manifest.uuid_DONT_CHANGE + "-audio";
	}

	getCoverName() {
		if (!this.manifest.uuid_DONT_CHANGE) return this.manifest.cover_file;
		else return this.manifest.uuid_DONT_CHANGE + "-cover";
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

import { Zip } from "@zenfs/archives";
import fs, { resolveMountConfig } from "@zenfs/core";
import audioBufferToBlob from "audiobuffer-to-blob";
import isUrl from "is-url";
import JSZip from "jszip";
import { resolve } from "path";
import TOML, { TomlPrimitive } from "smol-toml";
import { GAME } from "../core/game";
import { GameSave } from "../core/save";
import { AUDIO_HELPER, FileManager, IMAGE_HELPER } from "../FileManager";
import { ChartNote } from "../play/objects/note";
import { utils } from "../utils";
import { ChartEvent } from "./event/event";

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

	static get default_cover() {
		return "new-song-cover";
	}

	static get default_audio() {
		return "new-song-audio";
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

	assignFromOBJ(tomlRecord: Record<string, TomlPrimitive | any>) {
		Object.keys(tomlRecord).forEach((key) => {
			if (!(tomlRecord[key] == "undefined" || tomlRecord[key] == "")) {
				this[key] = tomlRecord[key];
			}
		});

		return this;
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
	static async getDefaultAssets() {
		const assets = new SongAssets();
		const manifest = new SongManifest();
		assets.cover = await FileManager.spriteToDataURL(SongManifest.default_cover);
		assets.audio = await FileManager.soundToDataURL(SongManifest.default_audio);
		assets.chart = JSON.stringify(new SongChart());
		assets.manifest = JSON.stringify(manifest);
		return assets;
	}

	static async extractFromUnloaded(song: SongContent) {
		const defaultAssets = await SongContent.getDefaultAssets();
		const endAssets = new SongAssets();

		// cover
		if (utils.isURL(song.manifest.cover_file)) {
			const response = await FileManager.getFileAtUrl(song.manifest.cover_file);
			const dataurl = await FileManager.blobToDataURL(await response.blob());
			endAssets.cover = dataurl;
		}
		else {
			if (fs.existsSync(`/home/songs/${song.manifest.uuid_DONT_CHANGE}`)) {
				const stringAssets = fs.readFileSync(`/home/songs/${song.manifest.uuid_DONT_CHANGE}`, "utf-8");
				const assets = JSON.parse(stringAssets) as SongAssets;
				endAssets.cover = assets.cover;
			}
			else {
				endAssets.cover = defaultAssets.cover;
			}
		}

		// audio
		if (utils.isURL(song.manifest.cover_file)) {
			const response = await FileManager.getFileAtUrl(song.manifest.audio_file);
			const dataurl = await FileManager.blobToDataURL(await response.blob());
			endAssets.audio = dataurl;
		}
		else {
			if (fs.existsSync(`/home/songs/${song.manifest.uuid_DONT_CHANGE}`)) {
				const stringAssets = fs.readFileSync(`/home/songs/${song.manifest.uuid_DONT_CHANGE}`, "utf-8");
				const assets = JSON.parse(stringAssets) as SongAssets;
				endAssets.audio = assets.audio;
			}
			else {
				endAssets.audio = defaultAssets.audio;
			}
		}

		endAssets.chart = JSON.stringify(song.chart);
		endAssets.manifest = JSON.stringify(song.manifest);
		return endAssets;
	}

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
		manifest.assignFromOBJ(manifestContent);

		return new Promise((resolve) => resolve(manifest));
	}

	/** Parses manifest data to Assets
	 *
	 * The next step is pass it through {@link load()}
	 */
	static async parseFromManifest(manifest: SongManifest, path: string): Promise<SongAssets> {
		const assets = new SongAssets();
		const getPath = (otherPath: string) => `${path}/${otherPath}`;

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
		manifest.assignFromOBJ(TOML.parse(stringManifest));

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
		const manifest = new SongManifest().assignFromOBJ(JSON.parse(assets.manifest));
		const content = new SongContent(JSON.parse(assets.chart), manifest);
		console.log(`${GAME.NAME}: Loading song '${content.manifest.name}', ${content.isDefault ? "default" : "extra"} with the UUID ${content.manifest.uuid_DONT_CHANGE}`);

		await loadSprite(content.getCoverName(), assets.cover);
		await loadSound(content.getAudioName(), assets.audio);

		if (pushToIndexedDB) SongContent.writeToSave(pushToIndexedDB, pushToLoaded, content, assets);
		if (pushToLoaded) SongContent.addToLoaded(content);

		console.log(`${GAME.NAME}: Loaded song '${content.manifest.name}' successfully`);
		return new Promise((resolve) => resolve(content));
	}

	static async loadAll() {
		await loadSprite(SongManifest.default_cover, SongManifest.default_cover_file);
		await loadSound(SongManifest.default_audio, SongManifest.default_audio_file);

		const defaultPromises = SongContent.defaultPaths.map((path) =>
			new Promise(async (resolve, reject) => {
				const manifest = await SongContent.fetchManifestFromPath(path);
				const assets = await SongContent.parseFromManifest(manifest, path);
				await SongContent.load(assets, false, true);
				resolve("ok");
			})
		);

		await load(
			new Promise((resolve, reject) => {
				Promise.all(defaultPromises).then(() => {
					console.log(`${GAME.NAME}: Finished loading default songs SUCCESSFULLY (loaded ${SongContent.loaded.filter((song) => song.isDefault).length})`);
					resolve("ok");
				});
			}),
		);

		if (GameSave.extraSongs.length < 1) return;

		const extraPromises = GameSave.extraSongs.map((uuid, index) =>
			new Promise(async (resolve, reject) => {
				console.log(`${GAME.NAME}: Found extra song (${uuid}), will try to load`);

				if (fs.existsSync(`/home/songs/${uuid}`)) {
					const stringAssets = fs.readFileSync(`/home/songs/${uuid}`, "utf-8");
					const assets = JSON.parse(stringAssets) as SongAssets;
					await SongContent.load(assets, false, true);
					resolve("ok");
				}
				else {
					console.log(`${GAME.NAME}: Didn't find the associated files with the UUID, removing UUID from list`);
					GameSave.extraSongs.splice(index, 1);
					reject("404");
				}
			})
		);

		load(
			new Promise((resolve, reject) => {
				Promise.allSettled(extraPromises).then(() => {
					console.log(`${GAME.NAME}: Finished loading extra songs SUCCESSFULLY (loaded ${SongContent.loaded.filter((song) => !song.isDefault).length})`);
					resolve("ok");
				});
			}),
		);
	}

	static getByUUID(uuid: string) {
		return SongContent.loaded.find((song) => song.manifest.uuid_DONT_CHANGE == uuid);
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

	static removeFromExistence(song: SongContent) {
		if (!SongContent.loaded.includes(song)) return;
		const indexInLoaded = SongContent.loaded.indexOf(song);
		const indexInSave = GameSave.extraSongs.indexOf(song.manifest.uuid_DONT_CHANGE);

		SongContent.loaded.splice(indexInLoaded, 1);
		GameSave.extraSongs.splice(indexInSave, 1);
		GameSave.save();

		console.log(`${GAME.NAME}: Removed song '${song.manifest.name}' from existance`);

		// const file_path = `/home/songs/${song.manifest.uuid_DONT_CHANGE}`;
		// if (fs.existsSync("/home/songs") && fs.existsSync("home/songs/")) {
		// 	if (fs.existsSync(file_path)) fs.rmSync(file_path);
		// }

		return song;
	}

	static async hasAssetsLoaded(song: SongContent) {
		const cover = await getSprite(song.getCoverName());
		const sound = await getSound(song.getAudioName());
		const loaded = cover != null && sound != null;
		return loaded;
	}

	static async extractFromLoaded(song: SongContent) {
		const assets = new SongAssets();
		assets.manifest = JSON.stringify(song.manifest);
		assets.chart = JSON.stringify(song.chart);

		const coverURL = await FileManager.spriteToDataURL(song.getCoverName());
		assets.cover = coverURL;

		const audioURL = await FileManager.soundToDataURL(song.getAudioName());
		assets.audio = audioURL;
		return assets;
	}

	static async writeToSave(toIndexedDB: boolean, extraSongs: boolean, song: SongContent, assets?: SongAssets) {
		const file_path = `/home/songs/${song.manifest.uuid_DONT_CHANGE}`;
		assets = assets ?? await SongContent.extractFromLoaded(song);

		const data = JSON.stringify(assets);

		if (extraSongs) {
			if (GameSave.extraSongs.includes(song.manifest.uuid_DONT_CHANGE)) {
				const uuids = SongContent.loaded.map((song) => song.manifest.uuid_DONT_CHANGE);
				const index = uuids.indexOf(song.manifest.uuid_DONT_CHANGE);
				if (index != -1) GameSave.extraSongs[index] = song.manifest.uuid_DONT_CHANGE;
			}
			else {
				GameSave.extraSongs.push(song.manifest.uuid_DONT_CHANGE);
			}
		}

		if (toIndexedDB) {
			if (!fs.existsSync("/home/songs")) fs.mkdirSync("/home/songs");
			fs.writeFileSync(file_path, data);
		}

		if (GameSave.save) GameSave.save();
	}

	static addToLoaded(song: SongContent) {
		const uuids = SongContent.loaded.map((song) => song.manifest.uuid_DONT_CHANGE);
		if (uuids.includes(song.manifest.uuid_DONT_CHANGE)) {
			const index = uuids.indexOf(song.manifest.uuid_DONT_CHANGE);
			if (index != -1) SongContent.loaded[index] = song;
		}
		else {
			if (!SongContent.loaded.includes(song)) SongContent.loaded.push(song);
		}
	}

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

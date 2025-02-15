import { Zip } from "@zenfs/archives";
import fs, { resolveMountConfig } from "@zenfs/core";
import TOML, { TomlPrimitive } from "smol-toml";
import { GAME } from "../core/game";
import { GameSave } from "../core/save";
import { AUDIO_HELPER, FileManager, IMAGE_HELPER } from "../FileManager";
import { IContent } from "../modding";
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

export class Song implements IContent {
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
	static loaded: Song[] = [];
	static get loadedExtra() {
		return Song.loaded.filter((song) => !song.isDefault);
	}
	static get loadedDefault() {
		return Song.loaded.filter((song) => song.isDefault);
	}

	static async loadAll() {
		await loadSprite(SongManifest.default_cover, SongManifest.default_cover_file);
		await loadSound(SongManifest.default_audio, SongManifest.default_audio_file);

		const defaultPromises = Song.defaultPaths.map((path) =>
			new Promise(async (resolve, reject) => {
				const song = new Song();
				await song.load(await song.pathToAssets(path));
				resolve("ok");
			})
		);

		await load(
			new Promise((resolve, reject) => {
				Promise.all(defaultPromises).then(() => {
					console.log(`${GAME.NAME}: Finished loading default songs SUCCESSFULLY (loaded ${Song.loadedDefault.length})`);
					resolve("ok");
				});
			}),
		);

		if (GameSave.extraSongs.length == 0) return;

		const extraPromises = GameSave.extraSongs.map((uuid, index) =>
			new Promise(async (resolve, reject) => {
				console.log(`${GAME.NAME}: Found extra song (${uuid}), will try to load`);

				if (fs.existsSync(`/home/songs/${uuid}`)) {
					const stringAssets = fs.readFileSync(`/home/songs/${uuid}`, "utf-8");
					new Song().load(JSON.parse(stringAssets));
					resolve("ok");
				}
				else {
					console.log(`${GAME.NAME}: Didn't find the associated files with the UUID, removing UUID from list`);
					GameSave.extraSongs.splice(index, 1);
					reject("not ok");
				}
			})
		);

		load(
			new Promise((resolve, reject) => {
				Promise.allSettled(extraPromises).then(() => {
					console.log(`${GAME.NAME}: Finished loading extra songs SUCCESSFULLY (loaded ${Song.loadedExtra.length})`);
					resolve("ok");
				});
			}),
		);
	}

	manifest: SongManifest;
	chart: SongChart;

	get indexedDB_path() {
		return `/home/songs/${this.manifest.uuid_DONT_CHANGE}`;
	}

	get isDefault() {
		return Song.defaultUUIDS.includes(this.manifest.uuid_DONT_CHANGE);
	}

	get coverName() {
		return this.manifest.uuid_DONT_CHANGE + "-cover";
	}

	get audioName() {
		return this.manifest.uuid_DONT_CHANGE + "-audio";
	}

	assignFromAssets(assets: SongAssets): Song {
		this.manifest = JSON.parse(assets.manifest);
		this.chart = JSON.parse(assets.chart);
		return this;
	}

	async fileToAssets(file: File): Promise<SongAssets> {
		const zipFs = await resolveMountConfig({ backend: Zip, data: await file.arrayBuffer() });
		fs.mount("/mnt/zip", zipFs);

		const stringManifest = fs.readFileSync("/mnt/zip/manifest.toml", "utf-8");
		const manifest = new SongManifest();
		manifest.assignFromOBJ(TOML.parse(stringManifest));

		const coverBase64 = fs.readFileSync(`/mnt/zip/${manifest.cover_file}`, "base64");
		const audioBase64 = fs.readFileSync(`/mnt/zip/${manifest.audio_file}`, "base64");
		const stringChart = fs.readFileSync(`/mnt/zip/${manifest.chart_file}`, "utf-8");
		const chartObject = JSON.parse(stringChart);

		const assets = new SongAssets();
		assets.cover = IMAGE_HELPER + coverBase64;
		assets.audio = AUDIO_HELPER + audioBase64;
		assets.manifest = JSON.stringify(manifest);
		assets.chart = JSON.stringify(chartObject);

		fs.umount("/mnt/zip");

		return new Promise((resolve, reject) => resolve(assets));
	}

	async pathToAssets(path: string): Promise<SongAssets> {
		const stringedTOML = await (await fetch(path + "/manifest.toml")).text();
		const manifestContent = TOML.parse(stringedTOML);

		const manifest = new SongManifest();
		manifest.assignFromOBJ(manifestContent);

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

		return new Promise((resolve, reject) => resolve(assets));
	}

	async pushToLoaded() {
		const uuids = Song.loaded.map((song) => song.manifest.uuid_DONT_CHANGE);
		if (uuids.includes(this.manifest.uuid_DONT_CHANGE)) {
			const index = uuids.indexOf(this.manifest.uuid_DONT_CHANGE);
			if (index != -1) Song.loaded[index] = this;
		}
		else {
			if (!Song.loaded.includes(this)) Song.loaded.push(this);
		}
	}

	async load(assets: SongAssets): Promise<void> {
		this.assignFromAssets(assets);
		console.log(`${GAME.NAME}: Loading ${this.isDefault ? "default" : "extra"} song: '${this.manifest.name}' with the UUID '${this.manifest.uuid_DONT_CHANGE}'`);
		await loadSprite(this.coverName, assets.cover);
		await loadSound(this.audioName, assets.audio);
		await this.writeToSave(!this.isDefault, !this.isDefault);
		this.pushToLoaded();
		console.log(`${GAME.NAME}: Loaded ${this.isDefault ? "default" : "extra"} song: '${this.manifest.name}' successfully`);
	}

	/**
	 * Convert the current song to assets
	 *
	 * WILL ONLY WORK IF THE SONG IS LOADED
	 * @returns
	 */
	async toAssets(): Promise<SongAssets> {
		const assets = new SongAssets();
		assets.manifest = JSON.stringify(this.manifest);
		assets.chart = JSON.stringify(this.chart);

		const coverURL = await FileManager.spriteToDataURL(this.coverName);
		assets.cover = coverURL;

		const audioURL = await FileManager.soundToDataURL(this.audioName);
		assets.audio = audioURL;
		return assets;
	}

	async hasAssetsLoaded(): Promise<boolean> {
		const cover = await getSprite(this.coverName);
		const sound = await getSound(this.audioName);
		const loaded = cover != null && sound != null;
		return loaded;
	}

	async writeToSave(toSave: boolean = true, toIndexedDB: boolean = false) {
		if (toSave) {
			if (GameSave.extraSongs.includes(this.manifest.uuid_DONT_CHANGE)) {
				const uuids = Song.loaded.map((song) => song.manifest.uuid_DONT_CHANGE);
				const index = uuids.indexOf(this.manifest.uuid_DONT_CHANGE);
				if (index != -1) GameSave.extraSongs[index] = this.manifest.uuid_DONT_CHANGE;
			}
			else {
				GameSave.extraSongs.push(this.manifest.uuid_DONT_CHANGE);
			}

			if (GameSave.save && !this.isDefault) GameSave.save();
		}

		if (toIndexedDB) {
			if (!fs.existsSync("/home/songs")) fs.mkdirSync("/home/songs");
			fs.writeFileSync(this.indexedDB_path, JSON.stringify(await this.toAssets()));
		}
	}

	removeFromExistence(): Song {
		if (!Song.loaded.includes(this)) return;
		const indexInLoaded = Song.loaded.indexOf(this);
		const indexInSave = GameSave.extraSongs.indexOf(this.manifest.uuid_DONT_CHANGE);

		Song.loaded.splice(indexInLoaded, 1);
		GameSave.extraSongs.splice(indexInSave, 1);
		GameSave.save();

		console.log(`${GAME.NAME}: Removed song '${this.manifest.name}' (${this.manifest.uuid_DONT_CHANGE}) from existance`);

		if (fs.existsSync("/home/songs")) {
			if (fs.existsSync(this.indexedDB_path)) fs.rmSync(this.indexedDB_path);
		}

		return this;
	}

	constructor(assets?: SongAssets) {
		if (assets) this.assignFromAssets(assets);
	}
}

import { Zip } from "@zenfs/archives";
import fs, { resolveMountConfig } from "@zenfs/core";
import { LoadSpriteOpt } from "kaplay";
import TOML from "smol-toml";
import { GAME } from "../core/game";
import { GameSave } from "../core/save";
import { FileManager, IMAGE_HELPER } from "../FileManager";
import { ContentManifest, IContent } from "../modding";
import { Move } from "../play/objects/dancer";

export class NoteskinManifest extends ContentManifest {
	name: string;
	sprite_path: string;
	data_path: string;
	id: string;
}

export class NoteskinAssets {
	manifest: string;
	sprite: string;
	data: string;
}

export class Noteskin implements IContent {
	static defaultNoteskins: string[] = ["arrows", "taiko", "play"];
	static defaultPaths: string[] = [
		"content/noteskins/arrows",
		"content/noteskins/taiko",
		"content/noteskins/play",
	];
	static loaded: Noteskin[] = [];

	static get loadedExtra() {
		return Noteskin.loaded.filter((noteskin) => !noteskin.isDefault);
	}
	static get loadedDefault() {
		return Noteskin.loaded.filter((noteskin) => noteskin.isDefault);
	}

	static async loadAll() {
		const defaultPromises = Noteskin.defaultPaths.map((path) =>
			new Promise(async (resolve, reject) => {
				const noteskin = new Noteskin();
				await noteskin.load(await noteskin.pathToAssets(path));
				resolve("ok");
			})
		);

		await load(
			new Promise((resolve, reject) => {
				Promise.all(defaultPromises).then(() => {
					console.log(`${GAME.NAME}: Finished loading default noteskins SUCCESSFULLY (loaded ${Noteskin.loadedDefault.length})`);
					resolve("ok");
				});
			}),
		);

		if (GameSave.extraNoteskins.length == 0) return;

		const extraPromises = GameSave.extraNoteskins.map((id, index) =>
			new Promise(async (resolve, reject) => {
				console.log(`${GAME.NAME}: Found extra noteskin (${id}), will try to load`);

				if (fs.existsSync(`/home/noteskins/${id}`)) {
					const stringAssets = fs.readFileSync(`/home/noteskins/${id}`, "utf-8");
					new Noteskin().load(JSON.parse(stringAssets));
					resolve("ok");
				}
				else {
					console.log(`${GAME.NAME}: Didn't find the associated files with the ID, removing ID from list`);
					GameSave.extraNoteskins.splice(index, 1);
					reject("not ok");
				}
			})
		);

		load(
			new Promise((resolve, reject) => {
				Promise.allSettled(extraPromises).then(() => {
					console.log(`${GAME.NAME}: Finished loading extra noteskins SUCCESSFULLY (loaded ${Noteskin.loadedExtra.length})`);
					resolve("ok");
				});
			}),
		);
	}

	manifest: NoteskinManifest;
	spriteData: LoadSpriteOpt;

	async hasAssetsLoaded(): Promise<boolean> {
		return await getSprite(this.spriteName) != null;
	}

	async fileToAssets(file: File): Promise<NoteskinAssets> {
		const zipFs = await resolveMountConfig({ backend: Zip, data: await file.arrayBuffer() });
		fs.mount("/mnt/zip", zipFs);

		const stringManifest = fs.readFileSync("/mnt/zip/manifest.toml", "utf-8");
		const manifest = new NoteskinManifest().assignFromOBJ(TOML.parse(stringManifest));

		const sprite = fs.readFileSync(`/mnt/zip/${manifest.sprite_path}`, "base64");
		const spriteData = fs.readFileSync(`/mnt/zip/${manifest.data_path}`, "utf-8");

		const assets = {} as NoteskinAssets;
		assets.manifest = JSON.stringify(manifest);
		assets.sprite = IMAGE_HELPER + sprite;
		assets.data = spriteData;

		fs.umount("/mnt/zip");

		return new Promise((resolve, reject) => resolve(assets));
	}

	removeFromExistence() {
		if (!Noteskin.loaded.includes(this)) return;
		const indexInLoaded = Noteskin.loaded.indexOf(this);
		const indexInSave = GameSave.extraNoteskins.indexOf(this.manifest.id);

		Noteskin.loaded.splice(indexInLoaded, 1);
		GameSave.extraNoteskins.splice(indexInSave, 1);
		GameSave.save();

		console.log(`${GAME.NAME}: Removed noteskin '${this.manifest.name}' (${this.manifest.id}) from existance`);

		if (fs.existsSync("/home/noteskins")) {
			if (fs.existsSync(this.indexedDB_path)) fs.rmSync(this.indexedDB_path);
		}

		return this;
	}

	async pathToAssets(path: string): Promise<any> {
		const stringedTOML = await (await fetch(path + "/manifest.toml")).text();
		const manifestContent = TOML.parse(stringedTOML);

		const manifest = new NoteskinManifest();
		manifest.assignFromOBJ(manifestContent);

		const assets = new NoteskinAssets();
		const getPath = (otherPath: string) => `${path}/${otherPath}`;

		const sprite = await FileManager.getFileAtUrl(getPath(manifest.sprite_path));
		const data = await FileManager.getFileAtUrl(getPath(manifest.data_path));

		if (sprite) assets.sprite = await FileManager.blobToDataURL(await sprite.blob());
		if (data) assets.data = await (await data.blob()).text();
		assets.manifest = JSON.stringify(manifest);

		return new Promise((resolve, reject) => resolve(assets));
	}

	get spriteName() {
		return `noteskin_${this.manifest.id}`;
	}

	assignFromAssets(assets: NoteskinAssets) {
		this.manifest = JSON.parse(assets.manifest);
		this.spriteData = JSON.parse(assets.data);
	}

	async toAssets(): Promise<any> {
		const assets = new NoteskinAssets();
		assets.manifest = JSON.stringify(this.manifest);
		assets.data = JSON.stringify(this.spriteData);
		assets.sprite = await FileManager.spriteToDataURL(this.spriteName);
		return assets;
	}

	async writeToSave(toSave: boolean = false, toIndexedDB: boolean = false): Promise<void> {
		if (toSave) {
			if (GameSave.extraNoteskins.includes(this.manifest.id)) {
				const uuids = Noteskin.loaded.map((noteskin) => noteskin.manifest.id);
				const index = uuids.indexOf(this.manifest.id);
				if (index != -1) GameSave.extraNoteskins[index] = this.manifest.id;
			}
			else {
				GameSave.extraNoteskins.push(this.manifest.id);
			}

			if (GameSave.save && !this.isDefault) GameSave.save();
		}

		if (toIndexedDB) {
			if (!fs.existsSync("/home/noteskins")) fs.mkdirSync("/home/noteskins");
			fs.writeFileSync(this.indexedDB_path, JSON.stringify(await this.toAssets()));
		}
	}

	async load(assets: NoteskinAssets): Promise<void> {
		this.assignFromAssets(assets);
		console.log(`${GAME.NAME}: Loading ${this.isDefault ? "default" : "extra"} noteskin: '${this.manifest.name}' with the ID '${this.manifest.id}'`);
		await loadSprite(this.spriteName, assets.sprite, JSON.parse(assets.data));
		await this.writeToSave(!this.isDefault, !this.isDefault);
		this.pushToLoaded();
		console.log(`${GAME.NAME}: Loaded ${this.isDefault ? "default" : "extra"} noteskin: '${this.manifest.name}' successfully`);
	}

	getSprite(move: Move, type?: "trail" | "tail") {
		if (type) return `${move}_${type}`;
		else return move;
	}

	addTest() {
		["left", "down", "up", "right"].forEach((move: Move, index) => {
			add([
				sprite(this.spriteName, { anim: this.getSprite(move) }),
				pos(90, 90 + index * 60),
				anchor("center"),
			]);

			// trail
			add([
				sprite(this.spriteName, { anim: this.getSprite(move, "trail") }),
				pos(170, 90 + index * 60),
				anchor("center"),
			]);

			// tail
			add([
				sprite(this.spriteName, { anim: this.getSprite(move, "tail") }),
				pos(260, 90 + index * 60),
				anchor("center"),
			]);
		});
	}

	pushToLoaded(): void {
		const ids = Noteskin.loaded.map((noteskin) => noteskin.manifest.id);
		if (ids.includes(this.manifest.id)) {
			const index = ids.indexOf(this.manifest.id);
			if (index != -1) Noteskin.loaded[index] = this;
		}
		else Noteskin.loaded.push(this);
	}

	get indexedDB_path() {
		return `/home/noteskins/${this.manifest.id}`;
	}

	get isDefault() {
		return Noteskin.defaultNoteskins.includes(this.manifest.id);
	}
}

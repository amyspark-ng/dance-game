import fs from "@zenfs/core";
import { LoadSpriteOpt } from "kaplay";
import TOML from "smol-toml";
import { GAME } from "../core/game";
import { GameSave } from "../core/save";
import { FileManager } from "../FileManager";
import { Move } from "../play/objects/dancer";

export class NoteskinManifest {
	name: string;
	sprite_path: string;
	data_path: string;

	assignFromOBJ(obj: Record<string, any>) {
		Object.keys(obj).forEach((key) => this[key] = obj[key]);
		return this as NoteskinManifest;
	}
}

export class NoteskinAssets {
	manifest: string;
	sprite: string;
	data: string;
}

// TODO: Do this like the others
export class NoteskinContent {
	static defaultNoteskins: string[] = ["arrows", "taiko", "play"];

	static defaultPaths: string[] = [
		"content/noteskins/arrows",
		// "content/noteskins/taiko",
		// "content/noteskins/play",
	];

	static loaded: NoteskinContent[] = [];

	static getByName(name: string) {
		return NoteskinContent.loaded.find((skin) => skin.name == name);
	}

	static async parseFromManifest(manifest: NoteskinManifest, pathPrefix: string) {
		const getPath = (otherPath: string) => `${pathPrefix}/${otherPath}`;

		const assets = new NoteskinAssets();
		const sprite = await FileManager.blobToDataURL(await (await FileManager.getFileAtUrl(getPath(manifest.sprite_path))).blob());
		const data = await (await (await FileManager.getFileAtUrl(getPath(manifest.data_path))).blob()).text();
		assets.manifest = JSON.stringify(manifest);
		assets.data = data;
		assets.sprite = sprite;
		return assets;
	}

	static async extractFromLoaded(noteskin: NoteskinContent) {
		const assets = new NoteskinAssets();
		assets.manifest = JSON.stringify(noteskin.manifest);
		assets.sprite = await FileManager.spriteToDataURL(noteskin.getSpriteName());
		assets.data = JSON.stringify(noteskin.spriteData);
		return assets;
	}

	static async writeToSave(toIndexedDB: boolean, extraNoteskins: boolean, noteskin: NoteskinContent, assets?: NoteskinAssets) {
		const file_path = `/home/noteskins/${noteskin.name}`;
		assets = assets ?? await NoteskinContent.extractFromLoaded(noteskin);

		const data = JSON.stringify(assets);

		if (extraNoteskins) {
			if (GameSave.extraNoteskins.includes(noteskin.name)) {
				const index = GameSave.extraNoteskins.indexOf(noteskin.name);
				if (index != -1) GameSave.extraNoteskins[index] = noteskin.name;
			}
			else {
				GameSave.extraNoteskins.push(noteskin.name);
			}
		}

		if (toIndexedDB) {
			if (!fs.existsSync("/home/noteskins")) fs.mkdirSync("/home/noteskins");
			fs.writeFileSync(file_path, data);
		}

		if (GameSave.save) GameSave.save();
	}

	static async fetchManifestFromPath(path: string): Promise<NoteskinManifest> {
		const stringedTOML = await (await fetch(path + "/manifest.toml")).text();
		const manifestContent = TOML.parse(stringedTOML);
		const manifest = new NoteskinManifest().assignFromOBJ(manifestContent);
		return new Promise((resolve) => resolve(manifest));
	}

	static async addTestSprites(content: NoteskinContent) {
		["left", "down", "up", "right"].forEach((move: Move, index) => {
			add([
				sprite(content.getSpriteName(), { anim: content.getSprite(move) }),
				pos(90, 90 + index * 60),
				anchor("center"),
			]);

			// trail
			add([
				sprite(content.getSpriteName(), { anim: content.getSprite(move, "trail") }),
				pos(170, 90 + index * 60),
				anchor("center"),
			]);

			// tail
			add([
				sprite(content.getSpriteName(), { anim: content.getSprite(move, "tail") }),
				pos(260, 90 + index * 60),
				anchor("center"),
			]);
		});
	}

	static async addToLoaded(content: NoteskinContent) {
		const uuids = NoteskinContent.loaded.map((song) => song.name);
		if (uuids.includes(content.name)) {
			const index = uuids.indexOf(content.name);
			if (index != -1) NoteskinContent.loaded[index] = content;
		}
		else {
			if (!NoteskinContent.loaded.includes(content)) NoteskinContent.loaded.push(content);
		}
	}

	static async load(assets: NoteskinAssets, pushToIndexedDB = false, pushToLoaded = true): Promise<NoteskinContent> {
		const manifest = JSON.parse(assets.manifest) as NoteskinManifest;
		const data = JSON.parse(assets.data) as LoadSpriteOpt;
		const content = new NoteskinContent(manifest.name, data);
		console.log(`${GAME.NAME}: Loading ${content.isDefault ? "default" : "extra"} noteskin, '${manifest.name}'`);

		if (pushToIndexedDB) NoteskinContent.writeToSave(pushToIndexedDB, pushToLoaded, content, assets);
		if (pushToLoaded) NoteskinContent.addToLoaded(content);

		console.log(`${GAME.NAME}: Loaded noteskin '${content.name}' successfully`);

		return new Promise((resolve) => resolve(content));
	}

	static async loadAll() {
		const defaultPromises = NoteskinContent.defaultPaths.map((path) =>
			new Promise(async (resolve, reject) => {
				const manifest = await NoteskinContent.fetchManifestFromPath(path);
				const assets = await NoteskinContent.parseFromManifest(manifest, path);
				await NoteskinContent.load(assets, false, true);
				resolve("ok");
			})
		);

		await load(
			new Promise((resolve, reject) => {
				Promise.all(defaultPromises).then(() => {
					console.log(`${GAME.NAME}: Finished loading default noteskins SUCCESSFULLY (loaded ${NoteskinContent.loaded.filter((noteskin) => noteskin.isDefault).length})`);
					resolve("ok");
				});
			}),
		);

		if (GameSave.extraNoteskins.length < 1) return;

		const extraPromises = GameSave.extraNoteskins.map((name, index) =>
			new Promise(async (resolve, reject) => {
				console.log(`${GAME.NAME}: Found extra noteskin (${name}), will try to load`);

				if (fs.existsSync(`/home/noteskins/${name}`)) {
					const stringAssets = fs.readFileSync(`/home/noteskins/${name}`, "utf-8");
					const assets = JSON.parse(stringAssets) as NoteskinAssets;
					await NoteskinContent.load(assets, false, true);
					resolve("ok");
				}
				else {
					console.log(`${GAME.NAME}: Didn't find the associated files with the noteskin, removing noteskin from list`);
					GameSave.extraNoteskins.splice(index, 1);
					reject("404");
				}
			})
		);

		load(
			new Promise((resolve, reject) => {
				Promise.allSettled(extraPromises).then(() => {
					console.log(`${GAME.NAME}: Finished loading extra noteskins SUCCESSFULLY (loaded ${NoteskinContent.loaded.filter((noteskin) => !noteskin.isDefault).length})`);
					resolve("ok");
				});
			}),
		);
	}

	name: string;
	spriteData: LoadSpriteOpt;
	manifest: NoteskinManifest = new NoteskinManifest();
	getSpriteName() {
		return `${this.name}-noteskin`;
	}

	getSprite(move: Move, type?: "tail" | "trail") {
		if (type) return `${move}_${type}`;
		else return move;
	}

	get isDefault() {
		return NoteskinContent.defaultNoteskins.includes(this.name);
	}

	constructor(name?: string, data?: LoadSpriteOpt) {
		this.name = name;
		this.spriteData = data;
	}
}

// export function getNoteskinSprite(sprite: "tail" | "trail", move: Move): string;
// export function getNoteskinSprite(sprite: Move): string;
// export function getNoteskinSprite(sprite: typeof NoteskinData.Moves[number], move?: Move) {
// 	const noteskin = NoteskinContent.getByName(GameSave.noteskin);
// 	// @ts-ignore
// 	return noteskin.getSprite(sprite, move);
// }

export function getCurNoteskin() {
	return NoteskinContent.loaded.find((noteskin) => noteskin.name == GameSave.noteskin);
}

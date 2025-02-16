import { Zip } from "@zenfs/archives";
import fs, { resolveMountConfig } from "@zenfs/core";
import { LoadSpriteOpt } from "kaplay";
import TOML, { TomlPrimitive } from "smol-toml";
import { GAME } from "../core/game";
import { GameSave } from "../core/save";
import { FileManager, IMAGE_HELPER } from "../FileManager";
import { ContentManifest, IContent } from "../modding";

type DancerAnim = "left" | "down" | "up" | "right" | "idle" | "miss";

type DancerAssets = {
	manifest: string;
	sprite: string;
	sprite_data: string;
	bg: string;
};

export class DancerManifest extends ContentManifest {
	name: string;
	id: string;
	artist: string;
	sprite_path: string;
	sprite_data_path: string;
	bg_path: string;
	bop_on_beat: boolean;
}

export class Dancer implements IContent {
	static defaultDancers: string[] = [
		"astri",
		// "astri-blight",
		// "starlight",
		// "mormon",
	];

	static defaultPaths: string[] = [
		"content/dancers/astri",
		// "content/dancers/astri-blight",
		// "content/dancers/starlight",
		// "content/dancers/mormon",
	];

	static loaded: Dancer[] = [];
	static get loadedExtra() {
		return Dancer.loaded.filter((dancer) => !dancer.isDefault);
	}

	static get loadedDefault() {
		return Dancer.loaded.filter((dancer) => dancer.isDefault);
	}

	static getByID(id: string) {
		return Dancer.loaded.find((dancer) => dancer.manifest.id == id);
	}

	static async loadAll() {
		const defaultPromises = Dancer.defaultPaths.map((path) =>
			new Promise(async (resolve, reject) => {
				const dancer = new Dancer();
				await dancer.load(await dancer.pathToAssets(path));
				resolve("ok");
			})
		);

		await load(
			new Promise((resolve, reject) => {
				Promise.all(defaultPromises).then(() => {
					console.log(`${GAME.NAME}: Finished loading default dancers SUCCESSFULLY (loaded ${Dancer.loadedDefault.length})`);
					resolve("ok");
				});
			}),
		);

		if (GameSave.extraDancers.length == 0) return;

		const extraPromises = GameSave.extraDancers.map((id, index) =>
			new Promise(async (resolve, reject) => {
				console.log(`${GAME.NAME}: Found extra dancer (${id}), will try to load`);

				if (fs.existsSync(`/home/dancers/${id}`)) {
					const stringAssets = fs.readFileSync(`/home/dancers/${id}`, "utf-8");
					new Dancer().load(JSON.parse(stringAssets));
					resolve("ok");
				}
				else {
					console.log(`${GAME.NAME}: Didn't find the associated files with the ID, removing ID from list`);
					GameSave.extraDancers.splice(index, 1);
					reject("not ok");
				}
			})
		);

		load(
			new Promise((resolve, reject) => {
				Promise.allSettled(extraPromises).then(() => {
					console.log(`${GAME.NAME}: Finished loading extra dancers SUCCESSFULLY (loaded ${Dancer.loadedExtra.length})`);
					resolve("ok");
				});
			}),
		);
	}

	manifest: DancerManifest;
	spriteData: LoadSpriteOpt;

	assignFromAssets(assets: DancerAssets) {
		this.manifest = JSON.parse(assets.manifest);
		this.spriteData = JSON.parse(assets.sprite_data); // wtf?????????????
		return this;
	}

	get rawAnims() {
		return this.spriteData.anims;
	}

	getAnim(move: DancerAnim, miss: boolean = false) {
		if (!Object.keys(this.rawAnims).includes("idle")) throw new Error("You have to at least include a miss animation for dancer: " + this.manifest.id);

		const animNames = Object.keys(this.rawAnims);

		// searching for regular move and combination (move_miss)
		const anim = animNames.find((name) => {
			if (name.includes(move)) {
				if (miss && name.includes("miss")) return true;
				else if (!miss) return true;
			}
			// didn't found an anim that matched the one you were looking for
			else return false;
		});

		if (!anim && miss) {
			if (animNames.includes("miss")) return "miss";
		}
		else if (anim) return anim;

		// this is if definetely didn't found a thing
		throw new Error(`Didn't found anim for Dancer ${this.manifest.name}, was looking for move ${move} (miss: ${miss})`);
	}

	animToMove(anim: string) {
		// @ts-ignore
		if (moveAnimsArr.includes(anim)) return anim;
		else {
			// moveAnimsArr.forEach((move) => {
			// 	if (anim.includes(move)) return anim;
			// });
			return undefined;
		}
	}

	get spriteName() {
		return `dancer_${this.manifest.id}`;
	}

	get bgSpriteName() {
		return `dancerBg_${this.manifest.id}`;
	}

	get indexedDB_path() {
		return `/home/dancers/${this.manifest.id}`;
	}

	get isDefault() {
		return Dancer.defaultDancers.includes(this.manifest.id);
	}

	removeFromExistence(): Dancer {
		if (!Dancer.loaded.includes(this)) return;
		const indexInLoaded = Dancer.loaded.indexOf(this);
		const indexInSave = GameSave.extraDancers.indexOf(this.manifest.id);

		Dancer.loaded.splice(indexInLoaded, 1);
		GameSave.extraDancers.splice(indexInSave, 1);
		GameSave.save();

		console.log(`${GAME.NAME}: Removed dancer '${this.manifest.name}' (${this.manifest.id}) from existance`);

		if (fs.existsSync("/home/dancers")) {
			if (fs.existsSync(this.indexedDB_path)) fs.rmSync(this.indexedDB_path);
		}

		return this;
	}

	async fileToAssets(file: File): Promise<DancerAssets> {
		const zipFs = await resolveMountConfig({ backend: Zip, data: await file.arrayBuffer() });
		fs.mount("/mnt/zip", zipFs);

		const stringManifest = fs.readFileSync("/mnt/zip/manifest.toml", "utf-8");
		const manifest = new DancerManifest().assignFromOBJ(TOML.parse(stringManifest));

		const sprite = fs.readFileSync(`/mnt/zip/${manifest.sprite_path}`, "base64");
		const spriteData = fs.readFileSync(`/mnt/zip/${manifest.sprite_data_path}`, "utf-8");
		const bg = fs.readFileSync(`/mnt/zip/${manifest.bg_path}`, "base64");

		const assets = {} as DancerAssets;
		assets.manifest = JSON.stringify(manifest);
		assets.sprite = IMAGE_HELPER + sprite;
		assets.sprite_data = spriteData;
		assets.bg = IMAGE_HELPER + bg;

		fs.umount("/mnt/zip");

		return new Promise((resolve, reject) => resolve(assets));
	}

	pushToLoaded(): void {
		const ids = Dancer.loaded.map((dancer) => dancer.manifest.id);
		if (ids.includes(this.manifest.id)) {
			const index = ids.indexOf(this.manifest.id);
			if (index != -1) Dancer.loaded[index] = this;
		}
		else {
			if (!Dancer.loaded.includes(this)) Dancer.loaded.push(this);
		}
	}

	async hasAssetsLoaded(): Promise<boolean> {
		const sprite = await getSprite(this.spriteName);
		const bg = await getSprite(this.bgSpriteName);
		const loaded = sprite != null && bg != null;
		return loaded;
	}

	async pathToAssets(path: string): Promise<DancerAssets> {
		const assets: DancerAssets = {} as any;
		const stringTOML = await (await fetch(path + "/manifest.toml")).text();
		const manifest = new DancerManifest().assignFromOBJ(TOML.parse(stringTOML));
		const getPath = (otherPath: string) => `${path}/${otherPath}`;

		const sprite = FileManager.getFileAtUrl(getPath(manifest.sprite_path));
		const spriteData = FileManager.getFileAtUrl(getPath(manifest.sprite_data_path));
		const bg = FileManager.getFileAtUrl(getPath(manifest.bg_path));

		if (sprite) assets.sprite = await FileManager.blobToDataURL(await (await sprite).blob());
		if (spriteData) assets.sprite_data = JSON.stringify(JSON.parse(await (await (await spriteData).blob()).text()));
		if (bg) assets.bg = await FileManager.blobToDataURL(await (await bg).blob());
		assets.manifest = JSON.stringify(manifest);

		return new Promise((resolve) => resolve(assets));
	}

	async toAssets(): Promise<DancerAssets> {
		const assets = {} as DancerAssets;
		assets.manifest = JSON.stringify(this.manifest);
		assets.sprite_data = JSON.stringify(this.spriteData);
		assets.sprite = await FileManager.spriteToDataURL(this.spriteName);
		assets.bg = await FileManager.spriteToDataURL(this.bgSpriteName);
		return assets;
	}

	async writeToSave(toSave: boolean = true, toIndexedDB: boolean = false): Promise<void> {
		if (toSave) {
			if (GameSave.extraDancers.includes(this.manifest.id)) {
				const ids = Dancer.loaded.map((dancer) => dancer.manifest.id);
				const index = ids.indexOf(this.manifest.id);
				if (index != -1) GameSave.extraDancers[index] = this.manifest.id;
			}
			else {
				GameSave.extraDancers.push(this.manifest.id);
			}

			if (GameSave.save && !this.isDefault) GameSave.save();
		}

		if (toIndexedDB) {
			if (!fs.existsSync("/home/dancers")) fs.mkdirSync("/home/dancers");
			fs.writeFileSync(this.indexedDB_path, JSON.stringify(await this.toAssets()));
		}
	}

	async load(assets: DancerAssets): Promise<void> {
		this.assignFromAssets(assets);
		console.log(`${GAME.NAME}: Loading ${this.isDefault ? "default" : "extra"} dancer: '${this.manifest.name}' with the ID '${this.manifest.id}'`);
		await loadSprite(this.spriteName, assets.sprite, this.spriteData);
		await loadSprite(this.bgSpriteName, assets.bg);
		await this.writeToSave(!this.isDefault, !this.isDefault);
		this.pushToLoaded();
		console.log(`${GAME.NAME}: Loaded ${this.isDefault ? "default" : "extra"} dancer: '${this.manifest.name}' successfully`);
	}
}

export function getCurDancer() {
	return Dancer.loaded.find((dancer) => dancer.manifest.id == GameSave.dancer);
}

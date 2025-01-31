import { LoadSpriteOpt, SpriteAnim } from "kaplay";
import TOML, { TomlPrimitive } from "smol-toml";
import { GameSave } from "../core/save";
import { FileManager } from "../FileManager";
import { DancerAnim, moveAnimsArr } from "../play/objects/dancer";

type DancerAssets = {
	manifest: DancerManifest;
	dancerSprite: string;
	dancerData: LoadSpriteOpt;
	bgSprite: string;
};

export class DancerManifest {
	/** The path the manifest is located in */
	path: string = undefined;
	name: string;
	artist: string;
	sprite_file_path: string;
	sprite_data_path: string;
	bg_file_path: string;

	getPath(path: string) {
		return this.path + "/" + path;
	}

	constructor(tomlRecord: Record<string, TomlPrimitive>, path: string) {
		Object.keys(tomlRecord).forEach((key) => {
			if (tomlRecord[key] == "" || tomlRecord[key] == "undefined" || tomlRecord[key] == "" || tomlRecord[key] == "null") {
				this[key] = undefined;
			}
			else {
				this[key] = tomlRecord[key];
			}
		});
		this.path = path;
	}
}

export class DancerContent {
	static async fetchManifest(path: string): Promise<DancerManifest> {
		const stringedTOML = await (await fetch(path + "/manifest.toml")).text();
		const TOMLm = TOML.parse(stringedTOML);
		return new Promise((resolve) => resolve(new DancerManifest(TOMLm, path)));
	}

	// function parseFromFile(zipFile: File) {
	//     const endData = new DancerAssetData();
	//     return endData;
	// }

	static async parseFromManifest(manifest: DancerManifest): Promise<DancerAssets> {
		const endData: DancerAssets = {} as any;
		endData.manifest = manifest;

		if (await FileManager.getFileAtUrl(manifest.getPath(manifest.sprite_file_path))) {
			endData.dancerSprite = manifest.getPath(manifest.sprite_file_path);
		}

		const spriteData = await FileManager.getFileAtUrl(manifest.getPath(manifest.sprite_data_path));
		if (spriteData) endData.dancerData = JSON.parse(await spriteData.text());

		if (await FileManager.getFileAtUrl(manifest.getPath(manifest.bg_file_path))) {
			endData.bgSprite = manifest.getPath(manifest.bg_file_path);
		}

		return new Promise((resolve) => resolve(endData));
	}

	static async load(assets: DancerAssets): Promise<DancerContent> {
		if (assets.dancerData) {
			await loadSprite("dancer_" + assets.manifest.name, assets.dancerSprite, assets.dancerData);
		}
		else {
			await loadSprite("dancer_" + assets.manifest.name, assets.dancerSprite);
		}

		if (assets.manifest.bg_file_path) {
			await loadSprite("dancerBg_" + assets.manifest.name, assets.bgSprite);
		}

		return new Promise((resolve) => resolve(new DancerContent({ manifest: assets.manifest, spriteOpt: assets.dancerData })));
	}

	static async loadAll() {
		await load(
			new Promise(async (resolve, reject) => {
				try {
					DancerContent.defaultPaths.forEach(async (path, index) => {
						try {
							const manifest = await DancerContent.fetchManifest(path);
							const assets = await DancerContent.parseFromManifest(manifest);
							const content = await DancerContent.load(assets);
							DancerContent.loaded.push(content);
						}
						catch (err) {
							throw new Error("There was an error loading the default dancers", { cause: "Idk: " + path });
						}

						if (index == DancerContent.defaultPaths.length - 1) resolve("ok");
					});
				}
				catch (e) {
					reject(e);
				}
			}),
		);
	}

	static getByName(name: string) {
		return DancerContent.loaded.find((content) => content.manifest.name == name);
	}

	static loaded: DancerContent[] = [];

	static defaultPaths: string[] = [
		"content/dancers/astri",
		"content/dancers/astri-blight",
		// "content/dancers/gru",
		"content/dancers/starlight",
		"content/dancers/mormon",
	];

	manifest: DancerManifest;
	spriteOpt: LoadSpriteOpt;

	get anims() {
		return this.spriteOpt.anims;
	}

	getAnim(move: DancerAnim, miss: boolean = false) {
		if (!Object.keys(this.anims).includes("idle")) throw new Error("You have to at least include a miss animation for dancer: " + this.manifest.name);
		const animNames = Object.keys(this.anims);

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
			moveAnimsArr.forEach((move) => {
				if (anim.includes(move)) return anim;
			});
			return undefined;
		}
	}

	get spriteName() {
		return "dancer_" + this.manifest.name;
	}

	get bgSpriteName() {
		return "dancerBg_" + this.manifest.name;
	}

	constructor(instance: { manifest: DancerManifest; spriteOpt: LoadSpriteOpt; }) {
		Object.assign(this, instance);
	}
}

export function getDancer() {
	return DancerContent.getByName(GameSave.dancer);
}

export function getDancerByName(name: string) {
	return DancerContent.loaded.find((dancer) => dancer.manifest.name == name);
}

import { LoadSpriteOpt } from "kaplay";
import TOML, { TomlPrimitive } from "smol-toml";
import { SongContent } from "./data/song";
import { FileManager } from "./FileManager";

export class DancerManifest {
	/** The path the manifest is located in */
	path: string = undefined;
	name: string;
	artist: string;
	sprite_file_path: string;
	sprite_data_path: string;
	bg_file_path: string;
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

export class DancerAssetData {
	dancerSprite: string;
	dancerData: LoadSpriteOpt;
	bgSprite: string;
}

// should have a function to fetch path to look for a manifest file
// if the manifest is found then load using it
export async function fetchManifest(path: string): Promise<DancerManifest> {
	const stringedManifest = await (await fetch(path + "/manifest.toml")).text();
	const result = TOML.parse(stringedManifest);
	return new DancerManifest(result, path);
}

export async function parseFromFile(zipFile: File) {
	const endData = new DancerAssetData();
	return endData;
}

// now we have to convert the manifest data to usable result so we can load it in the game
export async function parseFromManifest(manifest: DancerManifest) {
	const endData = new DancerAssetData();

	if (await FileManager.getFileAtUrl(manifest.path + "/" + manifest.sprite_file_path)) {
		endData.dancerSprite = manifest.path + "/" + manifest.sprite_file_path;
	}

	const spriteData = await FileManager.getFileAtUrl(manifest.path + "/" + manifest.sprite_data_path);
	if (spriteData) endData.dancerData = JSON.parse(await spriteData.text());

	if (await FileManager.getFileAtUrl(manifest.path + "/" + manifest.bg_file_path)) {
		endData.bgSprite = manifest.path + "/" + manifest.bg_file_path;
	}

	return endData;
}

// then now that we have the manifest we have to handle the asset loading
export async function loadDancer(manifest: DancerManifest, data: DancerAssetData) {
	if (data.dancerData) {
		await loadSprite("dancer_" + manifest.name, data.dancerSprite, data.dancerData);
	}
	else {
		await loadSprite("dancer_" + manifest.name, data.dancerSprite);
	}

	if (manifest.bg_file_path) {
		await loadSprite("dancerBg_" + manifest.name, data.bgSprite);
	}
}

// now that we have the functions, let's try loading a dancer
const manifest = await fetchManifest("content/dancers/starlight");
const assetData = await parseFromManifest(manifest);
await loadDancer(manifest, assetData);

if (manifest.bg_file_path) {
	add([
		sprite("dancerBg_Starlight"),
		anchor("center"),
		pos(center()),
	]);
}

const dancer = add([
	sprite("dancer_Starlight", { anim: "left" }),
	anchor("bot"),
	pos(center()),
	scale(2),
]);

const keysAndMoves = {
	"w": "up",
	"a": "left",
	"s": "down",
	"d": "right",
	"space": "idle",
};

Object.keys(keysAndMoves).forEach((key) => {
	const move = keysAndMoves[key];
	onKeyPress(key, () => {
		if (isKeyDown("shift")) dancer.play(move + "_miss");
		else dancer.play(move);
		tween(1.8, 2, 0.15, (p) => dancer.scale.y = p);
	});
});

const bopeeboManifest = await SongContent.fetchManifestFromPath("content/songs/bopeebo");
const assets = await SongContent.parseFromManifest(bopeeboManifest);
await SongContent.load(assets);

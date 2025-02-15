import "./kaplay";
// import "./core/init";
import fs, { configure, InMemory } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";
import { _GameSave, GameSave } from "./core/save";
import { Song } from "./data/song";
import { FileManager } from "./FileManager";

await configure({
	mounts: {
		"/tmp": InMemory,
		"/home": IndexedDB,
	},
	addDevices: true,
});

Song.loadAll();

onLoad(() => {
	onKeyPress("space", async () => {
		const file = await FileManager.receiveFile("mod");
		const song = new Song();
		await song.load(await song.fileToAssets(file));
	});
});

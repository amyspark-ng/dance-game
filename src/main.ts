import "./kaplay";
// import "./core/init";
import fs, { configure, InMemory } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";
import { _GameSave, GameSave } from "./core/save";
import { Dancer } from "./data/dancer";
import { Song } from "./data/song";
import { FileManager } from "./FileManager";

await configure({
	mounts: {
		"/tmp": InMemory,
		"/home": IndexedDB,
	},
	addDevices: true,
});

Dancer.loadAll();

onKeyPress("space", async () => {
	const file = await FileManager.receiveFile("mod");
	const dancer = new Dancer();
	await dancer.load(await dancer.fileToAssets(file));
});

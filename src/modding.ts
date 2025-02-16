import { AUDIO_HELPER, IMAGE_HELPER, inputElement } from "./FileManager";

export interface IContent {
	/** Converts a path to assets (used for default mods) */
	pathToAssets(path: string): Promise<any>;
	/** Converts a file to assets (used for extra mods) */
	fileToAssets(file: File): Promise<any>;
	/** Assign mod from assets */
	assignFromAssets(assets: any): any;
	pushToLoaded(): void;
	/** Given the assets, load its sprites, writeToSave, and pushToLoaded */
	load(assets: any): Promise<void>;
	writeToSave(): Promise<void>;
	removeFromExistence(): any;
	hasAssetsLoaded(): Promise<boolean>;
	toAssets(): Promise<any>;
	isDefault: boolean;
	indexedDB_path: string;
}

export class ContentManifest {
	assignFromOBJ(obj: any) {
		Object.keys(obj).forEach((key) => {
			if (!(obj[key] == "undefined" || obj[key] == "")) {
				this[key] = obj[key];
			}
		});

		return this;
	}
}

export type ModTag = "song" | "dancer" | "noteskin";

export class Mods {
	static async receive() {
		inputElement.accept = ".zip";
		inputElement.click();
		return new Promise((resolve) => {
			inputElement.onchange = () => {
				resolve(inputElement.files[0]);
			};
			inputElement.oncancel = () => {
				resolve(null);
			};
		});
	}

	// static async add<R extends ModTag, T = R extends "song" ? SongContent : R extends "dancer" ? DancerContent : R extends "noteskin" ? NoteskinContent : Song>(
	// 	tag: R,
	// 	file: File,
	// ): Promise<T> {
	// 	let content: T = null;
	// 	if (tag == "song") content = await SongContent.load(await fileToSongAssets(file), true, true) as T;
	// 	// else if (tag == "dancer") content =

	// 	return content;
	// }
}

// saving this for song importing
// const oldLoadedList = cloneDeep(Song.loaded);
// const assets = await Song.parseFromFile(gottenFile);
// const content = await Song.load(assets, true, false);

// // is trying to overwrite deafult, not!!
// if (Song.defaultUUIDS.includes(content.manifest.uuid_DONT_CHANGE)) {
// 	addNotification("[error]ERROR:[/error] The song you were trying to load overwrites a default song", 5);
// 	loadingScreen.cancel();
// 	return;
// }

// /** Wheter the UUID is already on loaded but not on default */
// const overwritingExtra = oldLoadedList.map((content) => content.manifest.uuid_DONT_CHANGE).includes(content.manifest.uuid_DONT_CHANGE)
// 	&& !Song.defaultUUIDS.includes(content.manifest.uuid_DONT_CHANGE);

// const overwritingDefault = Song.defaultUUIDS.includes(content.manifest.uuid_DONT_CHANGE);

// if (overwritingDefault) {
// 	addNotification("[error]ERROR:[/error] The song you were trying to load overwrites a default song", 5);
// 	state.index = allCapsules.indexOf(allCapsules.find((capsule) => capsule.song.manifest.uuid_DONT_CHANGE == content.manifest.uuid_DONT_CHANGE));
// 	state.updateState();
// 	loadingScreen.cancel();
// 	return;
// }
// else if (overwritingExtra) {
// 	const capsule = allCapsules.find((capsule) => capsule.song.manifest.uuid_DONT_CHANGE == content.manifest.uuid_DONT_CHANGE);
// 	if (!capsule) {
// 		addNotification("[warning]Warning:[/warning] Tried to overwrite an extra song but failed", 5);
// 		loadingScreen.cancel();
// 		return;
// 	}

// 	const indexOfSong = Song.loaded.indexOf(Song.loaded.find((song) => song.manifest.uuid_DONT_CHANGE == content.manifest.uuid_DONT_CHANGE));
// 	Song.loaded[indexOfSong] = capsule.song;

// 	addNotification(`[warning]Warning:[/warning] Overwrote "${capsule.song.manifest.name}" by "${content.manifest.name}" since they have the same UUID`, 5);
// 	allCapsules[allCapsules.indexOf(capsule)].song = content;
// 	state.index = allCapsules.indexOf(capsule);
// 	state.updateState();

// 	loadingScreen.cancel();
// 	return;
// }
// else {
// 	// some weird case??
// }

// // if you got here it's because you're not overwriting a song, you're adding a totally new one
// const capsule = SongSelectState.addSongCapsule(content);
// let index = allCapsules.indexOf(capsule);
// if (index == -1) index = 0;
// state.index = index;

// state.updateState();
// loadingScreen.cancel();

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
	removeFromExistence(): Promise<any>;
	hasAssetsLoaded(): Promise<boolean>;
	toAssets(): Promise<any>;
	isDefault: boolean;
	indexedDB_path: string;
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

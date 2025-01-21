import { DancerFile, Move } from "../../play/objects/dancer";
import { SongContent } from "../../play/song";
import { utils } from "../../utils";
import { GameSave } from "../save";

export class Content {
	// SONGS
	static defaultUUIDS: string[] = [];
	static defaultSongPaths: string[] = [
		"bopeebo",
		"unholy-blight",
	];
	static loadedSongs: SongContent[] = [];

	static getSongByName(name: string) {
		Content.loadedSongs.find((song) => utils.kebabCase(song.manifest.name) == name);
	}

	static async loadSongs() {
		await load(
			new Promise(async (resolve, reject) => {
				try {
					Content.defaultSongPaths.forEach(async (folderPath, index) => {
						const path = `content/songs/${folderPath}`;
						try {
							const songFolder = await SongContent.fetchPath(folderPath);
							await SongContent.loadAssets(songFolder);
						}
						catch (err) {
							console.error(err);
							// throw new Error("There was an error loading the default songs", err);
						}

						if (index == Content.loadedSongs.length - 1) resolve("ok");
					});
				}
				catch (e) {
					reject(e);
				}
			}),
		);
	}

	// DANCERS
	static defaultDancerPaths: string[] = [
		"astri",
		"astri-blight",
		"gru",
	];
	static loadedDancers: DancerFile[] = [];
	static getDancerByName(name: string) {
		return Content.loadedDancers.find((dancer) => dancer.dancerName == name);
	}

	static loadDancers() {
		Content.defaultDancerPaths.forEach((path) => DancerFile.loadByPath(path));
	}

	// NOTESKINS
	static loadedNoteskins: string[] = [];
	static getNoteskinSprite(sprite: Move | "trail" | "tail", noteskin: string = GameSave.noteskin) {
		return `${noteskin}_${sprite}`;
	}
}

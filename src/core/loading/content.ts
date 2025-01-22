import { LoadSpriteOpt, SpriteAtlasData } from "kaplay";
import { ChartEvent } from "../../play/event";
import { DancerData, Move, moveAnimsArr } from "../../play/objects/dancer";
import { NoteskinData } from "../../play/objects/note";
import { rankings } from "../../play/objects/scoring";
import { SongContent } from "../../play/song";
import { utils } from "../../utils";
import { _GameSave, GameSave } from "../save";

export class Content {
	// SONGS
	static defaultUUIDS: string[] = [
		"1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
		"14e1c3e9-b24f-4aaa-8401-d772d8725f51",
	];
	static defaultSongPaths: string[] = [
		"bopeebo",
		"unholy-blight",
	];
	static loadedSongs: SongContent[] = [];

	static getSongByName(name: string) {
		return Content.loadedSongs.find((song) => utils.kebabCase(song.manifest.name) == name);
	}

	static async loadSongs() {
		loadSound("new-song-audio", "content/songs/new-song-audio.ogg");
		loadSprite("new-song-cover", "content/songs/new-song-cover.png");

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
	static defaultDancers: DancerData[] = [
		new DancerData("astri", {
			sliceX: 5,
			sliceY: 3,
			"anims": {
				"left": 0,
				"up": 1,
				"down": 2,
				"right": 3,
				"idle": 4,
				"victory": { "from": 5, "to": 12, "speed": 10 },
				"miss": 13,
			},
		}),
		new DancerData("astri-blight", {
			"sliceX": 6,
			"sliceY": 2,
			"anims": {
				"idle": 0,
				"down": 1,
				"up": 2,
				"left": 3,
				"right": 4,
				"miss": 5,
				"victory": { "from": 6, "to": 7, "speed": 10 },
			},
		}),
		new DancerData("gru", {
			"sliceX": 6,
			"sliceY": 2,
			"anims": {
				"idle": 0,
				"up": 1,
				"down": 2,
				"left": 3,
				"right": 4,
				"miss": 5,
				"victory": { "from": 6, "to": 11, "speed": 10 },
			},
		}),
	];
	static loadedDancers: DancerData[] = [];
	static getDancerByName(name: string) {
		return {
			name: "dancer_" + name,
			bg: "dancerBg_" + name,
		};
	}

	static loadDancers() {
		// LOADS DANCERS
		this.defaultDancers.forEach((dancerData) => {
			const path = `content/dancers/${dancerData.name}/${dancerData.name}.png`;
			const bgPath = `content/dancers/${dancerData.name}/${dancerData.name}_bg.png`;
			loadSprite(`dancer_${dancerData.name}`, path, dancerData.animData ?? {});
			loadSprite(`dancerBg_${dancerData.name}`, bgPath, dancerData.bgAnimData ?? {});
		});
	}

	// NOTESKINS
	static defaultNoteskins: NoteskinData[] = [
		new NoteskinData("arrows"),
		new NoteskinData("taiko"),
		new NoteskinData("play"),
	];
	static loadedNoteskins: string[] = [];
	static loadNoteskins() {
		this.defaultNoteskins.forEach((data) => {
			if (!data.spriteData) {
				const atlasData = {} as SpriteAtlasData;
				moveAnimsArr.forEach((move, index) => {
					const y = index % 4 * 80;
					atlasData[`${data.name}_${move}`] = {
						width: 80,
						height: 80,
						x: 0,
						y,
					};

					atlasData[`${data.name}_${move}_trail`] = {
						width: 80,
						height: 80,
						x: 80,
						y,
					};

					atlasData[`${data.name}_${move}_tail`] = {
						width: 80,
						height: 80,
						x: 160,
						y,
					};
				});

				console.log(atlasData);
				loadSpriteAtlas(`content/noteskins/${data.name}.png`, atlasData);
			}
		});
	}

	// overloads are very cool
	static getNoteskinSprite(sprite: "tail" | "trail", move: Move, noteskin?: string): string;
	static getNoteskinSprite(sprite: Move, noteskin?: string): string;
	static getNoteskinSprite(sprite: typeof NoteskinData.Moves[number], move?: Move, noteskin: string = GameSave.noteskin) {
		if (sprite == "down" || sprite == "left" || sprite == "right" || sprite == "up") {
			return `${noteskin}_${sprite}`;
		}
		else if (sprite == "tail" || sprite == "trail") {
			return `${noteskin}_${move}_${sprite}`;
		}
	}

	// OTHER STUFF
	static getRankingSpriteAtlas() {
		let data = {};
		rankings.forEach((rank, index) => {
			data["rank_" + rank] = {
				width: 130,
				height: 130,
				x: 130 * index + 20 * index,
				y: 0,
			};
		});
		return data;
	}

	static loadEventSprites() {
		const data = {} as SpriteAtlasData;
		Object.keys(ChartEvent.eventSchema).forEach((id, index) => {
			// TODO: MAKE IT SO IT WORKS WITH THE GRID
			const x = index * 52;
			const y = 0;

			data[id] = {
				width: 52,
				height: 52,
				x,
				y,
			};
		});
		loadSpriteAtlas("editor/sprites/events.png", data);
	}
}

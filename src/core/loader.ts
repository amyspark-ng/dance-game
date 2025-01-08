import isUrl from "is-url";
import JSZip from "jszip";
import { LoadSpriteOpt } from "kaplay";
import TOML from "smol-toml";
import { FileManager } from "../fileManaging";
import { DancerFile } from "../play/objects/dancer";
import { rankings } from "../play/objects/scoring";
import { SongContent, SongManifest } from "../play/song";
import { utils } from "../utils";
import { loadCursor } from "./plugins/features/gameCursor";

/** Array of zip names to load songs */
export const defaultSongs = ["bopeebo", "unholy-blight"];
/** Array of the uuids for the default songs */
export const defaultUUIDS = [
	"1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
	"14e1c3e9-b24f-4aaa-8401-d772d8725f51",
];

/** Array of contents of song zip for the songs loaded */
export const loadedSongs: SongContent[] = [];

/** Gets a song with the kebab case of its name */
export function getSong(kebabCase: string) {
	// returns undefined on unholy-blight because it hasn't been loaded apparently
	const result = loadedSongs.find((songzip) => utils.kebabCase(songzip.manifest.name) == kebabCase);
	return result;
}

/** The loading screen of the game */
export function loadingScreen(progress: number) {
	// Black background
	drawRect({
		width: width(),
		height: height(),
		color: rgb(0, 0, 0),
	});

	// A pie representing current load progress
	drawCircle({
		pos: center(),
		radius: 32,
		end: map(progress, 0, 1, 0, 360),
	});

	drawText({
		text: "loading" + ".".repeat(wave(1, 4, time() * 12)),
		font: "monospace",
		size: 24,
		anchor: "center",
		pos: center().add(0, 70),
	});
}

/** Holds all the dancers in the game */
export let dancers: DancerFile[] = [];
/** Holds all the noteskins in the game */
export let noteskins: string[] = [];

/** Loads the noteskins */
function loadNoteSkins() {
	let spriteAtlasData = {};

	let noteSkinTypes = ["P", "T", "A"];
	let movements = ["up", "down", "left", "right", "trail", "tail"];
	noteskins = noteSkinTypes;

	let x = 0;
	let y = 0;
	let size = 80;
	noteSkinTypes.forEach((noteSkinType, noteIndex) => {
		movements.forEach((move, movIndex) => {
			x = movIndex * size;
			y = noteIndex * size;

			spriteAtlasData[noteSkinType + "_" + move] = {
				width: size,
				height: size,
				x: x,
				y: y,
			};
		});
	});

	loadSpriteAtlas("sprites/noteSkins.png", spriteAtlasData);
}

function loadDancer(dancerName: string, spriteData: LoadSpriteOpt) {
	loadSprite(`dancer_${dancerName}`, `sprites/dancers/${dancerName}/${dancerName}.png`, spriteData);
	loadSprite(`bg_${dancerName}`, `sprites/dancers/${dancerName}/bg_${dancerName}.png`);

	// load the background and other stuff here
}

/** Loads songs, dancers and noteskins */
async function loadContent() {
	// LOADS DANCERS
	const dancersToLoad = {
		"astri": {
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
		},
		"astri-blight": {
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
		},
		"gru": {
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
		},
	};

	loadSprite("defaultCover", "sprites/defaultCover.png");

	Object.keys(dancersToLoad).forEach((dancer, index) => {
		dancers[index] = { dancerName: dancer, dancerBg: dancer };
		loadDancer(dancer, dancersToLoad[dancer]);
	});

	// loads noteskins
	loadNoteSkins();
}

/** Loads all the assets of the game */
export async function loadAssets() {
	loadBean();
	loadSound("volumeChange", "sounds/volumeChange.wav");
	loadCursor();
	loadContent();

	loadSprite("optionsCursor", "sprites/optionsCursor.png");

	const events = ["change-scroll", "cam-move", "play-anim", "change-dancer"];
	const eventsSpriteAtlas = {};
	events.forEach((event, index) => {
		eventsSpriteAtlas[event] = {
			width: 52,
			height: 52,
			x: 52 * index,
			y: 0,
		};
	});
	loadSpriteAtlas("sprites/events.png", eventsSpriteAtlas);

	let songRanksAtlasData = {};
	rankings.forEach((rank, index) => {
		songRanksAtlasData[`rank_${rank}`] = {
			width: 130,
			height: 130,
			x: 130 * index + 20 * index,
			y: 0,
		};
	});

	loadSpriteAtlas("sprites/songRanks.png", songRanksAtlasData);
	loadSprite("importedSong", "sprites/imported.png");
	loadSprite("importSongBtn", "sprites/importSong.png");

	const icons = ["about", "fields", "download", "new"];
	const iconsAtlas = {};
	icons.forEach((icon, index) => {
		iconsAtlas[icon + "_charticon"] = {
			width: 45,
			height: 50,
			x: 45 * index,
			y: 0,
		};
	});

	loadSound("new-song-audio", "new-song-audio.ogg");
	loadSpriteAtlas("sprites/chartEditorIcons.png", iconsAtlas);

	loadSound("uiMove", "sounds/uiMove.wav");
	loadSound("uiSelect", "sounds/uiSelect.wav");
	loadSound("keyClick", "sounds/keyClick.ogg");

	// # SONG SELECT
	loadSprite("cdCase", "sprites/songSelect/cdCase.png");

	// # GAMEPLAY
	loadSound("introGo", "sounds/introgo.mp3");
	loadSound("lowhealth", "sounds/lowhealth.ogg");
	loadSound("pauseScratch", "sounds/pauseScratch.mp3");
	loadSound("missnote", "sounds/missnote.mp3");

	// # RESULTS SCREEN
	loadSound("drumroll", "sounds/drumroll.mp3");

	// # CHART-EDITOR
	loadSound("noteAdd", "sounds/chart-editor/noteAdd.mp3");
	loadSound("noteRemove", "sounds/chart-editor/noteRemove.mp3");
	loadSound("noteHit", "sounds/chart-editor/noteHit.ogg");
	loadSound("noteMove", "sounds/chart-editor/noteMove.ogg");
	loadSound("noteUndo", "sounds/chart-editor/noteUndo.wav");
	loadSound("noteCopy", "sounds/chart-editor/noteCopy.wav");
	loadSound("noteStretch", "sounds/chart-editor/noteStretch.ogg");
	loadSound("noteSnap", "sounds/chart-editor/noteSnap.ogg");
	loadSound("dialogOpen", "sounds/chart-editor/dialogOpen.ogg");
	loadSound("eventCog", "sounds/chart-editor/eventCog.wav");
	loadSound("mouseClick", "sounds/chart-editor/mouseClick.ogg");
	loadSprite("arrow", "sprites/arrow.png");
	loadSprite("editorhue", "sprites/hue.png");

	loadFont("robotomono", "robotomono.ttf");

	// loadFont("lambda", "lambda.ttf");
	// loadFont("lambdao", "lambda.ttf", {
	// 	outline: {
	// 		width: 5,
	// 		color: BLACK,
	// 	},
	// });

	loadNoteSkins();

	// Written by MF
	loadShader(
		"saturate",
		null,
		`
		uniform float u_time;
		uniform vec2 u_pos;
		uniform vec2 u_size;
		uniform vec3 u_color;
		
		vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
			vec4 c = def_frag();
			vec4 col = vec4(u_color/255.0, 1);
			return (c + vec4(mix(vec3(0), vec3(1), u_time), 0)) * col;
		}
	`,
	);

	loadShader(
		"replacecolor",
		null,
		`
		uniform vec3 u_targetcolor;
		uniform float u_alpha;

		vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
			vec4 o_color = texture2D(tex, uv);
			if (o_color.r > 0.01 && o_color.g < 0.01 && o_color.b < 0.01) return vec4(u_targetcolor / 255., u_alpha);
			return o_color;
		}
	`,
	);

	// load default songs
	await load(
		new Promise(async (resolve, reject) => {
			try {
				defaultSongs.forEach(async (folderPath, index) => {
					folderPath = `songs/${folderPath}`;
					try {
						const songFolder = await FileManager.fetchSongFolder(folderPath);
						await FileManager.loadSongAssets(songFolder);
					}
					catch (err) {
						throw new Error("There was an error loading the default songs");
					}

					if (index == defaultSongs.length - 1) resolve("ok");
				});
			}
			catch (e) {
				reject(e);
			}
		}),
	);
}

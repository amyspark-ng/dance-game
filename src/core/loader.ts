import { LoadSpriteOpt, SpriteData } from "kaplay";
import { DancerFile } from "../play/objects/dancer";
import { SongChart } from "../play/song";
import { loadCursor } from "./plugins/features/gameCursor";
import { rankings } from "../play/objects/scoring";

export const defaultSongs = ["bopeebo", "fresh", "unholy-blight", "black-rainbows", "its-just-a-burning-memory"]

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

/** Holds all the charts in the game */
export let songCharts:SongChart[] = [] 
/** Holds all the dancers in the game */
export let dancers:DancerFile[] = []
/** Holds all the noteskins in the game */
export let noteskins:string[] = []

/** Loads the noteskins */
function loadNoteSkins() {
	let spriteAtlasData = {}

	let noteSkinTypes = ["P", "T", "A"]
	let movements = ["up", "down", "left", "right"]
	noteskins = noteSkinTypes
	
	let x = 0
	let y = 0
	let size = 80
	noteSkinTypes.forEach((noteSkinType, noteIndex) => {
		movements.forEach((move, movIndex) => {
			x = movIndex * size
			y = noteIndex * size

			spriteAtlasData[noteSkinType + "_" + move] = {
				width: size,
				height: size,
				x: x,
				y: y,
			}
		})
	})

	loadSpriteAtlas("sprites/noteSkins.png", spriteAtlasData)
}

function loadDancer(dancerName: string, spriteData: LoadSpriteOpt) {
	loadSprite(`dancer_${dancerName}`, `sprites/dancers/${dancerName}/${dancerName}.png`, spriteData)
	loadSprite(`bg_${dancerName}`, `sprites/dancers/${dancerName}/bg_${dancerName}.png`)
	
	// load the background and other stuff here
}

export async function loadSong(songName: string) {
	// loads the chart
	let chart = null;
	
	await loadJSON(`${songName}-chart`, `songs/${songName}/${songName}-chart.json`).onLoad((data) => {
		chart = data
		loadSound(`${songName}-song`, `songs/${songName}/${songName}-song.ogg`)
	})
	
	loadSprite(`${songName}-cover`, `songs/${songName}/${songName}-cover.png`)

	return chart;
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
				"miss": 13
			}
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
				"victory": { "from": 6, "to": 7, "speed": 10 }
			}	
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
				"victory": { "from": 6, "to": 11, "speed": 10 }
			}
		},
	}
	
	loadSprite("defaultCover", "sprites/defaultCover.png")

	Object.keys(dancersToLoad).forEach((dancer, index) => {
		dancers[index] = { dancerName: dancer, dancerBg: dancer }
		loadDancer(dancer, dancersToLoad[dancer])
	})

	// LOADS SONGS
	defaultSongs.forEach(async (song, index) => {
		const newSong = await loadSong(song)
		songCharts[index] = newSong
	})

	// loads noteskins
	loadNoteSkins()
}

/** Gets a song */
export function getSong(songId: string) {
	return songCharts.find((song) => song.idTitle == songId)
}

/** Loads all the assets of the game */
export function loadAssets() {
	loadBean()
	loadSound("volumeChange", "sounds/volumeChange.wav")
	loadCursor();
	loadContent();

	loadSprite("optionsCursor", "sprites/optionsCursor.png")

	let songRanksAtlasData = {}
	rankings.forEach((rank, index) => {
		songRanksAtlasData[`rank_${rank}`] = {
			width: 130,
			height: 130,
			x: 130 * index + 20 * index,
			y: 0,
		}
	})

	loadSpriteAtlas("sprites/songRanks.png", songRanksAtlasData)

	loadSound("uiMove", "sounds/uiMove.wav")
	loadSound("uiSelect", "sounds/uiSelect.wav")
	loadSound("keyClick", "sounds/keyClick.ogg")

	// # SONG SELECT
	loadSprite("cdCase", "sprites/songSelect/cdCase.png")

	// # GAMEPLAY
	loadSound("introGo", "sounds/introgo.mp3")
	loadSound("lowhealth", "sounds/lowhealth.ogg")
	loadSound("pauseScratch", "sounds/pauseScratch.mp3")
	loadSound("missnote", "sounds/missnote.mp3")
	
	// # RESULTS SCREEN
	loadSound("drumroll", "sounds/drumroll.mp3")

	// # CHART-EDITOR
	loadSound("noteAdd", "sounds/chart-editor/noteAdd.mp3")
	loadSound("noteRemove", "sounds/chart-editor/noteRemove.mp3")
	loadSound("noteHit", "sounds/chart-editor/noteHit.ogg")
	loadSound("noteMove", "sounds/chart-editor/noteMove.ogg")
	loadSound("noteUndo", "sounds/chart-editor/noteUndo.wav")
	loadSound("noteCopy", "sounds/chart-editor/noteCopy.wav")
	loadSound("dialogOpen", "sounds/chart-editor/dialogOpen.ogg")

	loadFont("lambda", "Lambda-Regular.ttf")
	loadFont("lambdao", "Lambda-Regular.ttf", {
		outline: {
			width: 5,
			color: BLACK,
		}
	})

	loadNoteSkins()

	// Written by MF
	loadShader("saturate", null, `
		uniform float u_time;
		uniform vec2 u_pos;
		uniform vec2 u_size;
		uniform vec3 u_color;
		
		vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
			vec4 c = def_frag();
			vec4 col = vec4(u_color/255.0, 1);
			return (c + vec4(mix(vec3(0), vec3(1), u_time), 0)) * col;
		}
	`)
}
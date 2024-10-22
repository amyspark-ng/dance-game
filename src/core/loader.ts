import { DancerFile } from "../play/objects/dancer";
import { SongChart } from "../play/song";
import { loadCursor } from "./plugins/features/gameCursor";

enum noteskins {
	ps,
	xbox,
	nintendo,
	taiko,
	arrows,
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

export let songCharts:SongChart[] = [] 
export let dancers:DancerFile[] = []

function loadNoteSkins() {
	let spriteAtlasData = {}

	let noteSkinTypes = ["P", "T", "A"]
	let movements = ["up", "down", "left", "right"]
	
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

function loadSong(songName: string) {
	loadSound(`${songName}-song`, `songs/${songName}/${songName}-song.ogg`)
	const chart = loadJSON(`${songName}-chart`, `songs/${songName}/${songName}-chart.json`).onLoad(() => {
		if (chart.data.length == 0) {
			chart.data = new SongChart()
		}
		
		songCharts[songName] = chart.data
	})

	// load the album cover and other stuff here
}

function loadDancer(dancerName: string) {
	loadSprite(`dancer_${dancerName}`, `sprites/dancers/${dancerName}/${dancerName}.png`, dancers[dancerName].spriteData)
	// load the background and other stuff here
}

/** Loads all the assets of the game */
export function loadAssets() {
	loadBean()
	loadSprite("osaka", "osaka.png")
	loadSound("volumeChange", "sounds/volumeChange.wav")
	
	loadCursor();

	loadJSON("dancers", "dancers.json").onLoad((data) => {
		Object.keys(data).forEach((dancer) => {
			dancers[dancer] = data[dancer] as DancerFile
			loadDancer(dancer)
		})
	})

	loadSound("opening", "sounds/opening.ogg")
	loadSound("ending", "sounds/ending.mp3")
	loadSound("saataandagi", "sounds/saataandagi.ogg")
	
	loadSong("bopeebo")
	loadSong("fresh")

	loadSound("plap", "sounds/plap.mp3")
	loadSound("plop", "sounds/plop.mp3")
	loadSound("ClickUp", "sounds/ClickUp.ogg")
	loadSound("pauseScratch", "sounds/pauseScratch.mp3")
	loadSound("missnote", "sounds/missnote.mp3")

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
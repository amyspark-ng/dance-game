import { SongChart } from "../play/objects/song";

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

function loadSong(songName: string) {
	loadSound(`${songName}-song`, `songs/${songName}/${songName}-song.ogg`)
	const chart = loadJSON(`${songName}-chart`, `songs/${songName}/${songName}-chart.json`).onLoad(() => {
		songCharts[songName] = chart.data
	})
}

/** Loads all the assets of the game */
export function loadAssets() {
	loadBean()
	loadSprite("osaka", "osaka.png")
	loadSound("volumeChange", "sounds/volumeChange.wav")
	
	loadSprite("cursor", "sprites/cursor-o.png")
	loadSprite("pointer", "sprites/pointer-o.png")

	loadSprite("yeouch", "sprites/yeouch.png")

	loadSprite("astri", "sprites/astri.png", {
		sliceX: 5,
		sliceY: 3,
		anims: {
			"left": 0,
			"up": 1,
			"down": 2,
			"right": 3,
			"idle": 4,
			"victory": { from: 5, to: 12, speed: 5 }, 
			"miss": 13,
		}
	})

	loadSound("opening", "sounds/opening.ogg")
	loadSound("ending", "sounds/ending.mp3")
	loadSound("saataandagi", "sounds/saataandagi.ogg")
	
	loadSong("bopeebo")

	loadSound("plap", "sounds/plap.mp3")
	loadSound("plop", "sounds/plop.mp3")
	loadSound("ClickUp", "sounds/ClickUp.ogg")

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
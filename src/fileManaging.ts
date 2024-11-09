import JSZip from "jszip"
import { Conductor } from "./conductor"
import { gameCursor } from "./core/plugins/features/gameCursor"
import { playSound } from "./core/plugins/features/sound"
import { StateChart } from "./play/chartEditor/chartEditorBackend"
import { ImportedSong, SongChart } from "./play/song"
import { addSongCapsule, StateSongSelect } from "./ui/songselectscene"
import { GameSave } from "./core/gamesave"
import { loadSong, songCharts } from "./core/loader"
import { promiseHooks } from "v8"
import { url } from "inspector"

/** File manager for some stuff of the game */
export let fileManager = document.createElement("input")
fileManager.type = "file"

/** Runs when user accepts to input a song for a new chart on the chart editor */
export async function handleSongInput(ChartState:StateChart) {
	ChartState.paused = true
	fileManager.accept= ".ogg,.wav,.mp3"
	
	ChartState.inputDisabled = true
	gameCursor.canMove = false
	gameCursor.do("load")
	
	fileManager.onchange = async () => {
		const gottenFile = fileManager.files[0]	
		const buffer = await gottenFile.arrayBuffer()
		await loadSound(gottenFile.name, buffer)
		
		ChartState.setSong(new SongChart())
		ChartState.song.title = gottenFile.name
		
		await getSound(gottenFile.name).then((sound) => ChartState.audioBuffer = sound.buf)

		ChartState.conductor = new Conductor({
			audioPlay: playSound(gottenFile.name, { volume: 0.1 }),
			bpm: ChartState.song.bpm,
			timeSignature: ChartState.song.timeSignature,
		})

		ChartState.inputDisabled = false
		gameCursor.canMove = true
		gameCursor.do("default")
	}

	fileManager.oncancel = async () => {
		ChartState.inputDisabled = false
		gameCursor.canMove = true
		debug.log("user cancelled song input new upload")
	}
}

/** Runs when user accepts to input a new song for the song select */
export async function handleZipInput(SongSelectState:StateSongSelect) {
	SongSelectState.menuInputEnabled = false
	fileManager.accept= ".zip"

	fileManager.onchange = async () => {
		/** The imported song thing */
		let newSongThing:ImportedSong = null
		
		const gottenZip = fileManager.files[0]
		
		debug.log("got: " + gottenZip.name)
		const jsZip = new JSZip()
		
		const zipFile = await jsZip.loadAsync(gottenZip)
		
		let cover64:string;
		let songArrBuff:ArrayBuffer;
		let songChart:SongChart;
		
		// loading json
		const firstJson = zipFile.filter((file) => file.endsWith(".json"))[0]
		songChart = JSON.parse(await firstJson.async("string"))

		// if (songChart doesn't have properties of blah blah trigger error)

		// loading image
		const firstImage = zipFile.filter((file) => file.endsWith(".png"))[0]
		if (!firstImage) {
			let blobOfDefault = await fetch("sprites/defaultCover.png").then((res) => res.blob())
			cover64 = URL.createObjectURL(blobOfDefault)
		}

		else {
			cover64 = await firstImage.async("blob").then((blob) => URL.createObjectURL(blob))
		}

		// loading song
		const firstSong = zipFile.filter((file) => file.endsWith(".ogg"))[0]
		songArrBuff = await firstSong.async("arraybuffer")

		newSongThing = {
			cover: cover64,
			song: songArrBuff,
			chart: songChart,
		}

		songCharts.push(songChart)
		SongSelectState.menuInputEnabled = true

		if (!await getSprite(songChart.idTitle + "-cover")) {
			console.log(cover64)
			await loadSprite(songChart.idTitle + "-cover", cover64)
		}

		if (!await getSound(songChart.idTitle + "-song")) {
			await loadSound(songChart.idTitle + "-song", songArrBuff)
		}

		addSongCapsule(songChart)
		wait(0.1, () => {
			SongSelectState.index = songCharts.indexOf(songChart)
			SongSelectState.updateState()
		})
	}

	fileManager.oncancel = async () => {
		SongSelectState.menuInputEnabled = true
		debug.log("user cancelled song input new upload")
	}
}
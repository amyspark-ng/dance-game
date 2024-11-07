import JSZip from "jszip"
import { Conductor } from "./conductor"
import { gameCursor } from "./core/plugins/features/gameCursor"
import { playSound } from "./core/plugins/features/sound"
import { StateChart, updateAllTextboxes, updateTextboxes } from "./play/chartEditor/chartEditorBackend"
import { ImportedSong, SongChart } from "./play/song"
import { StateSongSelect } from "./ui/songselectscene"
import { GameSave } from "./core/gamesave"

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
		
		updateAllTextboxes(ChartState)
	}

	fileManager.oncancel = async () => {
		ChartState.inputDisabled = false
		gameCursor.canMove = true
		debug.log("user cancelled song input new upload")
	}
}

/** Runs when user accepts to input a new song for the song select */
export function handleZipInput(SongSelectState:StateSongSelect) {
	SongSelectState.menuInputEnabled = false
	fileManager.accept= ".zip"

	fileManager.onchange = async () => {
		/** The imported song thing */
		let newSongThing:ImportedSong = null
		
		/** The gotten zip */
		const gottenZip = fileManager.files[0]
		
		debug.log("got: " + gottenZip.name)
		const jsZip = new JSZip()
		
		const zipFile = await jsZip.loadAsync(gottenZip)
		
		// TODO: Have to do it a way so that it only picks the first jsons images and sounds
		// And doesn't load every single one
		zipFile.forEach(async (relativePath, zipEntry) => {
			// it's a folder
			if (zipEntry.dir) return
			type fileType = "img" | "song" | "json"

			// TODO: store the "id" to save stuff as the name of the zip
			// if it's already the name of any song just add a number

			let typeOfFile:fileType = null;
			if (relativePath.includes(".png")) typeOfFile = "img"
			else if (relativePath.includes(".ogg")) typeOfFile = "song"
			else if (relativePath.includes(".json")) typeOfFile = "json"

			if (typeOfFile == "song") {
				const fileArayBuffer = await zipEntry.async("arraybuffer")
				relativePath = "coolsong"
				await loadSound(relativePath, fileArayBuffer)
				
				newSongThing.song = fileArayBuffer
			}

			else if (typeOfFile == "json") {
				const songAsObject = JSON.parse(await zipEntry.async("string")) as SongChart
				newSongThing.chart = songAsObject
			}
			
			else if (typeOfFile == "img") {
				const fileBase64 = await zipEntry.async("base64")
				await loadSprite(relativePath, fileBase64)
				newSongThing.cover = fileBase64
			}
		})

		// this runs after the foreach supposedly
		GameSave.importedSongs.push(newSongThing)
	}

	fileManager.oncancel = async () => {
		SongSelectState.menuInputEnabled = true
		debug.log("user cancelled song input new upload")
	}
}
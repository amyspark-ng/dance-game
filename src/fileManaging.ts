import JSZip from "jszip"
import { Conductor } from "./conductor"
import { gameCursor } from "./core/plugins/features/gameCursor"
import { playSound } from "./core/plugins/features/sound"
import { StateChart } from "./play/chartEditor/chartEditorBackend"
import { addSongCapsule, StateSongSelect } from "./ui/songselectscene"
import { gameDialog } from "./ui/dialogs/gameDialog"
import { utils } from "./utils"
import { GameSave } from "./core/gamesave"
import { Chart } from "./play/song"

/** File manager for some stuff of the game */
export let fileManager = document.createElement("input")
fileManager.type = "file"

/** Runs when user accepts to input a song to change the one in the chart editor */
export async function handleSongInput(ChartState:StateChart) {
	fileManager.click()
	ChartState.paused = true
	fileManager.accept= ".ogg,.wav,.mp3"
	
	ChartState.inputDisabled = true
	gameCursor.canMove = false
	gameCursor.do("load")
	
	fileManager.onchange = async () => {
		const gottenFile = fileManager.files[0]	
		const buffer = await gottenFile.arrayBuffer()
		await loadSound(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio", buffer)
		await getSound(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio").then((sound) => ChartState.audioBuffer = sound.buf)

		ChartState.conductor = new Conductor({
			audioPlay: playSound(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio", { volume: 0.1 }),
			bpm: ChartState.song.manifest.initial_bpm,
			timeSignature: ChartState.song.manifest.time_signature,
		})

		ChartState.song.chart.notes.forEach((note) => {
			if (note.time >= ChartState.conductor.audioPlay.duration()) {
				ChartState.song.chart.notes = utils.removeFromArr(note, ChartState.song.chart.notes)
			}
		})

		ChartState.inputDisabled = false
		gameCursor.canMove = true
		gameCursor.do("default")
	}

	fileManager.oncancel = async () => {
		ChartState.inputDisabled = false
		gameCursor.canMove = true
		debug.log("user cancelled song input")
	}
}

/** Runs when user accepts to input a new song for the song select */
export async function handleZipInput(SongSelectState:StateSongSelect) {
	fileManager.click()
	SongSelectState.menuInputEnabled = false
	fileManager.accept= ".zip"

	// TODO: RE DO THIS 

	fileManager.onchange = async () => {
		const drawLoadingScreen = assetLoadingScreen()

		const gottenZip = fileManager.files[0]
		const jsZip = new JSZip()
		
		const zipFile = await jsZip.loadAsync(gottenZip)
		
		let coverDataURL:string;
		let songArrBuff:ArrayBuffer;
		let gottenChart:Chart;
		
		// loading json
		const firstJson = zipFile.filter((file) => file.endsWith(".json"))[0]
		gottenChart = JSON.parse(await firstJson.async("string"))

		// if (songChart doesn't have properties of blah blah trigger error)

		// loading image
		const firstImage = zipFile.filter((file) => file.endsWith(".png"))[0]
		if (!firstImage) {
			let blobOfDefault = await fetch("sprites/defaultCover.png").then((res) => res.blob())
			coverDataURL = URL.createObjectURL(blobOfDefault)
		}

		else {
			// if i don't do this it will qualify as security something idk
			function blobToSafeDataURL(blob: Blob): Promise<string> {
				return new Promise<string>((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = _e => resolve(reader.result as string);
					reader.onerror = _e => reject(reader.error);
					reader.onabort = _e => reject(new Error("Read aborted"));
					reader.readAsDataURL(blob);
				});
			}
			
			const blobOfCover = await firstImage.async("blob")
			coverDataURL = await blobToSafeDataURL(blobOfCover)
		}

		// loading song
		const firstSong = zipFile.filter((file) => file.endsWith(".ogg"))[0]
		songArrBuff = await firstSong.async("arraybuffer")

		// if (allSongCharts.some((song) => song.manifest.uuid_DONT_CHANGE == gottenChart.idTitle)) {
		// 	debug.log("Can't import that song because either it's already imported or it's one of the main ones")
		// 	drawLoadingScreen.cancel()
		// 	SongSelectState.menuInputEnabled = true
		// 	return;
		// }

		// if (!await getSprite(gottenChart.idTitle + "-cover")) {
		// 	await loadSprite(gottenChart.idTitle + "-cover", coverDataURL)
		// }
		
		// if (!await getSound(gottenChart.idTitle + "-audio")) {
		// 	await loadSound(gottenChart.idTitle + "-audio", songArrBuff)
		// }

		// allSongCharts.push(gottenChart)
		GameSave.save()
		SongSelectState.menuInputEnabled = true
		
		drawLoadingScreen.cancel()

		// TODO: Fix this function
		// addSongCapsule(gottenChart)
		getTreeRoot().trigger("addedCapsule")
		wait(0.1, () => {
			SongSelectState.updateState()
		})
	}

	fileManager.oncancel = async () => {
		SongSelectState.menuInputEnabled = true
		debug.log("user cancelled song input")
	}
}

/** Handles the input for a new cover */
export function handleCoverInput(ChartState:StateChart) {
	fileManager.click()
	fileManager.accept= ".png,.jpg"
	
	gameCursor.canMove = false
	gameDialog.canClose = false
	gameCursor.do("load")
	
	fileManager.onchange = async () => {
		const gottenFile = fileManager.files[0]
		const arrBuffer = await gottenFile.arrayBuffer()
		const blob = new Blob([arrBuffer])
		const base64 = URL.createObjectURL(blob)

		await loadSprite(ChartState.song.manifest.uuid_DONT_CHANGE + "-cover", base64)
		get("cover", { recursive: true })[0].sprite = ChartState.song.manifest.uuid_DONT_CHANGE + "-cover"
		gameDialog.canClose = true
		ChartState.inputDisabled = false
		gameCursor.canMove = true
	}

	fileManager.oncancel = async () => {
		ChartState.inputDisabled = false
		gameCursor.canMove = true
		gameDialog.canClose = true
		debug.log("user cancelled cover input")
	}
}

/** Small loading screen to display while stuff loads */
export function assetLoadingScreen() {
	let op = 0
	let ang = 0

	tween(op, 1, 0.1, (p) => op = p)
	const drawEv = onDraw(() => {
		drawRect({
			width: width(),
			height: height(),
			anchor: "center",
			pos: center(),
			color: BLACK,
			opacity: 0.5 * op,
		})

		drawText({
			text: "LOADING",
			font: "lambda",
			pos: center(),
			color: WHITE,
			anchor: "center",
			opacity: op
		})

		ang += 1
		drawSprite({
			sprite: "bean",
			angle: ang,
			anchor: "center",
			pos: vec2(center().x, wave(center().y + 70, center().y + 80, time() + 1)),
			opacity: op,
		})
	})

	return {
		cancel() {
			tween(op, 0, 0.1, (p) => op = p)
		}
	}
}
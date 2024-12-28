import JSZip from "jszip";
import TOML from "smol-toml";
import { Conductor } from "./conductor";
import { GameSave } from "./core/gamesave";
import { loadedSongs, loadSongFromZIP } from "./core/loader";
import { gameCursor } from "./core/plugins/features/gameCursor";
import { playSound } from "./core/plugins/features/sound";
import { StateChart } from "./play/chartEditor/chartEditorBackend";
import { Chart } from "./play/song";
import { GameDialog } from "./ui/dialogs/gameDialog";
import { addSongCapsule, StateSongSelect } from "./ui/SongSelectScene";
import { utils } from "./utils";

/** File manager for some stuff of the game */
export let fileManager = document.createElement("input");
fileManager.type = "file";

/** Runs when user accepts to input a new song for the song select */
export async function handleZipInput(SongSelectState: StateSongSelect) {
	fileManager.click();
	SongSelectState.menuInputEnabled = false;
	fileManager.accept = ".zip";

	// TODO: RE DO THIS

	fileManager.onchange = async () => {
		const drawLoadingScreen = inputLoadingScreen();

		const gottenFile = fileManager.files[0];
		const jsZip = new JSZip();

		const zipFile = await jsZip.loadAsync(gottenFile);

		const manifestFile = zipFile.file("manifest.toml");
		const manifestContent = TOML.parse(await manifestFile.async("string"));
		const uuid = manifestContent["uuid_DONT_CHANGE"];

		// if some song has an uuid equal to the one i just got, throw an error
		if (loadedSongs.some((song) => song.manifest.uuid_DONT_CHANGE == uuid)) {
			throw new Error("ALREADY LOADED A SONG WITH THAT UNIQUE UNIVERSAL IDENTIFIER");
		}

		const songInfo = await loadSongFromZIP(gottenFile);

		loadedSongs.push(songInfo);
		GameSave.save();
		SongSelectState.menuInputEnabled = true;

		drawLoadingScreen.cancel();

		addSongCapsule(songInfo);
		getTreeRoot().trigger("addedCapsule");
		wait(0.1, () => {
			SongSelectState.updateState();
		});
	};

	fileManager.oncancel = async () => {
		SongSelectState.menuInputEnabled = true;
		debug.log("user cancelled song input");
	};
}

/** Runs when user accepts to input a song to change the one in the chart editor */
export async function handleAudioInput(ChartState: StateChart) {
	fileManager.click();
	ChartState.paused = true;
	fileManager.accept = ".ogg,.wav,.mp3";

	ChartState.inputDisabled = true;
	gameCursor.canMove = false;
	gameCursor.do("load");

	fileManager.onchange = async () => {
		const loadScreen = inputLoadingScreen();

		// TODO: Why use array buffer and audio buffer?????
		const gottenFile = fileManager.files[0];
		const arrayBuffer = await gottenFile.arrayBuffer();
		await loadSound(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio", arrayBuffer);
		const soundData = await getSound(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio");
		const audioBuffer = soundData.buf;

		ChartState.audioBuffer = audioBuffer;
		// change the audio play for the conductor
		ChartState.conductor.audioPlay = playSound(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio", {
			channel: GameSave.sound.music,
			speed: 1,
		});

		ChartState.song.chart.notes.forEach((note) => {
			if (note.time >= ChartState.conductor.audioPlay.duration()) {
				ChartState.song.chart.notes = utils.removeFromArr(note, ChartState.song.chart.notes);
			}
		});

		ChartState.song.manifest.audio_file = gottenFile.name;

		ChartState.inputDisabled = false;
		gameCursor.canMove = true;
		gameCursor.do("default");
		loadScreen.cancel();
	};

	fileManager.oncancel = async () => {
		ChartState.inputDisabled = false;
		gameCursor.canMove = true;
		debug.log("user cancelled song input");
	};
}

/** Handles the input for a new cover */
export function handleCoverInput(ChartState: StateChart) {
	fileManager.click();
	fileManager.accept = ".png,.jpg";

	gameCursor.canMove = false;
	GameDialog.canClose = false;
	gameCursor.do("load");

	fileManager.onchange = async () => {
		const gottenFile = fileManager.files[0];
		const arrBuffer = await gottenFile.arrayBuffer();
		const blob = new Blob([arrBuffer]);
		const base64 = URL.createObjectURL(blob);

		await loadSprite(ChartState.song.manifest.uuid_DONT_CHANGE + "-cover", base64);

		ChartState.song.manifest.cover_file = gottenFile.name;

		GameDialog.canClose = true;
		ChartState.inputDisabled = false;
		gameCursor.canMove = true;
	};

	fileManager.oncancel = async () => {
		ChartState.inputDisabled = false;
		gameCursor.canMove = true;
		GameDialog.canClose = true;
		debug.log("user cancelled cover input");
	};
}

/** Small loading screen to display while stuff loads */
export function inputLoadingScreen() {
	let op = 0;
	let ang = 0;

	const obj = add([
		layer("cursor"),
		z(gameCursor.z - 1),
		timer(),
	]);

	obj.tween(op, 1, 0.1, (p) => op = p);
	const drawEv = obj.onDraw(() => {
		drawRect({
			width: width(),
			height: height(),
			anchor: "center",
			pos: center(),
			color: BLACK,
			opacity: 0.5 * op,
		});

		drawText({
			text: "LOADING",
			font: "lambda",
			pos: center(),
			color: WHITE,
			anchor: "center",
			opacity: op,
		});

		ang += 1;
		drawSprite({
			sprite: "bean",
			angle: ang,
			anchor: "center",
			pos: vec2(center().x, wave(center().y + 70, center().y + 80, time() + 1)),
			opacity: op,
		});
	});

	return {
		cancel() {
			tween(op, 0, 0.1, (p) => op = p);
		},
	};
}

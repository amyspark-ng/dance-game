import JSZip from "jszip";
import TOML from "smol-toml";
import { Conductor } from "./conductor";
import { GameSave } from "./core/gamesave";
import { loadedSongs, loadSongFromZIP } from "./core/loader";
import { gameCursor } from "./core/plugins/features/gameCursor";
import { playMusic } from "./core/plugins/features/sound";
import { StateChart } from "./play/chartEditor/chartEditorBackend";
import { DancerFile } from "./play/objects/dancer";
import { SongChart, SongContent, SongManifest } from "./play/song";
import { GameDialog } from "./ui/dialogs/gameDialog";
import { addSongCapsule, StateSongSelect } from "./ui/SongSelectScene";
import { utils } from "./utils";

type returnFromZIP = {
	content: SongContent;
	zipFile: JSZip;
};

/** Class to handle some of the file managing functions
 *
 * The process of loading a song goes like this
 * 1. First we call the {@link receiveFile} function to get a file from the user
 * this will return an object of type {@link SongContent} with only the manifest set
 *
 * 2. Then we have to call the {@link loadSongAssets} function to load the assets of the song
 * this function takes as a parameter a {@link returnFromZIP} type, which contains the zip content so it can access the actual files
 * and the song content so it can assign the manifest and the assets
 */
export class FileManager {
	/** Is called for a cool little loading screen when receiving files
	 *
	 * Use it in company of the {@link receiveFile} function
	 */
	static loadingScreen() {
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
				tween(op, 0, 0.1, (p) => op = p).onEnd(() => {
					drawEv.cancel();
				});
			},
		};
	}

	/** Asks for a file from the user
	 * @param type Will either be **mod** to receive a full mod, **audio** to receive only an audio file, or **cover** to only receive an image
	 * @returns The file that the user selected
	 */
	static async receiveFile(type: "mod" | "audio" | "cover"): Promise<File> {
		if (type == "mod") inputElement.accept = ".zip";
		else if (type == "audio") inputElement.accept = ".ogg,.wav,.mp3";
		else if (type == "cover") inputElement.accept = ".png,.jpg";
		inputElement.click();

		return new Promise((resolve, reject) => {
			inputElement.onchange = () => {
				resolve(inputElement.files[0]);
			};
			inputElement.oncancel = () => {
				reject("User cancelled file input");
			};
		});
	}

	/** Load the assets of a song to make it playable
	 * @param manifest The manifest of the song to receive the uuid and some asset paths
	 * @param assets An object containing the cover, audio, and chart of the song
	 */
	static async loadSongAssets(returnFromZIP: returnFromZIP) {
		const songContent = returnFromZIP.content;
		const zipFile = returnFromZIP.zipFile;
		const uuid = songContent.manifest.uuid_DONT_CHANGE;

		// cover
		const cover = zipFile.file(songContent.manifest.cover_file);
		await loadSprite(uuid + "-cover", URL.createObjectURL(await cover.async("blob")));

		// audio
		const audio = zipFile.file(songContent.manifest.audio_file);
		await loadSound(uuid + "-audio", await audio.async("arraybuffer"));

		// chart
		const chart = await zipFile.file(songContent.manifest.chart_file).async("string");
		const chartContent = JSON.parse(chart) as SongChart;
		songContent.chart = chartContent;

		const foundSongWithUUID = loadedSongs.find((song) => song.manifest.uuid_DONT_CHANGE == uuid);
		if (foundSongWithUUID) {
			// replace that spot in the loadedSongs array with the new one
			loadedSongs[loadedSongs.indexOf(foundSongWithUUID)] = songContent;
		}
		else {
			loadedSongs.push(songContent);
		}
	}

	/** Gets the song content from a ZIP file and assigns the manifest, then it can be passed to @link { loadSongAssets }
	 * @param zipFile Will be contents of {@link inputElement `fileManager`}
	 */
	static async SongContentFromZIP(zipFile: File): Promise<returnFromZIP> {
		const jsZip = new JSZip();
		const zipContent = await jsZip.loadAsync(zipFile);

		const songContent = new SongContent();

		const manifestFile = zipContent.file("manifest.toml");
		if (!manifestFile) return new Promise((_, reject) => reject("No manifest file found in zip"));
		else {
			const manifestContent = TOML.parse(await manifestFile.async("string"));

			// if the keys don't match
			if (JSON.stringify(Object.keys(manifestContent)) !== JSON.stringify(Object.keys(new SongManifest()))) {
				return new Promise((_, reject) => reject("Manifest file has wrong keys"));
			}

			// manifest set
			songContent.manifest = manifestContent as any;
		}

		// this will run at the end because all the foolproof returns have been returned
		return new Promise((resolve) => resolve({ content: songContent, zipFile: zipContent }));
	}

	/** Will write a blob zip file that has the songs, dancers, and noteskins folder */
	static writeZIP(songs: SongContent[], dancers: DancerFile[], noteskins: string[]) {
	}
}

/** File manager for some stuff of the game */
export let inputElement = document.createElement("input");
inputElement.type = "file";

/** Runs when user accepts to input a new song for the song select */
export async function handleZipInput(SongSelectState: StateSongSelect) {
	inputElement.click();
	SongSelectState.menuInputEnabled = false;
	inputElement.accept = ".zip";

	// TODO: RE DO THIS

	inputElement.onchange = async () => {
		const drawLoadingScreen = inputLoadingScreen();

		const gottenFile = inputElement.files[0];
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

	inputElement.oncancel = async () => {
		SongSelectState.menuInputEnabled = true;
		debug.log("user cancelled song input");
	};
}

/** Runs when user accepts to input a song to change the one in the chart editor */
export async function handleAudioInput(ChartState: StateChart) {
	inputElement.click();
	ChartState.paused = true;
	inputElement.accept = ".ogg,.wav,.mp3";

	ChartState.inputDisabled = true;
	gameCursor.canMove = false;
	gameCursor.do("load");

	inputElement.onchange = async () => {
		const loadScreen = inputLoadingScreen();

		// TODO: Why use array buffer and audio buffer?????
		const gottenFile = inputElement.files[0];
		const arrayBuffer = await gottenFile.arrayBuffer();
		await loadSound(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio", arrayBuffer);
		const soundData = await getSound(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio");
		const audioBuffer = soundData.buf;

		ChartState.audioBuffer = audioBuffer;
		// change the audio play for the conductor
		ChartState.conductor.audioPlay = playMusic(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio", {
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

	inputElement.oncancel = async () => {
		ChartState.inputDisabled = false;
		gameCursor.canMove = true;
		debug.log("user cancelled song input");
	};
}

/** Handles the input for a new cover */
export function handleCoverInput(ChartState: StateChart) {
	inputElement.click();
	inputElement.accept = ".png,.jpg";

	gameCursor.canMove = false;
	GameDialog.canClose = false;
	gameCursor.do("load");

	inputElement.onchange = async () => {
		const gottenFile = inputElement.files[0];
		const arrBuffer = await gottenFile.arrayBuffer();
		const blob = new Blob([arrBuffer]);
		const base64 = URL.createObjectURL(blob);

		await loadSprite(ChartState.song.manifest.uuid_DONT_CHANGE + "-cover", base64);

		ChartState.song.manifest.cover_file = gottenFile.name;

		GameDialog.canClose = true;
		ChartState.inputDisabled = false;
		gameCursor.canMove = true;
	};

	inputElement.oncancel = async () => {
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

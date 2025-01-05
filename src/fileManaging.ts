import audioBufferToBlob from "audiobuffer-to-blob";
import JSZip from "jszip";
import TOML from "smol-toml";
import { defaultUUIDS, loadedSongs } from "./core/loader";
import { gameCursor } from "./core/plugins/features/gameCursor";
import { SongChart, SongContent, SongManifest } from "./play/song";

/** File manager for some stuff of the game */
export const inputElement = document.createElement("input");
inputElement.type = "file";
inputElement.style.display = "none";

/** Holds the content to a song folder */
type songFolder = {
	manifest: SongManifest;
	audio: Blob;
	cover: Blob;
	chart: SongChart;
};

/** This class is a series of "utils" and important functions to manage some of the files that might be related to the content of the game
 *
 * The process of loading a real song of the game goes like this
 * 1. We call the {@link fetchSongFolder `fetchSongFolder()`} function which will return an object of type {@link songFolder}
 * 2. Then we have to call the {@link loadSongAssets `loadSongAssets()`} function to load the assets of the song
 *
 * The process of loading a (custom) song has 2 steps
 * 1. First we call the {@link receiveFile `receiveFile()`} function to get a file from the user
 * this will return an object of type {@link songFolder}
 *
 * 2. Then we have to call the {@link loadSongAssets `loadSongAssets()`} function to load the assets of the song
 * this function will take as a parameter a {@link songFolder}, this way it can access the files and load it
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

	/** Convers an image file to a base 64 */
	static ImageToBase64(file: File): string {
		return URL.createObjectURL(file);
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

		return new Promise((resolve) => {
			inputElement.onchange = () => {
				resolve(inputElement.files[0]);
			};
			inputElement.oncancel = () => {
				resolve(null);
			};
		});
	}

	/** Fetch a song folder given a path
	 * @param folderPath The path to the folder
	 *
	 * Used mostly for default songs
	 */
	static async fetchSongFolder(folderPath: string): Promise<songFolder> {
		const manifest = await fetch(`${folderPath}/manifest.toml`).then((thing) => thing.text()).then((text) => TOML.parse(text)) as SongManifest;
		const chart = await fetch(`${folderPath}/${manifest.chart_file}`).then((thing) => thing.json()) as SongChart;
		const audio = await fetch(`${folderPath}/${manifest.audio_file}`).then((thing) => thing.blob()) as Blob;
		const cover = await fetch(`${folderPath}/${manifest.cover_file}`).then((thing) => thing.blob()) as Blob;
		return { audio: audio, cover: cover, manifest: manifest, chart: chart } as songFolder;
	}

	/** Load the assets of a song to make it playable
	 * @param songFolder Receives the contents of a song folder
	 */
	static async loadSongAssets(songFolder: songFolder): Promise<SongContent> {
		// cover
		const cover64 = URL.createObjectURL(songFolder.cover);
		await loadSprite(songFolder.manifest.uuid_DONT_CHANGE + "-cover", cover64);

		// audio
		const arrayBuffer = await songFolder.audio.arrayBuffer();
		await loadSound(songFolder.manifest.uuid_DONT_CHANGE + "-audio", arrayBuffer);

		const songContent: SongContent = {
			manifest: songFolder.manifest,
			chart: songFolder.chart,
		};

		// songContent
		const songIsAlreadyLoaded = loadedSongs.find((song) => song.manifest.uuid_DONT_CHANGE == songContent.manifest.uuid_DONT_CHANGE);
		const isDefaultSong = defaultUUIDS.includes(songContent.manifest.uuid_DONT_CHANGE);

		if (songIsAlreadyLoaded) {
			if (isDefaultSong) console.error("You're trying to overwrite a default song, don't do that!");
			else {
				console.log("The song you were trying to load is already loaded, will overwrite");
				loadedSongs[loadedSongs.indexOf(songIsAlreadyLoaded)] = songContent;
			}
		}
		else {
			loadedSongs.push(songContent);
		}

		return new Promise((resolve) => resolve(songContent));
	}

	/** Get the content of a song folder */
	static async getSongFolderContent(zipFile: File): Promise<songFolder> {
		const songFolder: songFolder = {} as songFolder;

		const jsZip = new JSZip();
		const zipContent = await jsZip.loadAsync(zipFile);

		const manifestFile = zipContent.file("manifest.toml");
		if (!manifestFile) return new Promise((_, reject) => reject("No manifest file found in zip"));
		else {
			const manifestContent = TOML.parse(await manifestFile.async("string"));

			// if the keys don't match
			if (JSON.stringify(Object.keys(manifestContent)) !== JSON.stringify(Object.keys(new SongManifest()))) {
				return new Promise((_, reject) => reject("Manifest file has wrong keys"));
			}

			songFolder.manifest = manifestContent as any;
		}

		const audio_file = zipContent.file(songFolder.manifest.audio_file);
		if (!audio_file) return new Promise((_, reject) => reject("No audio file found in zip or wrong name in manifest"));
		else songFolder.audio = await audio_file.async("blob");

		const cover_file = zipContent.file(songFolder.manifest.cover_file);
		if (!cover_file) return new Promise((_, reject) => reject("No cover file found in zip or wrong name in manifest"));
		else songFolder.cover = await cover_file.async("blob");

		const chart_file = zipContent.file(songFolder.manifest.chart_file);
		if (!chart_file) return new Promise((_, reject) => reject("No chart file found in zip or wrong name in manifest"));
		else songFolder.chart = JSON.parse(await chart_file.async("string")) as SongChart;

		// this will run at the end because all the foolproof returns have been returned
		return new Promise((resolve) => resolve(songFolder));
	}

	/** Convers a sprite to a data url */
	static async spriteToDataURL(sprName: string) {
		const canvas = makeCanvas(396, 396);
		canvas.draw(() => {
			drawSprite({
				sprite: sprName,
				width: width(),
				height: height(),
				pos: center(),
				anchor: "center",
			});
		});

		const dataURL = canvas.toDataURL();
		return dataURL;
	}

	/** Will return a blob to download a zip with the song */
	static async writeSongFolder(songContent: SongContent): Promise<Blob> {
		/** This is the folder where everything will be stored */
		const zipFolder = new JSZip();

		// chart
		zipFolder.file(songContent.manifest.chart_file, JSON.stringify(songContent.chart));

		// manifest
		zipFolder.file("manifest.toml", TOML.stringify(songContent.manifest));

		// cover
		const defaultCover = "sprites/defaultCover.png";
		let pathToCover: string = undefined;
		const cover = await getSprite(songContent.manifest.uuid_DONT_CHANGE + "-cover");
		if (!cover) pathToCover = defaultCover;
		else pathToCover = await FileManager.spriteToDataURL(songContent.manifest.uuid_DONT_CHANGE + "-cover");
		const imageBlob = await fetch(pathToCover).then((r) => r.blob());
		zipFolder.file(songContent.manifest.cover_file, imageBlob);

		// audio
		const defaultAudio = "audio/new-song-audio.ogg";
		const audio = await getSound(songContent.manifest.uuid_DONT_CHANGE + "-audio");
		let audioBlob = await fetch(defaultAudio).then((r) => r.blob());
		if (!audio) audioBlob = await fetch(defaultAudio).then((r) => r.blob());
		else {
			const blob = audioBufferToBlob(audio.buf);
			audioBlob = blob;
		}
		zipFolder.file(songContent.manifest.audio_file, audioBlob);

		return zipFolder.generateAsync({ type: "blob" });
	}
}

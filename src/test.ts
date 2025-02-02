import { Zip, ZipFS } from "@zenfs/archives";
import fs, { configure, configureSingle, InMemory, mount, resolveMountConfig, umount } from "@zenfs/core";
import { IndexedDB, WebStorage } from "@zenfs/dom";
import TOML from "smol-toml";
import { SongAssets, SongContent, SongManifest } from "./data/song";

await configure({
	mounts: {
		"/tmp": InMemory,
		"/home": IndexedDB,
	},
	addDevices: true,
});

class TestSong extends SongContent {
	cover: string;
	audio: string;
}

export const inputElement = document.createElement("input");
inputElement.type = "file";
inputElement.style.display = "none";
// inputElement.accept = ".jpg,.png";
inputElement.accept = ".zip";

const fileButton = add([
	rect(50, 50),
	pos(center()),
	color(BLACK),
	area(),
]);

fileButton.onClick(() => {
	inputElement.click();
});

const IMAGE_HELPER = "data:image/png;base64,";
const AUDIO_HELPER = "data:audio/wav;base64,";

async function writeToStorage(song: SongContent) {
	const storageFs = await resolveMountConfig({ backend: WebStorage, storage: localStorage });
	storageFs.writeSync(`mnt/zip/${song.manifest.uuid_DONT_CHANGE}`, null, 0);
}

async function decodeFromFile(file: File) {
	const zipFs = await resolveMountConfig({ backend: Zip, data: await file.arrayBuffer() });
	fs.mount("/mnt/zip", zipFs);
	const stringManifest = fs.readFileSync("/mnt/zip/manifest.toml", "utf-8");
	const manifest = new SongManifest();
	manifest.assignFromTOML(TOML.parse(stringManifest));

	const coverPath = manifest["cover"];
	const coverBase64 = fs.readFileSync("/mnt/zip/" + coverPath, "base64");

	const audio = manifest["audio"];
	const audioBase64 = fs.readFileSync("/mnt/zip/" + audio, "base64");

	const chart = manifest["chart"];
	const stringChart = fs.readFileSync("/mnt/zip/" + chart, "utf-8");
	const chartObject = JSON.parse(stringChart);

	const song = new TestSong(chartObject, manifest);
	song.cover = IMAGE_HELPER + coverBase64;
	song.audio = AUDIO_HELPER + audioBase64;

	fs.umount("/mnt/zip");

	return song;
}

inputElement.onchange = async () => {
	const file = inputElement.files[0];
	const song = await decodeFromFile(file);
	await loadSprite(song.getCoverName(), song.cover);
	await loadSound(song.getAudioName(), song.audio);
	add([
		sprite(song.getCoverName()),
	]);
};

inputElement.oncancel = () => {
};

// fs.writeFileSync("/test.txt", "This will persist across reloads!");
// const file = fs.readFileSync("/test.txt");

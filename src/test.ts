import { Zip } from "@zenfs/archives";
import fs, { configure, InMemory, resolveMountConfig } from "@zenfs/core";
import { IndexedDB, WebStorage } from "@zenfs/dom";
import TOML from "smol-toml";
import { GameSave } from "./core/save";
import { SongContent, SongManifest, StringSongAssets } from "./data/song";

GameSave.load();

await configure({
	mounts: {
		"/tmp": InMemory,
		"/home": IndexedDB,
	},
	addDevices: true,
});

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

function writeToStorage(assets: StringSongAssets) {
	const manifest = JSON.parse(assets.manifest) as SongManifest;
	const file_path = `/home/songs/${manifest.uuid_DONT_CHANGE}`;

	// delete assets.audio;
	// delete assets.cover;
	// delete assets.chart;
	// delete assets.manifest;
	const data = JSON.stringify(assets);

	if (!fs.existsSync("/home/songs")) fs.mkdirSync("/home/songs");

	fs.writeFileSync(file_path, data);
	GameSave.extraSongs.push(manifest.uuid_DONT_CHANGE);
	GameSave.save();
}

async function assetsFromFile(file: File) {
	const zipFs = await resolveMountConfig({ backend: Zip, data: await file.arrayBuffer() });
	fs.mount("/mnt/zip", zipFs);

	const stringManifest = fs.readFileSync("/mnt/zip/manifest.toml", "utf-8");
	const manifest = new SongManifest();
	manifest.assignFromTOML(TOML.parse(stringManifest));

	const coverPath = manifest["cover_file"];
	const coverBase64 = fs.readFileSync("/mnt/zip/" + coverPath, "base64");

	const audioPath = manifest["audio_file"];
	const audioBase64 = fs.readFileSync("/mnt/zip/" + audioPath, "base64");

	const chartPath = manifest["chart_file"];
	const stringChart = fs.readFileSync("/mnt/zip/" + chartPath, "utf-8");
	const chartObject = JSON.parse(stringChart);

	const assets = new StringSongAssets();
	assets.cover = IMAGE_HELPER + coverBase64;
	assets.audio = AUDIO_HELPER + audioBase64;
	assets.manifest = JSON.stringify(manifest);
	assets.chart = JSON.stringify(chartObject);

	fs.umount("/mnt/zip");

	return assets;
}

inputElement.onchange = async () => {
	const file = inputElement.files[0];

	const assets = await assetsFromFile(file);
	const song = new SongContent();
	song.assignFromAssets(assets);

	await loadSprite(song.getCoverName(), assets.cover);
	await loadSound(song.getAudioName(), assets.audio);
	add([
		sprite(song.getCoverName()),
	]);

	writeToStorage(assets);
};

inputElement.oncancel = () => {
};

function assetsToSong(assets: StringSongAssets) {
	assets.chart = JSON.parse(assets.chart);
	assets.manifest = JSON.parse(assets.manifest);
	// @ts-ignore
	return new SongContent(assets.chart, assets.manifest);
}

async function loadFromAsesets(song: SongContent, assets: StringSongAssets) {
	await loadSprite(song.getCoverName(), assets.cover);
	await loadSound(song.getAudioName(), assets.audio);
	add([
		sprite(song.getCoverName()),
	]);
}

GameSave.extraSongs.forEach((uuid) => {
	if (fs.existsSync(`/home/songs/${uuid}`)) {
		console.log("Song stored at index: " + GameSave.extraSongs.indexOf(uuid));
		const file = fs.readFileSync(`/home/songs/${uuid}`, "utf8");
		const song = assetsToSong(JSON.parse(file));
		loadFromAsesets(song, JSON.parse(file));
	}
	else {
		throw new Error("Tried to load song with UUID: " + uuid + " But its assets are not stored");
	}
});

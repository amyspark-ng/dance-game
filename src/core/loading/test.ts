import TOML from "smol-toml";
import { DancerFile } from "../../play/objects/dancer";
import { SongChart, SongContent, SongManifest } from "../../play/song";
import { utils } from "../../utils";

/** The type that holds the content to a song folder */
type songFolder = {
	manifest: SongManifest;
	audio: Blob;
	cover: Blob;
	chart: SongChart;
};

export class Load {
	static Songs = {
		defaultUUIDS: [],
		loaded: [] as SongContent[],
		getByUUID(uuid: string) {
			return Load.Songs.loaded.find((song) => song.manifest.uuid_DONT_CHANGE == uuid);
		},

		getByName(name: string) {
			return Load.Songs.loaded.find((song) => utils.kebabCase(song.manifest.name) == name);
		},

		/** Takes as a parameter the name of the song, the prefix will always be `content/songs/${songName}`  */
		async loadByPath(songName: string): Promise<songFolder> {
			const path = `content/songs/${songName}`;

			const manifest = await fetch(`${path}/manifest.toml`).then((thing) => thing.text()).then((text) =>
				TOML.parse(text)
			) as SongManifest;
			const chart = await fetch(`${path}/${manifest.chart_file}`).then((thing) => thing.json()) as SongChart;
			const audio = await fetch(`${path}/${manifest.audio_file}`).then((thing) => thing.blob()) as Blob;
			const cover = await fetch(`${path}/${manifest.cover_file}`).then((thing) => thing.blob()) as Blob;
			return { audio: audio, cover: cover, manifest: manifest, chart: chart } as songFolder;
		},
	};

	static Dancers = {
		defaultDancers: [],
		loaded: [] as DancerFile[],
		getByName(name: string) {
			return Load.Dancers.loaded.find((dancer) => dancer.dancerName == name);
		},
	};

	static Noteskins = {
		defaultNoteskins: [],
		loaded: [] as string[],
		getByName(name: string) {
			return Load.Noteskins.loaded.find((noteskin) => noteskin == name);
		},
	};

	static loadSprites() {
		loadBean();
	}

	constructor() {
		this.loadAll();
	}

	async loadAll() {
		loadRoot("assets/");
		const song = await Load.Songs.loadByPath("bopeebo");
	}
}

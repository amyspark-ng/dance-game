import { GameSave } from "../../core/save";
import { IScene, switchScene } from "../../core/scenes/KaplayState";
import { DancerContent } from "../../data/dancer";
import { NoteskinContent } from "../../data/noteskins";
import { SongContent, SongManifest } from "../../data/song";
import { FileManager } from "../../FileManager";
import { utils } from "../../utils";
import { MenuState } from "./MenuState";

export class ModsState implements IScene {
	songs: SongContent[] = [];
	dancers: DancerContent[] = [];
	noteskins: NoteskinContent[] = [];
	itemIndex: number = 0;
	pageIndex: number = 0;
	curItems: any[] = [];

	changePage(action: () => void) {
		this.itemIndex = 0;
		get("page").forEach((obj) => obj.destroy());
		action();
		getTreeRoot().trigger("itemchange");
	}

	addSongItem() {
	}

	scene(state: ModsState): void {
		function songsPage() {
			state.curItems = state.songs;
			const pageTitle = add([
				text("SONGS", { size: 40, align: "center" }),
				pos(center().x, 40),
				anchor("center"),
				"title",
				"page",
			]);

			const cover = add([
				sprite(SongManifest.default_cover),
				anchor("center"),
				pos(center().x + 100, center().y),
			]);

			cover.width = 300;
			cover.height = 300;

			state.songs.forEach((song, index) => {
				const songTitle = add([
					pos(),
					text(song ? song.manifest.name : "[ENTER to add]", { size: 40, align: "left" }),
					anchor("left"),
					opacity(),
					"page",
					"songtitle",
					{
						index: index,
					},
				]);
			});

			const allSongTitlesUpdate = onUpdate("songtitle", async (songTitle) => {
				const index = get("songtitle").indexOf(songTitle);
				const isAdd = index == state.curItems.length - 1;
				const isHovered = index == state.itemIndex;

				songTitle.pos.y = 100 + songTitle.height * 1.5 * (index - state.itemIndex);
				songTitle.pos.x = 60;
				if (isHovered) songTitle.opacity = 1;
				else songTitle.opacity = 0.5;

				if (isKeyPressed("backspace")) {
					if (isAdd) return;
					const removedSong = SongContent.removeFromExistence(state.songs[songTitle.index]);
					state.songs.splice(state.songs.indexOf(removedSong), 1);
				}

				if (isAdd) {
					if (isKeyPressed("enter") && state.itemIndex == state.songs.length - 1) {
						const loading = FileManager.loadingScreen("Receiving song...");
						const song = await FileManager.receiveFile("mod");
						loading.cancel();
					}
				}
			});

			getTreeRoot().on("itemchange", () => {
				const hoveredSong = get("songtitle").find((title) => title.index == state.itemIndex);
				let coverName = state.songs[hoveredSong.index]?.getCoverName();
				if (!coverName) coverName = SongManifest.default_cover;
			});

			pageTitle.onDestroy(() => {
				allSongTitlesUpdate.cancel();
			});
		}

		function dancersPage() {
			add([
				text("DANCERS", { size: 40, align: "center" }),
				pos(center().x, 40),
				anchor("center"),
				"title",
				"page",
			]);
		}

		state.songs = GameSave.extraSongs.map((uuid) => SongContent.getByUUID(uuid));
		state.songs.push(null);
		const pages = [songsPage, dancersPage];
		state.changePage(songsPage);

		onUpdate(() => {
			const oldPage = state.pageIndex;
			const oldItem = state.itemIndex;
			if (isKeyPressed("left")) state.pageIndex = utils.scrollIndex(state.pageIndex, -1, pages.length);
			else if (isKeyPressed("right")) state.pageIndex = utils.scrollIndex(state.pageIndex, 1, pages.length);

			if (isKeyPressed("up")) state.itemIndex = utils.scrollIndex(state.itemIndex, -1, state.curItems.length);
			else if (isKeyPressed("down")) state.itemIndex = utils.scrollIndex(state.itemIndex, 1, state.curItems.length);
			if (oldPage != state.pageIndex) state.changePage(pages[state.pageIndex]);
			if (oldItem != state.itemIndex) getTreeRoot().trigger("itemchange");
		});

		onKeyPress("escape", () => {
			switchScene(MenuState, "mods");
		});
	}
}

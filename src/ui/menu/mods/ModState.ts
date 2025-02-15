import { GameSave } from "../../../core/save";
import { IScene, switchScene } from "../../../core/scenes/KaplayState";
import { DancerContent } from "../../../data/dancer";
import { NoteskinContent } from "../../../data/noteskins";
import { Song, SongManifest } from "../../../data/song";
import { FileManager } from "../../../FileManager";
import { utils } from "../../../utils";
import { MenuState } from "../MenuState";
import { dancersPage } from "./dancersPage";
import { songsPage } from "./songsPage";

export class ModsState implements IScene {
	songs: Song[] = [];
	dancers: DancerContent[] = [];
	noteskins: NoteskinContent[] = [];
	itemIndex: number = 0;
	pageIndex: number = 0;
	curItems: any[] = [];

	changePage(action: (state: ModsState) => void) {
		this.itemIndex = 0;
		get("page").forEach((obj) => obj.destroy());
		action(this);
		getTreeRoot().trigger("itemchange");
	}

	addSongItem() {
	}

	scene(state: ModsState): void {
		state.songs = GameSave.extraSongs.map((uuid) => Song.getByUUID(uuid));
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

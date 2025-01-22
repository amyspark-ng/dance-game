import { loadCursor } from "../cursor";
import { Content } from "./content";

/** The loading screen of the game */
export function loadingScreen(progress: number) {
	// Black background
	drawRect({
		width: width(),
		height: height(),
		color: rgb(0, 0, 0),
	});

	// A pie representing current load progress
	drawCircle({
		pos: center(),
		radius: 32,
		end: map(progress, 0, 1, 0, 360),
	});

	drawText({
		text: "loading" + ".".repeat(wave(1, 4, time() * 12)),
		font: "monospace",
		size: 24,
		anchor: "center",
		pos: center().add(0, 70),
	});
}

/** Loads all the assets of the game */
export async function loadAssets() {
	Content.loadSongs();
	Content.loadDancers();
	Content.loadNoteskins();

	// #region EDITOR
	loadSound("dialogOpen", "editor/sounds/dialogOpen.ogg");
	loadSound("eventCog", "editor/sounds/eventCog.wav");
	loadSound("noteAdd", "editor/sounds/noteAdd.mp3");
	loadSound("noteCopy", "editor/sounds/noteCopy.wav");
	loadSound("noteHit", "editor/sounds/noteHit.ogg");
	loadSound("noteMove", "editor/sounds/noteMove.ogg");
	loadSound("noteRemove", "editor/sounds/noteRemove.mp3");
	loadSound("noteSnap", "editor/sounds/noteSnap.ogg");
	loadSound("noteStretch", "editor/sounds/noteStretch.ogg");
	loadSound("undo", "editor/sounds/undo.wav");

	Content.loadEventSprites();
	loadSprite("hueSlider", "editor/sprites/hueSlider.png");
	// #endregion EDITOR

	// #region GAME
	loadSound("introGo", "game/sounds/introGo.mp3");
	loadSound("lowHealth", "game/sounds/lowHealth.ogg");
	loadSound("noteMiss", "game/sounds/noteMiss.mp3");
	loadSound("pauseScratch", "game/sounds/pauseScratch.mp3");
	loadSound("resultsDrumroll", "game/sounds/resultsDrumroll.mp3");

	loadSprite("optionsCursor", "game/sprites/options/optionsCursor.png");
	loadSprite("cdCase", "game/sprites/songselect/cdCase.png");
	loadSprite("imported", "game/sprites/songselect/imported.png");
	loadSprite("importSong", "game/sprites/songselect/importSong.png");
	loadSpriteAtlas("game/sprites/songRanks.png", Content.getRankingSpriteAtlas());
	// #endregion GAME

	// #region SHARED
	loadCursor();
	// loadFont("robotomono", "shared/fonts/robotomono.ttf");
	loadFont("geo", "shared/fonts/geologica.ttf", { outline: { width: 25, color: BLACK }, filter: "nearest" });
	loadShaderURL("saturate", null, "shared/shaders/saturate.frag"); // Written by MF
	loadShaderURL("replacecolor", null, "shared/shaders/replacecolor.frag"); // Written by dragoncoder i think
	loadSprite("ui_arrow", "shared/ui/ui_arrow.png");
	loadSound("volumeChange", "shared/volumeChange.wav");
	// #endregion SHARED
}

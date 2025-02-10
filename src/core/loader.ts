import { SpriteAtlasData } from "kaplay";
import { DancerContent } from "../data/dancer";
import EventSchema from "../data/event/schema";
import { NoteskinContent } from "../data/noteskins";
import { SongContent } from "../data/song";
import { rankings } from "../play/objects/scoring";
import { loadCursor } from "./cursor";

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
	loadBean();
	SongContent.loadAll();
	DancerContent.loadAll();
	NoteskinContent.loadAll();

	let rankData = {};
	rankings.forEach((rank, index) => {
		rankData["rank_" + rank] = {
			width: 130,
			height: 130,
			x: 130 * index + 20 * index,
			y: 0,
		};
	});
	loadSpriteAtlas("game/sprites/songRanks.png", rankData);

	const eventData = {} as SpriteAtlasData;
	Object.keys(EventSchema).forEach((id, index) => {
		const x = (index % 4) * 52;
		const y = Math.floor(index / 4) * 52;

		eventData[id] = {
			width: 52,
			height: 52,
			x,
			y,
		};
	});
	loadSpriteAtlas("editor/sprites/events.png", eventData);

	// #region EDITOR
	loadSound("dialogOpen", "editor/sounds/dialogOpen.ogg");
	loadSound("eventCog", "editor/sounds/eventCog.wav");
	loadSound("noteAdd", "editor/sounds/noteAdd.mp3");
	loadSound("noteCopy", "editor/sounds/noteCopy.wav");
	loadSound("noteHit", "editor/sounds/noteHit.ogg");
	loadSound("noteMove", "editor/sounds/noteMove.ogg");
	loadSound("noteDelete", "editor/sounds/noteDelete.mp3");
	loadSound("noteSnap", "editor/sounds/noteSnap.ogg");
	loadSound("noteStretch", "editor/sounds/noteStretch.ogg");
	loadSound("undo", "editor/sounds/undo.wav");

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
	// #endregion GAME

	// #region SHARED
	loadCursor();
	// loadFont("robotomono", "shared/fonts/robotomono.ttf");
	loadFont("geo", "shared/fonts/geologica.ttf", { outline: { width: 5, color: BLACK }, filter: "nearest" });
	loadShaderURL("saturate", null, "shared/shaders/saturate.frag"); // Written by MF
	loadShaderURL("replacecolor", null, "shared/shaders/replacecolor.frag"); // Written by dragoncoder i think
	loadSprite("ui_arrow", "shared/ui/ui_arrow.png");
	loadSound("volumeChange", "shared/volumeChange.wav");
	// #endregion SHARED
}

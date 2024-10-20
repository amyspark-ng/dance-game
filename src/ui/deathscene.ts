import { GameSave } from "../game/gamesave"
import { transitionToScene } from "../game/scenes"
import { fadeOut } from "../game/transitions/fadeOutTransition"
import { GameSceneParams, GameStateClass } from "../play/gamescene"
import { SongChart } from "../play/song"

export type DeathSceneParams = {
	GameState: GameStateClass
}

export function DeathScene() { scene("death", (params:DeathSceneParams) => {
	setBackground(BLACK)
	
	add([
		text("YOU DIED"),
		anchor("center"),
		pos(center()),
		"deathText",
	])

	add([
		sprite("astri", { anim: "miss" }),
		pos(center().x - 100, center().y + 50),
		anchor("center"),
		scale(0.5),
	])

	onKeyPress(GameSave.preferences.controls.accept, () => {
		transitionToScene(fadeOut, "game", { song: params.GameState.song } as GameSceneParams)
	})
})}
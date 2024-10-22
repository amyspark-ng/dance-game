import { GameSave } from "../../core/gamesave"
import { transitionToScene } from "../../core/scenes"
import { fadeOut } from "../../core/transitions/fadeOutTransition"
import { paramsGameScene, StateGame } from "../playstate"

export type paramsDeathScene = {
	GameState: StateGame
}

export function DeathScene() { scene("death", (params:paramsDeathScene) => {
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
		transitionToScene(fadeOut, "game", { song: params.GameState.song } as paramsGameScene)
	})
})}
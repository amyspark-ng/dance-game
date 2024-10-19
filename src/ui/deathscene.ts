import { triggerEvent } from "../game/events"
import { GameSave } from "../game/gamesave"
import { GameState } from "../game/gamestate"
import { goScene, transitionToScene } from "../game/scenes"
import { fadeOut } from "../game/transitions/fadeOutTransition"
import { GameSceneParams } from "../play/gamescene"

export function DeathScene() { scene("death", () => {
	setBackground(BLACK)
	
	GameState.conductor.audioPlay.windDown()

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
		transitionToScene(fadeOut, "game", { song: GameState.currentSong })
	})

	onKeyPress("q", () => {
		triggerEvent("onBeatHit")
	})
})}
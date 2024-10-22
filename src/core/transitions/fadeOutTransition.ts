import { SceneName } from "kaplay";
import { triggerEvent } from "../events";
import { goScene, sceneNameType } from "../scenes";

export function fadeOut(sceneName: sceneNameType, params: any) : void {
	const fade = add([
		rect(width(), height()),
		pos(center().x, center().y),
		anchor("center"),
		color(BLACK),
		opacity(1),
		stay(),
		layer("background"),
		z(999),
		fixed(),
		timer(),
		"fadeTransition"
	])

	const FADE_TIME = 1

	// Changes the scene
	fade.tween(0, 1, FADE_TIME, (p) => fade.opacity = p).onEnd(() => {
		goScene(sceneName, params)
	})
	
	triggerEvent("transitionStart", "fadeOut")

	// Runs when the scene has succesfully been changed
	const sceneLeaveChange = onSceneLeave(() => {
		fade.tween(1, 0, FADE_TIME, (p) => fade.opacity = p).onEnd(() => {
			fade.destroy()
			sceneLeaveChange.cancel()
			triggerEvent("transitionEnd", "fadeOut")
		})
	})
}
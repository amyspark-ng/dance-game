import { triggerEvent } from "../events";
import { goScene, sceneNameType } from "../scenes";

export function curtainTransition(newScene: sceneNameType) {
	const fade = add([
		rect(width(), height()),
		pos(-width(), center().y),
		anchor("center"),
		color(BLACK),
		opacity(1),
		stay(),
		layer("background"),
		z(1),
		timer(),
	])

	triggerEvent("transitionStart", "curtainTransition")

	fade.tween(-width(), center().x, 1, (p) => fade.pos.x = p).onEnd(() => {
		goScene(newScene)
	})

	const sceneLeave = onSceneLeave(() => {
		fade.tween(fade.pos.x, -width(), 1, (p) => fade.pos.x = p).onEnd(() => {
			fade.destroy()
			sceneLeave.cancel()
			triggerEvent("transitionEnd", "curtainTransition")
		})
	})
}
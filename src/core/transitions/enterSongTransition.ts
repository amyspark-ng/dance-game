import { triggerEvent } from "../events";
import { cam } from "../plugins/features/camera";
import { goScene, sceneNameType } from "../scenes";

export function enterSongTrans(sceneName:sceneNameType, params:any) {
	const fade = add([
		rect(width() * 5, height() * 5),
		pos(center().x, center().y),
		anchor("center"),
		color(WHITE),
		opacity(1),
		stay(),
		layer("background"),
		z(999),
		fixed(),
		timer(),
		"fadeTransition"
	])

	const FADE_TIME = 0.75

	fade.fadeIn(FADE_TIME)
	tween(cam.zoom, vec2(5), 1, (p) => cam.zoom = p, easings.easeInBack).onEnd(() => {
		camFlash(WHITE, 0.25)
		cam.zoom = vec2(1)
		wait(0.5, () => goScene(sceneName, params))
	})

	// Changes the scene
	triggerEvent("transitionStart", "enterSong")

	// Runs when the scene has succesfully been changed
	const sceneLeaveChange = onSceneLeave(() => {
		fade.tween(1, 0, FADE_TIME * 0.9, (p) => fade.opacity = p).onEnd(() => {
			fade.destroy()
			sceneLeaveChange.cancel()
			triggerEvent("transitionEnd", "enterSong")
		})
	})
}
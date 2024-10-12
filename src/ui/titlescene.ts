import { goScene } from "../game/scenes"
import { fadeOutTransition } from "../game/transitions/fadeOutTransition"

export function TitleScene() { scene("title", () => {
	setBackground(BLUE.lighten(30))

	onKeyPress("enter", () => {
		goScene("game", fadeOutTransition)
	})
})} // END OF SCENE

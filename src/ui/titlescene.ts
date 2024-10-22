import { goScene } from "../core/scenes"
import { fadeOut } from "../core/transitions/fadeOutTransition"

export function TitleScene() { scene("title", () => {
	setBackground(BLUE.lighten(30))

	onKeyPress("enter", () => {
		goScene("game", fadeOut)
	})
})} // END OF SCENE

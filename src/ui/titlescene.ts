import { goScene } from "../game/scenes"
import { fadeOut } from "../game/transitions/fadeOutTransition"

export function TitleScene() { scene("title", () => {
	setBackground(BLUE.lighten(30))

	onKeyPress("enter", () => {
		goScene("game", fadeOut)
	})
})} // END OF SCENE

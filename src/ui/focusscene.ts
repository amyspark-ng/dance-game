import { goScene } from "../game/scenes";
import { STARTING_SCENE } from "../main";

export function FocusScene() { scene("focus", () => {
	setBackground(BLACK.lighten(50))
	
	add([
		text("CLICK TO FOCUS")
	])

	onClick(() => {
		goScene(STARTING_SCENE, null)  
	})
})}
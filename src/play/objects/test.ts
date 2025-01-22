import { Color } from "kaplay";

function fadeTransition(theColor: Color, duration: number) {
	add([
		opacity(),
		color(theColor),
	]).fadeIn(duration);
}

goScene("game", fadeTransition);

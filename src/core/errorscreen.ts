export function coolErrorScreen(err: Error) {
	drawRect({
		width: width(),
		height: height(),
		color: BLACK,
	});

	drawText({
		text: "OOPS! There seems to be an error!",
	});

	drawText({
		pos: vec2(0, 50),
		text: err.stack,
	});
}

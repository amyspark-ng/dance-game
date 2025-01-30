/** Add a little notification on the left of the screen
 * @param textToShow The string to show
 * @param time? How long the text will be around for (default: 1)
 * @param type? Wheter it's just announcement, error or success (will determine color)
 */
export function addNotification(textToShow: string, time: number = 1) {
	const format = formatText({ text: textToShow, size: 20, align: "left" });

	let opacity = 1;

	const texty = add([
		pos(),
		stay(),
		fixed(),
		z(9999999),
		timer(),
		"logText",
	]);

	texty.onDraw(() => {
		drawRect({
			width: format.width + 10,
			height: format.height + 10,
			color: BLACK,
			opacity: opacity * 0.75,
			radius: 5,
			anchor: "left",
		});

		drawText({
			text: textToShow,
			pos: vec2(5, 0),
			styles: {
				"error": {
					color: RED,
				},
				"success": {
					color: GREEN,
				},
				"warning": {
					color: YELLOW,
				},
			},
			anchor: "left",
			opacity: opacity,
			align: "left",
			size: 20,
		});
	});

	const logTexts = get("logText") as ReturnType<typeof addNotification>[];
	const index = logTexts.indexOf(texty);
	const intendedPos = vec2(10, height() - format.height - (format.height * 1.75) * index);
	texty.pos.y = intendedPos.y;

	texty.tween(texty.pos.x, intendedPos.x, 0.15, (p) => texty.pos.x = p, easings.easeOutQuint);
	texty.tween(opacity, 0, time, (p) => opacity = p).onEnd(() => {
		texty.destroy();
	});

	return texty;
}

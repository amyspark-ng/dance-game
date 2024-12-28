import { DrawTextOpt } from "kaplay";

export type watcherObj = {
	object: any;
	property: string;
	customName?: string;
};

export const watches = new Set<watcherObj>();

export function watchVar(object: any, property: any, customName?: string) {
	watches.add({ object: object, property: property, customName: customName });
}

export function unwatchVar(object: any, property: any, customName?: string) {
	watches.delete({ object: object, property: property, customName: customName });
}

/** Sets up the debug watcher */
export function setupWatch() {
	const watchDebug = add([
		stay(),
	]);

	watchDebug.onDraw(() => {
		if (debug.inspect == false) return;

		let watchesText: string = "";

		watches.forEach((watch) => {
			if (!watch.customName) watch.customName = watch.property;
			watchesText += `${watch.customName}: ${watch.object[watch.property]}\n`;
		});

		const textOpts = {
			text: watchesText,
			size: 16,
			anchor: "left",
			align: "left",
		} as DrawTextOpt;

		const formattedText = formatText(textOpts);

		const padding = 20;
		let textPos = vec2(padding, padding);
		const squarePos = vec2(width() - padding / 2, padding / 2);
		let squareWidth = formattedText.width + padding;
		let squareHeight = formattedText.height + padding;

		drawRect({
			width: squareWidth,
			height: squareHeight,
			color: BLACK,
			anchor: "topright",
			pos: squarePos,
			opacity: 0.8,
			radius: 4,
			fixed: true,
		});

		textPos.x = squarePos.x - squareWidth + 10;
		textPos.y = squarePos.y + squareHeight / 2;
		textOpts.pos = textPos;
		drawText(textOpts);
	});
}

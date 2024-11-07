import { GameObj, RectComp } from "kaplay";

type openDialogOpts = { width: number, height: number, content: (dialog: GameObj<RectComp>) => void }

export class Dialog {
	static isOpen: boolean = false;

	/** Wheter the cursor is inside a dialog */
	static isInside: boolean = false;

	static openDialog(opts: openDialogOpts) {
		const dialogObj = add([
			rect(opts.width, opts.height),
			pos(center()),
			color(BLACK.lighten(50)),
			anchor("center"),
			z(100),
		])

		opts.content(dialogObj)
	}
}
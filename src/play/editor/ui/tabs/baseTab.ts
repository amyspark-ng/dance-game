import { CompList, Vec2 } from "kaplay";
import { drag } from "../../../../core/drag";
import { EditorTab } from "../editorTab";

type offsetForSizing = { left: number; right: number; top: number; bottom: number; };
const defaultOffset: offsetForSizing = { left: 10, right: 10, top: 10, bottom: 10 };

function addTab(data: EditorTab) {
	const tab = add([
		anchor("topleft"),
		pos(),
		rect(10, 10, { radius: [0, 0, 10, 10] }),
		color(EditorTab.BODY_COLOR),
		drag(),
		"editorTab",
		{
			data: data,
			updateLayout(padding: offsetForSizing = defaultOffset, spacing: offsetForSizing = defaultOffset) {
				return [vec2()];
			},
		},
	]);

	let widthOfTitle = 0;
	tab.updateLayout = (padding: offsetForSizing = defaultOffset, spacing: offsetForSizing = defaultOffset) => {
		tab.height = padding.top;

		const positions = [];

		const children = tab.get("ui").sort((a, b) => a.id - b.id);
		children.forEach((child, index) => {
			// debug.log("size:" + vec2(child.width, child.height));
			// debug.log(`id: ${child.id} has tags ${child.tags}`);

			const childHeight = child.height + spacing.bottom;
			tab.height += childHeight;
			if (child.pos) {
				if (children[index - 1]) {
					child.pos.y = children[index - 1].pos.y + children[index - 1].height + spacing.bottom;
				}
				else child.pos.y = padding.top;
				child.pos.x = padding.left;
				positions[index] = vec2(child.pos);
			}
			else console.warn("EDITOR: Tried positioning children in tab but it doesn't have pos");
		});

		tab.width = Math.max(widthOfTitle, ...children.map((child) => child.pos.x + child.width)) + padding.right * 2;
		tab.height += padding.bottom;

		// debug.log("FINAL SIZE: " + vec2(tab.width, tab.height));
		return positions;
	};

	const header = tab.add([
		pos(0, -30),
		area(),
		rect(0, 30, { radius: [10, 10, 0, 0] }),
		color(EditorTab.HEADER_COLOR),
	]);

	header.onDraw(() => {
		drawText({
			text: data.title,
			size: 25,
			pos: vec2(10, 0),
			align: "left",
		});
	});

	header.onUpdate(() => {
		header.width = tab.width;
		widthOfTitle = formatText({ text: data.title, size: 25 }).width;
	});

	header.onClick(() => {
		tab.pick();
	});

	header.onMouseRelease(() => {
		if (tab.dragging) tab.drop();
	});

	tab.pos = center();

	return tab;
}

export default addTab;

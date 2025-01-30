import { eventId } from "../../../../data/event/event";
import EventSchema from "../../../../data/event/schema";
import { StateChart } from "../../EditorState";
import { EditorTab } from "../tabs";
import addTab from "./baseTab";

export function panelTab() {
	const tab = addTab(EditorTab.tabs.Panel);

	const panel = tab.add(["ui", pos(), { width: 60 * 4, height: 0 }]);
	Object.keys(EventSchema).forEach((key, index) => {
		const event = panel.add([
			sprite(key, { width: 60, height: 60 }),
			pos((index % 4) * 60, Math.floor(index / 4) * 60),
			opacity(),
			area(),
			"hover",
		]);

		event.onClick(() => {
			StateChart.instance.currentEvent = key as eventId;
		});

		event.onUpdate(() => {
			if (StateChart.instance.currentEvent == key) event.opacity = lerp(event.opacity, 1, 0.5);
			else event.opacity = lerp(event.opacity, event.isHovering() ? 0.8 : 0.5, 0.5);
		});

		event.width = 60;
		event.height = 60;
	});

	panel.height = 60 * Math.floor(Object.keys(EventSchema).length / 4);
	tab.updateLayout();
	return tab;
}

import { GameObj, Vec2 } from "kaplay";
import EventSchema, { eventValue } from "../../../../data/event/schema";
import { uiComp } from "../../../../ui/objects/uiElementComp";
import { StateChart } from "../../EditorState";
import { EditorEvent } from "../../objects/stamp";
import makeCheckbox from "../elements/checkbox";
import { makeEnumStepper, makeNumberStepper } from "../elements/stepper";
import makeTextbox from "../elements/textbox";
import { EditorTab } from "../tabs";
import addTab from "./baseTab";

function eventTab() {
	const tab = addTab(EditorTab.tabs.Events);

	let currentEvent: EditorEvent = null;

	function updateTab() {
		tab.removeAll("ui");

		if (!currentEvent) {
			tab.add([
				text("No event", { size: 20 }),
				pos(),
				"ui",
				"label",
			]);

			EditorTab.tabs.Events.title = "Events";
			tab.updateLayout();
			return;
		}

		EditorTab.tabs.Events.title = currentEvent.data.id;
		Object.keys(currentEvent.data.data).forEach((dataKey) => {
			const schema = EventSchema[currentEvent.data.id][dataKey] as eventValue;
			const value = currentEvent.data.data[dataKey];

			let obj: GameObj<uiComp | { width: number; height: number; value: any; }> = null;
			if (schema.type == "number") obj = tab.add(makeNumberStepper(value, schema.range));
			else if (schema.type == "boolean") obj = tab.add(makeCheckbox(value));
			else if (schema.type == "string") obj = tab.add(makeTextbox(value));
			else if (schema.type == "enum") obj = tab.add(makeEnumStepper(value, schema.options));

			// add label
			const label = obj.add([
				text(schema.label + ":", { size: obj.height * 0.75 }),
				pos(),
				anchor("right"),
				"label",
			]);

			label.pos.x -= 10;
			label.pos.y += label.height / 2;

			// do the changes
			obj.onChange(() => {
				currentEvent.data.data[dataKey] = obj.value;
			});
		});

		const widestLabel = Math.max(...tab.get("label", { recursive: true }).map((label) => label.width));
		const padding = { left: widestLabel + 10, down: 10, right: 10, top: 10, bottom: 10 };
		tab.updateLayout(padding);
	}

	tab.onUpdate(() => {
		const oldEvent = currentEvent;
		currentEvent = StateChart.instance.events.find((event) => event.beingEdited == true);
		const newEvent = currentEvent;
		if (oldEvent != newEvent) updateTab();
	});

	const pointer = onDraw(() => {
		if (!currentEvent) return;
		drawLine({
			p1: vec2(currentEvent.pos.x, currentEvent.pos.y),
			p2: tab.pos,
			width: 2,
			opacity: 0.5,
		});

		// @ts-ignore
		if (!currentEvent.data.data.duration) return;
		// draw how long the event is
		drawLine({
			p1: vec2(currentEvent.pos.x, currentEvent.pos.y),
			// @ts-ignore
			p2: vec2(currentEvent.pos.x, currentEvent.pos.y + StateChart.SQUARE_SIZE.x * StateChart.instance.conductor.timeToStep(currentEvent.data.data.duration)),
			width: 2,
			opacity: 0.5,
		});
	});

	tab.onDestroy(() => {
		pointer.cancel();
	});

	updateTab();

	return tab;
}

export default eventTab;

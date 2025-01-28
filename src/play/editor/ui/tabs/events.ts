import { StateChart } from "../../EditorState";
import { EditorEvent } from "../../objects/stamp";
import { EditorTab } from "../editorTab";
import makeCheckbox from "../objects/checkbox";
import { makeEnumStepper, makeNumberStepper } from "../objects/stepper";
import makeTextbox from "../objects/textbox";

export function defineEventTab() {
	EditorTab.tabs.Events.addElements((tabObj) => {
		/** The event that is actually being selected and modified */
		let currentEvent: EditorEvent = null;

		/** Refreshes the objects in the ui */
		function refreshTabUI(event: EditorEvent) {
			if (!event) {
				tabObj.tab.title = "Edit event";
				tabObj.get("*").forEach((obj) => obj.destroy());
				return;
			}

			// # ALL of this will run if the you can there's an actual event
			tabObj.tab.title = `Editing ${event.data.id}`;

			/** All the properties an an event's value has */
			const props = Object.keys(event.data.value);
			props.forEach((key: string, index: number) => {
				const type = typeof event.data.value[key];
				const initial = event.data.value[key];
				if (type == "number") {
					if (key == "easing") {
						const currentEasing = Object.keys(easings)[event.data.value["easing"]];
						const stepper = tabObj.add(makeEnumStepper(currentEasing, Object.keys(easings)));
						stepper.onChange(() => event.data.value["easing"] = Object.keys(easings).indexOf(stepper.value));
						return;
					}

					const stepper = tabObj.add(makeNumberStepper(initial, 1));
					stepper.onChange(() => event.data.value[key] = stepper.value);
				}
				else if (type == "boolean") {
					const checkbox = tabObj.add(makeCheckbox(initial));
					checkbox.onChange(() => event.data.value[key] = checkbox.value);
				}
				else if (type == "string") {
					const textbox = tabObj.add(makeTextbox(initial));
					textbox.onChange(() => event.data.value[key] = textbox.value);
				}
			});

			tabObj.get("ui").forEach((obj, index) => {
				const initial_pos = vec2(tabObj.getTopLeft().x + 10, -tabObj.height * 2.5);

				const title = tabObj.add([
					pos(initial_pos.x, initial_pos.y + (obj.height * 1.5) * index),
					text(Object.keys(event.data.value)[index], { size: 20 }),
				]);

				obj.pos.x = title.pos.x + title.width + 15;
				obj.pos.y = title.pos.y;
			});
		}

		// runs to set everything up
		refreshTabUI(currentEvent);

		tabObj.onUpdate(() => {
			// the other event thing is so you can deselect the event and still make it work
			const oldEvent = currentEvent;
			currentEvent = StateChart.instance.events.find((event) => event.beingEdited == true);
			const newEvent = currentEvent;

			// this runs whenever the selected event changes
			if (oldEvent != newEvent) {
				// if currentEvent is null or undefined it will clear all the objects
				refreshTabUI(currentEvent);
			}

			// sets the size of the tab
			tabObj.width = 300;
			let theHeight = 0;
			if (currentEvent) {
				theHeight = (Object.keys(currentEvent.data.value).length + 1) * 40;
			}
			else {
				theHeight = 60;
			}

			tabObj.height = lerp(tabObj.height, theHeight, 0.9);
		});

		// draws a cool line from the event position to the position of the tab so you can know what event is being modified
		const pointer = onDraw(() => {
			if (currentEvent) {
				drawLine({
					p1: vec2(currentEvent.pos.x, currentEvent.pos.y),
					p2: vec2(tabObj.pos.x - tabObj.width / 2, tabObj.pos.y - tabObj.height / 2),
					width: 2,
					opacity: 0.5,
				});

				// @ts-ignore
				if (currentEvent.data.value.duration) {
					// draw how long the event is
					drawLine({
						p1: vec2(currentEvent.pos.x, currentEvent.pos.y),
						// @ts-ignore
						p2: vec2(currentEvent.pos.x, currentEvent.pos.y + StateChart.SQUARE_SIZE.x * StateChart.instance.conductor.timeToStep(currentEvent.data.value.duration)),
						width: 2,
						opacity: 0.5,
					});
				}
			}
		});

		tabObj.onDestroy(() => {
			pointer.cancel();
		});
	});
}

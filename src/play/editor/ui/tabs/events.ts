import { GameObj, PosComp } from "kaplay";
import { utils } from "../../../../utils";
import { ChartEvent, eventId } from "../../../event";
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
			/** This runs to do some work related to ui props */
			function objAfterwork(obj: GameObj<PosComp | any>, event: ChartEvent, evKey: string, index: number) {
				function positionObject(obj: GameObj<PosComp | any>, index: number) {
					const initialPos = vec2(tabObj.getTopLeft().x, tabObj.getTopLeft().y);
					obj.pos = vec2(initialPos.x + 15, initialPos.y + 15 + index * 40);
				}

				obj.use("eventobj");
				obj.value = event.value[evKey];
				obj.onUpdate(() => {
					positionObject(obj, index);
					event.value[evKey] = obj.value;
				});

				obj.onDraw(() => {
					drawText({
						text: utils.unIdText(evKey),
						size: 20,
						pos: vec2(obj.width + 10, 10),
					});
				});
			}

			tabObj.get("eventobj").forEach((obj) => obj.destroy());

			if (!event) {
				tabObj.add([
					text("No event", { size: 25, align: "center" }),
					anchor("center"),
					"eventobj",
				]);
				tabObj.tab.title = "Edit event";
				return;
			}

			// # ALL of this will run if the you can there's an actual event
			tabObj.tab.title = "Editing event: ";
			tabObj.add([
				sprite(currentEvent.data.id, { width: 25, height: 25 }),
				pos(),
				"eventobj",
				{
					update() {
						this.pos = vec2(
							tabObj.getTopLeft().x + formatText({ text: tabObj.tab.title, size: 25 }).width,
							tabObj.getTopLeft().y - 30,
						);
					},
				},
			]);

			/** All the properties an an event's value has */
			const eventProps = Object.keys(event.data.value);
			eventProps.forEach((keyofValue: string, index: number) => {
				const value = event.data.value[keyofValue];
				const typeOfValue = typeof value;
				const defaultValue = ChartEvent.eventSchema[event.data.id][keyofValue];

				if (typeOfValue == "string") {
					const textbox = tabObj.add(makeTextbox(defaultValue));
					objAfterwork(textbox, event.data, keyofValue, index);
				}
				else if (typeOfValue == "boolean") {
					const checkbox = tabObj.add(makeCheckbox(defaultValue));
					objAfterwork(checkbox, event.data, keyofValue, index);
				}
				else if (typeOfValue == "number") {
					let increment = 0;
					if (keyofValue == "speed" || keyofValue == "zoom" || keyofValue == "strength") increment = 0.1;
					else if (keyofValue == "x" || keyofValue == "y" || keyofValue == "angle") increment = 10;
					else increment = 1;

					const scrollable = tabObj.add(makeNumberStepper(defaultValue, increment));
					objAfterwork(scrollable, event.data, keyofValue, index);
				}
				else if (typeOfValue == "object") {
					if (Array.isArray(value)) {
						const easingKeys = Object.keys(easings);
						const scrollable = tabObj.add(makeEnumStepper(defaultValue, easingKeys));
						objAfterwork(scrollable, event.data, keyofValue, index);
					}
				}
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

			tabObj.height = lerp(tabObj.height, theHeight, 0.8);
		});

		// draws a cool line from the event position to the position of the tab so you can know what event is being modified
		const pointer = onDraw(() => {
			if (currentEvent) {
				drawLine({
					p1: vec2(currentEvent.pos.x + StateChart.SQUARE_SIZE.x, currentEvent.pos.y),
					p2: vec2(tabObj.pos.x - tabObj.width / 2, tabObj.pos.y - tabObj.height / 2),
					width: 2,
					opacity: 0.5,
				});
			}
		});

		tabObj.onDestroy(() => {
			pointer.cancel();
		});
	});
}

import { GameObj } from "kaplay";
import { eventValue } from "../../../../data/event/schema";
import { songSchema } from "../../../../data/song";
import { FileManager } from "../../../../FileManager";
import { EditorState } from "../../EditorState";
import makeButton from "../elements/button";
import makeCheckbox from "../elements/checkbox";
import { makeEnumStepper, makeNumberStepper } from "../elements/stepper";
import makeTextbox from "../elements/textbox";
import { EditorTab } from "../tabs";
import addTab from "./baseTab";

export function songTab() {
	const state = EditorState.instance;
	const tab = addTab(EditorTab.tabs.SongInfo);

	Object.keys(songSchema).forEach((key) => {
		const schema = songSchema[key] as eventValue;
		const value = state.song.manifest[key];

		let obj: GameObj<any> = null;
		if (schema.type == "number") obj = tab.add(makeNumberStepper(value));
		else if (schema.type == "boolean") obj = tab.add(makeCheckbox(value));
		else if (schema.type == "string") obj = tab.add(makeTextbox(value));
		else if (schema.type == "enum") obj = tab.add(makeEnumStepper(value, schema.options));
		else if (schema.type == "action") obj = tab.add(makeButton(value));

		// add label
		const label = obj.add([
			text(schema.label + ":", { size: obj.height * 0.75, align: "left" }),
			pos(),
			"label",
		]);

		if (schema.type == "action" && key == "cover_file") {
			obj.onClick(async () => {
				const loading = FileManager.loadingScreen();
				let file: File = await FileManager.receiveFile("cover");

				if (file) {
					// cover
					const base64 = FileManager.ImageToBase64(file);
					await loadSprite(state.song.getCoverName(), base64);
					const theButton = tab.get("ui").find((obj) => obj.value == state.song.manifest.cover_file);
					if (theButton) theButton.value = file.name;
					obj.trigger("change");
				}

				loading.cancel();
			});
		}

		if (schema.type == "action" && key == "audio_file") {
			obj.onClick(async () => {
				const loading = FileManager.loadingScreen();
				let file: File = await FileManager.receiveFile("audio");

				await loadSound(state.song.getAudioName(), await file.arrayBuffer());
				state.updateAudio();
				loading.cancel();
				const theButton = tab.get("ui").find((obj) => obj.value == state.song.manifest.audio_file);
				if (theButton) theButton.value = file.name;
				theButton.trigger("change");
			});
		}

		label.pos.x -= label.width;
		label.pos.y += label.height / 2;

		obj.onChange(() => {
			state.song.manifest[key] = obj.value;
		});
	});

	const widestLabel = Math.max(...tab.get("label", { recursive: true }).map((label) => label.width));
	const padding = { left: widestLabel, down: 10, right: 10, top: 10, bottom: 10 };
	tab.updateLayout(padding);

	return tab;
}

import { GameObj, PosComp, RectComp } from "kaplay";
import { FileManager } from "../../../../FileManager";
import { ui, uiComp } from "../../../../ui/objects/uiElementComp";
import { StateChart } from "../../EditorState";
import { EditorTab } from "../editorTab";
import makeButton from "../objects/button";
import { makeNumberStepper } from "../objects/stepper";
import makeTextbox from "../objects/textbox";

export function defineSongMetadataTab() {
	const ChartState = StateChart.instance;

	EditorTab.tabs.SongInfo.addElements((tabObj) => {
		type songField = {
			name: string;
			type: "string" | "number" | "function";
			direction: string;
			increase?: number;
			action?: () => any;
		};
		const songManifest = ChartState.song.manifest;

		const songFields: songField[] = [
			{ name: "Song name", type: "string", direction: "name" },
			{ name: "Artist name", type: "string", direction: "artist" },
			{ name: "Charter name", type: "string", direction: "charter" },
			{ name: "BPM", type: "number", direction: "initial_bpm", increase: 10 },
			{ name: "Scroll speed", type: "number", direction: "initial_scrollspeed", increase: 0.1 },
			{ name: "Steps per beat", type: "number", direction: "steps_per_beat", increase: 1 },
			{ name: "Beats per measure", type: "number", direction: "beats_per_measure", increase: 1 },
			{
				name: "Cover path",
				type: "function",
				direction: "cover_file",
				action: async () => {
					const loading = FileManager.loadingScreen();
					let file: File = await FileManager.receiveFile("cover");

					if (file) {
						// cover
						const base64 = FileManager.ImageToBase64(file);
						await loadSprite(ChartState.song.manifest.uuid_DONT_CHANGE + "-cover", base64);
						const theButton = tabObj.children.find((obj) => obj.value == songManifest.cover_file);
						if (theButton) theButton.value = file.name;
						theButton.trigger("change");
					}

					loading.cancel();
				},
			},
			{
				name: "Audio path",
				type: "function",
				direction: "audio_file",
				action: async () => {
					const loading = FileManager.loadingScreen();
					let file: File = await FileManager.receiveFile("audio");

					await loadSound(
						ChartState.song.manifest.uuid_DONT_CHANGE + "-audio",
						await file.arrayBuffer(),
					);
					ChartState.updateAudio();
					loading.cancel();
					const theButton = tabObj.children.find((obj) => obj.value == songManifest.audio_file);
					if (theButton) theButton.value = file.name;
					theButton.trigger("change");
				},
			},
		];

		tabObj.width = 400;
		tabObj.height = (40 * songFields.length) + 20;
		songFields.forEach((field, index) => {
			let uiobject: GameObj<RectComp | PosComp | uiComp | { value: any; }>;
			const valueInManifest = songManifest[field.direction];
			if (field.type == "string") uiobject = tabObj.add(makeTextbox(valueInManifest));
			else if (field.type == "number") uiobject = tabObj.add(makeNumberStepper(valueInManifest, field.increase));
			else if (field.type == "function") uiobject = tabObj.add(makeButton(valueInManifest, field.action));
			uiobject.pos.y = (uiobject.height * 1.1) * index;

			uiobject.onChange(() => {
				songManifest[field.direction] = uiobject.value;
			});

			uiobject.onDraw(() => {
				drawText({
					text: field.name,
					size: 20,
					pos: vec2(-10, uiobject.height / 2),
					anchor: "right",
					align: "right",
				});
			});

			uiobject.pos.x = 10;
			uiobject.pos.y = 10 + (tabObj.getTopLeft().y) + 40 * index;
		});
	});
}

import { GameSave } from "../../core/gamesave";
import { dancers } from "../../core/loader";
import { goScene, transitionToScene } from "../../core/scenes";
import { fadeOut } from "../../core/transitions/fadeOutTransition";
import { paramsSongSelect } from "../../ui/SongSelectScene";
import { utils } from "../../utils";

export function CharSelectScene() {
	scene("charselect", (params: paramsSongSelect) => {
		function addDancerChar(dancerName: string) {
			const curDancer = add([
				sprite("dancer_" + dancerName, { anim: "idle" }),
				pos(center().x, center().y),
				anchor("center"),
				scale(),
				"dancerChar",
				dancerName,
			]);

			return curDancer;
		}

		/** The index in dancers of the currently selected dancer */
		let curIndex = dancers.map(dancer => dancer.dancerName).indexOf(GameSave.dancer);
		const dancerNames = dancers.map(dancer => dancer.dancerName);

		const bg = add([
			sprite("dancer_" + dancers[curIndex].dancerName, {
				anim: "idle",
				tiled: true,
				width: width(),
				height: height(),
			}),
			opacity(0.5),
		]);

		bg.onUpdate(() => {
			bg.sprite = "dancer_" + dancers[curIndex].dancerName;
		});

		dancers.forEach((dancer, index) => {
			let intendedYPos = center().y;
			let intendedXScale = 1;

			const dancerChar = addDancerChar(dancer.dancerName);

			dancerChar.onUpdate(() => {
				if (dancers[curIndex].dancerName == dancer.dancerName) {
					intendedYPos = center().y;
					intendedXScale = 1;
				}
				else {
					intendedYPos = center().y + dancerChar.height * 1.5 * (index - curIndex);
					intendedXScale = 0;
				}

				dancerChar.pos.y = lerp(dancerChar.pos.x, intendedYPos - height() / 2, 0.5);
				dancerChar.scale.x = lerp(dancerChar.scale.x, intendedXScale, 0.5);
			});
		});

		onKeyPress("up", () => {
			curIndex = utils.scrollIndex(curIndex, -1, dancers.length);
			GameSave.dancer = dancerNames[curIndex];
		});

		onKeyPress("down", () => {
			curIndex = utils.scrollIndex(curIndex, 1, dancers.length);
			GameSave.dancer = dancerNames[curIndex];
		});

		onKeyPress("enter", () => {
			get(GameSave.dancer)[0].play("victory");
			transitionToScene(fadeOut, "songselect", { index: params.index } as paramsSongSelect);
			GameSave.save();
		});

		setBackground(BLUE.lighten(60));
	});
}

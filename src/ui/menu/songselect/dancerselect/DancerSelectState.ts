import { GameSave } from "../../../../core/save";
import { IScene, switchScene } from "../../../../core/scenes/KaplayState";
import { utils } from "../../../../utils";
import { SongSelectState } from "../SongSelectState";

export class DancerSelectState implements IScene {
	/** The index of the song you were when entering this state */
	previousSongIndex: number = 0;

	scene(instance: DancerSelectState): void {
		// function addDancerChar(dancerName: string) {
		// 	const curDancer = add([
		// 		sprite(getDancerByName(dancerName).spriteName),
		// 		pos(center().x, center().y),
		// 		anchor("center"),
		// 		scale(),
		// 		"dancerChar",
		// 		dancerName,
		// 		{
		// 			data: getDancerByName(dancerName),
		// 		},
		// 	]);

		// 	curDancer.play(curDancer.data.getAnim("idle"));

		// 	return curDancer;
		// }

		// const dancers = DancerContent.loaded;
		// let curIndex = dancers.indexOf(getDancer());

		// const bg = add([
		// 	sprite(dancers[curIndex].bgSpriteName, {
		// 		width: width(),
		// 		height: height(),
		// 	}),
		// ]);

		// bg.onUpdate(() => {
		// 	bg.sprite = getDancer().bgSpriteName;
		// });

		// dancers.forEach((dancer, index) => {
		// 	let intendedYPos = center().y;
		// 	let intendedXScale = 1;

		// 	const dancerChar = addDancerChar(dancer.manifest.name);

		// 	dancerChar.onUpdate(() => {
		// 		if (dancers[curIndex].spriteName == dancer.spriteName) {
		// 			intendedYPos = center().y;
		// 			intendedXScale = 1;
		// 		}
		// 		else {
		// 			intendedYPos = center().y + dancerChar.height * 1.5 * (index - curIndex);
		// 			intendedXScale = 0;
		// 		}

		// 		dancerChar.pos.y = lerp(dancerChar.pos.x, intendedYPos - height() / 2, 0.5);
		// 		dancerChar.scale.x = lerp(dancerChar.scale.x, intendedXScale, 0.5);
		// 	});
		// });

		// onKeyPress("up", () => {
		// 	curIndex = utils.scrollIndex(curIndex, -1, dancers.length);
		// 	GameSave.dancer = dancers[curIndex].manifest.name;
		// });

		// onKeyPress("down", () => {
		// 	curIndex = utils.scrollIndex(curIndex, 1, dancers.length);
		// 	GameSave.dancer = dancers[curIndex].manifest.name;
		// });

		// onKeyPress("enter", () => {
		// 	// get(GameSave.dancer)[0].play("victory");
		// 	GameSave.save();
		// 	switchScene(SongSelectState, instance.previousSongIndex);
		// });

		// setBackground(BLUE.lighten(60));
	}

	constructor(previousSongIndex: number) {
		this.previousSongIndex = previousSongIndex;
	}
}

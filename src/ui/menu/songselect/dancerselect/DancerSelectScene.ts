import { GameSave } from "../../../../core/save";
import { KaplayState } from "../../../../core/scenes/KaplayState";
import { DancerContent, getDancer, getDancerByName } from "../../../../data/dancer";
import { utils } from "../../../../utils";
import { StateSongSelect } from "../SongSelectScene";

export class StateDancerSelect extends KaplayState {
	constructor() {
		super("dancerselect");
	}
}

KaplayState.scene("dancerselect", (DancerSelectState: StateDancerSelect) => {
	function addDancerChar(dancerName: string) {
		const curDancer = add([
			sprite(getDancerByName(dancerName).spriteName),
			pos(center().x, center().y),
			anchor("center"),
			scale(),
			"dancerChar",
			dancerName,
			{
				data: getDancerByName(dancerName),
			},
		]);

		curDancer.play(curDancer.data.getAnim("idle"));

		return curDancer;
	}

	const dancers = DancerContent.loaded;
	let curIndex = dancers.indexOf(getDancer());

	const bg = add([
		sprite(dancers[curIndex].bgSpriteName, {
			width: width(),
			height: height(),
		}),
	]);

	bg.onUpdate(() => {
		bg.sprite = getDancer().bgSpriteName;
	});

	dancers.forEach((dancer, index) => {
		let intendedYPos = center().y;
		let intendedXScale = 1;

		const dancerChar = addDancerChar(dancer.manifest.name);

		dancerChar.onUpdate(() => {
			if (dancers[curIndex].spriteName == dancer.spriteName) {
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
		GameSave.dancer = dancers[curIndex].manifest.name;
	});

	onKeyPress("down", () => {
		curIndex = utils.scrollIndex(curIndex, 1, dancers.length);
		GameSave.dancer = dancers[curIndex].manifest.name;
	});

	onKeyPress("enter", () => {
		// get(GameSave.dancer)[0].play("victory");
		GameSave.save();
		KaplayState.switchState(new StateSongSelect(0));
	});

	setBackground(BLUE.lighten(60));
});

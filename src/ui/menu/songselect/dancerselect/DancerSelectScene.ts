import { Content } from "../../../../core/loading/content";
import { GameSave } from "../../../../core/save";
import { KaplayState } from "../../../../core/scenes/KaplayState";
import { utils } from "../../../../utils";
import { StateSongSelect } from "../SongSelectScene";

export class StateDancerSelect extends KaplayState {
	SongSelectState: StateSongSelect;
	constructor(songselectstate: StateSongSelect) {
		super("dancerselect");
		this.SongSelectState = songselectstate;
	}
}

KaplayState.scene("dancerselect", (DancerSelectState: StateDancerSelect) => {
	function addDancerChar(dancerName: string) {
		const curDancer = add([
			sprite(Content.getDancerByName(GameSave.dancer).name, { anim: "idle" }),
			pos(center().x, center().y),
			anchor("center"),
			scale(),
			"dancerChar",
			dancerName,
		]);

		return curDancer;
	}

	const dancers = Content.loadedDancers;
	/** The index in dancers of the currently selected dancer */
	let curIndex = dancers.map(dancer => dancer.name).indexOf(GameSave.dancer);
	const dancerNames = dancers.map(dancer => dancer.name);

	const bg = add([
		sprite(Content.getDancerByName(dancers[curIndex].name).name, {
			anim: "idle",
			tiled: true,
			width: width(),
			height: height(),
		}),
		opacity(0.5),
	]);

	bg.onUpdate(() => {
		bg.sprite = Content.getDancerByName(dancers[curIndex].name).name;
	});

	dancers.forEach((dancer, index) => {
		let intendedYPos = center().y;
		let intendedXScale = 1;

		const dancerChar = addDancerChar(dancer.name);

		dancerChar.onUpdate(() => {
			if (dancers[curIndex].name == dancer.name) {
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
		GameSave.save();
		KaplayState.switchState(new StateSongSelect(0));
	});

	setBackground(BLUE.lighten(60));
});

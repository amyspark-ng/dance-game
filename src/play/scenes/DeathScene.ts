import { IScene, switchScene } from "../../core/scenes/KaplayState";
import { getCurDancer } from "../../data/dancer";
import { SongSelectState } from "../../ui/menu/songselect/SongSelectState";
import { GameState } from "../GameState";
import { makeDancer } from "../objects/dancer";

export class DeathState implements IScene {
	GameState: GameState;

	scene(this: DeathState): void {
		setBackground(BLACK);

		add([
			text("YOU DIED"),
			anchor("center"),
			pos(center()),
			"deathText",
		]);

		const dancer = add(makeDancer(getCurDancer().manifest.name));
		dancer.play(dancer.data.getAnim("up", true));

		onKeyPress(["backspace", "escape"], () => {
			switchScene(SongSelectState, this.GameState.song);
		});

		onKeyPress("enter", () => {
			// TODO: Restart button
			switchScene(GameState, this.GameState.params);
		});
	}

	constructor(GameState: GameState) {
		this.GameState = GameState;
	}
}

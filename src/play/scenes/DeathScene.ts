import { KaplayState } from "../../core/scenes/scenes";
import { StateSongSelect } from "../../ui/menu/songselect/SongSelectScene";
import { paramsGameScene, StateGame } from "../PlayState";

export class StateDeath extends KaplayState {
	GameState: StateGame;
	constructor(GameState: StateGame) {
		super("death");
	}
}

KaplayState.scene("death", (DeathState: StateDeath) => {
	setBackground(BLACK);

	add([
		text("YOU DIED"),
		anchor("center"),
		pos(center()),
		"deathText",
	]);

	add([
		sprite("dancer_" + DeathState.GameState.params.dancerName, { anim: "miss" }),
		pos(center().x - 100, center().y + 50),
		anchor("center"),
		scale(0.5),
	]);

	onKeyPress(["backspace", "escape"], () => {
		KaplayState.switchState(new StateSongSelect(DeathState.GameState.song));
	});

	onKeyPress("enter", () => {
		// TODO: Restart button
		const gameParams: paramsGameScene = {
			dancerName: DeathState.GameState.params.dancerName,
			fromEditor: false,
			song: DeathState.GameState.song,
			playbackSpeed: DeathState.GameState.params.playbackSpeed,
			seekTime: DeathState.GameState.params.seekTime,
		};

		KaplayState.switchState(new StateGame(gameParams));
	});
});

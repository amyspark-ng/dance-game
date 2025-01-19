import { GameSave } from "../../core/gamesave";
import { KaplayState } from "../../core/scenes";
import { StateSongSelect } from "../../ui/SongSelectScene";
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
		KaplayState.switchState(new StateSongSelect({ index: 0 }));
	});

	onKeyPress("enter", () => {
		// TODO: Restart button
		const gameParams: paramsGameScene = {
			dancerName: DeathState.GameState.params.dancerName,
			fromChartEditor: false,
			song: DeathState.GameState.song,
			playbackSpeed: DeathState.GameState.params.playbackSpeed,
			seekTime: DeathState.GameState.params.seekTime,
		};

		KaplayState.switchState(new StateGame(gameParams));
	});
});

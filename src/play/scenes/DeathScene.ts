import { KaplayState } from "../../core/scenes/KaplayState";
import { getDancer } from "../../data/dancer";
import { StateSongSelect } from "../../ui/menu/songselect/SongSelectScene";
import { paramsGameScene, StateGame } from "../PlayState";

export class StateDeath extends KaplayState {
	GameState: StateGame;
	constructor(GameState: StateGame) {
		super("death");
		this.GameState = GameState;
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
		sprite(getDancer().getName(), { anim: "miss" }),
		pos(center().x - 100, center().y + 50),
		anchor("center"),
		scale(0.5),
	]);

	onKeyPress(["backspace", "escape"], () => {
		KaplayState.switchState(new StateSongSelect(DeathState.GameState.song));
	});

	onKeyPress("enter", () => {
		// TODO: Restart button
		KaplayState.switchState(
			new StateGame({
				dancerName: DeathState.GameState.params.dancerName,
				fromEditor: false,
				song: DeathState.GameState.song,
				playbackSpeed: DeathState.GameState.params.playbackSpeed,
				seekTime: DeathState.GameState.params.seekTime,
			}),
		);
	});
});

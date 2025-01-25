import { KaplayState } from "../../core/scenes/KaplayState";
import { getDancer, getDancerByName } from "../../data/dancer";
import { StateSongSelect } from "../../ui/menu/songselect/SongSelectScene";
import { makeDancer } from "../objects/dancer";
import { StateGame } from "../PlayState";

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

	const dancer = add(makeDancer(getDancerByName(DeathState.GameState.params.dancerName).manifest.name));
	dancer.play(dancer.data.getAnim("up", true));

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

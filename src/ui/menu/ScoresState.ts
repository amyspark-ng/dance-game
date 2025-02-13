import { cloneDeep, isEqual } from "lodash";
import { cam } from "../../core/camera";
import { GameSave } from "../../core/save";
import { IScene, switchScene } from "../../core/scenes/KaplayState";
import { SongContent } from "../../data/song";
import { Tally } from "../../play/objects/scoring";
import { SongScore } from "../../play/savescore";
import { ResultsState } from "../../play/scenes/ResultsState";
import { utils } from "../../utils";
import { MenuState } from "./MenuState";

const filters = ["score", "hitnotes", "combo", "clear"] as const;
export class ScoresState implements IScene {
	scoreIndex = 0;
	filterIndex = 0;

	filterBy: typeof filters[number] = "score";
	scores: SongScore[] = [];

	scoreItems: ReturnType<typeof this.addScoreObj>[] = [];

	addScoreObj(song: SongContent, score: SongScore) {
		const hitNotes = Tally.hitNotes(score.tally);
		const totalNotes = Tally.totalNotes(score.tally);
		const clear = Tally.cleared(score.tally);
		const rank = Tally.ranking(score.tally);
		const scoreText = `${song.manifest.name} | ${
			utils.formatNumber(score.tally.score, { type: "simple" })
		} | x${score.tally.highestCombo} | ${hitNotes}/${totalNotes} | (${clear}%)`;

		const container = add([pos(), "score", {
			index: 0,
			score: score,
			height: 0,
			opacity: 1,
		}]);

		const place = container.add([
			text("#1", { align: "left" }),
			pos(),
			anchor("center"),
			opacity(),
		]);

		const cover = container.add([
			sprite(song.getCoverName()),
			pos(place.pos.x + 65, 0),
			anchor("center"),
			scale(0.15),
			opacity(),
		]);

		const scoreTextObj = container.add([
			text(scoreText, { align: "left" }),
			anchor("left"),
			pos(cover.pos.x + 40, cover.pos.y),
			opacity(),
		]);

		const rankObj = container.add([
			sprite("rank_" + rank),
			scale(0.4),
			anchor("center"),
			pos(scoreTextObj.pos.x + scoreTextObj.width + 35, scoreTextObj.pos.y),
			opacity(),
		]);

		container.height = scoreTextObj.height;
		container.index = get("score").indexOf(container);
		this.scoreItems[container.index] = container;

		container.onUpdate(() => {
			place.text = `#${container.index + 1}`;
			place.opacity = container.opacity;
			cover.opacity = container.opacity;
			scoreTextObj.opacity = container.opacity;
			rankObj.opacity = container.opacity;
		});

		return container;
	}

	changeFilter(newFilter: typeof this.filterBy) {
		if (newFilter == this.filterBy) return;

		const oldScore = this.scores[this.scoreIndex];
		this.filterBy = newFilter;
		this.scores.sort((a, b) => {
			if (this.filterBy == "score") return b.tally.score - a.tally.score;
			else if (this.filterBy == "hitnotes") return Tally.hitNotes(b.tally) - Tally.hitNotes(a.tally);
			else if (this.filterBy == "clear") return Tally.cleared(b.tally) - Tally.cleared(a.tally);
			else if (this.filterBy == "combo") return b.tally.highestCombo - a.tally.highestCombo;
		});

		this.scoreItems.forEach((container) => {
			const newIndex = this.scores.findIndex((score) => isEqual(score, container.score));
			container.index = newIndex;
		});

		this.scoreIndex = this.scores.findIndex((score) => isEqual(score, oldScore));
	}

	scene(state: ScoresState): void {
		setBackground(RED.lerp(BLUE, 0.6));

		state.scores.forEach((score, index) => {
			const song = SongContent.getByUUID(score.uuid);

			if (!song) return;
			this.addScoreObj(song, score);
		});

		onUpdate(() => {
			if (isKeyPressed("left")) state.filterIndex = utils.scrollIndex(state.filterIndex, -1, filters.length);
			else if (isKeyPressed("right")) state.filterIndex = utils.scrollIndex(state.filterIndex, 1, filters.length);
			if (isKeyPressed("up")) state.scoreIndex = utils.scrollIndex(state.scoreIndex, -1, state.scoreItems.length);
			else if (isKeyPressed("down")) state.scoreIndex = utils.scrollIndex(state.scoreIndex, 1, state.scoreItems.length);
			state.changeFilter(filters[state.filterIndex]);
			const focusedScore = state.scoreItems[state.scoreIndex];

			if (isKeyPressed("enter")) {
				cam.reset();
				switchScene(ResultsState, focusedScore.score, () => {
					switchScene(ScoresState, this.scores[this.scoreIndex]);
				});
			}

			const camY = (focusedScore.pos.y + height() / 2) - focusedScore.height - 40;
			cam.pos.y = lerp(cam.pos.y, camY, 0.25);
		});

		onUpdate("score", (container: ReturnType<typeof this.addScoreObj>) => {
			container.pos.x = 50;
			const y = 75 + 75 * container.index;
			container.pos.y = lerp(container.pos.y, y, 0.25);
			const focused = container.index == state.scoreIndex;
			if (focused) container.opacity = lerp(container.opacity, 1, 0.5);
			else container.opacity = lerp(container.opacity, 0.5, 0.5);
		});

		const filterText = add([
			text(`Filter by: ${state.filterBy}`, { align: "center" }),
			anchor("center"),
			pos(center().x, center().y + height() / 2 - 50),
			fixed(),
		]);

		filterText.onUpdate(() => {
			let filterString: string = undefined;
			switch (state.filterBy) {
				case "clear":
					filterString = "Clear";
					break;
				case "combo":
					filterString = "Combo";
					break;
				case "hitnotes":
					filterString = "Hit notes";
					break;
				case "score":
					filterString = "Score";
					break;
			}
			filterText.text = `Filter by: ${filterString}`;
		});

		onKeyPress("escape", () => {
			switchScene(MenuState, "scores");
		});
	}

	constructor(startAt: SongScore | number = 0) {
		// creates an array and removes duplicates
		this.scores = cloneDeep(GameSave.scores).filter((o, index, arr) => {
			return arr.findIndex(item => JSON.stringify(item) === JSON.stringify(o)) === index;
		});

		this.scores.forEach((score, index) => {
			const songIsLoaded = SongContent.getByUUID(score.uuid) ? true : false;
			const shouldRemoveFromScore = !songIsLoaded;
			if (shouldRemoveFromScore) this.scores.splice(index, 1);
		});

		if (typeof startAt == "number") {
			if (utils.isInRange(startAt, 0, this.scores.length)) this.scoreIndex = startAt;
			else this.scoreIndex = 0;
		}
		else {
			const newIndex = this.scores.findIndex((otherScore) => isEqual(otherScore, startAt));
			if (!newIndex) this.scoreIndex = 0;
			else this.scoreIndex = newIndex;
		}
	}
}

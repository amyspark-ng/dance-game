import { StateGame } from "../PlayState";
import { DANCER_POS } from "./dancer";
import { ChartNote } from "./note";
import { Judgement, Scoring } from "./scoring";

/** Add judgement object */
export function updateJudgement(judgement: Judgement) {
	function createJudgement() {
		let timeLeft = 1;

		const judgementObj = add([
			text(judgement, { align: "center" }),
			pos(DANCER_POS.x + 50, DANCER_POS.y),
			anchor("center"),
			opacity(1),
			scale(),
			"judgement",
			"game",
		]);

		let comboText = "";

		judgementObj.onUpdate(() => {
			timeLeft -= dt();
			judgementObj.opacity = timeLeft;
			if (judgementObj.opacity <= 0) judgementObj.destroy();
			if (judgement == "Miss") comboText = "BREAK";
			else comboText = StateGame.instance.combo.toString();
		});

		const onNoteHitEV = StateGame.instance.events.onNoteHit((note: ChartNote) => {
			timeLeft = 1;
		});

		const onNoteMiss = StateGame.instance.events.onMiss(() => {
			timeLeft = 1;
		});

		judgementObj.onDraw(() => {
			drawText({
				size: judgementObj.textSize,
				text: "\n" + comboText,
				opacity: judgementObj.opacity,
			});
		});

		judgementObj.onDestroy(() => {
			onNoteHitEV.cancel();
			onNoteMiss.cancel();
		});

		return judgementObj;
	}

	// this is called a singleton i think??????
	if (get("judgement").length > 0) {
		// since it already exists just bop it
		const judgementObj = get("judgement")[0] as ReturnType<typeof createJudgement>;

		if (StateGame.instance.tally.isPerfect) judgementObj.text = judgement + "!!";
		else if (StateGame.instance.tally.misses < 1) judgementObj.text = judgement + "!";

		tween(vec2(1.15), vec2(1), 0.15, (p) => judgementObj.scale = p, easings.easeOutQuad);

		return judgementObj;
	}
	else {
		// this is when it's just being created
		const judgementObj = createJudgement();
		tween(0, 1, 0.15, (p) => judgementObj.opacity = p, easings.easeOutQuad);
		tween(vec2(1.15), vec2(1), 0.15, (p) => judgementObj.scale = p, easings.easeOutQuad);
		return judgementObj;
	}
}

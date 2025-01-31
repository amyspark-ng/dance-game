import "./kaplay";
import "./test";
// import "./core/init";

// type editorParams = { seekTime: number; speed: number; };
// class StateChart extends KaplayState {
// 	constructor(params: editorParams) {
// 		super();
// 	}
// }

// KaplayState.scene("StateChart", (params: editorParams) => {
// 	setBackground(BLUE.lerp(RED, 0.5));
// 	debug.log("now in the state scene");
// 	console.log(params);
// });

// setupScenes();

// function transition(state: new(...args) => KaplayState, ...args: any[]) {
// 	console.log("ran the transition, wait 1 second and i'll send you to the scene");
// 	wait(1, () => {
// 		KaplayState.goScene(state, ...args);
// 	});
// }

// KaplayState.switchState(StateChart, transition, { seekTime: 1, speed: 1 });

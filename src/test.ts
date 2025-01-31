// import { Zip, ZipFS } from "@zenfs/archives";
// import fs, { configure, configureSingle, InMemory } from "@zenfs/core";
// import { IndexedDB, WebStorage } from "@zenfs/dom";

// await configure({
// 	mounts: {
// 		"/tmp": InMemory,
// 		"/home": IndexedDB,
// 	},
// });

// export const inputElement = document.createElement("input");
// inputElement.type = "file";
// inputElement.style.display = "none";
// // inputElement.accept = ".jpg,.png";
// inputElement.accept = ".zip";

// const fileButton = add([
// 	rect(50, 50),
// 	pos(center()),
// 	color(BLACK),
// 	area(),
// ]);

// fileButton.onClick(() => {
// 	inputElement.click();
// });

// inputElement.onchange = async () => {
// 	const file = inputElement.files[0];
// 	await configure({
// 		mounts: {
// 			"/zip": { backend: Zip, data: await file.arrayBuffer() },
// 		},
// 	});

// 	const content = fs.readFileSync("/zip/test.txt");
// 	console.log(content);
// };

// inputElement.oncancel = () => {
// };

// // fs.writeFileSync("/test.txt", "This will persist across reloads!");
// // const file = fs.readFileSync("/test.txt");

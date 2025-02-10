// All scene classes should implement this interface.
export interface IScene {
	scene(instance: IScene): void;
}

/**
 * Switches the scene given a class and its parameters
 * @param SceneClass The class
 * @param args The arguments to pass
 *
 * Uses the class name as the scene name,
 * when any scene starts an instance of the class is created and the actual scene runs passing the instance of the class
 */
export function switchScene<T extends new(...args: any[]) => IScene>(
	SceneClass: T,
	...args: ConstructorParameters<T>
): void {
	const sceneName = SceneClass.name;

	// registers the scene and passes the params
	scene(sceneName, (...params: ConstructorParameters<T>) => {
		const instance = new SceneClass(...params);
		instance.scene(instance);
	});

	go(sceneName, ...args);
}

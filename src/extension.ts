import { posix } from 'path';
import * as vscode from 'vscode';

type AssetsFolder = 'images' | 'svgs';

// 资源缓存对象
const assets: Record<AssetsFolder, Record<string, string>> = { images: {}, svgs: {} };
// dart code缓存对象
const dartCodeCache: Record<AssetsFolder, string> = { images: '', svgs: '' };

// debounce
const debounce = (fn: Function, delay: number) => {
	let timer: NodeJS.Timeout;
	return (...args: any[]) => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			fn(...args);
		}, delay);
	};
};

// 处理file格式, 返回符合要求的文件名和文件格式
const handleFile = (file: vscode.Uri): { fileNameCamel?: string; fileFormatCamel?: string } => {
	// 从path中获取文件名, 排除格式
	const fileName = file.path.split('/').pop()?.split('.').shift();
	// 从文件名中获取格式
	const fileFormatCamel = file.path
		.split('/')
		.pop()
		?.split('.')
		.pop()
		?.replace(/^\S/, (s) => s.toUpperCase());
	// 判断name是否是下划线命名或者-命名, 如果是, 就转换成驼峰命名
	const fileNameCamel = fileName?.replace(/[-_]\S/g, (s) => s.slice(1).toUpperCase());
	return {
		fileNameCamel,
		fileFormatCamel
	};
};

// 处理缓存对象的数据结构, 提供file对象和缓存对象引用为参数, 返回缓存对象引用
type CacheHandler = (file: vscode.Uri, cache: Record<string, string>) => Record<string, string>;
const cacheHandler: CacheHandler = (file, cache) => {
	const { fileNameCamel, fileFormatCamel } = handleFile(file);
	// 把key value对添加到对象中
	cache[`${fileNameCamel}${fileFormatCamel}`] = file.path.substring(file.path.indexOf('assets'));
	return cache;
};

// 将缓存对象转换为dart code
const cacheToDartCode = async (
	cache: Record<string, string>,
	className: AssetsFolder,
	options?: {
		// 是否需要覆盖assets.dart文件
		cover?: boolean;
	}
): Promise<void> => {
	const val = Object.entries(cache)
		.map(([key, value]) => `  static const ${key} = '${value}';`)
		.join('\n');
	const dartCode = `class Assets${className?.replace(/^\S/, (s) => s.toUpperCase())} {\n${val}\n}`;
	// 将code缓存到dartCodeCache中
	dartCodeCache[className] = dartCode;
	// 如果需要覆盖原有的assets.dart文件, 就写入文件
	if (options?.cover) {
		// 循环缓存的dart code
		let code = '';
		Object.entries(dartCodeCache).forEach(([key, value]) => {
			code += value + '\n\n';
		});
		const folderUri = vscode.workspace.workspaceFolders![0].uri;
		const fileUri = folderUri.with({ path: posix.join(folderUri.path, 'lib', 'assets.dart') });
		await vscode.workspace.fs.writeFile(fileUri, Buffer.from(code));
		// vscode成功提示
		vscode.window.showInformationMessage(
			'[generate-resource-dart-code] assets.dart文件已成功生成🎉'
		);
	}
};

export async function activate(context: vscode.ExtensionContext) {
	// 获取当前项目的根目录第一级文件
	const isFlutter = await vscode.workspace.findFiles('pubspec.yaml');
	if (isFlutter.length === 0) {
		// 如果不存在pubspec.yaml文件，直接返回
		return;
	}
	let key: AssetsFolder;
	for (key in assets) {
		const watcher = vscode.workspace.createFileSystemWatcher(`**/assets/${key}/**`);
		// 遍历对应资源文件夹下的所有文件
		const files = await vscode.workspace.findFiles( `assets/${key}/**`);
		// 初始化缓存对象
		files.forEach((file) => {
			cacheHandler(file, assets[key]);
		});
		cacheToDartCode(assets[key], key, { cover: true });
		watcher.onDidCreate(
			debounce((uri: vscode.Uri) => {
				cacheHandler(uri, assets[key]);
				cacheToDartCode(assets[key], key, { cover: true });
			}, 1000)
		);
		watcher.onDidDelete(
			debounce(async (uri: vscode.Uri) => {
				const { fileNameCamel, fileFormatCamel } = handleFile(uri);
				if (assets[key][`${fileNameCamel}${fileFormatCamel}`]) {
					delete assets[key][`${fileNameCamel}${fileFormatCamel}`];
				}
				cacheToDartCode(assets[key], key, { cover: true });
			}, 1000)
		);
		watcher.onDidChange(
			debounce(async (uri: vscode.Uri) => {
				const { fileNameCamel, fileFormatCamel } = handleFile(uri);
				if (assets[key][`${fileNameCamel}${fileFormatCamel}`]) {
					delete assets[key][`${fileNameCamel}${fileFormatCamel}`];
				}
				// 重新添加
				cacheHandler(uri, assets[key]);
				cacheToDartCode(assets[key], key, { cover: true });
			}, 1000)
		);
	}
}

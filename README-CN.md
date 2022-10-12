# generate-resource-dart-code

[English](https://github.com/seho-code-life/generate-resource-dart-code/blob/main/README.md)

这是一个用于flutter项目把资源文件夹中的images以及svgs转换为dart code的vscode插件

## 特性

- 👂 时刻监听你的assets文件夹中的images以及svgs
- 🛞 轻松的生成优雅的dart code到lib/assets.dart
- 😄 提供了一个vscode命令能够方便地为你的文件夹生成lib/assets.dart

## vscode命令

ctrl + shift + p

- Generate Resource Dart Code : 生成 lib/assets.dart 或者 重新加载 lib/assets.dart

## 开始

你什么也不用做, 只需要在根目录建立好assets/images以及assets/svgs, 并且使用相对规范的文件名, 无论在这两个文件夹下做什么操作(删除, 新增, 修改等等), 它都会自动地同步到lib/assets.dart中

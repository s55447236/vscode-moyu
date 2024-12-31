const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

// 更丰富的代码片段库
const codeTemplates = {
    classStart: [
        'class DataProcessor {',
        'export class ServiceHandler {',
        'class AsyncManager implements IManager {',
        'export default class Controller {'
    ],
    methodStart: [
        'private async process',
        'public static handle',
        'protected async fetch',
        'private static async load'
    ],
    variables: [
        'private readonly data',
        'protected static config',
        'private async handler',
        'public static readonly instance'
    ],
    statements: [
        'await this.process${name}(data);',
        'const result = this.handle${name}();',
        'if (this.validate${name}()) {',
        'return await this.transform${name}();',
        'this.logger.debug(${name});'
    ]
};

function activate(context) {
    // 注册转换命令
    let convertCommand = vscode.commands.registerCommand('vscode-moyu.convertToCode', handleConvert);
    
    // 注册书签命令
    let bookmarkCommand = vscode.commands.registerCommand('vscode-moyu.addBookmark', handleBookmark);
    
    context.subscriptions.push(convertCommand, bookmarkCommand);
}

async function handleConvert() {
    try {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            filters: { 'Text files': ['txt'] }
        });

        if (!fileUri || !fileUri[0]) return;

        const filePath = fileUri[0].fsPath;
        const buffer = fs.readFileSync(filePath);
        const content = iconv.decode(buffer, 'gbk');
        
        // 读取上次的书签位置
        const bookmarkPath = filePath + '.bookmark';
        let bookmark = 0;
        if (fs.existsSync(bookmarkPath)) {
            bookmark = parseInt(fs.readFileSync(bookmarkPath, 'utf8')) || 0;
        }
        
        const convertedContent = convertToFakeCode(content, bookmark);
        const newFilePath = filePath.replace('.txt', '.js');
        fs.writeFileSync(newFilePath, convertedContent, 'utf8');

        const doc = await vscode.workspace.openTextDocument(newFilePath);
        const editor = await vscode.window.showTextDocument(doc);
        
        // 跳转到书签位置
        if (bookmark > 0) {
            const pos = new vscode.Position(bookmark, 0);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(new vscode.Range(pos, pos));
        }

    } catch (error) {
        vscode.window.showErrorMessage(`转换失败：${error.message}`);
        console.error('详细错误：', error);
    }
}

async function handleBookmark() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const line = editor.selection.active.line;
    const filePath = editor.document.uri.fsPath;
    
    // 保存书签
    const bookmarkPath = filePath.replace('.js', '.txt') + '.bookmark';
    fs.writeFileSync(bookmarkPath, line.toString(), 'utf8');
    
    vscode.window.showInformationMessage(`书签已保存在第 ${line + 1} 行`);
}

function convertToFakeCode(content, bookmark = 0) {
    const lines = content.split('\n');
    let result = '';
    let currentClass = '';
    let indentLevel = 0;
    
    // 添加文件头部
    result += '/**\n * @file Auto generated service handler\n * @author System Generator\n */\n\n';
    result += 'import { IManager, IProcessor } from \'./interfaces\';\n';
    result += 'import { Logger } from \'./utils\';\n\n';
    
    // 开始类定义
    currentClass = codeTemplates.classStart[Math.floor(Math.random() * codeTemplates.classStart.length)];
    result += `${currentClass}\n`;
    indentLevel++;
    
    // 添加类成员变量
    result += `  ${codeTemplates.variables[Math.floor(Math.random() * codeTemplates.variables.length)]};\n\n`;
    
    // 处理每一行内容
    let methodCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // 每隔一定行数开始新方法
        if (i % 15 === 0) {
            if (methodCount > 0) {
                // 结束前一个方法
                result += '  '.repeat(indentLevel) + '  return result;\n';
                result += '  '.repeat(indentLevel) + '}\n\n';
            }
            
            // 开始新方法
            const methodTemplate = codeTemplates.methodStart[Math.floor(Math.random() * codeTemplates.methodStart.length)];
            const methodName = `${line.slice(0, 2).replace(/[^a-zA-Z]/g, '')}Data`;
            result += `  ${methodTemplate}${methodName}() {\n`;
            result += '    const result = { status: true, data: {} };\n';
            methodCount++;
        }
        
        // 添加内容行
        if (line.length > 0) {
            // 处理长行，每80个字符自动换行
            const wrappedLines = wrapText(line, 80);
            for (const wrappedLine of wrappedLines) {
                result += '    // ' + wrappedLine + '\n';
            }
            
            const codeLine = generateCodeLine(line);
            result += '    ' + codeLine + '\n';
        }
    }
    
    // 结束最后一个方法
    result += '    return result;\n  }\n';
    
    // 结束类
    result += '}\n';
    
    return result;
}

function wrapText(text, maxLength) {
    const lines = [];
    let currentLine = '';
    
    for (const char of text) {
        if (currentLine.length >= maxLength) {
            lines.push(currentLine);
            currentLine = '';
        }
        currentLine += char;
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

function generateCodeLine(line) {
    const words = line.split('').filter(char => /[\u4e00-\u9fa5]/.test(char));
    if (words.length === 0) return 'continue;';
    
    // 使用第一个汉字作为变量名
    const varName = words[0];
    
    // 更丰富的代码模式
    const patterns = [
        `const ${varName}Data = await this.process${words[1] || 'Default'}();`,
        `if (this.validate${varName}()) { await this.handle${words[1] || 'Data'}(); }`,
        `result.data.${varName} = await this.transform${words[1] || 'Content'}();`,
        `this.logger.info('Processing ${varName}:', { status: true });`,
        `await this.emit('${varName}Changed', result.data);`
    ];
    
    return patterns[Math.floor(Math.random() * patterns.length)];
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
} 